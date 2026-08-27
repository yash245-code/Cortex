import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { SettingsWindow } from './components/SettingsWindow/SettingsWindow'
import './index.css'

const Root: React.FC = () => {
  const [route, setRoute] = useState(window.location.hash)

  useEffect(() => {
    const handleHashChange = (): void => {
      setRoute(window.location.hash)
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  if (route.startsWith('#/settings') || route.startsWith('#settings')) {
    return <SettingsWindow />
  }

  return <App />
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
