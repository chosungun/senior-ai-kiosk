import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Contrast, ArrowDownToLine, ZoomIn, Volume2 } from 'lucide-react'
import { useA11y } from '../context/AccessibilityContext'
import { getC } from '../styles/colors'
import { FF, BM, sc } from '../styles/typography'

const W = 1080
const H = 1920

function A11yBottomBar() {
  const { highContrast, setHighContrast, largeFont, setLargeFont, setSpeechRate } = useA11y()
  const hc = highContrast
  const lf = largeFont ? 1.2 : 1
  const C = getC(hc)
  const [rateStep, setRateStep] = useState(5)

  const changeRate = (delta) => {
    const next = Math.min(10, Math.max(1, rateStep + delta))
    setRateStep(next)
    setSpeechRate(0.5 + next * 0.1)
  }

  const scrollDown = () => {
    document.querySelector('[data-kiosk-scroll]')?.scrollBy({ top: 300, behavior: 'smooth' })
  }

  return (
    <div style={{
      flexShrink: 0,
      display: 'flex', alignItems: 'center',
      padding: '20px 28px 24px', gap: 14,
      background: C.card, borderTop: `1px solid ${C.border}`,
      fontFamily: FF,
    }}>
      <A11yBtn
        icon={<Contrast size={34} color={highContrast ? C.primary : C.textSub} />}
        label="고대비"
        active={highContrast}
        onClick={() => setHighContrast(!highContrast)}
        C={C} lf={lf}
      />
      <A11yBtn
        icon={<ArrowDownToLine size={34} color={C.textSub} />}
        label="화면 내리기"
        onClick={scrollDown}
        C={C} lf={lf}
      />
      <A11yBtn
        icon={<ZoomIn size={34} color={largeFont ? C.primary : C.textSub} />}
        label="화면확대"
        active={largeFont}
        onClick={() => setLargeFont(!largeFont)}
        C={C} lf={lf}
      />

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
        <Volume2 size={38} color={C.textSub} />
        <button onClick={() => changeRate(-1)} style={{
          width: 72, height: 72, borderRadius: 18,
          border: 'none', background: C.bg,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: C.textSub, fontSize: 36, fontWeight: 600,
        }}>−</button>
        <span style={{ color: C.text, minWidth: 44, textAlign: 'center', fontWeight: 700, fontSize: 36 }}>
          {rateStep}
        </span>
        <button onClick={() => changeRate(+1)} style={{
          width: 72, height: 72, borderRadius: 18,
          border: 'none', background: C.bg,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: C.textSub, fontSize: 36, fontWeight: 600,
        }}>+</button>
      </div>
    </div>
  )
}

function A11yBtn({ icon, label, active, onClick, C, lf }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '14px 20px', borderRadius: 14,
      border: 'none',
      background: active ? C.primaryBg : C.bg,
      cursor: 'pointer',
      ...sc(BM.XS, lf), color: active ? C.primary : C.textSub,
      fontWeight: 500,
    }}>
      {icon}
      {label}
    </button>
  )
}

export default function KioskFrame({ showA11yBar = true }) {
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

  if (!showFrame) return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Outlet />
        </div>
      </div>
      {showA11yBar && <A11yBottomBar />}
    </div>
  )

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
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
            <div style={{ position: 'absolute', inset: 0 }}>
              <Outlet />
            </div>
          </div>
          {showA11yBar && <A11yBottomBar />}
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
