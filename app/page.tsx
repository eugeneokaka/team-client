"use client"

import { useSession } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function Home() {
  const { data: session, isPending } = useSession()
  const router = useRouter()

  if (isPending) return null

  if (session?.user && (!session.user.firstName || !session.user.lastName)) {
    router.push("/onboarding")
    return null
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center py-32 px-16 text-center">
        <h1 className="text-4xl font-bold mb-4 text-black">
          Welcome to Teams
        </h1>
        <p className="text-lg text-zinc-600 mb-8 max-w-md">
          Collaborate with your team, manage projects, and stay organized.
        </p>
        <div className="flex gap-4">
          {session ? (
            <Link
              href="/workspaces"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-black px-6 text-sm font-medium text-white hover:opacity-90"
            >
              Go to Workspaces
            </Link>
          ) : (
            <>
              <a
                href="/auth/sign-in"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-black px-6 text-sm font-medium text-white hover:opacity-90"
              >
                Sign In
              </a>
              <a
                href="/auth/sign-up"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-300 bg-white px-6 text-sm font-medium text-black hover:bg-zinc-50"
              >
                Sign Up
              </a>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
