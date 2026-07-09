"use client"

import { useState } from "react"
import { useSession, updateUser } from "@/lib/auth-client"
import { Spinner } from "@/components/spinner"
import { useRouter } from "next/navigation"

export default function OnboardingPage() {
  const router = useRouter()
  const { data: session, isPending } = useSession()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  if (isPending) return null

  if (!session) {
    router.push("/auth/sign-in")
    return null
  }

  if (session.user.firstName && session.user.lastName) {
    router.push("/workspaces")
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const { error: err } = await updateUser({
      firstName,
      lastName,
    })

    if (err) {
      setLoading(false)
      setError(err.message ?? err.statusText)
      return
    }

    router.push("/workspaces")
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-zinc-200 bg-white p-8 shadow-sm"
      >
        <h1 className="text-2xl font-semibold text-center text-black">Complete your profile</h1>
        <p className="text-sm text-center text-zinc-500">
          Tell us your name to get started.
        </p>

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

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-black text-white py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading && <Spinner />}
          {loading ? "Saving..." : "Continue"}
        </button>
      </form>
    </div>
  )
}
