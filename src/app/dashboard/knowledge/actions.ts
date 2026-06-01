'use server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { processKnowledgeSource } from '@/lib/knowledge/ingestion'

export async function uploadKnowledgeSource(formData: FormData) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const type = formData.get('type') as string
  const sourceName = formData.get('source_name') as string
  const hostId = formData.get('host_id') as string | null

  // 1. Insert initial DB record
  const { data: dbRecord, error: dbError } = await supabase.from('knowledge_sources').insert({
    user_id: user.id,
    host_id: hostId || null,
    type,
    source_name: sourceName,
    status: 'processing'
  }).select().single()

  if (dbError) {
    console.error('Database insert error:', dbError)
    throw new Error('Failed to create knowledge source record')
  }

  // 2. Process based on type
  if (type === 'youtube' || type === 'url' || type === 'note') {
    const urlOrNote = formData.get('content') as string
    
    // Fire and forget processing (in a real app, use a queue like Inngest)
    // Next.js server actions might kill async if we don't await, but we will await here
    await processKnowledgeSource(dbRecord.id, type, urlOrNote)
  } else {
    // File upload (pdf, docx, txt)
    const file = formData.get('file') as File
    if (!file || file.size === 0) throw new Error('No file selected')

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // (Optional) also save to storage for backup
    const fileExt = file.name.split('.').pop()
    const storagePath = `${user.id}/${dbRecord.id}.${fileExt}`
    await supabase.storage.from('knowledge-documents').upload(storagePath, file)
    
    // Update source_url with storage path
    await supabase.from('knowledge_sources').update({ source_url: storagePath }).eq('id', dbRecord.id)

    // Await processing
    const typeStr = file.type.includes('pdf') ? 'pdf' 
                  : file.type.includes('word') ? 'docx' 
                  : 'txt';
                  
    await processKnowledgeSource(dbRecord.id, typeStr, buffer)
  }

  revalidatePath('/dashboard/knowledge')
  redirect('/dashboard/knowledge')
}

export async function deleteKnowledgeSource(id: string, storagePath?: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { error: dbError } = await supabase.from('knowledge_sources').delete().match({ id, user_id: user.id })
  if (dbError) throw new Error('Failed to delete document')

  if (storagePath) {
    await supabase.storage.from('knowledge-documents').remove([storagePath])
  }

  revalidatePath('/dashboard/knowledge')
}
