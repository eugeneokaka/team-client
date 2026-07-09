"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { api } from "@/lib/api"
import { getSocket } from "@/lib/socket"
import { useSession } from "@/lib/auth-client"

interface Author {
  id: string
  name: string
  firstName: string | null
  lastName: string | null
  email: string
  image: string | null
}

interface Message {
  id: string
  content: string
  chatId: string
  authorId: string
  author: Author
  parentId: string | null
  replies?: Message[]
  createdAt: string
}

interface ChatPanelProps {
  chatId: string
  entityType: "workspace" | "task"
  entityId: string
  onClose?: () => void
}

function authorLabel(a: Author) {
  return [a.firstName, a.lastName].filter(Boolean).join(" ") || a.name || a.email
}

function timeLabel(ts: string) {
  const d = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return "just now"
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  return d.toLocaleDateString([], { month: "short", day: "numeric" })
}

export function ChatPanel({ chatId, entityType, entityId, onClose }: ChatPanelProps) {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState("")
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [sending, setSending] = useState(false)
  const [notifyEnabled, setNotifyEnabled] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((p) => {
        if (p === "granted") setNotifyEnabled(true)
      })
    } else if ("Notification" in window && Notification.permission === "granted") {
      setNotifyEnabled(true)
    }
  }, [])

  useEffect(() => {
    setMessages([])
    setLoading(true)
    setReplyTo(null)

    const url = entityType === "workspace"
      ? `/workspaces/${entityId}/chat`
      : `/tasks/${entityId}/chat`

    api(url)
      .then((data) => {
        if (data.messages) setMessages(data.messages)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [entityType, entityId])

  const handleNewMessage = useCallback(
    (message: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev
        if (message.parentId) {
          return prev.map((m) => {
            if (m.id === message.parentId) {
              return {
                ...m,
                replies: [...(m.replies || []), message],
              }
            }
            return m
          })
        }
        return [...prev, message]
      })

      if (
        notifyEnabled &&
        document.hidden &&
        message.authorId !== session?.user?.id
      ) {
        new Notification(
          entityType === "task" ? "New reply on task" : "New message",
          {
            body: `${authorLabel(message.author)} (${message.author.email}): ${message.content.slice(0, 100)}`,
            icon: "/favicon.ico",
          }
        )
      }
    },
    [notifyEnabled, session?.user?.id, entityType]
  )

  const handleUpdatedMessage = useCallback((updated: Message) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === updated.id) return { ...m, content: updated.content }
        if (m.replies) {
          return {
            ...m,
            replies: m.replies.map((r) =>
              r.id === updated.id ? { ...r, content: updated.content } : r
            ),
          }
        }
        return m
      })
    )
  }, [])

  const handleDeletedMessage = useCallback(
    (data: { messageId: string; chatId: string }) => {
      if (data.chatId !== chatId) return
      setMessages((prev) =>
        prev
          .map((m) => ({
            ...m,
            replies: m.replies?.filter((r) => r.id !== data.messageId),
          }))
          .filter((m) => m.id !== data.messageId)
      )
    },
    [chatId]
  )

  useEffect(() => {
    const socket = getSocket()

    socket.emit("chat:join", { chatId })

    socket.on("chat:message", handleNewMessage)
    socket.on("chat:updated", handleUpdatedMessage)
    socket.on("chat:deleted", handleDeletedMessage)

    return () => {
      socket.emit("chat:leave", { chatId })
      socket.off("chat:message", handleNewMessage)
      socket.off("chat:updated", handleUpdatedMessage)
      socket.off("chat:deleted", handleDeletedMessage)
    }
  }, [chatId, handleNewMessage, handleUpdatedMessage, handleDeletedMessage])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault()
    const content = input.trim()
    if (!content) return

    setSending(true)
    const socket = getSocket()

    setInput("")
    setReplyTo(null)

    socket.emit(
      "chat:send",
      {
        chatId,
        content,
        parentId: replyTo?.id ?? undefined,
      },
      () => {
        setSending(false)
        inputRef.current?.focus()
      }
    )
  }

  const currentUserId = session?.user?.id

  function renderMessage(msg: Message, isReply = false) {
    const isMe = msg.authorId === currentUserId

    return (
      <div key={msg.id}>
        <div className={`flex ${isMe ? "justify-end" : "justify-start"} ${isReply ? "ml-8" : ""}`}>
          <div className={`flex items-end gap-2 max-w-[75%] ${isMe ? "flex-row-reverse" : "flex-row"}`}>
            {!isMe && (
              <div className="w-6 h-6 rounded-full bg-zinc-200 text-zinc-600 flex items-center justify-center text-[10px] font-medium shrink-0">
                {msg.author.firstName?.charAt(0)}
                {msg.author.lastName?.charAt(0)}
              </div>
            )}
            <div className="flex flex-col">
              {!isMe && (
                <div className={`flex items-baseline gap-2 ${isMe ? "justify-end" : "justify-start"} mb-1`}>
                  <span className="text-xs font-medium text-zinc-500">
                    {authorLabel(msg.author)}
                  </span>
                  <span className="text-[10px] text-zinc-400">{msg.author.email}</span>
                </div>
              )}
              <div
                className={`rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                  isMe
                    ? "bg-black text-white rounded-br-md"
                    : "bg-zinc-100 text-black rounded-bl-md"
                }`}
              >
                {msg.content}
              </div>
              <div className={`flex items-center gap-2 mt-0.5 ${isMe ? "justify-end" : "justify-start"}`}>
                <span className="text-[10px] text-zinc-400">{timeLabel(msg.createdAt)}</span>
                {!isReply && (
                  <button
                    onClick={() => {
                      setReplyTo(msg)
                      inputRef.current?.focus()
                    }}
                    className="text-[10px] text-zinc-400 hover:text-black"
                  >
                    Reply
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        {msg.replies?.map((r) => renderMessage(r, true))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 shrink-0">
        <h3 className="text-sm font-semibold text-black">Chat</h3>
        <div className="flex items-center gap-2">
          {notifyEnabled && (
            <span className="text-[10px] text-zinc-400" title="Notifications enabled">
              Notifications on
            </span>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-black text-sm"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-black" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-zinc-400">No messages yet. Start the conversation.</p>
          </div>
        ) : (
          messages.map((msg) => renderMessage(msg))
        )}
        <div ref={messagesEndRef} />
      </div>

      {replyTo && (
        <div className="px-4 py-1.5 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between">
          <span className="text-xs text-zinc-500 truncate">
            Replying to {authorLabel(replyTo.author)} ({replyTo.author.email})
          </span>
          <button
            onClick={() => setReplyTo(null)}
            className="text-xs text-zinc-400 hover:text-black"
          >
            Cancel
          </button>
        </div>
      )}

      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 px-4 py-3 border-t border-zinc-200 shrink-0"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder={replyTo ? "Write a reply..." : "Type a message..."}
          className="flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-black bg-white focus:outline-none focus:border-zinc-400"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="inline-flex h-8 items-center justify-center rounded-lg bg-black px-3 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {sending ? "..." : "Send"}
        </button>
      </form>
    </div>
  )
}
