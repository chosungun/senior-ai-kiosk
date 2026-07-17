import { Delete } from 'lucide-react'
import { FF } from '../styles/typography'

const NUMPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'back'],
]

export function formatPhoneDigits(digits) {
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`
}

export default function NumericKeypad({ C, lf, onDigit, onBackspace }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
      {NUMPAD_ROWS.map((row, ri) => (
        <div key={ri} style={{ display: 'flex', gap: 10 }}>
          {row.map((key, ki) => key === '' ? (
            <div key={ki} style={{ flex: 1 }} />
          ) : (
            <button
              key={ki}
              onClick={() => key === 'back' ? onBackspace() : onDigit(key)}
              style={{
                flex: key === 'back' ? 2 : 1, padding: '18px 0', borderRadius: 18,
                background: C.card, border: `2px solid ${C.borderMid}`,
                color: C.text, cursor: 'pointer', fontFamily: FF,
                fontSize: 32 * lf, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {key === 'back' ? <Delete size={30} color={C.textSub} /> : key}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
