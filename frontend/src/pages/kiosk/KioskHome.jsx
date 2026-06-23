import { useNavigate } from 'react-router-dom'

export default function KioskHome() {
  const nav = useNavigate()
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#f0f4ff', fontFamily: 'sans-serif', gap: 24
    }}>
      <h1 style={{ color: '#1a56a0', fontSize: 32 }}>안녕하세요!</h1>
      <p style={{ color: '#64748b' }}>드시고 싶은 메뉴를 편하게 말씀해 주세요.</p>
      <button
        onClick={() => nav('/kiosk/order')}
        style={{
          background: '#1a56a0', color: '#fff', border: 'none',
          borderRadius: 16, padding: '18px 40px', fontSize: 18,
          cursor: 'pointer', fontWeight: 500
        }}>
        음성으로 주문하기
      </button>
    </div>
  )
}
