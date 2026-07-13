import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  ArrowLeft, Home, CreditCard, Smartphone, Banknote,
  Check, Receipt, X, Loader2, Coffee,
} from 'lucide-react'
import { createOrder } from '../../api'
import { useA11y } from '../../context/AccessibilityContext'
import { getC } from '../../styles/colors'
import { FF, B, BM, L, sc } from '../../styles/typography'
import ScreenHeader, { HeaderIconButton } from '../../components/ScreenHeader'
import StepIndicator from '../../components/StepIndicator'

const fmt = n => n.toLocaleString() + '원'

const optionLabel = (name, choice) => name === '온도'
  ? (choice.label === 'HOT' ? '따뜻하게' : choice.label === 'ICE' ? '시원하게' : choice.label)
  : choice.label

const unitOf = item => (item.temp || item.selectedOptions?.['온도']) ? '잔' : '개'

const PAY_STEPS = [
  { n: 1, label: '주문확인' },
  { n: 2, label: '결제' },
  { n: 3, label: '완료' },
]

const PAY_METHODS = [
  { key: 'card',   label: '카드 결제', icon: CreditCard },
  { key: 'simple', label: '간편 결제 (삼성페이 등)', icon: Smartphone },
  { key: 'cash',   label: '현금 결제', icon: Banknote },
]

export default function KioskPayment() {
  const nav = useNavigate()
  const location = useLocation()
  const { highContrast, largeFont } = useA11y()

  const [cart, setCart] = useState(location.state?.cart || [])
  const [payStep, setPayStep] = useState('summary')
  const [payMethod, setPayMethod] = useState(null)
  const [pointChoice, setPointChoice] = useState(null)
  const [phone, setPhone] = useState('')
  const [receiptChoice, setReceiptChoice] = useState(null)
  const [paying, setPaying] = useState(false)
  const [orderNum, setOrderNum] = useState(null)
  const [paidTotal, setPaidTotal] = useState(0)

  const hc = highContrast
  const lf = largeFont ? 1.2 : 1
  const C = getC(hc)
  const T = {
    bg: C.bg, card: C.card, border: C.border,
    text: C.text, sub: C.textSub,
    primary: C.primary, primaryText: C.primaryText,
    primaryBg: C.primaryBg, primaryBgMid: C.primaryBgMid,
  }

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const stepIdx = payStep === 'summary' ? 0 : payStep === 'method' ? 1 : 2

  const removeItem = i => setCart(prev => prev.filter((_, idx) => idx !== i))

  const goBack = () => {
    if (payStep === 'method') setPayStep('summary')
    else nav(-1)
  }

  const confirmPay = async () => {
    if (!payMethod || paying || !pointChoice) return
    setPaying(true)
    try { await createOrder({ items: cart, total, payment_method: payMethod }) } catch { /* best effort */ }
    setOrderNum('#' + String(Math.floor(1000 + Math.random() * 9000)))
    setPaidTotal(total)
    setCart([])
    setPaying(false)
    setPayStep('receipt')
  }

  const finishReceipt = choice => {
    setReceiptChoice(choice)
    setPayStep('complete')
  }

  return (
    <div style={{
      height: '100%', background: T.card,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      fontFamily: FF,
    }}>
      <ScreenHeader
        C={C} lf={lf} title="결제"
        left={payStep !== 'receipt' && payStep !== 'complete'
          ? <HeaderIconButton icon={ArrowLeft} onClick={goBack} ariaLabel="뒤로가기" C={C} />
          : null}
      />

      {/* 스텝 인디케이터 (음성 주문 화면과 동일한 형태) */}
      <StepIndicator steps={PAY_STEPS} current={stepIdx + 1} C={C} lf={lf} />

      {/* ── SUMMARY ── */}
      {payStep === 'summary' && (
        cart.length > 0 ? (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '30px 36px 0' }}>
            <div data-kiosk-scroll style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {cart.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 24, padding: '20px 24px',
                  background: T.card, border: `2px solid ${T.border}`, borderRadius: 24,
                }}>
                  <div style={{
                    width: 96, height: 96, borderRadius: 18, overflow: 'hidden',
                    background: C.cardAlt, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {item.img
                      ? <img src={item.img} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      : <Coffee size={44} color={C.textMuted} />
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...sc(B.SM, lf), color: T.text, marginBottom: 8 }}>{item.name}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                      {Object.entries(item.selectedOptions || {}).map(([k, v]) => (
                        <span key={k} style={{ ...sc(BM.SM, lf), color: T.sub }}>{optionLabel(k, v)}</span>
                      ))}
                    </div>
                    <div style={{ ...sc(L.XS, lf), color: T.primary }}>
                      {fmt(item.price)} × {item.qty}{unitOf(item)}
                    </div>
                  </div>
                  <button onClick={() => removeItem(i)} style={{
                    width: 48, height: 48, borderRadius: 14, background: 'none', border: 'none',
                    cursor: 'pointer', flexShrink: 0, alignSelf: 'flex-start',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <X size={26} color={T.sub} />
                  </button>
                </div>
              ))}
            </div>

            <div style={{
              padding: '20px 0 24px', borderTop: `1.5px solid ${C.borderMid}`, marginTop: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ ...sc(B.MD, lf), color: T.sub }}>총 결제금액</span>
              <span style={{ ...sc(L.LG, lf), color: T.text }}>{fmt(total)}</span>
            </div>
            <button onClick={() => setPayStep('method')} style={{
              marginBottom: 28, padding: '26px', borderRadius: 20,
              background: T.primary, color: T.primaryText, border: 'none',
              ...sc(L.SM, lf), cursor: 'pointer',
            }}>
              결제 수단 선택
            </button>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
            <span style={{ ...sc(BM.SM, lf), color: T.sub }}>담긴 메뉴가 없습니다</span>
            <button onClick={() => nav('/kiosk/order')} style={{
              padding: '20px 32px', borderRadius: 18,
              background: T.primary, color: T.primaryText, border: 'none',
              ...sc(L.XS, lf), cursor: 'pointer',
            }}>
              메뉴 담으러 가기
            </button>
          </div>
        )
      )}

      {/* ── METHOD (결제 수단 + 포인트 적립) ── */}
      {payStep === 'method' && (
        <div data-kiosk-scroll style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '26px 36px 0' }}>
          <div style={{ fontSize: 36 * lf, fontWeight: 700, color: T.sub, marginBottom: 20 }}>결제 수단</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {PAY_METHODS.map(m => {
              const selected = payMethod === m.key
              return (
                <button key={m.key} onClick={() => setPayMethod(m.key)} style={{
                  display: 'flex', alignItems: 'center', gap: 26, padding: '32px 36px',
                  borderRadius: 24, cursor: 'pointer', textAlign: 'left',
                  background: selected ? C.primaryBg : T.card,
                  border: `2px solid ${selected ? T.primary : C.borderMid}`,
                }}>
                  <div style={{
                    width: 84, height: 84, borderRadius: 20, background: T.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <m.icon size={40} color={T.primary} />
                  </div>
                  <span style={{ flex: 1, fontSize: 40 * lf, fontWeight: 800, color: T.text }}>{m.label}</span>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    border: `3px solid ${selected ? T.primary : C.borderMid}`,
                    background: selected ? T.primary : 'transparent',
                  }} />
                </button>
              )
            })}
          </div>

          <div style={{ fontSize: 36 * lf, fontWeight: 700, color: T.sub, margin: '36px 0 20px' }}>포인트를 적립하시겠어요?</div>
          <div style={{ display: 'flex', gap: 20 }}>
            <button onClick={() => setPointChoice('yes')} style={{
              flex: 1, textAlign: 'center', padding: '30px 0', borderRadius: 22, cursor: 'pointer',
              background: pointChoice === 'yes' ? C.primaryBg : T.card,
              border: `2px solid ${pointChoice === 'yes' ? T.primary : C.borderMid}`,
              fontSize: 38 * lf, fontWeight: 800, color: pointChoice === 'yes' ? T.primary : T.text,
            }}>
              적립할게요
            </button>
            <button onClick={() => setPointChoice('no')} style={{
              flex: 1, textAlign: 'center', padding: '30px 0', borderRadius: 22, cursor: 'pointer',
              background: pointChoice === 'no' ? C.primaryBg : T.card,
              border: `2px solid ${pointChoice === 'no' ? T.primary : C.borderMid}`,
              fontSize: 38 * lf, fontWeight: 800, color: pointChoice === 'no' ? T.primary : T.text,
            }}>
              괜찮아요
            </button>
          </div>

          {pointChoice === 'yes' && (
            <div style={{ marginTop: 24, padding: 28, borderRadius: 22, border: `1.5px solid ${C.borderMid}`, background: T.card }}>
              <div style={{ fontSize: 32 * lf, fontWeight: 700, color: T.sub, marginBottom: 14 }}>적립할 휴대폰 번호를 입력해 주세요</div>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="010-0000-0000"
                style={{
                  width: '100%', padding: '22px 24px', borderRadius: 16,
                  border: `2px solid ${T.primary}`, background: T.bg,
                  fontSize: 38 * lf, fontWeight: 700, color: T.text, outline: 'none', fontFamily: FF,
                }}
              />
            </div>
          )}

          <div style={{ flex: 1, minHeight: 16 }} />
          <div style={{
            padding: '24px 0 28px', borderTop: `1.5px solid ${C.borderMid}`, marginTop: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 38 * lf, fontWeight: 700, color: T.sub }}>결제 금액</span>
            <span style={{ fontSize: 52 * lf, fontWeight: 900, color: T.text }}>{fmt(total)}</span>
          </div>
          <button
            onClick={confirmPay}
            disabled={!payMethod || !pointChoice || paying}
            style={{
              marginBottom: 28, padding: '32px 0', borderRadius: 22, border: 'none',
              background: (payMethod && pointChoice) ? T.primary : C.borderMid,
              color: (payMethod && pointChoice) ? T.primaryText : C.textMuted,
              fontSize: 40 * lf, fontWeight: 800, cursor: (payMethod && pointChoice) ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
            }}
          >
            {paying && <Loader2 size={36} style={{ animation: 'paySpin 0.8s linear infinite' }} />}
            {paying ? '결제 처리 중...' : '결제하기'}
          </button>
        </div>
      )}

      {/* ── RECEIPT ── */}
      {payStep === 'receipt' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 40, padding: '20px 30px' }}>
          <div style={{
            width: 160, height: 160, borderRadius: '50%', background: C.primaryBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Receipt size={80} color={T.primary} />
          </div>
          <div style={{ fontSize: 48 * lf, fontWeight: 800, color: T.text, textAlign: 'center' }}>영수증을 뽑으시겠어요?</div>
          <div style={{ display: 'flex', gap: 24, width: '100%', maxWidth: 640 }}>
            <button onClick={() => finishReceipt('yes')} style={{
              flex: 1, textAlign: 'center', padding: '36px 0', borderRadius: 24, cursor: 'pointer',
              background: C.primaryBg, border: `2px solid ${T.primary}`,
              fontSize: 40 * lf, fontWeight: 800, color: T.primary,
            }}>
              출력할게요
            </button>
            <button onClick={() => finishReceipt('no')} style={{
              flex: 1, textAlign: 'center', padding: '36px 0', borderRadius: 24, cursor: 'pointer',
              background: T.card, border: `2px solid ${C.borderMid}`,
              fontSize: 40 * lf, fontWeight: 800, color: T.text,
            }}>
              괜찮아요
            </button>
          </div>
        </div>
      )}

      {/* ── COMPLETE ── */}
      {payStep === 'complete' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '20px 30px' }}>
          <div style={{
            width: 200, height: 200, borderRadius: '50%', background: T.primary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'payPop 0.5s ease-out',
          }}>
            <Check size={100} color={T.primaryText} strokeWidth={3} />
          </div>
          <div style={{ marginTop: 14, fontSize: 56 * lf, fontWeight: 900, color: T.text, textAlign: 'center' }}>결제가 완료되었습니다</div>
          <div style={{ fontSize: 36 * lf, fontWeight: 600, color: T.sub }}>주문번호 {orderNum}</div>
          <div style={{ marginTop: 8, fontSize: 44 * lf, fontWeight: 800, color: T.primary }}>{fmt(paidTotal)}</div>
          {pointChoice === 'yes' && (
            <div style={{ marginTop: 6, fontSize: 30 * lf, fontWeight: 600, color: T.sub }}>포인트가 적립되었습니다</div>
          )}
          {receiptChoice === 'yes' && (
            <div style={{ fontSize: 30 * lf, fontWeight: 600, color: T.sub }}>영수증이 출력됩니다</div>
          )}
          <button onClick={() => nav('/kiosk')} style={{
            marginTop: 40, padding: '32px 72px', borderRadius: 22,
            background: T.primary, color: T.primaryText, border: 'none',
            fontSize: 38 * lf, fontWeight: 800, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
          }}>
            <Home size={36} /> 처음으로
          </button>
        </div>
      )}

      <style>{`
        @keyframes paySpin { to { transform: rotate(360deg); } }
        @keyframes payPop  { 0%{transform:scale(0.6);opacity:0} 60%{transform:scale(1.08);opacity:1} 100%{transform:scale(1)} }
      `}</style>
    </div>
  )
}
