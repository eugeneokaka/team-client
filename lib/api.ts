const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"

export async function api(path: string, options?: RequestInit) {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.message ?? `Request failed: ${res.status}`)
    }

    if (res.status === 204) return null
    return res.json()
  } catch (err: unknown) {
    if (err instanceof TypeError && err.message === "Failed to fetch") {
      throw new Error(
        `Cannot reach server at ${API_URL}. Is the backend running?`
      )
    }
    throw err
  }
}
