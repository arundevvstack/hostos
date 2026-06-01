import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { logout } from '@/app/auth/actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Mic, Users, Settings, Database, Video, LayoutDashboard, Share2, Activity, BarChart3 } from 'lucide-react'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  const links = [
    { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { href: '/dashboard/observability', label: 'Launch Console', icon: <Activity className="h-5 w-5" /> },
    { href: '/dashboard/analytics', label: 'Growth Analytics', icon: <BarChart3 className="h-5 w-5" /> },
    { href: '/dashboard/hosts', label: 'AI Hosts', icon: <Mic className="h-5 w-5" /> },
    { href: '/dashboard/episodes', label: 'Episodes', icon: <Video className="h-5 w-5" /> },
    { href: '/dashboard/publishing', label: 'Publishing OS', icon: <Share2 className="h-5 w-5" /> },
    { href: '/dashboard/guests', label: 'Guests', icon: <Users className="h-5 w-5" /> },
    { href: '/dashboard/knowledge', label: 'Knowledge Base', icon: <Database className="h-5 w-5" /> },
    { href: '/dashboard/video/health', label: 'Provider Health', icon: <Activity className="h-5 w-5" /> },
    { href: '/dashboard/settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
  ]

  return (
    <div className="flex h-screen w-full bg-background text-foreground font-sans">
      {/* Sidebar */}
      <aside className="w-[260px] border-r border-border bg-background flex flex-col shadow-sm z-10">
        <div className="p-6 pb-2">
          <div className="flex items-center gap-3 pl-2 mb-8">
            {/* The Logo */}
            <div className="relative h-20 w-[212px] flex-shrink-0">
              <img src="/logo.png" alt="HostAI Logo" className="object-contain h-full w-full object-left" />
            </div>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-1.5">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-[14px] text-muted-foreground font-medium hover:text-primary hover:bg-secondary transition-all duration-200"
            >
              <div className="text-muted-foreground transition-colors group-hover:text-primary">
                {link.icon}
              </div>
              {link.label}
            </Link>
          ))}
        </nav>
        
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-4 px-2">
            <Avatar className="h-10 w-10 border border-border shadow-sm rounded-[14px]">
              <AvatarImage src={profile?.avatar_url || ''} />
              <AvatarFallback className="bg-secondary text-primary font-semibold rounded-[14px]">
                {profile?.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-semibold text-foreground truncate">{profile?.full_name || 'User'}</span>
              <span className="text-xs text-muted-foreground truncate">{user.email}</span>
            </div>
          </div>
          <form action={logout}>
            <Button variant="outline" className="w-full border-border text-foreground hover:bg-background hover:text-foreground rounded-[14px] h-11 font-medium shadow-sm transition-all">
              Sign Out
            </Button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-background">
        <div className="h-full p-8 max-w-[1440px] mx-auto">{children}</div>
      </main>
    </div>
  )
}
