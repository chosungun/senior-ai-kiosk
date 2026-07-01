import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'

const W = 1080
const H = 1920

// Dev-only: wraps kiosk routes in a scaled portrait frame so you can
// preview the 1080×1920 kiosk on a regular laptop screen.
// In production (VITE_KIOSK_FRAME=off or !DEV) renders Outlet directly.
export default function KioskFrame() {
  const showFrame =
    import.meta.env.DEV && import.meta.env.VITE_KIOSK_FRAME !== 'off'

  const [scale, setScale] = useState(1)

  useEffect(() => {
    if (!showFrame) return
    const calc = () => {
      const sx = (window.innerWidth  * 0.88) / W
      const sy = (window.innerHeight * 0.92) / H
      setScale(Math.min(sx, sy))
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [showFrame])

  if (!showFrame) return <Outlet />

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: '#111827',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
      gap: 12,
    }}>
      {/* label */}
      <div style={{
        color: '#6b7280', fontSize: 11, letterSpacing: '0.1em', fontFamily: 'monospace',
        opacity: 0.7,
        transform: `scale(${Math.min(scale * 1.5, 1)})`,
        transformOrigin: 'center bottom',
      }}>
        KIOSK PREVIEW — {W} × {H} @ {Math.round(scale * 100)}%
      </div>

      {/* device shell */}
      <div style={{
        width: W + 32,
        height: H + 64,
        background: 'linear-gradient(145deg, #374151, #1f2937)',
        borderRadius: 36,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 0,
        boxShadow: '0 32px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.08)',
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        flexShrink: 0,
      }}>
        {/* top chin */}
        <div style={{
          width: W, height: 32,
          background: '#111827',
          borderRadius: '20px 20px 0 0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ width: 48, height: 5, background: '#374151', borderRadius: 3 }} />
        </div>

        {/* screen */}
        <div style={{
          width: W, height: H,
          overflowX: 'hidden', overflowY: 'hidden',
          position: 'relative',
          background: '#f8fafc',
        }}>
          <Outlet />
        </div>

        {/* bottom chin */}
        <div style={{
          width: W, height: 32,
          background: '#111827',
          borderRadius: '0 0 20px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ width: 32, height: 4, background: '#374151', borderRadius: 2 }} />
        </div>
      </div>
    </div>
  )
}
