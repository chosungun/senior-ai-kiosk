import { useState, useEffect } from 'react'
import { getStore, updateStore } from '../../api'

export default function AdminStore() {
  const [form, setForm] = useState({
    name: '', open_time: '', close_time: '',
    notice: '', parking_info: '', wifi_info: ''
  })

  useEffect(() => {
    getStore().then(({ data }) => setForm(f => ({ ...f, ...data }))).catch(() => {})
  }, [])

  const save = () => updateStore(form).then(() => alert('저장됐어요!'))

  const field = (label, key, placeholder, multiline = false) => (
    <div>
      <label style={lbl}>{label}</label>
      {multiline
        ? <textarea style={{ ...inp, height: 72, resize: 'vertical' }}
            value={form[key] || ''}
            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            placeholder={placeholder} />
        : <input style={inp} value={form[key] || ''}
            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            placeholder={placeholder} />
      }
    </div>
  )

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>매장 정보</h2>
      <p style={{ color: '#64748b', marginBottom: 24, fontSize: 14 }}>
        여기 입력한 내용을 AI가 고객 질문에 활용해요.
      </p>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {field('매장명', 'name', '온누리카페 성수역점')}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>{field('오픈', 'open_time', '09:00')}</div>
            <div style={{ flex: 1 }}>{field('마감', 'close_time', '22:00')}</div>
          </div>
        </div>
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {field('오늘의 공지 (품절 안내 등)', 'notice', '오늘 녹차라떼 품절이에요!', true)}
          {field('주차 안내', 'parking_info', '건물 지하 2시간 무료, 이후 10분당 500원', true)}
          {field('와이파이 정보', 'wifi_info', 'SSID: Onuri_Cafe / PW: onuri1234', true)}
        </div>
        <button onClick={save} style={{ ...btnPrimary, marginTop: 20 }}>저장</button>
      </div>
    </div>
  )
}

const lbl = { display: 'block', fontSize: 13, color: '#64748b', marginBottom: 4 }
const inp = { width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }
const btnPrimary = { background: '#1a56a0', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 14 }
