import { useEffect } from 'react'
import { Utensils, ShoppingBag } from 'lucide-react'
import { useA11y } from '../context/AccessibilityContext'
import { getC } from '../styles/colors'
import { FF, H, BM, sc } from '../styles/typography'
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

// 주문 시작 전 매장 식사 / 포장 여부를 먼저 확인하는 모달
export default function OrderTypeModal({ onSelect, hc, lf }) {
  const { volume } = useA11y()
  const C = getC(hc)

  useEffect(() => {
    speakOnce('매장에서 드시고 가시나요, 포장해 가시나요?', volume)
  }, [])

  const optionBtn = {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
    padding: '44px 24px', borderRadius: 28, cursor: 'pointer',
    background: hc ? '#111111' : C.primaryBg, border: `2px dashed ${hc ? C.primary : C.primaryBorder}`,
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
        width: '100%', maxWidth: 800,
        background: hc ? '#0D0D0D' : '#FFFFFF',
        border: `2px solid ${C.borderMid}`,
        borderRadius: 40, padding: '56px 48px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 36,
        boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
      }}>
        <div style={{ ...sc(H.SM, lf), color: C.text, textAlign: 'center' }}>
          매장에서 드시나요, 포장하시나요?
        </div>
        <div style={{ ...sc(BM.SM, lf), color: C.textSub, textAlign: 'center' }}>
          주문하실 방법을 먼저 선택해 주세요.
        </div>

        <div style={{ display: 'flex', gap: 20, width: '100%' }}>
          <button onClick={() => onSelect('dine_in')} style={optionBtn}>
            <Utensils size={52} color={C.primary} strokeWidth={2} />
            <span style={{ ...sc(BM.MD, lf), color: C.text, fontWeight: 700 }}>매장에서 먹을게요</span>
          </button>
          <button onClick={() => onSelect('takeout')} style={optionBtn}>
            <ShoppingBag size={52} color={C.primary} strokeWidth={2} />
            <span style={{ ...sc(BM.MD, lf), color: C.text, fontWeight: 700 }}>포장할게요</span>
          </button>
        </div>
      </div>
    </div>
  )
}
