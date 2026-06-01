import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Registracija Service Worker-a za PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // vite-plugin-pwa automatski registruje SW u produkciji
    console.log('Hotel Minibar PWA spreman')
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
