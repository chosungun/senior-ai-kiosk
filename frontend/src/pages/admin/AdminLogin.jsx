import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminLogin } from '../../api'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await adminLogin(username, password)
      localStorage.setItem('admin_token', res.data.access_token)
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail || '로그인에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f8fafc', fontFamily: 'sans-serif',
    }}>
      <form onSubmit={handleSubmit} style={{
        background: '#fff', borderRadius: 12, padding: '40px 36px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)', width: 340,
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1a56a0' }}>어드민 로그인</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>아이디</label>
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="아이디를 입력하세요"
            autoComplete="username"
            required
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="비밀번호를 입력하세요"
            autoComplete="current-password"
            required
            style={inputStyle}
          />
        </div>

        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: 8, padding: '10px 14px',
            color: '#dc2626', fontSize: 13,
          }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} style={{
          marginTop: 4, padding: '12px 0', borderRadius: 8,
          background: loading ? '#93c5fd' : '#1a56a0', color: '#fff',
          border: 'none', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
        }}>
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>
    </div>
  )
}

const inputStyle = {
  padding: '10px 12px', borderRadius: 8,
  border: '1.5px solid #d1d5db', fontSize: 14,
  outline: 'none', width: '100%', boxSizing: 'border-box',
}
