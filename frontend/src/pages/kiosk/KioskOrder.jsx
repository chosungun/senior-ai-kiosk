import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { agentChat, sttAudio, ttsText, getMenus, createOrder } from '../../api'

const INITIAL_STATE = { step: 'start', items: [], total: 0 }

export default function KioskOrder() {
  const nav = useNavigate()
  const [kState,    setKState]    = useState(INITIAL_STATE)
  const [messages,  setMessages]  = useState([{ role: 'bot', text: '어서오세요! 주문하실 메뉴를 말씀하거나 입력해 주세요.' }])
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [recording, setRecording] = useState(false)
  const [menuMap,   setMenuMap]   = useState({})
  const [paid,      setPaid]      = useState(false)
  const bottomRef  = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef  = useRef([])

  useEffect(() => {
    getMenus().then(({ data }) => {
      const map = {}
      data.forEach(m => { map[m.name] = m })
      setMenuMap(map)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const calcTotal = useCallback((items) =>
    items.reduce((sum, item) => {
      const m = menuMap[item.menu]
      if (!m) return sum
      let p = m.price * item.qty
      item.options?.forEach(opt => {
        const grp = m.options?.find(o => o.name === opt.name)
        const ch  = grp?.choices?.find(c => c.label === opt.value)
        p += (ch?.price ?? 0) * item.qty
      })
      return sum + p
    }, 0)
  , [menuMap])

  const playTTS = useCallback(async (text) => {
    try {
      const { data } = await ttsText(text)
      const url = URL.createObjectURL(data)
      const audio = new Audio(url)
      audio.onended = () => URL.revokeObjectURL(url)
      audio.play()
    } catch {}
  }, [])

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || loading) return
    setMessages(prev => [...prev, { role: 'user', text }])
    setInput('')
    setLoading(true)
    try {
      const { data } = await agentChat(text, kState)
      setKState(data.state)
      setMessages(prev => [...prev, { role: 'bot', text: data.reply }])
      playTTS(data.reply)
    } catch {
      const msg = '죄송해요, 다시 한 번 말씀해 주시겠어요?'
      setMessages(prev => [...prev, { role: 'bot', text: msg }])
      playTTS(msg)
    } finally {
      setLoading(false)
    }
  }, [kState, loading, playTTS])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setLoading(true)
        try {
          const { data } = await sttAudio(blob)
          if (data.text) sendMessage(data.text)
        } catch {
          setMessages(prev => [...prev, { role: 'bot', text: '음성 인식에 실패했어요. 다시 말씀해 주세요.' }])
        } finally {
          setLoading(false)
        }
      }
      recorder.start()
      recorderRef.current = recorder
      setRecording(true)
    } catch {
      alert('마이크 권한을 허용해 주세요.')
    }
  }, [sendMessage])

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop()
    setRecording(false)
  }, [])

  const handleOrder = async () => {
    const total = calcTotal(kState.items)
    try {
      await createOrder({ items: kState.items, total })
      setPaid(true)
      playTTS('주문이 완료됐어요. 감사합니다!')
    } catch {
      alert('주문 중 오류가 발생했어요. 직원을 불러주세요.')
    }
  }

  /* ── 주문 완료 화면 ── */
  if (paid) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2rem', padding: '2rem', fontFamily: 'var(--font-sans)' }}>
        <div style={{ fontSize: '5rem' }}>☕</div>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--ink)', textAlign: 'center' }}>
          주문이 완료됐어요!
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '1.1rem', textAlign: 'center' }}>
          잠시 후 음료가 준비됩니다.
        </p>
        <button
          onClick={() => nav('/kiosk')}
          style={{ background: 'var(--rust)', color: '#fff', border: 'none', borderRadius: '999px', padding: '1rem 3rem', fontSize: '1.2rem', cursor: 'pointer', fontWeight: 700 }}
        >
          처음으로
        </button>
      </div>
    )
  }

  /* ── 결제 확인 화면 ── */
  const isCheckout = (kState.step === '결제확인' || kState.step === '결제진행') && kState.items.length > 0
  if (isCheckout) {
    const total = calcTotal(kState.items)
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-sans)' }}>
        {/* 헤더 */}
        <div style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
          <button
            onClick={() => setKState(s => ({ ...s, step: '메뉴선택' }))}
            style={{ background: 'none', border: '1px solid rgba(243,235,221,0.35)', color: 'var(--bg)', borderRadius: '0.5rem', padding: '0.4rem 0.9rem', fontSize: '0.9rem', cursor: 'pointer' }}
          >
            ← 뒤로
          </button>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', letterSpacing: '0.05em' }}>주문 확인</span>
        </div>

        {/* 아이템 목록 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {kState.items.map((item, i) => {
              const m = menuMap[item.menu]
              const lineTotal = m ? (m.price + (item.options?.reduce((s, opt) => {
                const grp = m.options?.find(o => o.name === opt.name)
                const ch  = grp?.choices?.find(c => c.label === opt.value)
                return s + (ch?.price ?? 0)
              }, 0) ?? 0)) * item.qty : 0
              return (
                <div key={i} style={{ background: 'var(--bg-white)', borderRadius: '1rem', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow-sm)' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--ink)' }}>{item.menu}</div>
                    {item.options?.length > 0 && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                        {item.options.map(o => `${o.name}: ${o.value}`).join(' · ')}
                      </div>
                    )}
                    <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
                      {item.qty}개
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1.15rem', color: 'var(--rust)' }}>
                    {lineTotal.toLocaleString()}원
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 합계 + 주문 버튼 */}
        <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderTop: `2px solid var(--brass)`, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--ink)' }}>합계</span>
            <span style={{ fontSize: '1.7rem', fontWeight: 700, color: 'var(--rust)' }}>
              {total.toLocaleString()}원
            </span>
          </div>
          <button
            onClick={handleOrder}
            style={{ width: '100%', background: 'var(--rust)', color: '#fff', border: 'none', borderRadius: '999px', padding: '1.1rem', fontSize: '1.3rem', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.05em' }}
          >
            주문하기
          </button>
        </div>
      </div>
    )
  }

  /* ── 채팅 화면 (주문 중) ── */
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', fontFamily: 'var(--font-sans)' }}>
      {/* 헤더 */}
      <div style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', letterSpacing: '0.08em' }}>아날로그</span>
        {kState.items.length > 0 && (
          <span style={{ background: 'var(--rust)', color: '#fff', borderRadius: '999px', padding: '0.25rem 0.8rem', fontSize: '0.85rem', fontWeight: 700 }}>
            {kState.items.reduce((s, i) => s + i.qty, 0)}가지 담김
          </span>
        )}
      </div>

      {/* 메시지 영역 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '78%', padding: '0.875rem 1.125rem', borderRadius: '1.25rem',
              fontSize: '1.05rem', lineHeight: 1.6,
              background: msg.role === 'user' ? 'var(--rust)' : 'var(--bg-white)',
              color: msg.role === 'user' ? '#fff' : 'var(--ink)',
              boxShadow: 'var(--shadow-sm)',
              borderBottomRightRadius: msg.role === 'user' ? '0.25rem' : '1.25rem',
              borderBottomLeftRadius:  msg.role === 'bot'  ? '0.25rem' : '1.25rem',
            }}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ background: 'var(--bg-white)', padding: '0.875rem 1.125rem', borderRadius: '1.25rem', borderBottomLeftRadius: '0.25rem', color: 'var(--muted)', fontSize: '1rem', boxShadow: 'var(--shadow-sm)' }}>
              답변 중...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 장바구니 요약 */}
      {kState.items.length > 0 && (
        <div style={{ background: 'var(--bg-card)', borderTop: `1px solid var(--brass)`, padding: '0.75rem 1.25rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 500 }}>장바구니</span>
            {kState.items.map((item, i) => (
              <span key={i} style={{ background: 'var(--bg-white)', border: `1px solid var(--brass)`, borderRadius: '999px', padding: '0.2rem 0.65rem', fontSize: '0.85rem', color: 'var(--ink)' }}>
                {item.menu} ×{item.qty}
              </span>
            ))}
            <span style={{ marginLeft: 'auto', fontWeight: 700, color: 'var(--rust)', fontSize: '0.95rem' }}>
              {calcTotal(kState.items).toLocaleString()}원
            </span>
          </div>
        </div>
      )}

      {/* 입력 바 */}
      <div style={{ display: 'flex', gap: '0.625rem', padding: '0.875rem', background: 'var(--bg-white)', borderTop: `1px solid var(--bg-card)`, alignItems: 'center', flexShrink: 0 }}>
        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          disabled={loading}
          style={{
            width: '3.25rem', height: '3.25rem', borderRadius: '50%', border: 'none',
            background: recording ? '#dc2626' : 'var(--bg-card)',
            fontSize: '1.3rem', cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s',
          }}
        >
          {recording ? '⏹' : '🎤'}
        </button>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
          placeholder="말씀해 주세요..."
          disabled={loading || recording}
          style={{
            flex: 1, padding: '0.875rem 1.125rem', fontSize: '1rem',
            border: `1.5px solid var(--bg-card)`, borderRadius: '999px',
            outline: 'none', background: 'var(--bg)', color: 'var(--ink)',
            fontFamily: 'var(--font-sans)',
          }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim() || recording}
          style={{
            background: input.trim() && !loading && !recording ? 'var(--rust)' : 'var(--bg-card)',
            color: input.trim() && !loading && !recording ? '#fff' : 'var(--muted)',
            border: 'none', borderRadius: '999px',
            padding: '0.875rem 1.375rem', fontSize: '1rem', cursor: 'pointer',
            fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0,
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          전송
        </button>
      </div>
    </div>
  )
}
