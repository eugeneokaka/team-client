"use client"

import { useState } from "react"
import { signUp, authClient } from "@/lib/auth-client"
import { Spinner } from "@/components/spinner"

export default function SignUpPage() {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const name = `${firstName} ${lastName}`.trim()

    const { error: err } = await signUp.email({
      name,
      firstName,
      lastName,
      email,
      password,
      callbackURL: `${window.location.origin}/auth/sign-in?verified=true`,
    })

    if (err) {
      setLoading(false)
      setError(err.message ?? err.statusText)
      return
    }

    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm text-center space-y-4">
          <h1 className="text-2xl font-semibold text-black">Check your email</h1>
          <p className="text-sm text-zinc-500">
            We sent a verification link to <strong>{email}</strong>.
            Click the link to activate your account.
          </p>
          <a
            href="/auth/sign-in"
            className="inline-block text-sm underline text-zinc-500"
          >
            Go to sign in
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-zinc-200 bg-white p-8 shadow-sm"
      >
        <h1 className="text-2xl font-semibold text-center text-black">Sign Up</h1>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">
            {error}
          </p>
        )}

        <div>
          <label htmlFor="firstName" className="block text-sm font-medium mb-1 text-black">
            First name
          </label>
          <input
            id="firstName"
            type="text"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-black bg-white"
          />
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-medium mb-1 text-black">
            Last name
          </label>
          <input
            id="lastName"
            type="text"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-black bg-white"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1 text-black">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-black bg-white"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1 text-black">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-black bg-white"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-black text-white py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading && <Spinner />}
          {loading ? "Signing up..." : "Sign Up"}
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-zinc-400">or</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => authClient.signIn.social({ provider: "google", callbackURL: `${window.location.origin}/` })}
          className="w-full rounded-lg border border-zinc-300 bg-white py-2 text-sm font-medium text-black hover:bg-zinc-50 flex items-center justify-center gap-2"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Sign up with Google
        </button>

        <p className="text-sm text-center text-zinc-500">
          Already have an account?{" "}
          <a href="/auth/sign-in" className="underline text-black">
            Sign in
          </a>
        </p>
      </form>
    </div>
  )
}
