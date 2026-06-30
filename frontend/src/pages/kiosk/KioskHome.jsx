import { useNavigate } from 'react-router-dom'

export default function KioskHome() {
  const nav = useNavigate()
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', fontFamily: 'var(--font-sans)',
      gap: '2rem', padding: '2rem', textAlign: 'center',
    }}>
      <div style={{ fontSize: '5rem', lineHeight: 1 }}>🎵</div>

      <div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '3rem', color: 'var(--ink)', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
          아날로그
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '1.1rem' }}>
          음성이나 채팅으로 편하게 주문하세요
        </p>
      </div>

      <button
        onClick={() => nav('/kiosk/order')}
        style={{
          background: 'var(--rust)', color: '#fff', border: 'none',
          borderRadius: '999px', padding: '1.25rem 3.5rem', fontSize: '1.4rem',
          cursor: 'pointer', fontWeight: 700, letterSpacing: '0.05em',
          boxShadow: '0 4px 16px rgba(193,84,44,0.3)',
          transition: 'transform 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        주문 시작
      </button>

      <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
        버튼을 누르고 원하시는 메뉴를 말씀해 주세요
      </p>
    </div>
  )
}
