import { useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'

const NAV = [
  { to: 'menus',  label: '메뉴 관리' },
  { to: 'faq',    label: 'FAQ 관리' },
  { to: 'store',  label: '매장 정보' },
  { to: 'orders', label: '주문 내역' },
]

export default function AdminLayout() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!localStorage.getItem('admin_token')) {
      navigate('/admin/login', { replace: true })
    }
  }, [navigate])

  const logout = () => {
    localStorage.removeItem('admin_token')
    navigate('/admin/login', { replace: true })
  }

  return (
    <div style={{ display: 'flex', minHeight: '100%', fontFamily: 'sans-serif' }}>
      <nav style={{
        width: 200, background: '#1a56a0', color: '#fff',
        padding: '24px 0', display: 'flex', flexDirection: 'column', gap: 4,
        flexShrink: 0,
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
        <div style={{ marginTop: 'auto', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <NavLink to="/kiosk" style={{ color: '#cce0ff', fontSize: 13 }}>
            키오스크 화면 →
          </NavLink>
          <button onClick={logout} style={{
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff', borderRadius: 6, padding: '8px 0',
            cursor: 'pointer', fontSize: 13, width: '100%',
          }}>
            로그아웃
          </button>
        </div>
      </nav>

      <main style={{ flex: 1, padding: 32, background: '#f8fafc', overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  )
}
