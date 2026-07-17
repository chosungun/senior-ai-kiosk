import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Contrast, ArrowDownToLine, ZoomIn, Volume2, VolumeX } from 'lucide-react'
import { useA11y } from '../context/AccessibilityContext'
import { useIdle } from '../context/IdleContext'
import { getC } from '../styles/colors'
import { FF, BM, sc } from '../styles/typography'
import IdleCheckModal from './IdleCheckModal'

const W = 1080
const H = 1920

function A11yBottomBar() {
  const {
    highContrast, setHighContrast, largeFont, setLargeFont, volume, setVolume,
    screenLowered, setScreenLowered,
  } = useA11y()
  const hc = highContrast
  const lf = largeFont ? 1.2 : 1
  const C = getC(hc)
  const volumeStep = Math.round(volume * 10)

  const changeVolume = (delta) => {
    const next = Math.min(10, Math.max(0, volumeStep + delta))
    setVolume(next / 10)
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
        icon={<ArrowDownToLine size={34} color={screenLowered ? C.primary : C.textSub} />}
        label="화면 내리기"
        active={screenLowered}
        onClick={() => setScreenLowered(!screenLowered)}
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
        {volumeStep === 0
          ? <VolumeX size={38} color={C.textSub} />
          : <Volume2 size={38} color={C.textSub} />}
        <button onClick={() => changeVolume(-1)} style={{
          width: 72, height: 72, borderRadius: 18,
          border: 'none', background: C.bg,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: C.textSub, fontSize: 36, fontWeight: 600,
        }}>−</button>
        <span style={{ color: C.text, minWidth: 44, textAlign: 'center', fontWeight: 700, fontSize: 36 }}>
          {volumeStep}
        </span>
        <button onClick={() => changeVolume(+1)} style={{
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

// 화면 내리기 활성화 시 위쪽 40%를 비워 조작 영역을 하단 60%로 낮춘다 (휠체어 이용자 접근성)
function ScreenLoweredOverlay({ lf }) {
  return (
    <div style={{
      flex: '0 0 40%', flexShrink: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 12, background: '#111827', fontFamily: FF,
    }}>
      <ArrowDownToLine size={40 * lf} color="#9CA3AF" />
      <span style={{ fontSize: 24 * lf, fontWeight: 600, color: '#E5E7EB' }}>화면 내리기 사용중</span>
    </div>
  )
}

function KioskContent({ screenLowered, hc, lf, idle }) {
  return (
    <>
      {screenLowered && <ScreenLoweredOverlay lf={lf} />}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <Outlet />
        </div>
        {idle?.showPrompt && <IdleCheckModal onResolve={idle.resolvePrompt} hc={hc} lf={lf} />}
      </div>
    </>
  )
}

export default function KioskFrame({ showA11yBar = true }) {
  const showFrame =
    import.meta.env.DEV && import.meta.env.VITE_KIOSK_FRAME !== 'off'

  const { highContrast, largeFont, screenLowered } = useA11y()
  const idle = useIdle() // 어드민 화면에는 IdleProvider가 없어 null — 이때는 항상 비활성
  const hc = highContrast
  const lf = largeFont ? 1.2 : 1

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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <KioskContent screenLowered={screenLowered} hc={hc} lf={lf} idle={idle} />
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
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <KioskContent screenLowered={screenLowered} hc={hc} lf={lf} idle={idle} />
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
