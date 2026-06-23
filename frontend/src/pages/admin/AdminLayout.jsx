import { Outlet, NavLink } from 'react-router-dom'

const NAV = [
  { to: 'menus',  label: '메뉴 관리' },
  { to: 'faq',    label: 'FAQ 관리' },
  { to: 'store',  label: '매장 정보' },
  { to: 'orders', label: '주문 내역' },
]

export default function AdminLayout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      {/* 사이드바 */}
      <nav style={{
        width: 200, background: '#1a56a0', color: '#fff',
        padding: '24px 0', display: 'flex', flexDirection: 'column', gap: 4
      }}>
        <div style={{ padding: '0 20px 20px', fontWeight: 600, fontSize: 16 }}>
          어드민
        </div>
        {NAV.map(n => (
          <NavLink key={n.to} to={n.to} style={({ isActive }) => ({
            display: 'block', padding: '10px 20px', color: '#fff',
            textDecoration: 'none',
            background: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
            borderRadius: 4,
          })}>
            {n.label}
          </NavLink>
        ))}
        <div style={{ marginTop: 'auto', padding: '0 20px' }}>
          <NavLink to="/kiosk" style={{ color: '#cce0ff', fontSize: 13 }}>
            키오스크 화면 →
          </NavLink>
        </div>
      </nav>

      {/* 컨텐츠 */}
      <main style={{ flex: 1, padding: 32, background: '#f8fafc' }}>
        <Outlet />
      </main>
    </div>
  )
}
