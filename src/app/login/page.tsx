'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    })
    if (error) {
      setError(error.message)
    }
  }

  return (
    <main className="w-full h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary-container rounded-full blur-[150px] opacity-10"></div>
      </div>

      <div className="w-full max-w-[400px] z-10 px-container-padding">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-surface-container flex items-center justify-center rounded-lg border border-outline-variant shadow-sm mb-6">
            <span
              className="material-symbols-outlined text-primary text-[28px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              hexagon
            </span>
          </div>
          <h1 className="font-h1 text-h1 text-on-surface mb-2">Welcome back</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Enter your credentials to access your workspace.
          </p>
        </div>

        <div className="bg-surface-container rounded-xl border border-outline-variant shadow-sm p-6">
          {error && (
            <div className="mb-4 flex items-center gap-2 bg-error/10 border border-error/30 text-error rounded-lg px-4 py-3 text-sm">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-5">
            <div className="space-y-1.5">
              <label
                className="font-label-caps text-label-caps text-on-surface-variant block uppercase"
                htmlFor="email"
              >
                Email Address
              </label>
              <input
                className="w-full bg-surface border border-outline-variant text-on-surface text-body-sm font-body-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary transition-colors placeholder:text-outline outline-none"
                id="email"
                placeholder="name@company.com"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  className="font-label-caps text-label-caps text-on-surface-variant block uppercase"
                  htmlFor="password"
                >
                  Password
                </label>
                <a
                  className="font-body-sm text-body-sm text-primary hover:text-primary-fixed transition-colors"
                  href="#"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input
                  className="w-full bg-surface border border-outline-variant text-on-surface text-body-sm font-body-sm rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-primary focus:border-primary transition-colors placeholder:text-outline outline-none"
                  id="password"
                  placeholder="••••••••"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  aria-label="Toggle password visibility"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors flex items-center justify-center"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <button
              disabled={loading}
              className="w-full bg-primary-container text-on-primary-container font-body-sm text-body-sm font-semibold rounded-lg px-4 py-2.5 shadow-sm hover:bg-primary-fixed transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              type="submit"
            >
              <span>{loading ? 'Signing in…' : 'Sign in'}</span>
              {loading && (
                <span className="material-symbols-outlined animate-spin text-[18px]">
                  progress_activity
                </span>
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center text-outline-variant">
            <div className="flex-grow border-t border-outline-variant"></div>
            <span className="px-3 font-body-sm text-body-sm text-on-surface-variant">
              or continue with
            </span>
            <div className="flex-grow border-t border-outline-variant"></div>
          </div>

          <div className="mt-6 space-y-3">
            <button
              onClick={handleGoogleSignIn}
              className="w-full bg-surface border border-outline-variant text-on-surface font-body-sm text-body-sm rounded-lg px-4 py-2.5 hover:bg-surface-bright transition-colors flex items-center justify-center gap-3"
              type="button"
            >
              <img
                alt="Google"
                className="w-5 h-5"
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              />
              Google
            </button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Don't have an account?{' '}
            <a
              className="text-primary hover:text-primary-fixed font-medium transition-colors"
              href="#"
            >
              Sign up
            </a>
          </p>
        </div>
      </div>
    </main>
  )
}
