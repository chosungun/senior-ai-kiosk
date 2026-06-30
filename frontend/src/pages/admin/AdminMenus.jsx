import { useState, useEffect } from 'react'
import { getMenus, createMenu, updateMenu, deleteMenu } from '../../api'

const EMPTY = { name: '', category: '커피', price: '', description: '', options: [] }
const CATS   = ['커피', '논커피', '디저트', '푸드']

export default function AdminMenus() {
  const [menus,   setMenus]   = useState([])
  const [form,    setForm]    = useState(EMPTY)
  const [editing, setEditing] = useState(null)

  const load = async () => {
    try { const { data } = await getMenus(); setMenus(data) }
    catch { /* TODO: 에러 토스트 */ }
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    try {
      if (editing) await updateMenu(editing, form)
      else         await createMenu(form)
      setForm(EMPTY); setEditing(null); load()
    } catch { /* TODO */ }
  }

  const toggleSoldOut = (menu) =>
    updateMenu(menu.id, { is_sold_out: !menu.is_sold_out }).then(load)

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>메뉴 관리</h2>

      {/* 입력 폼 */}
      <div style={{
        background: '#fff', border: '1px solid #e2e8f0',
        borderRadius: 12, padding: 24, marginBottom: 32
      }}>
        <h3 style={{ marginBottom: 16 }}>{editing ? '메뉴 수정' : '메뉴 추가'}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={lbl}>메뉴명</label>
            <input style={inp} value={form.name}
              onChange={e => setForm(f => ({...f, name: e.target.value}))}
              placeholder="아이스 아메리카노" />
          </div>
          <div>
            <label style={lbl}>카테고리</label>
            <select style={inp} value={form.category}
              onChange={e => setForm(f => ({...f, category: e.target.value}))}>
              {CATS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>가격 (원)</label>
            <input style={inp} type="number" value={form.price}
              onChange={e => setForm(f => ({...f, price: e.target.value}))}
              placeholder="4000" />
          </div>
          <div>
            <label style={lbl}>설명</label>
            <input style={inp} value={form.description}
              onChange={e => setForm(f => ({...f, description: e.target.value}))}
              placeholder="간단한 메뉴 설명" />
          </div>
        </div>
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <button onClick={save} style={btnPrimary}>
            {editing ? '수정 완료' : '메뉴 추가'}
          </button>
          {editing && (
            <button onClick={() => { setEditing(null); setForm(EMPTY) }} style={btnSecondary}>
              취소
            </button>
          )}
        </div>
      </div>

      {/* 메뉴 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {menus.length === 0 && (
          <p style={{ color: '#94a3b8' }}>등록된 메뉴가 없어요. 위에서 추가해 주세요.</p>
        )}
        {menus.map(m => (
          <div key={m.id} style={{
            background: '#fff', border: '1px solid #e2e8f0',
            borderRadius: 10, padding: '14px 20px',
            display: 'flex', alignItems: 'center', gap: 12,
            opacity: m.is_sold_out ? 0.5 : 1
          }}>
            <span style={{ flex: 1, fontWeight: 500 }}>{m.name}</span>
            <span style={{ color: '#64748b', fontSize: 13 }}>{m.category}</span>
            <span style={{ fontWeight: 500 }}>{Number(m.price).toLocaleString()}원</span>
            <button onClick={() => toggleSoldOut(m)} style={{
              ...btnSecondary, fontSize: 12, padding: '4px 10px',
              color: m.is_sold_out ? '#16a34a' : '#dc2626'
            }}>
              {m.is_sold_out ? '품절해제' : '품절'}
            </button>
            <button onClick={() => { setEditing(m.id); setForm(m) }}
              style={{ ...btnSecondary, fontSize: 12, padding: '4px 10px' }}>
              수정
            </button>
            <button onClick={() => deleteMenu(m.id).then(load)}
              style={{ ...btnSecondary, fontSize: 12, padding: '4px 10px', color: '#dc2626' }}>
              삭제
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

const lbl = { display: 'block', fontSize: 13, color: '#64748b', marginBottom: 4 }
const inp = {
  width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0',
  borderRadius: 8, fontSize: 14, boxSizing: 'border-box'
}
const btnPrimary = {
  background: '#1a56a0', color: '#fff', border: 'none',
  borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontSize: 14
}
const btnSecondary = {
  background: '#fff', color: '#1e293b', border: '1px solid #e2e8f0',
  borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontSize: 14
}
