import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Database, Plus, FileText, CheckCircle2, Loader2 } from 'lucide-react'
import { deleteDocument } from './actions'

export default async function KnowledgePage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()

  const { data: documents } = await supabase
    .from('knowledge_documents')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Knowledge Base</h2>
          <p className="text-zinc-400">Upload documents to train your AI hosts.</p>
        </div>
        <Link href="/dashboard/knowledge/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
        </Link>
      </div>

      {documents?.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800 text-center py-12">
          <CardContent className="flex flex-col items-center space-y-4">
            <Database className="h-12 w-12 text-zinc-600" />
            <div className="space-y-2">
              <h3 className="font-semibold text-xl text-zinc-200">No documents uploaded</h3>
              <p className="text-zinc-400 max-w-sm mx-auto">
                Train your hosts by uploading PDFs, DOCX, or TXT files to build their knowledge base.
              </p>
            </div>
            <Link href="/dashboard/knowledge/new">
              <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white mt-4">
                Upload your first Document
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents?.map((doc) => (
            <Card key={doc.id} className="bg-zinc-900 border-zinc-800 flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded bg-zinc-800 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-6 w-6 text-emerald-500" />
                  </div>
                  <div className="overflow-hidden">
                    <CardTitle className="text-base text-zinc-100 truncate">{doc.file_name}</CardTitle>
                    <CardDescription className="text-zinc-400 uppercase text-xs">{doc.file_type}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Upload Status</span>
                  <span className="flex items-center gap-1.5 text-zinc-300">
                    {doc.upload_status === 'completed' ? (
                      <><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Completed</>
                    ) : (
                      <>{doc.upload_status}</>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Processing</span>
                  <span className="flex items-center gap-1.5 text-zinc-300">
                    {doc.processing_status === 'completed' ? (
                      <><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Embedded</>
                    ) : doc.processing_status === 'pending' ? (
                      <><Loader2 className="h-4 w-4 text-blue-500 animate-spin" /> Pending</>
                    ) : (
                      <>{doc.processing_status}</>
                    )}
                  </span>
                </div>
              </CardContent>
              <div className="p-4 border-t border-zinc-800 mt-auto flex justify-between items-center">
                <span className="text-xs text-zinc-500">
                  {new Date(doc.created_at).toLocaleDateString()}
                </span>
                <form action={async () => {
                  'use server'
                  await deleteDocument(doc.id, doc.storage_path)
                }}>
                  <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-950/30 h-8">
                    Delete
                  </Button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
