import { useState, useEffect } from 'react'
import { getOrders } from '../../api'

export default function AdminOrders() {
  const [orders, setOrders] = useState([])

  useEffect(() => {
    getOrders().then(({ data }) => setOrders(data)).catch(() => {})
  }, [])

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>주문 내역</h2>
      {orders.length === 0
        ? <p style={{ color: '#94a3b8' }}>아직 주문이 없어요.</p>
        : orders.map(o => (
            <div key={o.id} style={{
              background: '#fff', border: '1px solid #e2e8f0',
              borderRadius: 10, padding: '14px 20px', marginBottom: 8,
              display: 'flex', alignItems: 'center', gap: 16
            }}>
              <span style={{ fontWeight: 500 }}>#{o.id}</span>
              <span style={{ flex: 1, color: '#64748b', fontSize: 13 }}>
                {o.items?.map(i => i.menu).join(', ')}
              </span>
              <span style={{ fontWeight: 500 }}>{Number(o.total).toLocaleString()}원</span>
              <span style={{
                fontSize: 12, padding: '3px 8px', borderRadius: 6,
                background: o.status === 'paid' ? '#f0fdf4' : '#fef3c7',
                color: o.status === 'paid' ? '#16a34a' : '#92400e'
              }}>
                {o.status === 'paid' ? '결제완료' : '대기'}
              </span>
            </div>
          ))
      }
    </div>
  )
}
