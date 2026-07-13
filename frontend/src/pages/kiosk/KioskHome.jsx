import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sprout, Speech, LayoutGrid, HelpCircle, ChevronRight } from 'lucide-react'
import { useA11y } from '../../context/AccessibilityContext'
import { getC } from '../../styles/colors'
import { FF, B, sc } from '../../styles/typography'
import { FALLBACK } from '../../constants/menus'
import AIAssistantFAB from '../../components/AIAssistantFAB'
import ScreenHeader from '../../components/ScreenHeader'
import { ttsText, getMenus } from '../../api'

const SCR_LIGHT = {
  pageBg:        '#ffffff',
  accent:        '#2563ff',
  headText:      '#111827',
  subText:       '#8b93a7',
  chipBg:        '#f1f4fb',
  chipBorder:    '#e5eaf5',
  chipText:      '#374151',
  cardShadow:    '0 4px 16px rgba(30,40,80,0.05)',
  chevron:       '#c3cad8',
  barBorder:     '#eef1f6',
  charFilter:    'none',
  homeBtnBg:     '#DEEAFB',
  homeBtnBorder: '1px solid #cddef5',
  homeBtnIconBg: '#ffffff',
}

const SCR_HC = {
  pageBg:        '#000000',
  accent:        '#ffe600',
  headText:      '#ffffff',
  subText:       '#e6e6e6',
  chipBg:        '#000000',
  chipBorder:    '#ffe600',
  chipText:      '#ffe600',
  cardShadow:    'none',
  chevron:       '#ffe600',
  barBorder:     '#ffe600',
  charFilter:    'invert(1)',
  homeBtnBg:     '#111111',
  homeBtnBorder: '2px solid #ffe600',
  homeBtnIconBg: '#1a1a1a',
}

export default function KioskHome() {
  const nav = useNavigate()
  const { highContrast, largeFont } = useA11y()

  const fabRef = useRef(null)
  const [menus, setMenus] = useState(FALLBACK)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30 * 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    getMenus().then(({ data }) => {
      if (!data?.length) return
      const norm = s => (s || '').replace(/따뜻한\s*|아이스\s*/g, '').replace(/\s+/g, '').toLowerCase()
      setMenus(FALLBACK.map(fb => {
        const api = data.find(m =>
          m.name === fb.name || m.id === fb.id || norm(m.name) === norm(fb.name)
        )
        return api ? { ...fb, price: api.price ?? fb.price, options: api.options ?? [] } : fb
      }))
    }).catch(() => {})
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
  const scr = hc ? SCR_HC : SCR_LIGHT
  const C = getC(hc)

  const homeOptions = [
    { Icon: Speech,     title: '음성으로 주문하기',   desc: '말씀만 하시면 담아 드려요',        go: () => fabRef.current?.open('order') },
    { Icon: LayoutGrid, title: '화면 눌러서 주문하기', desc: '메뉴를 보고 천천히 고르세요',       go: () => nav('/kiosk/order') },
    { Icon: HelpCircle, title: '궁금한 점 물어보기',   desc: '메뉴·매장 안내를 도와드려요',       go: () => fabRef.current?.open('faq') },
  ]

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      position: 'relative', background: scr.pageBg, fontFamily: FF,
    }}>

      {/* ── 상단 헤더: 터치로 주문하기 화면과 동일한 헤더 디자인 ── */}
      <ScreenHeader
        C={C} lf={lf} align="left"
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <Sprout size={44} color={C.primary} strokeWidth={2} />
            카페 아날로그
          </span>
        }
        right={
          <span style={{ ...sc(B.SM, lf), color: C.textSub, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
            {now.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: true })}
          </span>
        }
      />

      {/* ── 뱃지·타이틀·이미지·버튼 전체를 남는 공간에 균등 간격으로 배치 ── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 28, padding: '32px 40px 36px', overflow: 'hidden' }}>

        {/* 뱃지 칩 */}
        <div style={{
          display: 'inline-flex', alignSelf: 'center', alignItems: 'center', gap: 8,
          padding: '12px 22px', borderRadius: 999,
          background: scr.chipBg, border: `1px solid ${scr.chipBorder}`,
        }}>
          <span style={{ fontSize: 24 * lf, fontWeight: 700, color: scr.chipText }}>
            대화형 AI 키오스크 <strong style={{ fontSize: 28 * lf, fontWeight: 800 }}>골라봄</strong>
          </span>
        </div>

        {/* 타이틀 + 부제 */}
        <div>
          <div style={{
            textAlign: 'center',
            fontSize: 76 * lf, fontWeight: 900, lineHeight: 1.18,
            color: scr.headText, letterSpacing: '-0.5px',
          }}>
            무엇을<br />도와드릴까요?
          </div>
          <div style={{ marginTop: 14, textAlign: 'center', fontSize: 32 * lf, fontWeight: 500, color: scr.subText }}>
            원하시는 주문 방법을 선택해주세요.
          </div>
        </div>

        {/* 캐릭터 이미지 */}
        <img
          src="/title.png" alt="직원 캐릭터"
          style={{ alignSelf: 'center', maxHeight: '82%', maxWidth: '62%', objectFit: 'contain', filter: scr.charFilter }}
        />

        {/* 3개 주문 방법 버튼 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%', maxWidth: 760, alignSelf: 'center' }}>
          {homeOptions.map(opt => (
            <div
              key={opt.title}
              onClick={opt.go}
              style={{
                display: 'flex', alignItems: 'center', gap: 24,
                padding: '24px 32px', borderRadius: 26,
                background: scr.homeBtnBg, border: scr.homeBtnBorder,
                boxShadow: scr.cardShadow, cursor: 'pointer',
              }}
            >
              <div style={{
                width: 92, height: 92, borderRadius: '50%', flexShrink: 0,
                background: scr.homeBtnIconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <opt.Icon size={44} color={scr.accent} strokeWidth={2} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 36 * lf, fontWeight: 800, color: scr.headText }}>{opt.title}</div>
                <div style={{ marginTop: 6, fontSize: 26 * lf, fontWeight: 500, color: scr.subText }}>{opt.desc}</div>
              </div>
              <ChevronRight size={30} color={scr.chevron} strokeWidth={2.4} />
            </div>
          ))}
        </div>
      </div>

      {/* ── AI Assistant FAB ─────────────────────────────────────────── */}
      <AIAssistantFAB ref={fabRef} menus={menus} bottomOffset={80} showFab={false} />
    </div>
  )
}
