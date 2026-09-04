import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AppBootstrap from './AppBootstrap'
import './styles.css'
import './app-like.css'
import './mobile-polish.css'
import './nocturne-redesign.css'
import './uiHotfix'

createRoot(document.getElementById('root')!).render(<StrictMode><AppBootstrap /></StrictMode>)
