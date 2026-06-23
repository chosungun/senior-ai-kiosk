import { useState, useCallback } from 'react'
import { agentChat } from '../../api'

const INITIAL_STATE = {
  step:  'start',   // start | menu | option | confirm | payment
  items: [],        // [{menu, qty, options, price}]
  total: 0,
}

export default function KioskOrder() {
  const [state,    setState]    = useState(INITIAL_STATE)
  const [reply,    setReply]    = useState('')
  const [loading,  setLoading]  = useState(false)

  // STT 결과 → 카나나 → 상태 업데이트
  const handleVoiceInput = useCallback(async (text) => {
    setLoading(true)
    try {
      const { data } = await agentChat(text, state)
      setState(data.state)
      setReply(data.reply)
      // TODO: data.reply를 TTS로 읽기
      // TODO: data.ui_action === 'call_staff' → 직원호출 UI
    } catch (e) {
      setReply('죄송해요, 다시 한 번 말씀해 주시겠어요?')
    } finally {
      setLoading(false)
    }
  }, [state])

  return (
    <div style={{ maxWidth: 400, margin: '0 auto', padding: 20 }}>
      <h2>키오스크 주문</h2>
      <p>현재 단계: <b>{state.step}</b></p>
      {reply && <p style={{ color: '#1a56a0' }}>{reply}</p>}

      {/* TODO: 단계별 컴포넌트 렌더링 */}
      {/* <StepStart   onNext={() => setState(s => ({...s, step:'menu'}))} /> */}
      {/* <StepMenu    state={state} onVoice={handleVoiceInput} /> */}
      {/* <StepOption  state={state} onVoice={handleVoiceInput} /> */}
      {/* <StepConfirm state={state} onNext={...} /> */}
      {/* <StepPayment state={state} /> */}

      <button
        onClick={() => handleVoiceInput('아이스 아메리카노 한 잔 주세요')}
        disabled={loading}
        style={{ marginTop: 20, padding: '12px 24px' }}
      >
        {loading ? '처리중...' : '테스트 발화 전송'}
      </button>
    </div>
  )
}
