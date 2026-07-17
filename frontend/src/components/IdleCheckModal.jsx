import { useEffect, useState } from 'react'
import { HeartHandshake, Bell } from 'lucide-react'
import { useA11y } from '../context/AccessibilityContext'
import { getC } from '../styles/colors'
import { FF, H, BM, L, sc } from '../styles/typography'
import { ttsText } from '../api'

function speakOnce(text, volume) {
  ttsText(text)
    .then(res => {
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: 'audio/mpeg' })
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.volume = volume
      audio.onended = () => URL.revokeObjectURL(url)
      audio.onerror = () => URL.revokeObjectURL(url)
      audio.play().catch(() => {})
    })
    .catch(() => {})
}

// 1분 이상 터치·음성이 감지되지 않을 때 뜨는 안심 안내 — 직원 호출 여부만 간단히 묻는다 (프론트엔드 표시용, 실제 전달은 없음)
export default function IdleCheckModal({ onResolve, hc, lf }) {
  const [stage, setStage] = useState('ask') // 'ask' | 'called'
  const { volume } = useA11y()
  const C = getC(hc)

  useEffect(() => {
    speakOnce('괜찮으신가요? 대답이 없으셔서 걱정했어요. 직원을 불러드릴까요?', volume)
  }, [])

  useEffect(() => {
    if (stage !== 'called') return
    speakOnce('직원을 호출했어요. 잠시만 기다려 주세요.', volume)
    const t = setTimeout(onResolve, 5000)
    return () => clearTimeout(t)
  }, [stage, onResolve])

  const primaryBtn = {
    padding: '28px 0', borderRadius: 22, cursor: 'pointer', border: 'none',
    background: C.primary, color: C.primaryText, ...sc(L.XS, lf), fontFamily: FF,
  }
  const ghostBtn = {
    padding: '26px 0', borderRadius: 22, cursor: 'pointer',
    background: 'transparent', color: C.textSub, border: `2px solid ${C.borderMid}`,
    ...sc(L.XS, lf), fontFamily: FF,
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 200,
      background: hc ? 'rgba(0,0,0,0.95)' : 'rgba(15,23,42,0.55)',
      backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: FF, padding: 48,
    }}>
      <div style={{
        width: '100%', maxWidth: 760,
        background: hc ? '#0D0D0D' : '#FFFFFF',
        border: `2px solid ${C.borderMid}`,
        borderRadius: 40, padding: '56px 48px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28,
        boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
      }}>
        <div style={{
          width: 120, height: 120, borderRadius: '50%',
          background: C.warningBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {stage === 'called'
            ? <Bell size={56} color={C.warning} />
            : <HeartHandshake size={56} color={C.warning} />
          }
        </div>

        {stage === 'ask' && (
          <>
            <div style={{ ...sc(H.SM, lf), color: C.text, textAlign: 'center' }}>괜찮으신가요?</div>
            <div style={{ ...sc(BM.SM, lf), color: C.textSub, textAlign: 'center' }}>
              대답이 없으셔서 걱정했어요.<br />직원을 불러드릴까요?
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', marginTop: 12 }}>
              <button onClick={() => setStage('called')} style={primaryBtn}>네, 불러주세요</button>
              <button onClick={onResolve} style={ghostBtn}>아니요, 괜찮아요</button>
            </div>
          </>
        )}

        {stage === 'called' && (
          <>
            <div style={{ ...sc(H.SM, lf), color: C.text, textAlign: 'center' }}>직원을 호출했어요</div>
            <div style={{ ...sc(BM.SM, lf), color: C.textSub, textAlign: 'center' }}>
              잠시만 기다려 주세요. 곧 도와드릴게요.
            </div>
            <button onClick={onResolve} style={{ ...ghostBtn, width: '100%', marginTop: 12 }}>확인했어요</button>
          </>
        )}
      </div>
    </div>
  )
}
