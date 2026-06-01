import { createGroq } from '@ai-sdk/groq'
import { generateObject } from 'ai'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export const maxDuration = 120

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req: Request) {
  try {
    const { episode_id } = await req.json()

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    // 1. Fetch transcript and episode details
    const { data: episode } = await supabase
      .from('episodes')
      .select('*, hosts(name), guests(name)')
      .eq('id', episode_id)
      .single()

    const { data: conversations } = await supabase
      .from('conversations')
      .select('*')
      .eq('episode_id', episode_id)
      .order('created_at', { ascending: true })

    if (!conversations || conversations.length === 0) {
      return new Response(JSON.stringify({ error: 'No transcript found' }), { status: 400 })
    }

    const hostName = episode?.hosts?.name || 'Host'
    const guestName = episode?.guests?.name || 'Guest'

    // Calculate approx start time based on first message
    const firstMsgTime = new Date(conversations[0].created_at).getTime()
    
    // Format transcript with timestamps
    const transcriptText = conversations.map(msg => {
      const ms = new Date(msg.created_at).getTime() - firstMsgTime
      const seconds = Math.floor(ms / 1000)
      const mm = Math.floor(seconds / 60).toString().padStart(2, '0')
      const ss = (seconds % 60).toString().padStart(2, '0')
      const speaker = msg.role === 'host' ? hostName : msg.role === 'guest' ? guestName : 'System'
      return `[${mm}:${ss}] ${speaker}: ${msg.content}`
    }).join('\n\n')

    // 2. Parallel Processing with heavy LLMs (70b for high quality)
    const model = groq('llama-3.3-70b-versatile')

    const [summaryRes, chaptersRes, quotesRes, socialRes] = await Promise.allSettled([
      // Task 1: Show Notes (Summaries)
      generateObject({
        model,
        system: 'You are an expert podcast producer. Extract high quality show notes.',
        prompt: `Analyze this podcast transcript and provide a summary, 3-5 key takeaways, 2-3 action items, and 3 suggested titles.\n\nTranscript:\n${transcriptText}`,
        schema: z.object({
          summary: z.string(),
          key_takeaways: z.array(z.string()),
          action_items: z.array(z.string()),
          suggested_titles: z.array(z.string()),
        })
      }),

      // Task 2: Chapters
      generateObject({
        model,
        system: 'You are an expert podcast producer. Identify 3 to 6 major topic shifts in the conversation.',
        prompt: `Based on this transcript, identify logical chapters. For each chapter, provide the start time (in seconds from 0), the title, and a brief summary. Ensure chronological order.\n\nTranscript:\n${transcriptText}`,
        schema: z.object({
          chapters: z.array(z.object({
            start_time_seconds: z.number(),
            title: z.string(),
            summary: z.string()
          }))
        })
      }),

      // Task 3: Key Quotes
      generateObject({
        model,
        system: 'You are an expert podcast producer. Extract the most impactful, tweetable quotes.',
        prompt: `Extract 2 quotes from the Host and 3 quotes from the Guest that are highly impactful. Provide the context for each.\n\nTranscript:\n${transcriptText}`,
        schema: z.object({
          quotes: z.array(z.object({
            speaker_role: z.enum(['host', 'guest']),
            quote_text: z.string(),
            context: z.string()
          }))
        })
      }),

      // Task 4: Social Media Drafts
      generateObject({
        model,
        system: 'You are an expert social media manager. Create engaging content based on the podcast.',
        prompt: `Create promotional content for this episode:\n1. A professional LinkedIn post\n2. A highly engaging X (Twitter) thread (just return as a single long string with line breaks)\n3. A short blog post draft\n4. A newsletter teaser\n\nTranscript:\n${transcriptText}`,
        schema: z.object({
          linkedin: z.string(),
          x_thread: z.string(),
          blog_draft: z.string(),
          newsletter: z.string()
        })
      })
    ])

    // 3. Save to Database
    
    // Summaries
    let compiledShowNotes = ''
    if (summaryRes.status === 'fulfilled') {
      const data = summaryRes.value.object
      await supabase.from('summaries').upsert({
        episode_id,
        user_id: user.id,
        summary: data.summary,
        key_takeaways: data.key_takeaways,
        action_items: data.action_items,
        suggested_titles: data.suggested_titles
      }, { onConflict: 'episode_id' })

      compiledShowNotes = `# Show Notes\n\n${data.summary}\n\n## Key Takeaways\n${data.key_takeaways.map(t => `- ${t}`).join('\n')}\n\n## Action Items\n${data.action_items.map(t => `- ${t}`).join('\n')}`
    }

    // Chapters
    let compiledChapters = ''
    if (chaptersRes.status === 'fulfilled') {
      await supabase.from('episode_chapters').delete().eq('episode_id', episode_id)
      const inserts = chaptersRes.value.object.chapters.map(c => ({
        episode_id, user_id: user.id, ...c
      }))
      await supabase.from('episode_chapters').insert(inserts)

      compiledChapters = chaptersRes.value.object.chapters.map(c => {
        const mm = Math.floor(c.start_time_seconds / 60).toString().padStart(2, '0')
        const ss = (c.start_time_seconds % 60).toString().padStart(2, '0')
        return `[${mm}:${ss}] ${c.title} - ${c.summary}`
      }).join('\n')
    }

    // Quotes
    let compiledQuotes = ''
    if (quotesRes.status === 'fulfilled') {
      await supabase.from('episode_quotes').delete().eq('episode_id', episode_id)
      const inserts = quotesRes.value.object.quotes.map(q => ({
        episode_id, user_id: user.id, ...q
      }))
      await supabase.from('episode_quotes').insert(inserts)

      compiledQuotes = quotesRes.value.object.quotes.map(q => `- "${q.quote_text}" (${q.speaker_role.toUpperCase()})\n  Context: ${q.context}`).join('\n\n')
    }

    // Social Drafts
    let linkedinDraft = ''
    let xDraft = ''
    let blogDraft = ''
    let newsletterDraft = ''
    if (socialRes.status === 'fulfilled') {
      await supabase.from('episode_social_drafts').delete().eq('episode_id', episode_id)
      const d = socialRes.value.object
      const inserts = [
        { episode_id, user_id: user.id, platform: 'linkedin', draft_content: d.linkedin },
        { episode_id, user_id: user.id, platform: 'x', draft_content: d.x_thread },
        { episode_id, user_id: user.id, platform: 'blog', draft_content: d.blog_draft },
        { episode_id, user_id: user.id, platform: 'newsletter', draft_content: d.newsletter },
      ]
      await supabase.from('episode_social_drafts').insert(inserts)

      linkedinDraft = d.linkedin
      xDraft = d.x_thread
      blogDraft = d.blog_draft
      newsletterDraft = d.newsletter
    }

    // 4. Seed Publishing OS Assets
    const seedPublishingAsset = async (assetType: string, contentStr: string, destination: string | null) => {
      if (!contentStr) return

      const { data: existing } = await supabase
        .from('publishing_assets')
        .select('*')
        .eq('episode_id', episode_id)
        .eq('asset_type', assetType)
        .maybeSingle()

      if (!existing) {
        const { data: newAsset } = await supabase
          .from('publishing_assets')
          .insert({
            episode_id,
            user_id: user.id,
            asset_type: assetType,
            content: contentStr,
            status: 'Draft',
            publish_destination: destination,
            version: 1,
            editor_id: user.id
          })
          .select()
          .single()

        if (newAsset) {
          await supabase
            .from('publishing_asset_versions')
            .insert({
              asset_id: newAsset.id,
              user_id: user.id,
              content: contentStr,
              version: 1,
              changed_by: user.id
            })
        }
      } else if (existing.content !== contentStr) {
        const nextVersion = existing.version + 1
        await supabase
          .from('publishing_assets')
          .update({
            content: contentStr,
            version: nextVersion,
            editor_id: user.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)

        await supabase
          .from('publishing_asset_versions')
          .insert({
            asset_id: existing.id,
            user_id: user.id,
            content: contentStr,
            version: nextVersion,
            changed_by: user.id
          })
      }
    }

    await seedPublishingAsset('transcript', transcriptText, 'rss')
    await seedPublishingAsset('show_notes', compiledShowNotes, 'rss')
    await seedPublishingAsset('chapters', compiledChapters, 'rss')
    await seedPublishingAsset('quotes', compiledQuotes, 'rss')
    await seedPublishingAsset('linkedin', linkedinDraft, 'linkedin')
    await seedPublishingAsset('x_thread', xDraft, 'x')
    await seedPublishingAsset('blog', blogDraft, 'web')
    await seedPublishingAsset('newsletter', newsletterDraft, 'email')

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('Studio Process Error:', error?.message || error)
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
