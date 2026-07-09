"use client"

import { useSession } from "@/lib/auth-client"
import { Spinner } from "@/components/spinner"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, isPending } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/auth/sign-in")
    }
  }, [isPending, session, router])

  if (isPending || !session) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner className="h-5 w-5 text-zinc-400" />
      </div>
    )
  }

  return <>{children}</>
}
