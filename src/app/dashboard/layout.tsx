import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { logout } from '@/app/auth/actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Mic, Users, Settings, Database, Video, LayoutDashboard } from 'lucide-react'

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
    { href: '/dashboard/hosts', label: 'AI Hosts', icon: <Mic className="h-5 w-5" /> },
    { href: '/dashboard/episodes', label: 'Episodes', icon: <Video className="h-5 w-5" /> },
    { href: '/dashboard/guests', label: 'Guests', icon: <Users className="h-5 w-5" /> },
    { href: '/dashboard/knowledge', label: 'Knowledge Base', icon: <Database className="h-5 w-5" /> },
    { href: '/dashboard/settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
  ]

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-zinc-100">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-950 flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            HostAI Studio
          </h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-zinc-800">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-9 w-9">
              <AvatarImage src={profile?.avatar_url || ''} />
              <AvatarFallback className="bg-zinc-800 text-zinc-300">
                {profile?.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">{profile?.full_name || 'User'}</span>
              <span className="text-xs text-zinc-500 truncate">{user.email}</span>
            </div>
          </div>
          <form action={logout}>
            <Button variant="outline" className="w-full border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white">
              Sign Out
            </Button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="h-full p-8">{children}</div>
      </main>
    </div>
  )
}
