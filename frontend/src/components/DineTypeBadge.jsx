import { Utensils, ShoppingBag } from 'lucide-react'

// 헤더에 표시하는 매장/포장 선택 배지
export default function DineTypeBadge({ type, C, lf }) {
  if (!type) return null
  const Icon = type === 'takeout' ? ShoppingBag : Utensils
  const label = type === 'takeout' ? '포장' : '매장'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '16px 26px', borderRadius: 999,
      background: C.primaryBg, border: `2px solid ${C.primaryBorder}`,
      whiteSpace: 'nowrap',
    }}>
      <Icon size={32} color={C.primary} strokeWidth={2.2} />
      <span style={{ fontSize: 32 * lf, fontWeight: 700, color: C.primary }}>{label}</span>
    </div>
  )
}
