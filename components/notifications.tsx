"use client"

import { useEffect, useState, useCallback } from "react"
import { api } from "@/lib/api"
import { getSocket } from "@/lib/socket"
import { useSession } from "@/lib/auth-client"

interface Notification {
  id: string
  type: string
  title: string
  body: string | null
  read: boolean
  createdAt: string
  workspaceId: string
}

export function Notifications() {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const loadNotifications = useCallback(async () => {
    try {
      const data = await api("/notifications")
      setNotifications(data)
      const unread = data.filter((n: Notification) => !n.read).length
      setUnreadCount(unread)
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  useEffect(() => {
    const socket = getSocket()

    const handleNewNotification = (n: Notification) => {
      setNotifications((prev) => [n, ...prev])
      setUnreadCount((c) => c + 1)
    }

    socket.on("notification:new", handleNewNotification)

    return () => {
      socket.off("notification:new", handleNewNotification)
    }
  }, [])

  async function handleMarkRead(id: string) {
    try {
      await api(`/notifications/${id}/read`, { method: "PATCH" })
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      )
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch {
      // silently fail
    }
  }

  async function handleMarkAllRead() {
    try {
      await api("/notifications/read-all", { method: "POST" })
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch {
      // silently fail
    }
  }

  function typeIcon(type: string) {
    switch (type) {
      case "member_added":
        return "+"
      case "task_completed":
        return "\u2713"
      case "message_sent":
        return "\u2197"
      default:
        return "\u2022"
    }
  }

  function timeAgo(ts: string) {
    const diff = Date.now() - new Date(ts).getTime()
    if (diff < 60000) return "just now"
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
    return `${Math.floor(diff / 86400000)}d`
  }

  const user = session?.user

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
      >
        <svg className="h-5 w-5 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-medium flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-80 rounded-xl border border-zinc-200 bg-white shadow-lg z-50 max-h-[480px] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
              <h3 className="text-sm font-semibold text-black">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-zinc-500 hover:text-black"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-zinc-400">
                  No notifications yet
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => !n.read && handleMarkRead(n.id)}
                    className={`w-full text-left px-4 py-3 border-b border-zinc-50 flex items-start gap-3 transition-colors ${
                      n.read ? "bg-white" : "bg-blue-50/50"
                    } hover:bg-zinc-50`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0 mt-0.5 ${
                        n.read
                          ? "bg-zinc-100 text-zinc-500"
                          : "bg-blue-500 text-white"
                      }`}
                    >
                      {typeIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-black font-medium truncate">
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-xs text-zinc-400 truncate mt-0.5">
                          {n.body}
                        </p>
                      )}
                      <p className="text-[10px] text-zinc-400 mt-1">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                    {!n.read && (
                      <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
