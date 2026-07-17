import { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react'

const IdleCtx = createContext(null)
const IDLE_MS = 60000

// 키오스크 화면(터치·음성) 1분 무응답 감지 — 관리자 화면에는 Provider가 없어 자동으로 비활성화됨
export function IdleProvider({ children }) {
  const [showPrompt, setShowPrompt] = useState(false)
  const lastActivityRef = useRef(Date.now())
  const showPromptRef = useRef(false)
  const enabledRef = useRef(true)

  const notifyActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
  }, [])

  const resolvePrompt = useCallback(() => {
    lastActivityRef.current = Date.now()
    showPromptRef.current = false
    setShowPrompt(false)
  }, [])

  // 홈 화면처럼 무응답 감지가 필요 없는 화면에서 껐다 켤 수 있도록 — 다시 켤 때는 그동안 쌓인 무응답 시간을 리셋
  const setEnabled = useCallback(enabled => {
    enabledRef.current = enabled
    if (enabled) lastActivityRef.current = Date.now()
    else { showPromptRef.current = false; setShowPrompt(false) }
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      if (enabledRef.current && !showPromptRef.current && Date.now() - lastActivityRef.current >= IDLE_MS) {
        showPromptRef.current = true
        setShowPrompt(true)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [])

  // 프롬프트가 떠 있는 동안은 배경 터치로 조용히 사라지지 않도록, 명시적 버튼 응답(resolvePrompt)으로만 닫음
  useEffect(() => {
    const onActivity = () => { if (!showPromptRef.current) notifyActivity() }
    document.addEventListener('pointerdown', onActivity)
    document.addEventListener('keydown', onActivity)
    return () => {
      document.removeEventListener('pointerdown', onActivity)
      document.removeEventListener('keydown', onActivity)
    }
  }, [notifyActivity])

  return (
    <IdleCtx.Provider value={{ showPrompt, notifyActivity, resolvePrompt, setEnabled }}>
      {children}
    </IdleCtx.Provider>
  )
}

export const useIdle = () => useContext(IdleCtx)
