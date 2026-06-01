import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { logTelemetry } from '@/lib/hardening/logger'

export async function POST(req: Request) {
  const startTime = Date.now()
  let userId = ''

  try {
    const { action, dlqId } = await req.json()
    if (!action || !dlqId) {
      return NextResponse.json({ error: 'Missing action or dlqId' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    userId = user.id

    // 1. Fetch DLQ Item
    const { data: dlqItem, error: fetchErr } = await supabase
      .from('dead_letter_queue')
      .select('*')
      .eq('id', dlqId)
      .single()

    if (fetchErr || !dlqItem) {
      return NextResponse.json({ error: 'DLQ item not found' }, { status: 404 })
    }

    if (action === 'delete') {
      // Simply delete the failed record
      const { error: delErr } = await supabase
        .from('dead_letter_queue')
        .delete()
        .eq('id', dlqId)

      if (delErr) throw delErr

      return NextResponse.json({ success: true, message: 'DLQ item deleted.' })
    }

    if (action === 'retry') {
      // 2. Mark DLQ item as retrying
      await supabase
        .from('dead_letter_queue')
        .update({ 
          status: 'retrying',
          retry_count: dlqItem.retry_count + 1
        })
        .eq('id', dlqId)

      let isSuccess = false
      let details = ''

      if (dlqItem.job_type === 'publishing_job') {
        const payload = dlqItem.payload as any
        const jobId = payload.job_id
        const assetId = payload.asset_id

        // Simulate retry processing with 95% success rate on retry
        isSuccess = Math.random() > 0.05
        
        if (isSuccess) {
          // Update distribution_jobs to published
          await supabase
            .from('distribution_jobs')
            .update({ 
              status: 'published',
              updated_at: new Date().toISOString(),
              metadata: {
                ...payload,
                published_at: new Date().toISOString(),
                logs: 'Job resolved successfully via manual retry.'
              }
            })
            .eq('id', jobId)

          if (assetId) {
            await supabase
              .from('publishing_assets')
              .update({ status: 'Published', updated_at: new Date().toISOString() })
              .eq('id', assetId)
          }

          // Update DLQ item to resolved
          await supabase
            .from('dead_letter_queue')
            .update({ status: 'resolved' })
            .eq('id', dlqId)

          details = 'Publishing job completed successfully.'
        } else {
          // Re-fail
          await supabase
            .from('dead_letter_queue')
            .update({ status: 'failed', error_message: 'Retry failed: Destination server still unreachable.' })
            .eq('id', dlqId)

          details = 'Retry failed again.'
        }
      } else {
        // Fallback simulation for other job types
        isSuccess = true
        await supabase
          .from('dead_letter_queue')
          .update({ status: 'resolved' })
          .eq('id', dlqId)
        details = `${dlqItem.job_type} job simulated and resolved.`
      }

      const latencyMs = Date.now() - startTime
      await logTelemetry({
        userId,
        systemArea: 'Queue',
        status: isSuccess ? 'success' : 'failure',
        errorMessage: isSuccess ? undefined : 'Retry failed again.',
        latencyMs,
        provider: 'supabase',
      })

      return NextResponse.json({ 
        success: isSuccess, 
        message: details,
        dlq_status: isSuccess ? 'resolved' : 'failed'
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error: any) {
    console.error('DLQ action error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
