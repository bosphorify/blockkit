import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// No StrictMode: it double-mounts, which the BlockNote editor dislikes in a demo.
createRoot(document.getElementById('root')!).render(<App />)
