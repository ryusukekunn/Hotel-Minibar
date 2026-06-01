export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center z-50">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full border-2 border-hotel-600/20" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-hotel-500 animate-spin" />
          <div className="absolute inset-2 rounded-full bg-hotel-600/10 flex items-center justify-center">
            <span className="text-xl">🍾</span>
          </div>
        </div>
        <p className="text-slate-400 text-sm font-medium tracking-wide">Učitavanje...</p>
      </div>
    </div>
  )
}
