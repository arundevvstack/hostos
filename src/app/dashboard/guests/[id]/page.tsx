import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Briefcase, FileText, Globe, Target, User, Zap, Sparkles, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react'
import { runGuestResearch } from '../actions'

export default async function GuestProfilePage({ params }: { params: { id: string } }) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: guest } = await supabase
    .from('guests')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!guest) return <div>Guest not found</div>

  const { data: research } = await supabase
    .from('guest_research')
    .select('*')
    .eq('guest_id', guest.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const report = research?.report_data

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/guests">
            <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full h-10 w-10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">{guest.name}</h2>
            <p className="text-gray-500 mt-1">{guest.title || 'Guest'} {guest.company && `at ${guest.company}`}</p>
          </div>
        </div>
        
        <form action={async () => {
          'use server'
          await runGuestResearch(guest.id)
        }}>
          <Button 
            disabled={research?.status === 'processing'}
            className="bg-red-600 hover:bg-red-700 text-white rounded-full h-11 px-6 shadow-sm font-medium"
          >
            {research?.status === 'processing' ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" /> Run Research Agent</>
            )}
          </Button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column: Basic Info */}
        <div className="space-y-6">
          <Card className="bg-white border-gray-200 shadow-sm rounded-3xl">
            <CardHeader className="p-6 border-b border-gray-100">
              <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <User className="h-5 w-5 text-gray-400" />
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {guest.bio && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">Bio</h4>
                  <p className="text-sm text-gray-600">{guest.bio}</p>
                </div>
              )}
              {guest.company && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">Company</h4>
                  <p className="text-sm text-gray-600 flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-gray-400" /> {guest.company}
                  </p>
                </div>
              )}
              {guest.website && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">Website</h4>
                  <a href={guest.website} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-400" /> {guest.website}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Intelligence Report */}
        <div className="md:col-span-2 space-y-6">
          {!report ? (
            <Card className="bg-white border-gray-200 shadow-sm rounded-3xl p-12 text-center">
              <Sparkles className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">No Intelligence Report</h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                Run the Research Agent to analyze this guest and generate deep interview insights, contradictions, and viral moments.
              </p>
            </Card>
          ) : (
            <>
              <Card className="bg-white border-gray-200 shadow-sm rounded-3xl">
                <CardHeader className="p-6 border-b border-gray-100 bg-red-50/50">
                  <CardTitle className="text-xl font-bold text-gray-900">Intelligence Report</CardTitle>
                  <CardDescription>Generated by HostAI Research Agent</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                  
                  {/* Summary */}
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-red-600 mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Career & Background
                    </h3>
                    <p className="text-gray-700 text-sm leading-relaxed mb-4">{report.careerSummary}</p>
                    <p className="text-gray-700 text-sm leading-relaxed">{report.backgroundOverview}</p>
                  </div>

                  {/* Opportunities */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-700 mb-3 flex items-center gap-2">
                        <Target className="h-4 w-4" /> Story Angles
                      </h3>
                      <ul className="list-disc pl-4 space-y-2 text-sm text-emerald-900">
                        {report.potentialAngles?.map((angle: string, i: number) => (
                          <li key={i}>{angle}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-amber-700 mb-3 flex items-center gap-2">
                        <Zap className="h-4 w-4" /> Contradictions
                      </h3>
                      <ul className="list-disc pl-4 space-y-2 text-sm text-amber-900">
                        {report.contradictionOpportunities?.map((item: string, i: number) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Deep Dives & Curiosity */}
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-blue-600 mb-3 flex items-center gap-2">
                      <Sparkles className="h-4 w-4" /> Deep Dives & Curiosity
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <ul className="list-disc pl-4 space-y-2 text-sm text-gray-700">
                        {report.suggestedDeepDives?.map((item: string, i: number) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                      <ul className="list-disc pl-4 space-y-2 text-sm text-gray-700">
                        {report.curiosityOpportunities?.map((item: string, i: number) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Viral & Risk */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-purple-600 mb-3 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" /> Viral Moments
                      </h3>
                      <ul className="list-disc pl-4 space-y-2 text-sm text-gray-700">
                        {report.potentialViralMoments?.map((item: string, i: number) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-red-600 mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" /> Risk Areas
                      </h3>
                      <ul className="list-disc pl-4 space-y-2 text-sm text-gray-700">
                        {report.riskAreas?.map((item: string, i: number) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                </CardContent>
              </Card>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
