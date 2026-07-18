'use client'

import { createContext, useContext } from 'react'

/**
 * Whether editing is available, computed server-side from the active provider
 * (`getProvider(session).canWrite()`) and pushed to the client. True when:
 *   - local mode (`--dir`), or
 *   - GitHub mode with a token (production logged-in owner, or `--repo --token`).
 * The render layer uses this instead of inspecting the session or the backend
 * kind directly.
 */
const EditContext = createContext(false)

export function EditProvider({
  canEdit,
  children,
}: {
  canEdit: boolean
  children: React.ReactNode
}) {
  return <EditContext.Provider value={canEdit}>{children}</EditContext.Provider>
}

export function useCanEdit(): boolean {
  return useContext(EditContext)
}
