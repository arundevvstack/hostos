import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  try {
    const { asset_id, status, scheduled_for, publish_destination } = await req.json()

    if (!asset_id || !status) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

    const validStatuses = ['Draft', 'Review', 'Approved', 'Scheduled', 'Publishing', 'Published', 'Failed', 'Archived']
    if (!validStatuses.includes(status)) {
      return new Response(JSON.stringify({ error: 'Invalid status' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    // Get current asset
    const { data: asset, error: getErr } = await supabase
      .from('publishing_assets')
      .select('*')
      .eq('id', asset_id)
      .single()

    if (getErr) throw getErr

    // Update asset status
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
      editor_id: user.id
    }
    if (publish_destination) {
      updateData.publish_destination = publish_destination
    }

    const { data: updatedAsset, error: updErr } = await supabase
      .from('publishing_assets')
      .update(updateData)
      .eq('id', asset_id)
      .select()
      .single()

    if (updErr) throw updErr

    // Manage distribution_jobs sync
    if (status === 'Scheduled' || status === 'Publishing' || status === 'Published' || status === 'Failed') {
      const jobStatusMap: Record<string, string> = {
        'Scheduled': 'queued',
        'Publishing': 'publishing',
        'Published': 'published',
        'Failed': 'failed'
      }

      const platform = updatedAsset.publish_destination || 'rss' // Default platform if unspecified

      const { data: existingJob } = await supabase
        .from('distribution_jobs')
        .select('id')
        .eq('episode_id', updatedAsset.episode_id)
        .eq('platform', platform)
        .maybeSingle()

      if (existingJob) {
        await supabase
          .from('distribution_jobs')
          .update({
            status: jobStatusMap[status],
            scheduled_for: scheduled_for || new Date().toISOString(),
            metadata: { asset_id, asset_type: updatedAsset.asset_type },
            updated_at: new Date().toISOString()
          })
          .eq('id', existingJob.id)
      } else {
        await supabase
          .from('distribution_jobs')
          .insert({
            episode_id: updatedAsset.episode_id,
            platform: platform,
            status: jobStatusMap[status],
            scheduled_for: scheduled_for || new Date().toISOString(),
            metadata: { asset_id, asset_type: updatedAsset.asset_type }
          })
      }
    }

    return new Response(JSON.stringify(updatedAsset), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('Publishing Status update Error:', error?.message || error)
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
