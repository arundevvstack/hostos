import { login } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-zinc-950">
      <Card className="w-[400px] border-zinc-800 bg-zinc-900 text-zinc-100">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">HostAI Studio</CardTitle>
          <CardDescription className="text-zinc-400">
            Enter your email to sign in to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <form id="login-form" action={login} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                required
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            {searchParams?.error && (
              <p className="text-sm text-red-500">{searchParams.error}</p>
            )}
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button form="login-form" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
            Sign In
          </Button>
          <div className="text-sm text-zinc-400 text-center">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="text-blue-500 hover:underline">
              Sign up
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
