import { Check } from 'lucide-react'

// ── 단계 인디케이터 (음성 주문 / 결제 화면 등에서 공용) ──────────────
export default function StepIndicator({ steps, current, C, lf }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: '28px 0 0' }}>
      {steps.map((s, i) => {
        const done = s.n < current
        const active = s.n === current
        return (
          <div key={s.n} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{
                width: 68, height: 68, borderRadius: '50%', flexShrink: 0,
                background: done ? C.primaryBg : active ? C.primary : 'transparent',
                border: `3px solid ${done ? C.primaryBg : active ? C.primary : C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {done
                  ? <Check size={34} color={C.primary} strokeWidth={3} />
                  : <span style={{ fontSize: 30 * lf, fontWeight: 700, color: active ? C.primaryText : C.textMuted }}>{s.n}</span>
                }
              </div>
              <span style={{
                fontSize: 36 * lf, fontWeight: done || active ? 600 : 500,
                color: done || active ? C.text : C.textMuted, whiteSpace: 'nowrap',
              }}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ width: 56, height: 3, background: C.border, margin: '0 22px' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
