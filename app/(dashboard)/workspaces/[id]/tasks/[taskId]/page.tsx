"use client"

import { useCallback, useEffect, useState, use } from "react"
import { useSession } from "@/lib/auth-client"
import { api } from "@/lib/api"
import { Spinner } from "@/components/spinner"
import { ChatPanel } from "@/components/chat-panel"
import { getSocket } from "@/lib/socket"
import Link from "next/link"

interface Task {
  id: string
  title: string
  completed: boolean
  assigneeId: string | null
  workspaceId: string
  createdById: string
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
  children?: Task[]
  chat: { id: string } | null
}

export default function TaskPage({
  params,
}: {
  params: Promise<{ id: string; taskId: string }>
}) {
  const { id: workspaceId, taskId } = use(params)
  const { data: session } = useSession()
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [toggling, setToggling] = useState(false)
  const [newSubTitle, setNewSubTitle] = useState("")
  const [creatingSub, setCreatingSub] = useState(false)
  const [togglingSubId, setTogglingSubId] = useState<string | null>(null)
  const [deletingSubId, setDeletingSubId] = useState<string | null>(null)

  const loadTask = useCallback(async () => {
    try {
      const data = await api(`/workspaces/${workspaceId}/tasks/${taskId}`)
      setTask(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load task")
    } finally {
      setLoading(false)
    }
  }, [workspaceId, taskId])

  useEffect(() => {
    loadTask()
  }, [loadTask])

  useEffect(() => {
    const socket = getSocket()

    const handleTaskUpdated = (updated: Task) => {
      if (updated.id === taskId) {
        setTask((prev) => prev ? { ...prev, ...updated } : prev)
      }
    }

    const handleTaskDeleted = (data: { taskId: string }) => {
      if (data.taskId === taskId) {
        setError("This task has been deleted")
      }
    }

    socket.on("task:updated", handleTaskUpdated)
    socket.on("task:deleted", handleTaskDeleted)

    return () => {
      socket.off("task:updated", handleTaskUpdated)
      socket.off("task:deleted", handleTaskDeleted)
    }
  }, [taskId])

  async function handleToggle() {
    if (!task) return
    setToggling(true)
    try {
      const updated = await api(`/workspaces/${workspaceId}/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ completed: !task.completed }),
      })
      setTask(updated)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update task")
    } finally {
      setToggling(false)
    }
  }

  async function handleCreateSubTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newSubTitle.trim()) return
    setCreatingSub(true)
    try {
      const created = await api(`/workspaces/${workspaceId}/tasks`, {
        method: "POST",
        body: JSON.stringify({
          title: newSubTitle.trim(),
          parentId: taskId,
        }),
      })
      setTask((prev) => prev ? {
        ...prev,
        children: [...(prev.children || []), created],
      } : prev)
      setNewSubTitle("")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create sub-task")
    } finally {
      setCreatingSub(false)
    }
  }

  async function handleToggleSub(subId: string, completed: boolean) {
    setTogglingSubId(subId)
    try {
      const updated = await api(`/workspaces/${workspaceId}/tasks/${subId}`, {
        method: "PATCH",
        body: JSON.stringify({ completed: !completed }),
      })
      setTask((prev) => prev ? {
        ...prev,
        children: prev.children?.map((c) => c.id === subId ? updated : c) || [],
      } : prev)
    } catch {
      // silently fail
    } finally {
      setTogglingSubId(null)
    }
  }

  async function handleDeleteSub(subId: string) {
    setDeletingSubId(subId)
    try {
      await api(`/workspaces/${workspaceId}/tasks/${subId}`, { method: "DELETE" })
      setTask((prev) => prev ? {
        ...prev,
        children: prev.children?.filter((c) => c.id !== subId) || [],
      } : prev)
    } catch {
      // silently fail
    } finally {
      setDeletingSubId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner className="h-5 w-5 text-zinc-400" />
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-sm text-red-600">{error || "Task not found"}</p>
        <Link href={`/workspaces/${workspaceId}`} className="text-sm text-zinc-500 underline">
          Back to workspace
        </Link>
      </div>
    )
  }

  const assigneeName = task.assignee
    ? [task.assignee.user.firstName, task.assignee.user.lastName].filter(Boolean).join(" ") || task.assignee.user.name
    : null

  const subs = task.children || []
  const completedSubs = subs.filter((c) => c.completed).length

  return (
    <div className="flex flex-col flex-1 max-w-3xl mx-auto w-full px-6 py-12">
      <div className="mb-8">
        <Link href={`/workspaces/${workspaceId}`} className="text-sm text-zinc-400 hover:text-zinc-600 mb-1 inline-block">
          &larr; Back to workspace
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <div
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
              task.completed ? "bg-black border-black text-white" : "border-zinc-300"
            }`}
          >
            {task.completed && (
              <svg className="h-3.5 w-3.5" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <h1 className={`text-2xl font-bold ${task.completed ? "line-through text-zinc-400" : "text-black"}`}>
            {task.title}
          </h1>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 p-5 mb-8 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-500">Status</span>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${task.completed ? "text-green-600" : "text-zinc-600"}`}>
              {task.completed ? "Completed" : "Open"}
            </span>
            <button
              onClick={handleToggle}
              disabled={toggling}
              className="text-xs text-black underline hover:opacity-70 disabled:opacity-50"
            >
              {toggling ? "..." : task.completed ? "Reopen" : "Complete"}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-500">Assignee</span>
          <span className="text-sm font-medium text-black">
            {assigneeName || "Unassigned"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-500">Created by</span>
          <span className="text-sm font-medium text-black">
            {[task.createdBy.firstName, task.createdBy.lastName].filter(Boolean).join(" ") || task.createdBy.name}
          </span>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-black">
            Sub-tasks {subs.length > 0 && `(${completedSubs}/${subs.length})`}
          </h2>
        </div>

        <form onSubmit={handleCreateSubTask} className="flex items-center gap-2 mb-3">
          <input
            type="text"
            required
            value={newSubTitle}
            onChange={(e) => setNewSubTitle(e.target.value)}
            placeholder="Add a sub-task..."
            className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-black bg-white"
          />
          <button
            type="submit"
            disabled={creatingSub || !newSubTitle.trim()}
            className="inline-flex h-[38px] items-center justify-center rounded-lg bg-black px-3 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {creatingSub ? "..." : "Add"}
          </button>
        </form>

        {subs.length > 0 && (
          <div className="rounded-xl border border-zinc-200 divide-y divide-zinc-100">
            {subs.map((sub) => (
              <div key={sub.id} className="flex items-center gap-3 p-3 pl-4">
                <button
                  onClick={() => handleToggleSub(sub.id, sub.completed)}
                  disabled={togglingSubId === sub.id}
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    sub.completed
                      ? "bg-black border-black text-white"
                      : "border-zinc-300 hover:border-zinc-400"
                  }`}
                >
                  {togglingSubId === sub.id ? (
                    <Spinner className="h-2.5 w-2.5" />
                  ) : sub.completed ? (
                    <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : null}
                </button>

                <Link
                  href={`/workspaces/${workspaceId}/tasks/${sub.id}`}
                  className={`flex-1 text-sm truncate hover:underline ${sub.completed ? "line-through text-zinc-400" : "text-black"}`}
                >
                  {sub.title}
                </Link>

                <span className="text-xs text-zinc-400 min-w-0 truncate">
                  {sub.assignee
                    ? [sub.assignee.user.firstName, sub.assignee.user.lastName].filter(Boolean).join(" ") || sub.assignee.user.email
                    : "—"}
                </span>

                <button
                  onClick={() => handleDeleteSub(sub.id)}
                  disabled={deletingSubId === sub.id}
                  className="inline-flex h-6 items-center justify-center rounded border border-zinc-200 px-2 text-[10px] font-medium text-zinc-500 hover:border-red-300 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed gap-1 shrink-0"
                >
                  {deletingSubId === sub.id && <Spinner className="h-2.5 w-2.5" />}
                  {deletingSubId === sub.id ? "" : "Del"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {task.chat && (
        <div className="rounded-xl border border-zinc-200 overflow-hidden" style={{ minHeight: "400px" }}>
          <ChatPanel
            chatId={task.chat.id}
            entityType="task"
            entityId={taskId}
          />
        </div>
      )}
    </div>
  )
}
