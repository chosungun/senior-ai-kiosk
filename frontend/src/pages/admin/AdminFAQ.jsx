// AdminFAQ.jsx
import { useState, useEffect } from 'react'
import { getFaqs, createFaq, updateFaq, deleteFaq } from '../../api'

export function AdminFAQ() {
  const [faqs, setFaqs] = useState([])
  const [form, setForm] = useState({ question: '', answer: '', keywords: '' })

  const load = async () => {
    try { const { data } = await getFaqs(); setFaqs(data.faqs) } catch {}
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    await createFaq({
      ...form,
      keywords: form.keywords.split(',').map(k => k.trim()).filter(Boolean)
    })
    setForm({ question: '', answer: '', keywords: '' })
    load()
  }

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>FAQ 관리</h2>
      <p style={{ color: '#64748b', marginBottom: 24, fontSize: 14 }}>
        고객이 자주 묻는 질문을 등록하면 AI가 자동으로 답변해요.
      </p>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>질문 추가</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={lbl}>질문</label>
            <input style={inp} value={form.question}
              onChange={e => setForm(f => ({...f, question: e.target.value}))}
              placeholder="화장실 어디 있어요?" />
          </div>
          <div>
            <label style={lbl}>답변</label>
            <textarea style={{...inp, height: 80, resize: 'vertical'}} value={form.answer}
              onChange={e => setForm(f => ({...f, answer: e.target.value}))}
              placeholder="1층 입구 오른쪽에 있어요." />
          </div>
          <div>
            <label style={lbl}>키워드 (쉼표로 구분 — AI 매칭에 활용)</label>
            <input style={inp} value={form.keywords}
              onChange={e => setForm(f => ({...f, keywords: e.target.value}))}
              placeholder="화장실, restroom, 어디" />
          </div>
          <button onClick={save} style={btnPrimary}>추가</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {faqs.length === 0 && <p style={{ color: '#94a3b8' }}>등록된 FAQ가 없어요.</p>}
        {faqs.map(f => (
          <div key={f.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 20px' }}>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>Q. {f.question}</div>
            <div style={{ color: '#64748b', fontSize: 14 }}>A. {f.answer}</div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <button onClick={() => deleteFaq(f.id).then(load)}
                style={{ ...btnSecondary, fontSize: 12, padding: '3px 10px', color: '#dc2626' }}>
                삭제
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AdminFAQ

const lbl = { display: 'block', fontSize: 13, color: '#64748b', marginBottom: 4 }
const inp = { width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }
const btnPrimary = { background: '#1a56a0', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontSize: 14 }
const btnSecondary = { background: '#fff', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 14 }
