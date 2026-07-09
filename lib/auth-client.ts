import { createAuthClient } from "better-auth/react"
import { inferAdditionalFields } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  baseURL: "http://localhost:3000/api/auth",
  plugins: [inferAdditionalFields({
    user: {
      firstName: { type: "string" },
      lastName: { type: "string" },
    }
  })],
})

export const { signIn, signUp, useSession, updateUser } = authClient
