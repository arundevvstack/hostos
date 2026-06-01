import { signup } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function RegisterPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-zinc-950">
      <Card className="w-[400px] border-zinc-800 bg-zinc-900 text-zinc-100">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <CardDescription className="text-zinc-400">
            Enter your email below to create your account
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <form id="register-form" action={signup} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="John Doe"
                required
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
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
          <Button form="register-form" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
            Create account
          </Button>
          <div className="text-sm text-zinc-400 text-center">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-blue-500 hover:underline">
              Sign in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
