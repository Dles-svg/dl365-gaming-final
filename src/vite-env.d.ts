/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface ElectronAPI {
  getSources?: () => Promise<Array<{
    id: string
    name: string
    thumbnail: string
    appIcon?: string
  }>>
  onSetMode?: (callback: (mode: string) => void) => void
  removeSetModeListener?: () => void
  launchLocalGame?: (gamePath: string) => Promise<{ success: boolean; error?: string }>
  checkGameInstalled?: (gamePath: string) => Promise<{ installed: boolean; path?: string; error?: string }>
  sendRemoteInput?: (inputData: any) => void
  isElectron?: boolean
  appMode?: 'miner' | 'gamer'
}

interface Window {
  electronAPI?: ElectronAPI
}
