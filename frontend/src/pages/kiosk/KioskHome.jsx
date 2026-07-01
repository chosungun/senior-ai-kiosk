import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Accessibility, Contrast, Smile, Headphones,
  Loader2, Laugh, Frown, ZoomIn, Volume2, X,
  BellRing, ChevronRight, Megaphone, Bot,
} from 'lucide-react'
import { useA11y } from '../../context/AccessibilityContext'
import { getC } from '../../styles/colors'
import { FF, H, B, BM, L, NAV, sc } from '../../styles/typography'
import { FALLBACK } from '../../constants/menus'
import AIAssistantFAB from '../../components/AIAssistantFAB'
import { ttsText } from '../../api'

const RECS = [
  { id: 1, name: '따뜻한 아메리카노', desc: '부드럽고 고소한 맛',             img: '/menu/01_americano.png'  },
  { id: 2, name: '카페라떼',          desc: '우유가 들어가 속이 편안한 커피', img: '/menu/02_cafe_latte.png' },
]

const AI_STATES = [
  { id: 'idle',       label: '대기중', Icon: Smile,      circleBg: { l: '#DBEAFE', hc: '#2A1E00' }, iconColor: { l: '#2563EB', hc: '#FFE500' } },
  { id: 'listening',  label: '듣는중', Icon: Headphones, circleBg: { l: '#BFDBFE', hc: '#2A1E00' }, iconColor: { l: '#2563EB', hc: '#FFE500' } },
  { id: 'processing', label: '생각중', Icon: Loader2,    circleBg: { l: '#FEF3C7', hc: '#1A1200' }, iconColor: { l: '#D97706', hc: '#FFC107' } },
  { id: 'complete',   label: '완료',   Icon: Laugh,      circleBg: { l: '#F0FDF4', hc: '#001A06' }, iconColor: { l: '#16A34A', hc: '#00E326' } },
  { id: 'error',      label: '오류',   Icon: Frown,      circleBg: { l: '#FEF2F2', hc: '#2D0000' }, iconColor: { l: '#DC2626', hc: '#FF6B6B' } },
]

const NOTICES = [
  {
    id: 1,
    badge: '영업',
    badgeColor: { l: '#16A34A', hc: '#00E326' },
    badgeBg:    { l: '#F0FDF4', hc: '#001A06' },
    title: '오늘 영업 시간 안내',
    body: '오늘은 오전 8시부터 오후 10시까지 정상 영업합니다.',
  },
  {
    id: 2,
    badge: '신메뉴',
    badgeColor: { l: '#2563EB', hc: '#FFE500' },
    badgeBg:    { l: '#DBEAFE', hc: '#2A1E00' },
    title: '여름 한정 복숭아 에이드 출시',
    body: '상큼한 복숭아와 탄산이 어우러진 시원한 여름 음료를 만나보세요!',
  },
  {
    id: 3,
    badge: '이벤트',
    badgeColor: { l: '#16A34A', hc: '#00E326' },
    badgeBg:    { l: '#F0FDF4', hc: '#001A06' },
    title: '7월 카드 결제 10% 할인',
    body: '이번 달 모든 카드 결제 시 10% 할인 혜택을 제공합니다.',
  },
]

export default function KioskHome() {
  const nav = useNavigate()
  const { highContrast, setHighContrast, largeFont, setLargeFont, speechRate, setSpeechRate } = useA11y()

  const fabRef = useRef(null)
  const [showSettings, setShowSettings] = useState(false)
  const [draft, setDraft] = useState({ highContrast, largeFont, speechRate })

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

  useEffect(() => {
    if (showSettings) setDraft({ highContrast, largeFont, speechRate })
  }, [showSettings])

  const hc = highContrast
  const lf = largeFont ? 1.2 : 1
  const C = getC(hc)

  const applySettings = () => {
    setHighContrast(draft.highContrast)
    setLargeFont(draft.largeFont)
    setSpeechRate(draft.speechRate)
    setShowSettings(false)
  }

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
        <button onClick={() => setShowSettings(true)} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 28px', borderRadius: 28,
          border: `1.5px solid ${C.border}`, background: C.card,
          ...sc(NAV.SB, lf), color: C.text, cursor: 'pointer',
        }}>
          <Contrast size={28} color={C.text} />
          대비 설정
        </button>
      </div>

      {/* ── 스크롤 가능한 중간 영역 ─────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {NOTICES.map(notice => {
            const bColor = hc ? notice.badgeColor.hc : notice.badgeColor.l
            const bBg    = hc ? notice.badgeBg.hc    : notice.badgeBg.l
            return (
              <div key={notice.id} style={{
                background: C.card, borderRadius: 22, padding: '20px 24px',
                border: `1.5px solid ${C.border}`,
                display: 'flex', alignItems: 'center', gap: 16,
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                  background: bBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <BellRing size={28} color={bColor} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{
                      ...NAV.SB, padding: '4px 14px', borderRadius: 20,
                      background: bBg, color: bColor, flexShrink: 0,
                    }}>{notice.badge}</span>
                    <span style={{
                      fontSize: B.XS.fontSize * lf, fontWeight: 600, lineHeight: 1.4,
                      color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{notice.title}</span>
                  </div>
                  <p style={{ ...sc(BM.XS, lf), color: C.textSub, margin: 0 }}>
                    {notice.body}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 추천 메뉴 ────────────────────────────────────────────────── */}
      <div style={{ padding: '0 36px 32px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ ...sc(H.SM, lf), color: C.text, margin: 0 }}>추천 메뉴</h2>
          <button onClick={() => nav('/kiosk/order')} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            ...sc(L.XS, lf), color: C.primary, padding: '8px 4px',
          }}>
            전체 메뉴 <ChevronRight size={28} color={C.primary} />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, flex: 1 }}>
          {RECS.map(item => (
            <div key={item.id} onClick={() => nav('/kiosk/order')} style={{
              background: C.card, borderRadius: 20, overflow: 'hidden',
              border: `1.5px solid ${C.border}`,
              cursor: 'pointer', display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ flex: 1, overflow: 'hidden', background: C.bg, minHeight: 0 }}>
                <img src={item.img} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div style={{ padding: '16px 20px 20px', flexShrink: 0 }}>
                <div style={{ fontSize: B.XS.fontSize * lf, fontWeight: 600, lineHeight: 1.4, color: C.text, marginBottom: 6 }}>{item.name}</div>
                <div style={{ ...BM.XS, color: C.textSub }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => nav('/kiosk/order')} style={{
          marginTop: 18, width: '100%', padding: '32px', borderRadius: 22,
          background: C.primary, color: C.primaryText,
          border: 'none', ...sc(L.LG, lf),
          cursor: 'pointer', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
          boxShadow: hc ? 'none' : '0 8px 28px rgba(37,99,235,0.35)',
        }}>
          지금 주문하기 <ChevronRight size={52} strokeWidth={2.5} />
        </button>
      </div>

      </div>{/* 스크롤 영역 끝 */}

      {/* ── AI 도우미 바텀바 ─────────────────────────────────────────── */}
      <button
        onClick={() => fabRef.current?.open()}
        style={{
          flexShrink: 0, width: '100%',
          background: C.primaryBg, borderTop: `2px solid ${C.primaryBorder}`,
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20,
          padding: '28px 0',
        }}
      >
        <div style={{
          width: 64, height: 64, borderRadius: '50%', background: C.primary,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Bot size={36} color={C.primaryText} />
        </div>
        <span style={{ ...sc(L.XS, lf), color: C.primary }}>AI 도우미</span>
      </button>

      {/* ── AI Assistant FAB ─────────────────────────────────────────── */}
      <AIAssistantFAB ref={fabRef} menus={FALLBACK} bottomOffset={160} />

      {/* ── Settings sheet ─────────────────────────────────────────── */}
      {showSettings && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end',
        }} onClick={e => e.target === e.currentTarget && setShowSettings(false)}>
          <div style={{
            width: '100%', background: C.card,
            borderRadius: '36px 36px 0 0', padding: '48px 40px 64px',
            border: `2px solid ${C.border}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 44 }}>
              <span style={{ ...H.SM, color: C.text }}>접근성 설정</span>
              <button onClick={() => setShowSettings(false)} style={{
                width: 72, height: 72, borderRadius: '50%', border: `2px solid ${C.border}`,
                background: C.bg, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}><X size={28} color={C.textSub} /></button>
            </div>
            <SettingRow icon={<Contrast size={28} color={draft.highContrast ? C.primary : C.textSub} />}
              label="고대비 모드" active={draft.highContrast} C={C}>
              <Toggle value={draft.highContrast} onChange={v => setDraft(d => ({ ...d, highContrast: v }))} C={C} />
            </SettingRow>
            <SettingRow icon={<ZoomIn size={28} color={draft.largeFont ? C.primary : C.textSub} />}
              label="큰 글씨 사용" active={draft.largeFont} C={C}>
              <Toggle value={draft.largeFont} onChange={v => setDraft(d => ({ ...d, largeFont: v }))} C={C} />
            </SettingRow>
            <div style={{
              padding: '28px 32px', borderRadius: 20, marginBottom: 44,
              background: C.bg, border: `2px solid ${C.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <Volume2 size={28} color={C.textSub} />
                <span style={{ ...B.XS, color: C.text }}>음성 안내 속도</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ ...BM.XS, color: C.textMuted }}>느리게</span>
                <input type="range" min="0.5" max="1.5" step="0.1" value={draft.speechRate}
                  onChange={e => setDraft(d => ({ ...d, speechRate: parseFloat(e.target.value) }))}
                  style={{ flex: 1, accentColor: C.primary }} />
                <span style={{ ...BM.XS, color: C.textMuted }}>빠르게</span>
              </div>
            </div>
            <button onClick={applySettings} style={{
              width: '100%', padding: '28px', borderRadius: 20,
              background: C.primary, color: C.primaryText,
              border: 'none', ...L.SM, cursor: 'pointer',
            }}>적용하기</button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function SettingRow({ icon, label, active, children, C }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '28px 32px', borderRadius: 20, marginBottom: 20,
      background: active ? C.primaryBg : C.bg,
      border: `2px solid ${active ? C.primaryBorder : C.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {icon}
        <span style={{ ...B.XS, color: C.text }}>{label}</span>
      </div>
      {children}
    </div>
  )
}

function Toggle({ value, onChange, C }) {
  return (
    <div onClick={() => onChange(!value)} style={{
      width: 96, height: 52, borderRadius: 26,
      background: value ? C.primary : C.border,
      position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: 6, left: value ? 48 : 6,
        width: 40, height: 40, borderRadius: '50%',
        background: value ? C.primaryText : C.card,
        boxShadow: '0 2px 6px rgba(0,0,0,0.2)', transition: 'left 0.2s',
      }} />
    </div>
  )
}
