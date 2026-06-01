import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Database, Plus, FileText, CheckCircle2, Loader2, Video, Globe, StickyNote, Activity, Target, Clock, Zap } from 'lucide-react'
import { deleteKnowledgeSource } from './actions'

export default async function KnowledgePage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()

  const { data: sources } = await supabase
    .from('knowledge_sources')
    .select('*, hosts(name)')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const getIcon = (type: string) => {
    switch (type) {
      case 'youtube': return <Video className="h-6 w-6 text-red-600" />
      case 'url': return <Globe className="h-6 w-6 text-blue-600" />
      case 'note': return <StickyNote className="h-6 w-6 text-yellow-600" />
      default: return <FileText className="h-6 w-6 text-emerald-600" />
    }
  }

  const getBgColor = (type: string) => {
    switch (type) {
      case 'youtube': return 'bg-red-50 border-red-100'
      case 'url': return 'bg-blue-50 border-blue-100'
      case 'note': return 'bg-yellow-50 border-yellow-100'
      default: return 'bg-emerald-50 border-emerald-100'
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Knowledge Studio</h2>
          <p className="text-gray-500 mt-1">Train your AI hosts with domains, documents, and videos.</p>
        </div>
        <Link href="/dashboard/knowledge/new">
          <Button className="bg-red-600 hover:bg-red-700 text-white rounded-full h-11 px-6 shadow-sm font-medium">
            <Plus className="mr-2 h-4 w-4" />
            Add Knowledge
          </Button>
        </Link>
      </div>

      {sources?.length === 0 ? (
        <Card className="bg-white border-gray-200 shadow-sm rounded-3xl text-center py-16">
          <CardContent className="flex flex-col items-center space-y-4">
            <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mb-2 border border-gray-100">
              <Database className="h-10 w-10 text-gray-400" />
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-xl text-gray-900">No knowledge sources</h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                Train your hosts by uploading PDFs, adding YouTube videos, or sharing Website URLs.
              </p>
            </div>
            <Link href="/dashboard/knowledge/new">
              <Button variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 mt-6 rounded-full h-11 px-6">
                Add your first source
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {sources?.map((source) => (
            <Card key={source.id} className="bg-white border-gray-200 shadow-sm rounded-3xl flex flex-col hover:shadow-md transition-shadow overflow-hidden">
              <CardHeader className="p-6 pb-4">
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-2xl border flex items-center justify-center flex-shrink-0 ${getBgColor(source.type)}`}>
                    {getIcon(source.type)}
                  </div>
                  <div className="overflow-hidden">
                    <CardTitle className="text-base font-semibold text-gray-900 truncate">{source.source_name}</CardTitle>
                    <div className="flex gap-2 mt-1 items-center">
                      <CardDescription className="text-gray-500 font-medium uppercase text-xs bg-gray-50 inline-block px-2 py-0.5 rounded border border-gray-100">
                        {source.type}
                      </CardDescription>
                      {source.hosts && (
                        <CardDescription className="text-gray-500 font-medium text-xs bg-red-50 text-red-700 inline-block px-2 py-0.5 rounded border border-red-100 truncate max-w-[120px]">
                          Host: {(source.hosts as any).name}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4 px-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col justify-center items-center text-center">
                    <Target className="h-4 w-4 text-gray-400 mb-1" />
                    <span className="text-xl font-bold text-gray-900">{source.confidence_score}%</span>
                    <span className="text-[10px] uppercase font-bold text-gray-500">Confidence</span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col justify-center items-center text-center">
                    <Activity className="h-4 w-4 text-gray-400 mb-1" />
                    <span className="text-xl font-bold text-gray-900">{source.coverage_score}%</span>
                    <span className="text-[10px] uppercase font-bold text-gray-500">Coverage</span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col justify-center items-center text-center">
                    <Clock className="h-4 w-4 text-gray-400 mb-1" />
                    <span className="text-xl font-bold text-gray-900">{source.freshness_score}%</span>
                    <span className="text-[10px] uppercase font-bold text-gray-500">Freshness</span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col justify-center items-center text-center">
                    <Zap className="h-4 w-4 text-gray-400 mb-1" />
                    <span className="text-xl font-bold text-gray-900">{source.usage_count}</span>
                    <span className="text-[10px] uppercase font-bold text-gray-500">Retrievals</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-gray-500 font-medium">Status</span>
                  <span className="flex items-center gap-1.5 text-gray-900 font-semibold">
                    {source.status === 'completed' ? (
                      <><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Active</>
                    ) : source.status === 'processing' ? (
                      <><Loader2 className="h-4 w-4 text-blue-500 animate-spin" /> Processing</>
                    ) : (
                      <span className="capitalize text-red-500">{source.status}</span>
                    )}
                  </span>
                </div>
              </CardContent>
              <div className="p-4 px-6 border-t border-gray-100 mt-2 flex justify-between items-center bg-gray-50/50 rounded-b-3xl">
                <span className="text-xs font-medium text-gray-400">
                  {new Date(source.created_at).toLocaleDateString()}
                </span>
                <form action={async () => {
                  'use server'
                  await deleteKnowledgeSource(source.id, source.source_url)
                }}>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg h-8 px-3">
                    Remove
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
