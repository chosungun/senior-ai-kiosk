import { useState, useCallback, useRef, useEffect } from 'react'
import { agentChat, sttAudio, ttsText } from '../../api'

const INITIAL_STATE = {
  step:  'start',
  items: [],
  total: 0,
}

export default function KioskOrder() {
  const [state,      setState]      = useState(INITIAL_STATE)
  const [messages,   setMessages]   = useState([
    { role: 'bot', text: '안녕하세요! 주문하실 메뉴를 말씀하거나 입력해 주세요.' }
  ])
  const [input,      setInput]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [recording,  setRecording]  = useState(false)
  const bottomRef    = useRef(null)
  const recorderRef  = useRef(null)
  const chunksRef    = useRef([])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const playTTS = useCallback(async (text) => {
    try {
      const { data } = await ttsText(text)
      const url = URL.createObjectURL(data)
      const audio = new Audio(url)
      audio.onended = () => URL.revokeObjectURL(url)
      audio.play()
    } catch {
      // TTS 실패해도 텍스트는 이미 표시돼 있으므로 무시
    }
  }, [])

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || loading) return

    setMessages(prev => [...prev, { role: 'user', text }])
    setInput('')
    setLoading(true)

    try {
      const { data } = await agentChat(text, state)
      setState(data.state)
      setMessages(prev => [...prev, { role: 'bot', text: data.reply }])
      playTTS(data.reply)
    } catch {
      const errMsg = '죄송해요, 다시 한 번 입력해 주시겠어요?'
      setMessages(prev => [...prev, { role: 'bot', text: errMsg }])
      playTTS(errMsg)
    } finally {
      setLoading(false)
    }
  }, [state, loading, playTTS])

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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div style={{
      maxWidth: 480, margin: '0 auto', height: '100vh',
      display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif',
      background: '#f0f4ff'
    }}>
      {/* 헤더 */}
      <div style={{
        background: '#1a56a0', color: '#fff',
        padding: '16px 20px', fontSize: 18, fontWeight: 600
      }}>
        카페 키오스크
      </div>

      {/* 메시지 목록 */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: 16,
        display: 'flex', flexDirection: 'column', gap: 12
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
          }}>
            <div style={{
              maxWidth: '75%', padding: '12px 16px', borderRadius: 18,
              fontSize: 16, lineHeight: 1.5,
              background: msg.role === 'user' ? '#1a56a0' : '#fff',
              color: msg.role === 'user' ? '#fff' : '#1e293b',
              boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
              borderBottomRightRadius: msg.role === 'user' ? 4 : 18,
              borderBottomLeftRadius:  msg.role === 'bot'  ? 4 : 18,
            }}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              background: '#fff', padding: '12px 16px', borderRadius: 18,
              borderBottomLeftRadius: 4, fontSize: 16, color: '#94a3b8',
              boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
            }}>
              입력 중...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div style={{
        display: 'flex', gap: 8, padding: 12,
        background: '#fff', borderTop: '1px solid #e2e8f0', alignItems: 'center'
      }}>
        {/* 마이크 버튼 */}
        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          disabled={loading}
          style={{
            width: 48, height: 48, borderRadius: '50%', border: 'none',
            background: recording ? '#dc2626' : '#e2e8f0',
            fontSize: 20, cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s'
          }}
        >
          {recording ? '⏹' : '🎤'}
        </button>

        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요..."
          disabled={loading || recording}
          style={{
            flex: 1, padding: '12px 16px', fontSize: 16,
            border: '1.5px solid #cbd5e1', borderRadius: 24,
            outline: 'none', background: '#f8fafc'
          }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim() || recording}
          style={{
            background: input.trim() && !loading && !recording ? '#1a56a0' : '#cbd5e1',
            color: '#fff', border: 'none', borderRadius: 24,
            padding: '12px 20px', fontSize: 16, cursor: 'pointer',
            fontWeight: 600, whiteSpace: 'nowrap'
          }}
        >
          전송
        </button>
      </div>
    </div>
  )
}
