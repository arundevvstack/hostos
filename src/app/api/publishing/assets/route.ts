import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

// GET all assets for an episode (with history)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const episodeId = searchParams.get('episode_id')

    if (!episodeId) {
      return new Response(JSON.stringify({ error: 'Missing episode_id' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    // Fetch assets
    const { data: assets, error: assetsErr } = await supabase
      .from('publishing_assets')
      .select('*')
      .eq('episode_id', episodeId)
      .order('created_at', { ascending: true })

    if (assetsErr) throw assetsErr

    // Fetch version histories for each asset
    const assetsWithHistory = await Promise.all((assets || []).map(async (asset) => {
      const { data: versions, error: versionsErr } = await supabase
        .from('publishing_asset_versions')
        .select('*')
        .eq('asset_id', asset.id)
        .order('version', { ascending: false })

      if (versionsErr) throw versionsErr

      return {
        ...asset,
        history: versions || []
      }
    }))

    return new Response(JSON.stringify(assetsWithHistory), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('Publishing Assets GET Error:', error?.message || error)
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// POST to save/update an asset, creating a version history if content changes
export async function POST(req: Request) {
  try {
    const { episode_id, asset_type, content, publish_destination } = await req.json()

    if (!episode_id || !asset_type || content === undefined) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    // Check if asset already exists
    const { data: existingAsset, error: getErr } = await supabase
      .from('publishing_assets')
      .select('*')
      .eq('episode_id', episode_id)
      .eq('asset_type', asset_type)
      .maybeSingle()

    if (getErr) throw getErr

    let finalAsset

    if (!existingAsset) {
      // 1. Create new asset
      const { data: newAsset, error: insErr } = await supabase
        .from('publishing_assets')
        .insert({
          episode_id,
          user_id: user.id,
          asset_type,
          content,
          status: 'Draft',
          publish_destination: publish_destination || null,
          version: 1,
          editor_id: user.id
        })
        .select()
        .single()

      if (insErr) throw insErr

      // 2. Create initial version entry
      const { error: verErr } = await supabase
        .from('publishing_asset_versions')
        .insert({
          asset_id: newAsset.id,
          user_id: user.id,
          content,
          version: 1,
          changed_by: user.id
        })

      if (verErr) throw verErr

      finalAsset = { ...newAsset, history: [] }
    } else {
      // 2. Update existing asset if content has changed
      const contentChanged = existingAsset.content !== content
      const nextVersion = contentChanged ? existingAsset.version + 1 : existingAsset.version

      const updateData: any = {
        updated_at: new Date().toISOString(),
        editor_id: user.id
      }
      if (contentChanged) {
        updateData.content = content
        updateData.version = nextVersion
      }
      if (publish_destination !== undefined) {
        updateData.publish_destination = publish_destination
      }

      const { data: updatedAsset, error: updErr } = await supabase
        .from('publishing_assets')
        .update(updateData)
        .eq('id', existingAsset.id)
        .select()
        .single()

      if (updErr) throw updErr

      // Create new version entry if content changed
      if (contentChanged) {
        const { error: verErr } = await supabase
          .from('publishing_asset_versions')
          .insert({
            asset_id: existingAsset.id,
            user_id: user.id,
            content,
            version: nextVersion,
            changed_by: user.id
          })

        if (verErr) throw verErr
      }

      finalAsset = updatedAsset
    }

    return new Response(JSON.stringify(finalAsset), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('Publishing Assets POST Error:', error?.message || error)
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
