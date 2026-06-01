import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { logTelemetry, enqueueToDLQ } from '@/lib/hardening/logger'

// GET active queue and scheduled events
export async function GET(req: Request) {
  const startTime = Date.now()
  let userId = ''

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })
    userId = user.id

    // Fetch distribution jobs
    const { data: jobs, error: jobsErr } = await supabase
      .from('distribution_jobs')
      .select(`
        *,
        episodes(title)
      `)
      .order('scheduled_for', { ascending: true })

    if (jobsErr) throw jobsErr

    // For each job, fetch associated asset information if available in metadata
    const enrichedJobs = await Promise.all((jobs || []).map(async (job) => {
      let assetDetails = null
      const assetId = (job.metadata as any)?.asset_id

      if (assetId) {
        const { data: asset } = await supabase
          .from('publishing_assets')
          .select('*')
          .eq('id', assetId)
          .maybeSingle()

        assetDetails = asset
      }

      return {
        ...job,
        asset: assetDetails
      }
    }))

    const latencyMs = Date.now() - startTime
    await logTelemetry({
      userId,
      systemArea: 'Publishing OS',
      status: 'success',
      latencyMs,
      provider: 'supabase',
    })

    return new Response(JSON.stringify(enrichedJobs), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('Publishing Queue GET Error:', error?.message || error)
    const latencyMs = Date.now() - startTime
    if (userId) {
      await logTelemetry({
        userId,
        systemArea: 'Publishing OS',
        status: 'failure',
        errorMessage: error?.message || 'Unknown error',
        latencyMs,
        provider: 'supabase',
      })
    }

    return new Response(
      JSON.stringify({ error: error?.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// POST to simulate the processing of a job
export async function POST(req: Request) {
  const startTime = Date.now()
  let userId = ''

  try {
    const { job_id } = await req.json()

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })
    userId = user.id

    let jobsToProcess = []

    if (job_id) {
      const { data: job, error: getErr } = await supabase
        .from('distribution_jobs')
        .select('*')
        .eq('id', job_id)
        .single()
      if (getErr) throw getErr
      jobsToProcess.push(job)
    } else {
      // Find all queued jobs that are due
      const { data: jobs, error: getErr } = await supabase
        .from('distribution_jobs')
        .select('*')
        .eq('status', 'queued')
        .lte('scheduled_for', new Date().toISOString())
      if (getErr) throw getErr
      jobsToProcess = jobs || []
    }

    const results = []

    for (const job of jobsToProcess) {
      // Simulate transition to 'publishing'
      await supabase
        .from('distribution_jobs')
        .update({ status: 'publishing', updated_at: new Date().toISOString() })
        .eq('id', job.id)

      const assetId = (job.metadata as any)?.asset_id
      if (assetId) {
        await supabase
          .from('publishing_assets')
          .update({ status: 'Publishing', updated_at: new Date().toISOString() })
          .eq('id', assetId)
      }

      // Simulate a small delay or proceed directly to outcome
      // For testing, we succeed 90% of the time, and fail 10% of the time.
      const isSuccess = Math.random() > 0.1
      const finalJobStatus = isSuccess ? 'published' : 'failed'
      const finalAssetStatus = isSuccess ? 'Published' : 'Failed'
      const errorMessage = isSuccess ? null : 'Error: Destination server timeout.'

      await supabase
        .from('distribution_jobs')
        .update({ 
          status: finalJobStatus, 
          updated_at: new Date().toISOString(),
          metadata: { 
            ...(job.metadata as any), 
            published_at: new Date().toISOString(),
            logs: isSuccess ? 'Job completed successfully. Feed updated.' : errorMessage
          }
        })
        .eq('id', job.id)

      if (assetId) {
        await supabase
          .from('publishing_assets')
          .update({ status: finalAssetStatus, updated_at: new Date().toISOString() })
          .eq('id', assetId)
      }

      const latencyMs = Date.now() - startTime

      // If job failed, enqueue to Dead Letter Queue (DLQ)
      if (!isSuccess) {
        await enqueueToDLQ({
          userId: user.id,
          jobType: 'publishing_job',
          payload: { job_id: job.id, asset_id: assetId, platform: job.platform, episode_id: job.episode_id },
          errorMessage: errorMessage || 'Destination server timeout.',
        })

        await logTelemetry({
          episodeId: job.episode_id,
          userId,
          systemArea: 'Publishing OS',
          status: 'failure',
          errorMessage: errorMessage || 'Destination server timeout.',
          latencyMs,
          provider: 'supabase',
        })
      } else {
        await logTelemetry({
          episodeId: job.episode_id,
          userId,
          systemArea: 'Publishing OS',
          status: 'success',
          latencyMs,
          provider: 'supabase',
        })
      }

      results.push({
        job_id: job.id,
        status: finalJobStatus
      })
    }

    return new Response(JSON.stringify({ success: true, processed: results }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('Publishing Queue POST Error:', error?.message || error)
    const latencyMs = Date.now() - startTime
    if (userId) {
      await logTelemetry({
        userId,
        systemArea: 'Publishing OS',
        status: 'failure',
        errorMessage: error?.message || 'Unknown error',
        latencyMs,
        provider: 'supabase',
      })
    }

    return new Response(
      JSON.stringify({ error: error?.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
