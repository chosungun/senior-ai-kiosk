import { FF, B, sc } from '../styles/typography'

// ── 공용 헤더 (터치로 주문하기 화면의 헤더 디자인을 모든 화면에 재사용) ──
export default function ScreenHeader({ left, title, right, C, lf, align = 'center' }) {
  return (
    <div style={{
      flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '24px 36px', background: C.card, borderBottom: `2px solid ${C.border}`,
      fontFamily: FF, gap: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: left ? 72 : 0 }}>{left}</div>
      <span style={{
        ...sc(B.SM, lf), color: C.text, letterSpacing: '-0.3px',
        flex: 1, textAlign: align, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {title}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 72, justifyContent: 'flex-end' }}>{right}</div>
    </div>
  )
}

// ── 헤더용 아이콘 버튼 (둥근 사각형, 카드 배경 + 테두리) ──────────────
export function HeaderIconButton({ icon: Icon, onClick, active, badge, C, size = 44, ariaLabel }) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        position: 'relative',
        width: 72, height: 72, borderRadius: 20,
        background: active ? C.primaryBg : C.card,
        border: `2px solid ${active ? C.primary : C.border}`,
        cursor: 'pointer', padding: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Icon size={size} color={active ? C.primary : C.text} strokeWidth={2} />
      {badge > 0 && (
        <span style={{
          position: 'absolute', top: -8, right: -8,
          minWidth: 28, height: 28, borderRadius: 14, padding: '0 6px',
          background: C.primary, color: C.primaryText,
          fontSize: 16, fontWeight: 700, lineHeight: '28px', textAlign: 'center',
        }}>
          {badge}
        </span>
      )}
    </button>
  )
}
