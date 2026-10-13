import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { rememberLaunchQuery } from './services/api'

// Keep the signed query Shopify opens the app with (needed if we must start OAuth later).
rememberLaunchQuery()

createRoot(document.getElementById('root')).render(<App />)
