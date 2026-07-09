"use client"

import { useCallback, useEffect, useState, use } from "react"
import { useSession } from "@/lib/auth-client"
import { api } from "@/lib/api"
import { Spinner } from "@/components/spinner"
import { ChatPanel } from "@/components/chat-panel"
import { getSocket } from "@/lib/socket"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Member {
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

interface Task {
  id: string
  title: string
  completed: boolean
  assigneeId: string | null
  workspaceId: string
  createdById: string
  parentId?: string | null
  createdAt: string
  assignee: {
    id: string
    user: {
      id: string
      name: string
      firstName: string | null
      lastName: string | null
      email: string
      image: string | null
    }
  } | null
  createdBy: {
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
  members: Member[]
}

export default function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data: session } = useSession()
  const router = useRouter()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [taskError, setTaskError] = useState("")
  const [showAddMember, setShowAddMember] = useState(false)
  const [addEmail, setAddEmail] = useState("")
  const [addError, setAddError] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [addingMember, setAddingMember] = useState(false)
  const [removingUserId, setRemovingUserId] = useState<string | null>(null)

  const [tasks, setTasks] = useState<Task[]>([])
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState("")
  const [creatingTask, setCreatingTask] = useState(false)
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null)
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null)

  const [workspaceChatId, setWorkspaceChatId] = useState<string | null>(null)

  const loadWorkspace = useCallback(async () => {
    try {
      const data = await api(`/workspaces/${id}`)
      setWorkspace(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load workspace")
    }
  }, [id])

  const loadTasks = useCallback(async () => {
    try {
      const data = await api(`/workspaces/${id}/tasks`)
      setTasks(data)
    } catch {
      // silently fail, tasks are not critical
    }
  }, [id])

  const loadChat = useCallback(async () => {
    try {
      const data = await api(`/workspaces/${id}/chat`)
      setWorkspaceChatId(data.chat.id)
    } catch {
      // silently fail, chat is not critical
    }
  }, [id])

  useEffect(() => {
    async function init() {
      setLoading(true)
      await Promise.all([loadWorkspace(), loadTasks(), loadChat()])
      setLoading(false)
    }
    init()
  }, [loadWorkspace, loadTasks, loadChat])

  useEffect(() => {
    const socket = getSocket()
    socket.emit("workspace:join", { workspaceId: id })

    const handleTaskCreated = (task: Task) => {
      if (task.workspaceId === id && !task.parentId) {
        setTasks((prev) => {
          if (prev.some((t) => t.id === task.id)) return prev
          return [...prev, task]
        })
      }
    }
    const handleTaskUpdated = (task: Task) => {
      if (task.workspaceId === id) {
        setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)))
      }
    }
    const handleTaskDeleted = (data: { taskId: string; workspaceId: string }) => {
      if (data.workspaceId === id) {
        setTasks((prev) => prev.filter((t) => t.id !== data.taskId))
      }
    }

    socket.on("task:created", handleTaskCreated)
    socket.on("task:updated", handleTaskUpdated)
    socket.on("task:deleted", handleTaskDeleted)

    return () => {
      socket.emit("workspace:leave", { workspaceId: id })
      socket.off("task:created", handleTaskCreated)
      socket.off("task:updated", handleTaskUpdated)
      socket.off("task:deleted", handleTaskDeleted)
    }
  }, [id])

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault()
    setAddError("")
    setAddingMember(true)

    try {
      const users = await api(`/users/search?email=${encodeURIComponent(addEmail)}`)
      const user = users[0]
      if (!user) {
        setAddError("User not found")
        return
      }

      await api(`/workspaces/${id}/members`, {
        method: "POST",
        body: JSON.stringify({ userId: user.id }),
      })
      setAddEmail("")
      setShowAddMember(false)
      await loadWorkspace()
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : "Failed to add member")
    } finally {
      setAddingMember(false)
    }
  }

  async function handleRemoveMember(userId: string) {
    setRemovingUserId(userId)
    try {
      await api(`/workspaces/${id}/members/${userId}`, { method: "DELETE" })
      await loadWorkspace()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to remove member")
    } finally {
      setRemovingUserId(null)
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this workspace? This action cannot be undone.")) return

    setDeleting(true)
    try {
      await api(`/workspaces/${id}`, { method: "DELETE" })
      router.push("/workspaces")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete workspace")
      setDeleting(false)
    }
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTaskTitle.trim()) return
    setCreatingTask(true)

    try {
      const created = await api(`/workspaces/${id}/tasks`, {
        method: "POST",
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          assigneeId: newTaskAssigneeId || undefined,
        }),
      })
      setTasks((prev) => {
        if (prev.some((t) => t.id === created.id)) return prev
        return [...prev, created]
      })
      setNewTaskTitle("")
      setNewTaskAssigneeId("")
    } catch (err: unknown) {
      setTaskError(err instanceof Error ? err.message : "Failed to create task")
    } finally {
      setCreatingTask(false)
    }
  }

  async function handleToggleTask(taskId: string, currentCompleted: boolean) {
    setTogglingTaskId(taskId)
    try {
      const updated = await api(`/workspaces/${id}/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ completed: !currentCompleted }),
      })
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)))
    } catch (err: unknown) {
      setTaskError(err instanceof Error ? err.message : "Failed to update task")
    } finally {
      setTogglingTaskId(null)
    }
  }

  async function handleDeleteTask(taskId: string) {
    setDeletingTaskId(taskId)
    try {
      await api(`/workspaces/${id}/tasks/${taskId}`, { method: "DELETE" })
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
    } catch (err: unknown) {
      setTaskError(err instanceof Error ? err.message : "Failed to delete task")
    } finally {
      setDeletingTaskId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner className="h-5 w-5 text-zinc-400" />
      </div>
    )
  }

  if (error || !workspace) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-sm text-red-600">{error || "Workspace not found"}</p>
        <Link href="/workspaces" className="text-sm text-zinc-500 underline">
          Back to workspaces
        </Link>
      </div>
    )
  }

  const currentUser = session?.user
  const currentMembership = workspace.members.find((m) => m.userId === currentUser?.id)
  const isOwner = currentMembership?.role === "owner"
  const completedCount = tasks.filter((t) => t.completed).length
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0

  return (
    <div className="flex flex-col flex-1 max-w-3xl mx-auto w-full px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/workspaces" className="text-sm text-zinc-400 hover:text-zinc-600 mb-1 inline-block">
            &larr; Workspaces
          </Link>
          <h1 className="text-2xl font-bold text-black">{workspace.name}</h1>
        </div>
        {isOwner && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 px-3 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed gap-2"
          >
            {deleting && <Spinner />}
            {deleting ? "Deleting..." : "Delete"}
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2 mb-4">{error}</p>
      )}

      {/* Tasks Section */}
      <div className="mb-10">
        {taskError && (
          <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2 mb-4">{taskError}</p>
        )}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-black">Tasks</h2>
          <span className="text-sm text-zinc-500">
            {completedCount} of {tasks.length} completed
          </span>
        </div>

        {tasks.length > 0 && (
          <div className="mb-4 bg-zinc-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-black rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        <form onSubmit={handleCreateTask} className="flex items-end gap-2 mb-4">
          <div className="flex-1">
            <input
              type="text"
              required
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="New task..."
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-black bg-white"
            />
          </div>
          <div>
            <select
              value={newTaskAssigneeId}
              onChange={(e) => setNewTaskAssigneeId(e.target.value)}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-black bg-white"
            >
              <option value="">Unassigned</option>
              {workspace.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {[m.user.firstName, m.user.lastName].filter(Boolean).join(" ") || m.user.name} ({m.user.email})
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={creatingTask || !newTaskTitle.trim()}
            className="inline-flex h-[38px] items-center justify-center rounded-lg bg-black px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed gap-2 shrink-0"
          >
            {creatingTask && <Spinner />}
            {creatingTask ? "Adding..." : "Add"}
          </button>
        </form>

        <div className="rounded-xl border border-zinc-200 divide-y divide-zinc-100">
          {tasks.length === 0 && (
            <div className="p-6 text-center text-sm text-zinc-400">
              No tasks yet. Create one above.
            </div>
          )}
          {tasks.map((task) => {
            const isAssignee = currentMembership && task.assigneeId === currentMembership.id
            const canToggle = !task.assigneeId || isAssignee
            return (
            <div key={task.id} className="flex items-center gap-3 p-4">
              <button
                onClick={() => handleToggleTask(task.id, task.completed)}
                disabled={togglingTaskId === task.id || !canToggle}
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  task.completed
                    ? "bg-black border-black text-white"
                    : canToggle
                      ? "border-zinc-300 hover:border-zinc-400"
                      : "border-zinc-200 cursor-not-allowed opacity-50"
                }`}
                title={!canToggle ? "Only the assignee can mark this task as completed" : undefined}
              >
                {togglingTaskId === task.id ? (
                  <Spinner className="h-3 w-3" />
                ) : task.completed ? (
                  <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : null}
              </button>

              <div className="flex-1 min-w-0">
                <Link
                  href={`/workspaces/${id}/tasks/${task.id}`}
                  className={`text-sm truncate hover:underline block ${task.completed ? "line-through text-zinc-400" : "text-black"}`}
                >
                  {task.title}
                </Link>
              </div>

              <span className="text-xs text-zinc-400">
                {task.assignee
                  ? [task.assignee.user.firstName, task.assignee.user.lastName].filter(Boolean).join(" ") || task.assignee.user.email
                  : "—"}
              </span>

              <button
                onClick={() => handleDeleteTask(task.id)}
                disabled={deletingTaskId === task.id}
                className="inline-flex h-6 items-center justify-center rounded border border-zinc-200 px-2 text-[10px] font-medium text-zinc-500 hover:border-red-300 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed gap-1 shrink-0"
              >
                {deletingTaskId === task.id && <Spinner className="h-2.5 w-2.5" />}
                {deletingTaskId === task.id ? "" : "Del"}
              </button>
            </div>
            )
          })}
        </div>
      </div>

      {/* Members Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-black">
            Members ({workspace.members.length})
          </h2>
          {isOwner && (
            <button
              onClick={() => setShowAddMember(!showAddMember)}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-black px-3 text-sm font-medium text-white hover:opacity-90"
            >
              {showAddMember ? "Cancel" : "Add Member"}
            </button>
          )}
        </div>

        {showAddMember && (
          <form onSubmit={handleAddMember} className="rounded-xl border border-zinc-200 p-4 space-y-3">
            {addError && (
              <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{addError}</p>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1 text-black">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-black bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={addingMember}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-black px-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed gap-2"
            >
              {addingMember && <Spinner />}
              {addingMember ? "Adding..." : "Add"}
            </button>
          </form>
        )}

        <div className="rounded-xl border border-zinc-200 divide-y divide-zinc-100">
          {workspace.members.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-medium">
                  {m.user.firstName?.charAt(0)}
                  {m.user.lastName?.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-black">
                    {[m.user.firstName, m.user.lastName].filter(Boolean).join(" ") || m.user.name}
                  </p>
                  <p className="text-xs text-zinc-400">{m.user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  m.role === "owner"
                    ? "bg-black text-white"
                    : "bg-zinc-100 text-zinc-600"
                }`}>
                  {m.role}
                </span>
                {isOwner && m.userId !== currentUser?.id && (
                  <button
                    onClick={() => handleRemoveMember(m.userId)}
                    disabled={removingUserId === m.userId}
                    className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
                  >
                    {removingUserId === m.userId && <Spinner className="h-3 w-3" />}
                    {removingUserId === m.userId ? "Removing..." : "Remove"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {workspaceChatId && (
        <div className="mt-8 rounded-xl border border-zinc-200 overflow-hidden" style={{ minHeight: "400px" }}>
          <ChatPanel
            chatId={workspaceChatId}
            entityType="workspace"
            entityId={id}
          />
        </div>
      )}
    </div>
  )
}
