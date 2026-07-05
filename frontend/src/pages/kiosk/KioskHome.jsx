import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Accessibility, Smile, Headphones,
  Loader2, Laugh, Frown,
  BellRing, ChevronRight, Megaphone, Bot, Camera,
} from 'lucide-react'
import { useA11y } from '../../context/AccessibilityContext'
import { getC } from '../../styles/colors'
import { FF, H, B, BM, L, NAV, sc } from '../../styles/typography'
import { FALLBACK } from '../../constants/menus'
import AIAssistantFAB from '../../components/AIAssistantFAB'
import { ttsText, getStore, getMenus } from '../../api'

const AI_STATES = [
  { id: 'idle',       label: '대기중', Icon: Smile,      circleBg: { l: '#DBEAFE', hc: '#2A1E00' }, iconColor: { l: '#2563EB', hc: '#FFE500' } },
  { id: 'listening',  label: '듣는중', Icon: Headphones, circleBg: { l: '#BFDBFE', hc: '#2A1E00' }, iconColor: { l: '#2563EB', hc: '#FFE500' } },
  { id: 'processing', label: '생각중', Icon: Loader2,    circleBg: { l: '#FEF3C7', hc: '#1A1200' }, iconColor: { l: '#D97706', hc: '#FFC107' } },
  { id: 'complete',   label: '완료',   Icon: Laugh,      circleBg: { l: '#F0FDF4', hc: '#001A06' }, iconColor: { l: '#16A34A', hc: '#00E326' } },
  { id: 'error',      label: '오류',   Icon: Frown,      circleBg: { l: '#FEF2F2', hc: '#2D0000' }, iconColor: { l: '#DC2626', hc: '#FF6B6B' } },
]

export default function KioskHome() {
  const nav = useNavigate()
  const { highContrast, largeFont } = useA11y()

  const fabRef = useRef(null)
  const [storeNotice, setStoreNotice] = useState('')
  const [menus, setMenus] = useState(FALLBACK)

  useEffect(() => {
    getStore().then(({ data }) => setStoreNotice(data.notice || '')).catch(() => {})
    getMenus().then(({ data }) => { if (data?.length) setMenus(data) }).catch(() => {})
  }, [])

  useEffect(() => {
    ttsText('안녕하세요, 카페 아날로그입니다.').then(res => {
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: 'audio/mpeg' })
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.onended = () => URL.revokeObjectURL(url)
      audio.onerror = () => URL.revokeObjectURL(url)
      audio.play().catch(() => {})
    }).catch(() => {})
  }, [])

  const hc = highContrast
  const lf = largeFont ? 1.2 : 1
  const C = getC(hc)

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: C.bg, fontFamily: FF,
      overflow: 'hidden',
    }}>

      {/* ── Top header ──────────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '28px 40px 20px',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 28px', borderRadius: 28,
          border: `1.5px solid ${C.border}`, background: C.card,
          ...sc(NAV.SB, lf), color: C.text,
        }}>
          <Accessibility size={28} color={C.primary} />
          배리어프리 디자인 시스템
        </div>
        <button onClick={() => fabRef.current?.open()} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 28px', borderRadius: 28,
          border: `1.5px solid ${C.primaryBorder}`, background: C.primaryBg,
          ...sc(NAV.SB, lf), color: C.primary, cursor: 'pointer',
        }}>
          <Bot size={28} color={C.primary} />
          AI 도우미
        </button>
      </div>

      {/* ── 스크롤 가능한 중간 영역 ─────────────────────────────────── */}
      <div data-kiosk-scroll style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, textAlign: 'center', padding: '8px 48px 24px' }}>
        <h1 style={{ ...sc(H.LG, lf), color: C.text, marginBottom: 16 }}>
          누구나 쉽게 사용하는<br />
          <span style={{ color: C.primary }}>AI 키오스크</span>
        </h1>
        <p style={{ ...sc(BM.SM, lf), color: C.textSub, maxWidth: 800, margin: '0 auto' }}>
          어르신과 시각장애인을 위한 큰 글씨, 명확한 색상 대비,<br />친근한 AI 음성 안내를 제공합니다.
        </p>
      </div>

      {/* ── AI 도우미 소개 ───────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, padding: '0 36px 24px' }}>
        <h2 style={{ ...sc(H.SM, lf), color: C.text, marginBottom: 16 }}>AI 도우미 소개</h2>
        <div style={{ display: 'flex', gap: 14 }}>
          {AI_STATES.map(s => {
            const circleBg  = hc ? s.circleBg.hc  : s.circleBg.l
            const iconColor = hc ? s.iconColor.hc : s.iconColor.l
            return (
              <div key={s.id} style={{
                flex: 1, textAlign: 'center', background: C.card,
                borderRadius: 20, padding: '18px 6px 14px',
                border: `2px solid ${iconColor}`,
              }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: circleBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
                }}>
                  <s.Icon size={28} color={iconColor} />
                </div>
                <span style={{
                  fontSize: BM.XS.fontSize * lf, fontWeight: 500,
                  lineHeight: 1.4, color: iconColor,
                }}>{s.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 오늘의 공지사항 ──────────────────────────────────────────── */}
      {storeNotice && (
        <div style={{ flexShrink: 0, padding: '0 36px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, background: C.primaryBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Megaphone size={28} color={C.primary} />
            </div>
            <h2 style={{ ...sc(H.SM, lf), color: C.text, margin: 0 }}>오늘의 공지사항</h2>
          </div>

          <div style={{
            background: C.card, borderRadius: 22, padding: '20px 24px',
            border: `1.5px solid ${C.border}`,
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: C.primaryBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <BellRing size={28} color={C.primary} />
            </div>
            <p style={{ ...sc(BM.XS, lf), color: C.text, margin: 0 }}>
              {storeNotice}
            </p>
          </div>
        </div>
      )}

      {/* ── 주문하기 버튼 ──────────────────────────────────────────── */}
      <div style={{ padding: '0 36px 24px' }}>
        <button onClick={() => nav('/kiosk/order')} style={{
          width: '100%', padding: '32px', borderRadius: 22,
          background: C.primary, color: C.primaryText,
          border: 'none', ...sc(L.LG, lf),
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
          boxShadow: hc ? 'none' : '0 8px 28px rgba(37,99,235,0.35)',
        }}>
          지금 주문하기 <ChevronRight size={52} strokeWidth={2.5} />
        </button>
      </div>

      {/* ── CCTV 보안 안내 ───────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, padding: '0 36px 32px' }}>

        <div style={{
          background: C.card, borderRadius: 22,
          border: `1.5px solid ${C.border}`,
          overflow: 'hidden',
          display: 'flex', alignItems: 'stretch',
        }}>
          {/* 왼쪽: 1:1 CCTV 이미지 영역 */}
          <div style={{
            width: 240, flexShrink: 0, alignSelf: 'stretch',
            background: hc ? '#111' : '#F1F5F9',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <Camera size={40} color={hc ? '#555' : '#CBD5E1'} strokeWidth={1.5} />
            <span style={{ ...sc(BM.XS, lf), color: hc ? '#555' : '#94A3B8' }}>CCTV</span>
          </div>

          {/* 오른쪽: 안내 문구 */}
          <div style={{
            flex: 1, padding: '24px 28px',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            borderLeft: `1px solid ${C.border}`,
          }}>
            <p style={{ ...sc(BM.XS, lf), color: C.text, margin: 0, lineHeight: 1.7 }}>
              정보의 도난 방지를 위해 24시간 CCTV 실시간 촬영 및 보안 시스템이 작동 중입니다.
            </p>
          </div>
        </div>
      </div>

      </div>{/* 스크롤 영역 끝 */}

      {/* ── AI Assistant FAB ─────────────────────────────────────────── */}
      <AIAssistantFAB ref={fabRef} menus={menus} bottomOffset={80} />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
