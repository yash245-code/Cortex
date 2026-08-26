import { CortexAPI } from '../shared/types'

declare global {
  interface Window {
    cortexAPI: CortexAPI
  }
}

export {}
