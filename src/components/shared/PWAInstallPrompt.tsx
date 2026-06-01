import { useState, useEffect } from 'react'
import { Download, X, Smartphone } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Proveri da li je već instaliran
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)

      // Prikaži banner samo ako korisnik nije već odbio
      const dismissed = localStorage.getItem('pwa_install_dismissed')
      if (!dismissed) {
        setTimeout(() => setShowBanner(true), 3000)
      }
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setInstalled(true))

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowBanner(false)
      setInstalled(true)
    }
    setDeferredPrompt(null)
  }

  function handleDismiss() {
    setShowBanner(false)
    localStorage.setItem('pwa_install_dismissed', '1')
  }

  if (!showBanner || installed) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 lg:left-auto lg:right-6 lg:max-w-sm pwa-prompt">
      <div className="bg-slate-800 border border-slate-600 rounded-2xl p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-hotel-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Smartphone size={20} className="text-hotel-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Instalirajte aplikaciju</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Dodajte Hotel Minibar na početni ekran za brži pristup i rad bez interneta.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleInstall}
                className="flex-1 bg-hotel-600 hover:bg-hotel-500 text-white text-xs font-medium py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors touch-manipulation"
              >
                <Download size={13} />
                Instaliraj
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 text-xs transition-colors touch-manipulation"
              >
                Ne sada
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 text-slate-500 hover:text-white touch-manipulation"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
