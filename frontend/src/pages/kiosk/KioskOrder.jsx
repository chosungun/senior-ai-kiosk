import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Home, X, ShoppingCart, Flame, Snowflake,
  Plus, Minus, Trash2, Coffee, Milk, CupSoda, Cake, Check, ChevronRight,
} from 'lucide-react'
import { getMenus } from '../../api'
import { useA11y } from '../../context/AccessibilityContext'
import { getC } from '../../styles/colors'
import { FF, H, B, BM, L, NAV, sc } from '../../styles/typography'
import { FALLBACK } from '../../constants/menus'

const TABS = ['커피', '논커피', '티/에이드', '디저트']
const fmt = n => n.toLocaleString() + '원'

const CATEGORY_ICON = { '커피': Coffee, '논커피': Milk, '티/에이드': CupSoda, '디저트': Cake }
const CATEGORY_STYLE = {
  '커피':      { icon: '#9C7A50' },
  '논커피':    { icon: '#C98A4B' },
  '티/에이드': { icon: '#3FA88B' },
  '디저트':    { icon: '#D6789B' },
}

function mapPreItems(preItems, menus) {
  const norm = s => (s || '').replace(/따뜻한\s*|아이스\s*/g, '').replace(/\s+/g, '').toLowerCase()
  return preItems.map((pi, i) => {
    const found = menus.find(m =>
      m.name === pi.menu || m.name.includes(pi.menu || '') ||
      (pi.menu || '').includes(m.name) || norm(m.name) === norm(pi.menu)
    )
    if (!found) return null
    const tempOpt = pi.options?.find(o => o.name === '온도')
    const hasTempOption = (found.options || []).some(o => o.name === '온도')
    const tempLabel = tempOpt
      ? (tempOpt.value === 'HOT' ? 'HOT' : 'ICE')
      : (hasTempOption || found.hasTemp ? 'HOT' : null)
    const temp = tempLabel === 'HOT' ? '따뜻하게' : tempLabel === 'ICE' ? '시원하게' : null
    const selectedOptions = tempLabel ? { '온도': { label: tempLabel, price: 0 } } : {}
    return {
      id: `${found.id}-${Date.now()}-${i}`,
      menuId: found.id, name: found.name, price: found.price,
      qty: pi.qty || 1, temp, selectedOptions, img: found.img,
    }
  }).filter(Boolean)
}

export default function KioskOrder() {
  const nav = useNavigate()
  const location = useLocation()
  const { highContrast, largeFont } = useA11y()

  const [menus, setMenus]               = useState(FALLBACK)
  const [tab, setTab]                   = useState('커피')
  const [cart, setCart]                 = useState([])
  const [detail, setDetail]             = useState(null)
  const [detailOptions, setDetailOptions] = useState({})
  const [detailQty, setDetailQty]       = useState(1)
  const [showCart, setShowCart]         = useState(false)
  const [agentBanner, setAgentBanner]   = useState(location.state?.agentReply || '')

  const hc = highContrast
  const lf = largeFont ? 1.2 : 1
  const C = getC(hc)
  const T = {
    bg: C.bg, card: C.card, cardAlt: C.cardAlt, border: C.border,
    text: C.text, sub: C.textSub, muted: C.textMuted,
    primary: C.primary, primaryText: C.primaryText,
    tabActive: C.primary, tabInactive: C.textMuted,
    badgeRed: C.negative,
  }

  useEffect(() => {
    getMenus()
      .then(({ data }) => {
        if (!data?.length) return
        const norm = s => s.replace(/따뜻한\s*|아이스\s*/g, '').replace(/\s+/g, '').toLowerCase()
        setMenus(FALLBACK.map(fb => {
          const api = data.find(m =>
            m.name === fb.name || m.id === fb.id || norm(m.name) === norm(fb.name)
          )
          return api ? { ...fb, price: api.price ?? fb.price, options: api.options ?? [] } : fb
        }))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    // Items from voice order on KioskHome (already resolved)
    const resolvedItems = location.state?.resolvedItems
    if (resolvedItems?.length) { setCart(resolvedItems); return }

    // Items from legacy preItems format
    const preItems = location.state?.preItems || []
    if (!preItems.length) return
    const items = mapPreItems(preItems, menus)
    if (items.length) setCart(items)
  }, [menus])

  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const cartCount = cart.reduce((s, i) => s + i.qty, 0)
  const tabMenus  = Object.fromEntries(TABS.map(t => [t, menus.filter(m => m.category === t)]))

  const openDetail = (item) => {
    const defaults = {}
    ;(item.options || []).forEach(opt => {
      if (opt.choices?.length > 0) defaults[opt.name] = opt.choices[0]
    })
    setDetail(item); setDetailOptions(defaults); setDetailQty(1)
  }

  const addToCart = () => {
    const optionExtra = Object.values(detailOptions).reduce((s, o) => s + (o.price || 0), 0)
    const tempChoice = detailOptions['온도']
    const temp = tempChoice?.label === 'HOT' ? '따뜻하게' : tempChoice?.label === 'ICE' ? '시원하게' : null
    const item = {
      id: `${detail.id}-${Date.now()}`,
      menuId: detail.id, name: detail.name,
      price: detail.price + optionExtra,
      qty: detailQty, temp,
      selectedOptions: { ...detailOptions }, img: detail.img,
    }
    setCart(prev => {
      const key = JSON.stringify(item.selectedOptions)
      const same = prev.find(c => c.menuId === item.menuId && JSON.stringify(c.selectedOptions || {}) === key)
      if (same) return prev.map(c => c.id === same.id ? { ...c, qty: c.qty + item.qty } : c)
      return [...prev, item]
    })
    setDetail(null)
  }

  const changeQty = (id, delta) =>
    setCart(prev => prev.map(c => c.id === id ? { ...c, qty: Math.max(1, c.qty + delta) } : c))
  const removeItem = (id) => setCart(prev => prev.filter(c => c.id !== id))

  // ── Cart screen ────────────────────────────────────────────────────
  if (showCart) return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: T.bg, fontFamily: FF }}>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 36px', background: T.card, borderBottom: `2px solid ${T.border}` }}>
        <button onClick={() => setShowCart(false)} aria-label="뒤로" style={{ width: 72, height: 72, borderRadius: 20, background: T.card, border: `2px solid ${T.border}`, color: T.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
          <ChevronRight size={44} color={T.text} strokeWidth={2} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <span style={{ ...sc(B.SM, lf), color: T.text, letterSpacing: '-0.3px' }}>장바구니 확인</span>
        <div style={{ width: 72 }} />
      </div>

      <div data-kiosk-scroll style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
        {cart.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '120px 40px', color: T.sub, ...BM.SM }}>
            장바구니가 비어있어요
          </div>
        ) : cart.map(item => (
          <div key={item.id} style={{ background: T.card, borderRadius: 24, border: `2px solid ${T.border}`, padding: '28px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ width: 160, height: 160, borderRadius: 24, overflow: 'hidden', background: T.cardAlt, flexShrink: 0 }}>
              {item.img
                ? <img src={item.img} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                : <Coffee size={72} color={T.muted} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ ...sc(B.SM, lf), color: T.text }}>{item.name}</div>
              <div style={{ marginTop: 4 }}>
                {item.selectedOptions
                  ? Object.entries(item.selectedOptions).map(([optName, choice]) => (
                      <div key={optName} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        {optName === '온도' && choice.label === 'HOT' && <Flame size={36} color="#dc2626" />}
                        {optName === '온도' && choice.label === 'ICE' && <Snowflake size={36} color="#0ea5e9" />}
                        <span style={{ ...BM.SM, color: T.sub }}>
                          {choice.label === 'HOT' ? '따뜻하게' : choice.label === 'ICE' ? '시원하게' : choice.label}
                          {choice.price > 0 && ` +${choice.price.toLocaleString()}원`}
                        </span>
                      </div>
                    ))
                  : item.temp && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {item.temp === '따뜻하게' ? <Flame size={36} color="#dc2626" /> : <Snowflake size={36} color="#0ea5e9" />}
                        <span style={{ ...BM.SM, color: T.sub }}>{item.temp}</span>
                      </div>
                    )
                }
              </div>
              <div style={{ ...sc(B.SM, lf), color: T.text, marginTop: 8 }}>{fmt(item.price)}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button onClick={() => changeQty(item.id, -1)} style={{ width: 72, height: 72, borderRadius: '50%', background: T.bg, border: `2px solid ${T.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Minus size={32} color={T.text} />
              </button>
              <span style={{ ...sc(B.SM, lf), color: T.text, minWidth: 40, textAlign: 'center' }}>{item.qty}</span>
              <button onClick={() => changeQty(item.id, 1)} style={{ width: 72, height: 72, borderRadius: '50%', background: T.primary, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={32} color={T.primaryText} />
              </button>
            </div>
            <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
              <Trash2 size={32} color={T.muted} />
            </button>
          </div>
        ))}
      </div>

      <div style={{ flexShrink: 0, padding: '28px 36px', background: T.card, borderTop: `2px solid ${T.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <span style={{ ...sc(B.SM, lf), color: T.sub }}>총 주문 금액</span>
          <span style={{ ...sc(L.MD, lf), color: T.primary }}>{fmt(cartTotal)}</span>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <button onClick={() => setShowCart(false)} style={{ flex: 1, padding: '28px', borderRadius: 20, background: T.bg, color: T.text, border: `2px solid ${T.border}`, ...sc(L.SM, lf), cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <Plus size={32} /> 메뉴 추가
          </button>
          <button onClick={() => nav('/kiosk/payment', { state: { cart, total: cartTotal } })} disabled={!cart.length} style={{ flex: 2, padding: '28px', borderRadius: 20, background: cart.length ? T.primary : T.border, color: cart.length ? T.primaryText : T.muted, border: 'none', ...sc(L.SM, lf), cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            주문 확인 <ChevronRight size={32} />
          </button>
        </div>
      </div>
    </div>
  )

  // ── Main menu screen ───────────────────────────────────────────────
  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: T.bg, fontFamily: FF, position: 'relative', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 36px', background: T.card, borderBottom: `2px solid ${T.border}` }}>
        <button onClick={() => nav('/kiosk')} aria-label="처음으로" style={{ width: 72, height: 72, borderRadius: 20, background: T.card, border: `2px solid ${T.border}`, color: T.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
          <Home size={44} color={T.text} strokeWidth={2} />
        </button>
        <span style={{ ...sc(B.SM, lf), color: T.text, letterSpacing: '-0.3px' }}>메뉴 주문</span>
        <div style={{ width: 72 }} />
      </div>

      {/* AI banner */}
      {agentBanner && (
        <div style={{ flexShrink: 0, background: C.primaryBg, borderBottom: `2px solid ${C.primaryBorder}`, padding: '20px 36px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1, ...sc(BM.XS, lf), color: C.text }}>{agentBanner}</div>
          <button onClick={() => setAgentBanner('')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={32} color={C.textMuted} /></button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ flexShrink: 0, display: 'flex', gap: 10, padding: '18px 28px 20px', background: T.card, borderBottom: `2px solid ${T.border}` }}>
        {TABS.map(t => {
          const active = tab === t
          return (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '20px 8px', border: 'none', borderRadius: 18, cursor: 'pointer',
              background: active ? T.tabActive : 'transparent',
              color: active ? T.primaryText : T.tabInactive,
              ...sc(NAV.SB, lf),
              fontWeight: active ? 600 : 500,
              boxShadow: active && !hc ? '0 6px 18px rgba(37,99,235,0.28)' : 'none',
              transition: 'background-color .18s ease, color .18s ease',
            }}>{t}</button>
          )
        })}
      </div>

      {/* Menu grid */}
      <div data-kiosk-scroll style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
          {(tabMenus[tab] || []).map(item => (
            <MenuCard key={item.id} item={item} onAdd={openDetail} T={T} lf={lf} hc={hc} />
          ))}
        </div>
      </div>

      {/* Cart bar — only when items exist */}
      {cart.length > 0 && (
        <div style={{ flexShrink: 0, background: T.card, borderTop: `2px solid ${T.border}`, padding: '20px 36px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => setShowCart(true)} style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'none', border: 'none', cursor: 'pointer', flex: 1 }}>
            <div style={{ position: 'relative' }}>
              <ShoppingCart size={58} color={T.text} />
              <span style={{ position: 'absolute', top: -10, right: -10, width: 34, height: 34, borderRadius: '50%', background: T.badgeRed, color: '#fff', fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{cartCount}</span>
            </div>
            <div>
              <div style={{ ...BM.XS, color: T.sub }}>총 결제금액</div>
              <div style={{ ...sc(L.XS, lf), color: T.primary }}>{fmt(cartTotal)}</div>
            </div>
          </button>
          <button onClick={() => setShowCart(true)} style={{ padding: '24px 44px', borderRadius: 18, background: T.primary, color: T.primaryText, border: 'none', ...sc(L.XS, lf), cursor: 'pointer' }}>
            주문하기
          </button>
        </div>
      )}



      {/* Detail modal */}
      {detail && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 70, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end' }} onClick={e => e.target === e.currentTarget && setDetail(null)}>
          <div style={{ width: '100%', background: C.card, borderRadius: '36px 36px 0 0', padding: '48px 44px 64px' }}>
            <div style={{ display: 'flex', gap: 28, marginBottom: 36 }}>
              <div style={{ width: 160, height: 160, borderRadius: 24, overflow: 'hidden', background: C.cardAlt, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {detail.img
                  ? <img src={detail.img} alt={detail.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  : <Coffee size={52} color={C.textMuted} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ ...sc(B.SM, lf), color: C.text, marginBottom: 10 }}>{detail.name}</div>
                <div style={{ ...BM.XS, color: C.textSub }}>{detail.description}</div>
                <div style={{ ...sc(L.XS, lf), color: C.text, marginTop: 14 }}>{fmt(detail.price)}</div>
              </div>
            </div>

            {(detail.options || []).map(opt => {
              const isTempOpt = opt.name === '온도'
              return (
                <div key={opt.name} style={{ marginBottom: 28 }}>
                  <div style={{ ...B.XS, color: C.textSub, marginBottom: 16 }}>{opt.name} 선택</div>
                  <div style={{ display: 'flex', gap: 14 }}>
                    {opt.choices.map(choice => {
                      const isSelected = detailOptions[opt.name]?.label === choice.label
                      const accentColor = isTempOpt && choice.label === 'HOT' ? '#dc2626'
                                        : isTempOpt && choice.label === 'ICE' ? '#0ea5e9' : null
                      const displayLabel = choice.label === 'HOT' ? '따뜻하게'
                                         : choice.label === 'ICE' ? '시원하게' : choice.label
                      return (
                        <button key={choice.label}
                          onClick={() => setDetailOptions(prev => ({ ...prev, [opt.name]: choice }))}
                          style={{
                            flex: 1, padding: '20px 12px', borderRadius: 18,
                            background: isSelected ? (accentColor || C.primary) : C.bg,
                            color: isSelected ? '#fff' : C.text,
                            border: 'none', ...sc(NAV.SB, lf), cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          }}
                        >
                          {isTempOpt && choice.label === 'HOT' && <Flame size={28} />}
                          {isTempOpt && choice.label === 'ICE' && <Snowflake size={28} />}
                          <span>{displayLabel}{choice.price > 0 && ` +${choice.price.toLocaleString()}원`}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            <div style={{ marginBottom: 40 }}>
              <div style={{ ...B.XS, color: C.textSub, marginBottom: 16 }}>수량</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
                <button onClick={() => setDetailQty(q => Math.max(1, q - 1))} style={{ width: 72, height: 72, borderRadius: '50%', background: C.bg, border: `2px solid ${C.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Minus size={28} color={C.text} />
                </button>
                <span style={{ ...sc(L.SM, lf), color: C.text, minWidth: 56, textAlign: 'center' }}>{detailQty}</span>
                <button onClick={() => setDetailQty(q => q + 1)} style={{ width: 72, height: 72, borderRadius: '50%', background: C.primary, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={28} color={C.primaryText} />
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
              <button onClick={() => setDetail(null)} style={{ flex: 1, padding: '28px', borderRadius: 20, background: C.bg, color: C.text, border: `2px solid ${C.border}`, ...sc(L.XS, lf), cursor: 'pointer' }}>
                취소
              </button>
              <button onClick={addToCart} style={{ flex: 2, padding: '28px', borderRadius: 20, background: C.primary, color: C.primaryText, border: 'none', ...sc(L.XS, lf), cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <ShoppingCart size={28} /> 장바구니 담기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MenuCard({ item, onAdd, T, lf, hc }) {
  const Icon = CATEGORY_ICON[item.category] || Coffee
  const style = CATEGORY_STYLE[item.category] || { icon: '#94A3B8' }
  const tint = T.cardAlt
  const iconColor = hc ? T.muted : style.icon

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      background: T.card, borderRadius: 26, border: `2px solid ${T.border}`, overflow: 'hidden',
      boxShadow: hc ? 'none' : '0 4px 20px rgba(17,26,48,0.06)',
      cursor: 'pointer',
    }} onClick={() => onAdd(item)}>
      <div style={{ height: 260, background: tint, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
        {item.img
          ? <img src={item.img} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          : (
            <>
              <Icon size={72} color={iconColor} strokeWidth={1.7} />
              <span style={{
                position: 'absolute', bottom: 12, right: 16,
                fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 14, letterSpacing: '0.5px',
                color: iconColor, opacity: 0.55,
              }}>PHOTO</span>
            </>
          )}
      </div>
      <div style={{ padding: '20px 22px 22px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ fontSize: 38 * lf, fontWeight: 700, lineHeight: 1.4, color: T.text, marginBottom: 6 }}>{item.name}</div>
        <div style={{ fontSize: 26 * lf, fontWeight: 400, lineHeight: 1.4, color: T.sub, marginBottom: 16, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{item.description}</div>
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: L.XS.fontSize * lf, fontWeight: 600, lineHeight: 1.2, color: T.text }}>{fmt(item.price)}</span>
          <button onClick={e => { e.stopPropagation(); onAdd(item) }} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '16px 26px', borderRadius: 16,
            background: T.primary, color: T.primaryText, border: 'none',
            ...sc(NAV.SB, lf), fontWeight: 700, cursor: 'pointer',
          }}>
            <Check size={26} strokeWidth={2.6} />
            담기
          </button>
        </div>
      </div>
    </div>
  )
}
