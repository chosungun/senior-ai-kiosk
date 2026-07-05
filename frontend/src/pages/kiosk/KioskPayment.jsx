import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Home, ArrowLeft, PenLine, ChevronRight,
  CreditCard, Banknote, Check, ArrowDown,
  CheckCircle, Coffee, Smile, Flame, Snowflake,
} from 'lucide-react'
import { createOrder } from '../../api'
import { useA11y } from '../../context/AccessibilityContext'
import { getC } from '../../styles/colors'
import { FF, H, B, BM, L, NAV, sc } from '../../styles/typography'

const fmt = n => n.toLocaleString() + '원'

export default function KioskPayment() {
  const nav = useNavigate()
  const location = useLocation()
  const { highContrast, largeFont } = useA11y()

  const cart = location.state?.cart || []
  const total = location.state?.total || cart.reduce((s, i) => s + i.price * i.qty, 0)

  const [step, setStep] = useState('confirm')
  const [method, setMethod] = useState(null)
  const [countdown, setCountdown] = useState(60)
  const [ordering, setOrdering] = useState(false)

  const hc = highContrast
  const lf = largeFont ? 1.2 : 1
  const C = getC(hc)
  const T = {
    bg: C.bg, card: C.card, border: C.border,
    text: C.text, sub: C.textSub,
    primary: C.primary, primaryText: C.primaryText,
    primaryBg: C.primaryBg, primaryBgMid: C.primaryBgMid,
  }

  useEffect(() => {
    if (step !== 'card') return
    setCountdown(60)
    const id = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(id); nav('/kiosk'); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [step])

  const placeOrder = async (payMethod) => {
    setMethod(payMethod)
    if (payMethod === 'card') {
      setStep('card')
    } else {
      setOrdering(true)
      try { await createOrder({ items: cart, total, payment_method: 'cash' }) } catch { /* best effort */ }
      setOrdering(false)
      setStep('complete')
    }
  }

  const confirmCardPayment = async () => {
    setOrdering(true)
    try { await createOrder({ items: cart, total, payment_method: 'card' }) } catch { /* best effort */ }
    setOrdering(false)
    setStep('complete')
  }

  // ─── CONFIRM ──────────────────────────────────────────────────────
  if (step === 'confirm') return (
    <Screen title="주문 내용을 확인해주세요" T={T} lf={lf}>
      <div style={{
        width: 100, height: 100, borderRadius: '50%',
        background: C.positiveBg, margin: '0 auto 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Smile size={52} color={C.positive} />
      </div>

      <div style={{ position: 'relative', marginBottom: 28 }}>
        <div style={{
          background: C.cardAlt, borderRadius: 14, padding: '18px 24px',
          border: `1.5px solid ${C.border}`, textAlign: 'center',
          ...sc(BM.XS, lf), color: C.textSub, fontWeight: 600,
        }}>
          "선택하신 메뉴가 맞는지 확인해 보세요!"
        </div>
        <div style={{
          position: 'absolute', left: '50%', bottom: -8,
          transform: 'translateX(-50%) rotate(45deg)',
          width: 16, height: 16, background: C.cardAlt,
          borderRight: `1.5px solid ${C.border}`, borderBottom: `1.5px solid ${C.border}`,
        }} />
      </div>

      <div style={{
        background: T.card, borderRadius: 20, border: `2px solid ${T.primary}`,
        overflow: 'hidden', marginBottom: 28, marginTop: 8,
      }}>
        <div style={{ ...sc(B.XS, lf), color: T.text, padding: '24px 28px 16px' }}>주문 목록</div>
        <div style={{ padding: '0 28px' }}>
          {cart.map((item, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              paddingBottom: 18, marginBottom: 18,
              borderBottom: i < cart.length - 1 ? `1.5px solid ${T.border}` : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {item.temp && (
                  item.temp === '따뜻하게'
                    ? <Flame size={28} color="#dc2626" />
                    : <Snowflake size={28} color="#0ea5e9" />
                )}
                <span style={{ fontSize: BM.XS.fontSize * lf, fontWeight: 700, lineHeight: 1.4, color: T.text }}>
                  {item.name}
                </span>
                <span style={{
                  fontSize: (BM.XS.fontSize - 4) * lf, fontWeight: 500, color: T.sub,
                  background: C.cardAlt, padding: '4px 12px', borderRadius: 8,
                }}>
                  {item.qty}개
                </span>
              </div>
              <span style={{ fontSize: B.XS.fontSize * lf, fontWeight: 700, lineHeight: 1.4, color: T.text }}>
                {fmt(item.price * item.qty)}
              </span>
            </div>
          ))}
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '24px 28px',
          background: hc ? C.primary : '#1E293B',
        }}>
          <span style={{ ...sc(B.XS, lf), color: C.primaryText }}>총 결제금액</span>
          <span style={{ ...sc(L.SM, lf), color: hc ? C.primaryText : '#FBBF24' }}>{fmt(total)}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
        <button onClick={() => nav(-1)} style={{
          flex: 1, padding: '28px', borderRadius: 20,
          background: T.bg, color: T.text, border: `2px solid ${T.border}`,
          ...sc(L.XS, lf), cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
        }}>
          <PenLine size={28} /> 수정하기
        </button>
        <button onClick={() => setStep('method')} style={{
          flex: 2, padding: '28px', borderRadius: 20,
          background: T.primary, color: T.primaryText, border: 'none',
          ...sc(L.XS, lf), cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}>
          결제하기 <ChevronRight size={28} />
        </button>
      </div>
    </Screen>
  )

  // ─── METHOD ───────────────────────────────────────────────────────
  if (step === 'method') return (
    <Screen title="결제 수단을 선택해주세요" T={T} lf={lf} onBack={() => setStep('confirm')}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1, justifyContent: 'center' }}>
        <PayMethodCard
          icon={<CreditCard size={52} color={method === 'card' ? T.primary : T.sub} />}
          title="신용카드"
          desc="삼성페이 / LG페이 포함"
          selected={method === 'card'}
          onClick={() => placeOrder('card')}
          T={T} lf={lf}
        />
        <PayMethodCard
          icon={<Banknote size={52} color={method === 'cash' ? T.primary : T.sub} />}
          title="현금 결제"
          desc="지폐와 동전 사용"
          selected={method === 'cash'}
          onClick={() => placeOrder('cash')}
          T={T} lf={lf}
        />
      </div>
      <button onClick={() => setStep('confirm')} style={{
        padding: '26px', borderRadius: 20,
        background: T.bg, color: T.sub, border: `2px solid ${T.border}`,
        ...sc(L.XS, lf), cursor: 'pointer', marginTop: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
      }}>
        <ArrowLeft size={28} /> 뒤로가기
      </button>
    </Screen>
  )

  // ─── CARD ─────────────────────────────────────────────────────────
  if (step === 'card') return (
    <Screen title="카드를 단말기에 넣어주세요" T={T} lf={lf}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
        <div style={{
          width: 220, height: 140, borderRadius: 20,
          background: 'linear-gradient(135deg, #2563EB 0%, #60A5FA 100%)',
          boxShadow: '0 12px 40px rgba(37,99,235,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          <div style={{ position: 'absolute', top: 24, left: 24, width: 52, height: 40, borderRadius: 8, background: C.warningBorder, opacity: 0.9 }} />
          <div style={{ position: 'absolute', bottom: 20, left: 24, right: 24, display: 'flex', gap: 8 }}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{ height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.5)', flex: 1 }} />
            ))}
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          background: C.primaryBg, borderRadius: 32, padding: '16px 36px',
          border: `2px solid ${C.primaryBorder}`,
        }}>
          <ArrowDown size={28} color={C.primary} />
          <span style={{ ...sc(B.XS, lf), color: C.primary }}>화살표 방향으로</span>
        </div>

        <div style={{
          width: 320, background: C.bg,
          border: `3px solid ${C.borderMid}`, borderRadius: 18,
          padding: '24px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: '100%', height: 14, background: C.borderMid,
            borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ width: '80%', height: 4, background: C.textMuted, borderRadius: 2 }} />
          </div>
          <span style={{ ...sc(B.XS, lf), color: C.textSub }}>IC 카드 입구</span>
        </div>

        <p style={{ ...sc(BM.XS, lf), color: C.textSub, textAlign: 'center' }}>
          단말기 오른쪽에 카드를 꽂아주세요
        </p>

        <div style={{ position: 'relative', width: 120, height: 120 }}>
          <svg viewBox="0 0 120 120" width="120" height="120" style={{ position: 'absolute', inset: 0 }}>
            <circle cx="60" cy="60" r="54" fill="none" stroke={C.negativeBorder} strokeWidth="6" />
            <circle cx="60" cy="60" r="54" fill="none" stroke={C.negative} strokeWidth="6"
              strokeDasharray={`${(countdown / 60) * 339} 339`}
              strokeLinecap="round" transform="rotate(-90 60 60)"
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ ...sc(L.SM, lf), color: C.negative }}>{countdown}</span>
          </div>
        </div>
        <p style={{ ...sc(B.XS, lf), color: C.negative }}>초 후 주문이 취소됩니다</p>

        <button onClick={confirmCardPayment} disabled={ordering} style={{
          padding: '26px 56px', borderRadius: 20,
          background: ordering ? C.border : C.positive,
          color: ordering ? C.textMuted : C.positiveText,
          border: 'none', ...sc(L.XS, lf), cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
        }}>
          <CheckCircle size={28} /> {ordering ? '처리 중...' : '결제 완료 (시뮬레이션)'}
        </button>
      </div>

      <button onClick={() => nav('/kiosk')} style={{
        padding: '26px', borderRadius: 20,
        background: T.bg, color: T.sub, border: `2px solid ${T.border}`,
        ...sc(L.XS, lf), cursor: 'pointer', marginTop: 20,
      }}>결제 취소</button>
    </Screen>
  )

  // ─── COMPLETE ─────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh', background: T.bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '60px 48px', gap: 36,
      fontFamily: FF,
    }}>
      <div style={{
        width: 160, height: 160, borderRadius: '50%',
        background: C.positive,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: hc ? `0 0 0 6px ${C.positiveBorder}` : '0 0 0 20px #dcfce7',
      }}>
        <CheckCircle size={52} color={C.positiveText} strokeWidth={1.5} />
      </div>

      <div style={{ textAlign: 'center' }}>
        <h2 style={{ ...sc(H.MD, lf), color: T.text, marginBottom: 16 }}>
          주문이 완료되었습니다!
        </h2>
        <p style={{ ...sc(BM.SM, lf), color: T.sub }}>
          3번 진동벨로<br />준비되면 알려드릴게요
        </p>
      </div>

      <div style={{
        width: 130, height: 130, borderRadius: '50%',
        background: C.warningBg,
        border: `3px solid ${hc ? C.primary : '#fed7aa'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Coffee size={52} color={hc ? C.primary : '#f97316'} strokeWidth={1.5} />
      </div>

      <div style={{
        background: C.positiveBg,
        border: `2px solid ${hc ? C.positive : C.positiveBorder}`,
        borderRadius: 18, padding: '20px 36px',
        ...sc(BM.XS, lf), color: C.positive,
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <Smile size={28} color={C.positive} />
        <span>맛있게 준비해 드릴게요!</span>
      </div>

      <button onClick={() => nav('/kiosk')} style={{
        width: '100%', padding: '32px', borderRadius: 24,
        background: T.primary, color: T.primaryText,
        border: 'none', ...sc(L.SM, lf), cursor: 'pointer', marginTop: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
      }}>
        <Home size={28} /> 처음으로
      </button>
    </div>
  )
}

// ─── Screen wrapper ───────────────────────────────────────────────
function Screen({ title, children, T, lf, onBack }) {
  return (
    <div style={{
      minHeight: '100vh', background: T.bg,
      display: 'flex', flexDirection: 'column',
      fontFamily: FF,
    }}>
      <div style={{
        padding: '28px 36px', textAlign: 'center',
        background: T.card, borderBottom: `2px solid ${T.border}`,
        position: 'relative',
      }}>
        {onBack && (
          <button onClick={onBack} style={{
            position: 'absolute', left: 36, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center',
          }}>
            <ArrowLeft size={28} color={T.sub} />
          </button>
        )}
        <span style={{ ...sc(B.SM, lf), color: T.text }}>{title}</span>
      </div>
      <div data-kiosk-scroll style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '40px 36px 56px', overflow: 'auto' }}>
        {children}
      </div>
    </div>
  )
}

function PayMethodCard({ icon, title, desc, selected, onClick, T, lf }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', padding: '36px 32px', borderRadius: 24,
      background: selected ? T.primaryBg : T.card,
      border: `3px solid ${selected ? T.primary : T.border}`,
      cursor: 'pointer', textAlign: 'left',
      display: 'flex', alignItems: 'center', gap: 28,
      transition: 'all 0.15s',
    }}>
      <div style={{
        width: 88, height: 88, borderRadius: 22,
        background: selected ? T.primaryBgMid : T.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: B.XS.fontSize * lf, fontWeight: 600, lineHeight: 1.4, color: T.text, marginBottom: 8 }}>{title}</div>
        <div style={{ ...sc(BM.XS, lf), color: T.sub }}>{desc}</div>
      </div>
      {selected && (
        <div style={{ marginLeft: 'auto' }}>
          <Check size={28} color={T.primary} />
        </div>
      )}
    </button>
  )
}
