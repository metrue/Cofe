'use client'

import { createContext, useContext } from 'react'

/**
 * Propagates whether the app is running in local mode (`npx cofe --data`) from
 * the server (root layout reads isLocalMode()) to client components. In local
 * mode there is no GitHub session, but the single local user is the trusted
 * owner — so the editor and create button treat local mode as "authenticated".
 */
const LocalModeContext = createContext(false)

export function LocalModeProvider({
  localMode,
  children,
}: {
  localMode: boolean
  children: React.ReactNode
}) {
  return <LocalModeContext.Provider value={localMode}>{children}</LocalModeContext.Provider>
}

export function useLocalMode(): boolean {
  return useContext(LocalModeContext)
}
