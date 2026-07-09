"use client"

import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Spinner } from "@/components/spinner"
import Link from "next/link"

interface WorkspaceMember {
  id: string
  userId: string
  role: string
  user: {
    id: string
    name: string
    firstName: string | null
    lastName: string | null
    email: string
    image: string | null
  }
}

interface Workspace {
  id: string
  name: string
  createdAt: string
  members: WorkspaceMember[]
}

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [creating, setCreating] = useState(false)

  const loadWorkspaces = useCallback(async () => {
    try {
      const data = await api("/workspaces")
      setWorkspaces(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load workspaces")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadWorkspaces()
  }, [loadWorkspaces])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setCreating(true)

    try {
      const created = await api("/workspaces", {
        method: "POST",
        body: JSON.stringify({ name }),
      })
      setWorkspaces((prev) => [created, ...prev])
      setName("")
      setShowCreate(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create workspace")
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner className="h-5 w-5 text-zinc-400" />
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 max-w-3xl mx-auto w-full px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-black">Workspaces</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-black px-4 text-sm font-medium text-white hover:opacity-90"
        >
          {showCreate ? "Cancel" : "New Workspace"}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-8 rounded-xl border border-zinc-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-black">Create Workspace</h2>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1 text-black">
              Workspace name
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Design Team, Engineering"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-black bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={creating}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-black px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed gap-2"
          >
            {creating && <Spinner />}
            {creating ? "Creating..." : "Create"}
          </button>
        </form>
      )}

      {error && !showCreate && (
        <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2 mb-4">{error}</p>
      )}

      {workspaces.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-zinc-500 text-sm">No workspaces yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {workspaces.map((w) => (
            <Link
              key={w.id}
              href={`/workspaces/${w.id}`}
              className="block rounded-xl border border-zinc-200 p-5 hover:border-zinc-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-black">{w.name}</h3>
                  <p className="text-sm text-zinc-500 mt-0.5">
                    {w.members.length} {w.members.length === 1 ? "member" : "members"}
                  </p>
                </div>
                <div className="flex -space-x-2">
                  {w.members.slice(0, 4).map((m) => (
                    <div
                      key={m.id}
                      className="w-7 h-7 rounded-full bg-zinc-200 text-zinc-600 flex items-center justify-center text-[10px] font-medium border-2 border-white"
                      title={m.user.firstName ? `${m.user.firstName} ${m.user.lastName}` : m.user.email}
                    >
                      {m.user.firstName?.charAt(0)}
                      {m.user.lastName?.charAt(0)}
                    </div>
                  ))}
                  {w.members.length > 4 && (
                    <div className="w-7 h-7 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center text-[10px] font-medium border-2 border-white">
                      +{w.members.length - 4}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
