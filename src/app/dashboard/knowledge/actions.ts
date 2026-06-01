'use server'
import { cookies } from 'next/headers'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function uploadDocument(formData: FormData) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  const file = formData.get('file') as File
  if (!file || file.size === 0) {
    throw new Error('No file selected')
  }

  const fileExt = file.name.split('.').pop()
  const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
  const storagePath = `${user.id}/${fileName}`

  // Upload to Supabase Storage
  const { data: storageData, error: storageError } = await supabase
    .storage
    .from('knowledge-documents')
    .upload(storagePath, file)

  if (storageError) {
    console.error('Storage error:', storageError)
    throw new Error('Failed to upload file to storage')
  }

  // Get public URL (or just store path if private, but schema expects file_url)
  const { data: publicUrlData } = supabase
    .storage
    .from('knowledge-documents')
    .getPublicUrl(storagePath)

  // Insert into database
  const { error: dbError } = await supabase.from('knowledge_documents').insert({
    user_id: user.id,
    file_name: file.name,
    file_type: file.type || fileExt || 'unknown',
    file_url: publicUrlData.publicUrl,
    storage_path: storagePath,
    upload_status: 'completed',
    processing_status: 'pending',
  })

  if (dbError) {
    console.error('Database error:', dbError)
    // Optionally delete from storage if DB insert fails
    await supabase.storage.from('knowledge-documents').remove([storagePath])
    throw new Error('Failed to save document metadata')
  }

  revalidatePath('/dashboard/knowledge')
  redirect('/dashboard/knowledge')
}

export async function deleteDocument(id: string, storagePath: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  // Delete from DB
  const { error: dbError } = await supabase.from('knowledge_documents').delete().match({ id, user_id: user.id })

  if (dbError) {
    console.error('Error deleting document from DB:', dbError)
    throw new Error('Failed to delete document')
  }

  // Delete from Storage
  if (storagePath) {
    await supabase.storage.from('knowledge-documents').remove([storagePath])
  }

  revalidatePath('/dashboard/knowledge')
}
