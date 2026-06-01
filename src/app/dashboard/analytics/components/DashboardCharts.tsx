'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Users, Activity, PlayCircle, Clock } from 'lucide-react'

// Mock Data for charts if db is empty
const mockPodcastData = [
  { name: 'Mon', views: 4000, completion: 64 },
  { name: 'Tue', views: 3000, completion: 68 },
  { name: 'Wed', views: 2000, completion: 70 },
  { name: 'Thu', views: 2780, completion: 65 },
  { name: 'Fri', views: 1890, completion: 69 },
  { name: 'Sat', views: 2390, completion: 72 },
  { name: 'Sun', views: 3490, completion: 75 },
]

const mockShortsData = [
  { platform: 'TikTok', views: 120000, likes: 15000 },
  { platform: 'Reels', views: 80000, likes: 9000 },
  { platform: 'YouTube', views: 50000, likes: 4000 },
  { platform: 'LinkedIn', views: 10000, likes: 800 },
]

export function RevenueMetricsWidget() {
  return (
    <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
      <CardHeader className="pb-2">
        <CardDescription>Estimated Revenue (30d)</CardDescription>
        <CardTitle className="text-4xl">$4,250.00</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center text-sm text-emerald-500 font-medium">
          <TrendingUp className="w-4 h-4 mr-1" />
          +14.5% from last month
        </div>
      </CardContent>
    </Card>
  )
}

export function PodcastMetricsWidget() {
  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlayCircle className="w-5 h-5 text-indigo-500" />
          Episode Performance
        </CardTitle>
        <CardDescription>Views and Completion Rate over the last 7 days</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockPodcastData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Area type="monotone" dataKey="views" stroke="#6366f1" fillOpacity={1} fill="url(#colorViews)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export function ShortsMetricsWidget() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-pink-500" />
          Shorts Distribution
        </CardTitle>
        <CardDescription>Views by platform</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mockShortsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="platform" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                cursor={{ fill: 'hsl(var(--muted))' }}
                contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
              />
              <Bar dataKey="views" fill="#ec4899" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export function HostMetricsWidget() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-500" />
          AI Host Performance
        </CardTitle>
        <CardDescription>Avg scores across all episodes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {[
          { metric: 'Conversation Flow', score: 92, color: 'bg-blue-500' },
          { metric: 'Naturalness', score: 88, color: 'bg-indigo-500' },
          { metric: 'Curiosity', score: 95, color: 'bg-purple-500' },
          { metric: 'Memory Usage', score: 85, color: 'bg-emerald-500' },
        ].map(item => (
          <div key={item.metric} className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{item.metric}</span>
              <span className="text-muted-foreground">{item.score}/100</span>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div className={`h-full ${item.color}`} style={{ width: `${item.score}%` }} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function AIRecommendationEngine() {
  return (
    <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
          ✨ AI Growth Recommendations
        </CardTitle>
        <CardDescription>Based on your historical performance</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-background/50 p-4 rounded-xl border border-white/10">
          <h4 className="text-sm font-semibold text-muted-foreground mb-1">Best Posting Time</h4>
          <p className="text-lg font-bold">Tuesdays at 9:00 AM</p>
        </div>
        <div className="bg-background/50 p-4 rounded-xl border border-white/10">
          <h4 className="text-sm font-semibold text-muted-foreground mb-1">Best Clip Length</h4>
          <p className="text-lg font-bold">34 - 42 seconds</p>
        </div>
        <div className="bg-background/50 p-4 rounded-xl border border-white/10">
          <h4 className="text-sm font-semibold text-muted-foreground mb-1">Highest ROI Platform</h4>
          <p className="text-lg font-bold">YouTube Shorts</p>
        </div>
        <div className="bg-background/50 p-4 rounded-xl border border-white/10">
          <h4 className="text-sm font-semibold text-muted-foreground mb-1">Top Performing Topic</h4>
          <p className="text-lg font-bold">"Founder Failures"</p>
        </div>
      </CardContent>
    </Card>
  )
}
