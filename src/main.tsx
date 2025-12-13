import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Playground from './pages/Playground'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Playground />
  </StrictMode>,
)
