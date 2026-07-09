"use client"

import { useState } from "react"
import { useSession, authClient } from "@/lib/auth-client"
import { Spinner } from "@/components/spinner"
import { Notifications } from "@/components/notifications"
import Link from "next/link"

export function Header() {
  const { data: session } = useSession()
  const [signingOut, setSigningOut] = useState(false)
  const user = session?.user

  const initials = user
    ? `${user.firstName?.charAt(0).toUpperCase() ?? ""}${user.lastName?.charAt(0).toUpperCase() ?? ""}`
    : ""

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.name || "User"
    : ""

  async function handleSignOut() {
    setSigningOut(true)
    await authClient.signOut()
  }

  return (
    <header className="flex h-14 items-center justify-between px-6 border-b border-zinc-200 bg-white">
      <div className="flex items-center gap-4">
        {user && (
          <Link
            href="/workspaces"
            className="text-sm font-medium text-black hover:opacity-70"
          >
            Workspaces
          </Link>
        )}
      </div>
      {user ? (
        <div className="flex items-center gap-2">
          <Notifications />
          <div className="relative group">
          <div className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center text-sm font-medium cursor-pointer">
            {initials || user.name?.charAt(0).toUpperCase() || "?"}
          </div>
          <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-zinc-200 bg-white shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all py-1 z-50">
            <div className="px-3 py-2 text-sm text-black border-b border-zinc-100">
              {displayName}
              <div className="text-xs text-zinc-400">{user.email}</div>
            </div>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full text-left px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {signingOut && <Spinner />}
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
          </div>
        </div>
      ) : (
        <a
          href="/auth/sign-in"
          className="text-sm text-zinc-500 hover:text-black"
        >
          Sign in
        </a>
      )}
    </header>
  )
}
