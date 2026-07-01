import { useState, useRef, forwardRef, useImperativeHandle, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Smile, X, Mic, MicOff, Keyboard, Volume2, VolumeX, Bot,
  Check, Flame, Snowflake, Coffee, CreditCard,
} from 'lucide-react'
import { agentChat, sttAudio, ttsText } from '../api'
import { useA11y } from '../context/AccessibilityContext'
import { getC } from '../styles/colors'
import { FF, B, BM, L, NAV, sc } from '../styles/typography'

const fmt = n => n.toLocaleString() + '원'

function matchOption(text, choices) {
  const t = text.trim()
  for (const c of choices) {
    if (c.label === 'HOT') { if (/따뜻|뜨겁|핫|hot/i.test(t)) return c }
    else if (c.label === 'ICE') { if (/시원|차갑|아이스|냉|ice|cold|차게/i.test(t)) return c }
    else { const d = c.label.toLowerCase(); if (t.includes(d) || d.includes(t)) return c }
  }
  return null
}

function getDisplay(label) {
  return label === 'HOT' ? '따뜻하게' : label === 'ICE' ? '시원하게' : label
}

function resolveItems(rawItems, menus) {
  const norm = s => (s || '').replace(/따뜻한\s*|아이스\s*/g, '').replace(/\s+/g, '').toLowerCase()
  return rawItems.map((pi, idx) => {
    const found = menus.find(m =>
      m.name === pi.menu || m.name.includes(pi.menu || '') ||
      (pi.menu || '').includes(m.name) || norm(m.name) === norm(pi.menu)
    )
    if (!found) return null
    const spokenOpts = pi.options || []
    const tempOpt = spokenOpts.find(o => o.name === '온도')
    const hasTempMenu = (found.options || []).some(o => o.name === '온도') || found.hasTemp
    let tempLabel = tempOpt ? (tempOpt.value === 'HOT' ? 'HOT' : 'ICE') : (hasTempMenu ? 'HOT' : null)
    const selectedOptions = {}
    if (tempLabel) selectedOptions['온도'] = { label: tempLabel, price: 0 }
    spokenOpts.forEach(so => {
      if (so.name === '온도') return
      const menuOpt = (found.options || []).find(o => o.name === so.name)
      const choice = menuOpt?.choices?.find(c => c.label === so.value || c.label === (so.value || '').toUpperCase())
      if (choice) selectedOptions[so.name] = choice
    })
    return {
      id: `${found.id}-${Date.now()}-${idx}`,
      menuId: found.id, name: found.name, price: found.price,
      qty: pi.qty || 1,
      temp: tempLabel === 'HOT' ? '따뜻하게' : tempLabel === 'ICE' ? '시원하게' : null,
      selectedOptions, img: found.img, menuOptions: found.options || [],
    }
  }).filter(Boolean)
}

// ── 컴포넌트 ──────────────────────────────────────────────────────────
const AIAssistantFAB = forwardRef(function AIAssistantFAB({
  menus = [], onAddToCart, cart = [], cartTotal = 0, bottomOffset = 48,
}, ref) {
  const nav = useNavigate()
  const { highContrast, largeFont } = useA11y()
  const hc = highContrast
  const lf = largeFont ? 1.2 : 1
  const C = getC(hc)

  const [open, setOpen]             = useState(false)
  const [messages, setMessages]     = useState([
    { id: 1, role: 'ai', type: 'text', text: '안녕하세요! 어떤 메뉴를 주문하고 싶으신가요?' },
  ])
  const [voiceState, setVoiceState] = useState('idle')
  const [liveWords, setLiveWords]   = useState([])
  const [showKeyboard, setShowKeyboard] = useState(false)
  const [inputText, setInputText]   = useState('')
  const [ttsOn, setTtsOn]           = useState(true)
  const [orderItems, setOrderItems] = useState({})
  const [optCtx, setOptCtxState]    = useState(null)
  const [confirmed, setConfirmed]   = useState({})

  const recRef    = useRef(null)
  const mrRef     = useRef(null)
  const chunksRef = useRef([])
  const finalRef  = useRef('')
  const liveRef   = useRef([])
  const chatRef   = useRef(null)
  const idRef     = useRef(2)
  const audioRef  = useRef(null)
  const optCtxRef = useRef(null)

  const setOptCtx = ctx => { optCtxRef.current = ctx; setOptCtxState(ctx) }
  const nextId    = () => ++idRef.current

  useImperativeHandle(ref, () => ({ open: () => setOpen(true) }), [])

  useEffect(() => {
    if (!chatRef.current) return
    const el = chatRef.current
    setTimeout(() => { el.scrollTop = el.scrollHeight }, 80)
  }, [messages, voiceState, orderItems])

  // ── TTS ──────────────────────────────────────────────────────────
  const speak = text => new Promise(resolve => {
    if (!ttsOn || !text) { resolve(); return }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    ttsText(text)
      .then(res => {
        const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: 'audio/mpeg' })
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audioRef.current = audio
        const done = () => { URL.revokeObjectURL(url); audioRef.current = null; resolve() }
        audio.onended = done; audio.onerror = done
        audio.play().catch(done)
      })
      .catch(resolve)
  })

  // ── 음성 인식 ──────────────────────────────────────────────────
  const startVoice = () => {
    setLiveWords([]); liveRef.current = []; finalRef.current = ''
    setVoiceState('listening'); setShowKeyboard(false)
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SR) {
      const rec = new SR()
      rec.lang = 'ko-KR'; rec.interimResults = true; rec.continuous = false
      recRef.current = rec
      rec.onresult = e => {
        const parts = Array.from(e.results)
        finalRef.current = parts.filter(r => r.isFinal).map(r => r[0].transcript).join('')
        const words = parts.map(r => r[0].transcript).join('').trim().split(/\s+/).filter(Boolean)
        liveRef.current = words; setLiveWords(words)
      }
      rec.onend  = () => processInput(finalRef.current || liveRef.current.join(' '))
      rec.onerror = () => setVoiceState('idle')
      rec.start()
    } else {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          chunksRef.current = []
          const mr = new MediaRecorder(stream)
          mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
          mr.onstop = async () => {
            stream.getTracks().forEach(t => t.stop())
            const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
            try { const { data: stt } = await sttAudio(blob); await processInput(stt.text || '') }
            catch { setVoiceState('idle') }
          }
          mr.start(); mrRef.current = mr
          setTimeout(() => { if (mr.state === 'recording') mr.stop() }, 8000)
        })
        .catch(() => setVoiceState('idle'))
    }
  }

  const stopVoice = () => {
    recRef.current?.stop()
    if (mrRef.current?.state === 'recording') mrRef.current.stop()
  }

  // ── 입력 통합 처리 ─────────────────────────────────────────────
  const processInput = async text => {
    if (!text?.trim()) { setVoiceState('idle'); return }
    setLiveWords([])
    const ctx = optCtxRef.current
    if (ctx) { setVoiceState('processing'); await handleOptionVoice(text, ctx); setVoiceState('idle'); return }
    await processChat(text)
  }

  // ── 옵션 음성 처리 ─────────────────────────────────────────────
  const handleOptionVoice = async (text, ctx) => {
    if (ctx.type === 'confirm') {
      if (/^(네|예|응|맞아|좋아|넣어|담아|주세요|확인|오케|ㅇㅇ)/i.test(text.trim())) {
        setConfirmed(prev => ({ ...prev, [ctx.msgId]: true }))
        setOptCtx(null)
        const items = orderItems[ctx.msgId] || []
        if (onAddToCart) {
          onAddToCart(items)
          const names = items.map(i => `${i.name} ${i.qty}잔`).join(', ')
          const reply = `${names} 장바구니에 담았어요! 더 필요한 것이 있으신가요?`
          setMessages(prev => [...prev, { id: nextId(), role: 'ai', type: 'text', text: reply }])
          await speak(reply)
        } else {
          nav('/kiosk/order', { state: { resolvedItems: items } })
        }
      } else if (/아니|취소|싫어|됐어|없어/.test(text)) {
        setOptCtx(null)
        const reply = '알겠습니다! 다른 메뉴를 원하시면 말씀해 주세요.'
        setMessages(prev => [
          ...prev.filter(m => m.id !== ctx.msgId),
          { id: nextId(), role: 'ai', type: 'text', text: reply },
        ])
        await speak(reply)
      } else {
        await speak('네 또는 아니요로 말씀해 주세요.')
        await speak('장바구니에 넣을까요?')
        startVoice()
      }
      return
    }
    const matched = matchOption(text, ctx.choices)
    if (matched) {
      const currentItems = orderItems[ctx.msgId] || []
      const currentItem  = currentItems[0]
      if (!currentItem) { setOptCtx(null); return }
      const newSel = { ...currentItem.selectedOptions, [ctx.optName]: matched }
      setOrderItems(prev => ({
        ...prev,
        [ctx.msgId]: prev[ctx.msgId].map((it, i) =>
          i === 0 ? { ...it, selectedOptions: newSel } : it
        ),
      }))
      const display = getDisplay(matched.label)
      const nextUnresolved = (currentItem.menuOptions || []).find(o => !newSel[o.name])
      if (nextUnresolved) {
        setOptCtx({ msgId: ctx.msgId, optName: nextUnresolved.name, choices: nextUnresolved.choices })
        await speak(`${display}로 선택했어요. ${nextUnresolved.name}를 선택해 주세요.`)
        if (optCtxRef.current) startVoice()
      } else {
        setOptCtx({ type: 'confirm', msgId: ctx.msgId })
        await speak(`${display}로 선택했어요. 장바구니에 넣을까요?`)
        if (optCtxRef.current) startVoice()
      }
    } else {
      const hint = ctx.choices.map(c => getDisplay(c.label)).join(' 또는 ')
      await speak(`다시 말씀해 주세요. ${hint} 중에 선택해 주세요.`)
      startVoice()
    }
  }

  // ── 일반 대화(AI) 처리 ─────────────────────────────────────────
  const processChat = async text => {
    setMessages(prev => [...prev, { id: nextId(), role: 'user', type: 'text', text }])
    setVoiceState('processing')
    try {
      const { data: agent } = await agentChat(text, {
        step: 'start',
        items: cart.map(c => ({ menu: c.name, qty: c.qty })),
        total: cartTotal,
      })
      const state = agent.state || {}
      const items = resolveItems(state.items || [], menus)

      if (state.action === 'payment' || (/결제/.test(text) && items.length === 0)) {
        const reply = agent.reply || '결제 화면으로 이동할게요!'
        setMessages(prev => [...prev, { id: nextId(), role: 'ai', type: 'action', text: reply }])
        await speak(reply)
        setTimeout(() => { nav('/kiosk/payment', { state: { cart, total: cartTotal } }); setOpen(false) }, 1000)
      } else if (items.length > 0) {
        const msgId = nextId()
        setMessages(prev => [...prev, { id: msgId, role: 'ai', type: 'order', items, reply: agent.reply || '' }])
        setOrderItems(prev => ({ ...prev, [msgId]: items.map(it => ({ ...it })) }))
        const firstItem = items[0]
        const firstUnresolved = firstItem
          ? (firstItem.menuOptions || []).find(o => !firstItem.selectedOptions[o.name])
          : null
        if (firstUnresolved) {
          const prompt = agent.reply || `${firstItem.name} 확인했어요! ${firstUnresolved.name}를 선택해 주세요.`
          setOptCtx({ msgId, optName: firstUnresolved.name, choices: firstUnresolved.choices })
          await speak(prompt)
          if (optCtxRef.current?.msgId === msgId) startVoice()
        } else {
          const prompt = agent.reply || `${firstItem?.name} ${firstItem?.qty}잔이요, 장바구니에 넣을까요?`
          setOptCtx({ type: 'confirm', msgId })
          await speak(prompt)
          if (optCtxRef.current?.msgId === msgId) startVoice()
        }
      } else {
        const reply = agent.reply || '죄송해요, 다시 한번 말씀해 주세요.'
        setMessages(prev => [...prev, { id: nextId(), role: 'ai', type: 'text', text: reply }])
        await speak(reply)
      }
    } catch {
      const reply = '일시적인 오류가 발생했어요. 다시 시도해 주세요.'
      setMessages(prev => [...prev, { id: nextId(), role: 'ai', type: 'text', text: reply }])
      await speak(reply)
    }
    setVoiceState('idle')
  }

  const submitText = () => {
    const text = inputText.trim()
    if (!text) return
    setInputText(''); processInput(text)
  }

  const getInputHint = () => {
    if (!optCtx) return '말씀해 주세요...'
    if (optCtx.type === 'confirm') return '"네" 또는 "아니요"로 말씀해 주세요'
    const hint = optCtx.choices.map(c => getDisplay(c.label)).join(' / ')
    return `${optCtx.optName}: ${hint}`
  }

  const sheetBg  = hc ? '#0D0D0D' : '#FFFFFF'
  const bubbleBg = hc ? '#1E1E1E' : '#F1F5F9'

  return (
    <>
      {/* FAB 버튼 */}
      {!open && (
        <div style={{
          position: 'absolute', bottom: bottomOffset, right: 48, zIndex: 20,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        }}>
          <div style={{
            background: hc ? C.card : '#fff', border: `2px solid ${C.border}`,
            borderRadius: 32, padding: '14px 32px',
            ...sc(BM.XS, lf), color: C.text, whiteSpace: 'nowrap',
            boxShadow: '0 4px 20px rgba(0,0,0,0.14)',
          }}>
            도움이 필요하신가요?
          </div>
          <button
            onClick={() => setOpen(true)}
            style={{
              width: 120, height: 120, borderRadius: '50%',
              background: C.primary, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: hc ? '0 8px 40px rgba(255,229,0,0.5)' : '0 8px 40px rgba(37,99,235,0.5)',
              position: 'relative',
            }}
          >
            <Smile size={60} color={C.primaryText} />
            <div style={{
              position: 'absolute', top: 10, right: 10,
              width: 22, height: 22, borderRadius: '50%',
              background: '#22C55E', border: `3px solid ${C.primary}`,
            }} />
          </button>
        </div>
      )}

      {/* 바텀 시트 */}
      {open && (
        <div
          style={{
            position: 'absolute', inset: 0, zIndex: 55,
            background: 'rgba(0,0,0,0.50)',
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          }}
          onClick={e => e.target === e.currentTarget && setOpen(false)}
        >
          <div style={{
            background: sheetBg, borderRadius: '40px 40px 0 0', height: '76%',
            display: 'flex', flexDirection: 'column',
            border: `2px solid ${C.border}`, borderBottom: 'none',
            overflow: 'hidden', fontFamily: FF,
          }}>

            {/* 핸들 */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0 10px' }}>
              <div style={{ width: 80, height: 8, borderRadius: 4, background: C.border }} />
            </div>

            {/* 헤더 */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 20,
              padding: '10px 40px 24px',
              borderBottom: `2px solid ${C.border}`,
            }}>
              <div style={{
                width: 80, height: 80, borderRadius: 22, background: C.primaryBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Bot size={44} color={C.primary} />
              </div>
              <span style={{ ...sc(B.SM, lf), color: C.text, flex: 1 }}>AI 도우미</span>
              <button
                onClick={() => setOpen(false)}
                style={{
                  width: 80, height: 80, borderRadius: '50%',
                  border: `2px solid ${C.border}`, background: C.bg,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={40} color={C.textSub} />
              </button>
            </div>

            {/* 채팅 영역 */}
            <div ref={chatRef} style={{
              flex: 1, overflowY: 'auto',
              padding: '28px 36px',
              display: 'flex', flexDirection: 'column', gap: 24,
            }}>
              {messages.map(msg => (
                <ChatMessage
                  key={msg.id}
                  msg={msg}
                  localItems={orderItems[msg.id]}
                  isConfirmed={!!confirmed[msg.id]}
                  activeOptName={optCtx?.msgId === msg.id && optCtx?.type !== 'confirm' ? optCtx.optName : null}
                  isAwaitingConfirm={optCtx?.type === 'confirm' && optCtx?.msgId === msg.id}
                  C={C} lf={lf} hc={hc} bubbleBg={bubbleBg}
                  onUpdateOption={(optName, choice) => {
                    const current = orderItems[msg.id] || []
                    const item = current[0]
                    if (!item) return
                    const newSel = { ...item.selectedOptions, [optName]: choice }
                    setOrderItems(prev => ({
                      ...prev,
                      [msg.id]: prev[msg.id].map((it, i) =>
                        i === 0 ? { ...it, selectedOptions: newSel } : it
                      ),
                    }))
                    const nextUnresolved = (item.menuOptions || []).find(o => !newSel[o.name])
                    if (nextUnresolved) {
                      setOptCtx({ msgId: msg.id, optName: nextUnresolved.name, choices: nextUnresolved.choices })
                      speak(`다음으로 ${nextUnresolved.name}를 선택해 주세요.`).then(() => {
                        if (optCtxRef.current) startVoice()
                      })
                    } else {
                      setOptCtx({ type: 'confirm', msgId: msg.id })
                      speak('장바구니에 넣을까요?').then(() => {
                        if (optCtxRef.current) startVoice()
                      })
                    }
                  }}
                  onConfirm={items => {
                    setConfirmed(prev => ({ ...prev, [msg.id]: true }))
                    setOptCtx(null)
                    if (onAddToCart) {
                      onAddToCart(items)
                      const names = items.map(i => `${i.name} ${i.qty}잔`).join(', ')
                      const reply = `${names} 장바구니에 담았어요!`
                      setMessages(prev => [...prev, { id: nextId(), role: 'ai', type: 'text', text: reply }])
                      speak(reply)
                    } else {
                      nav('/kiosk/order', { state: { resolvedItems: items } })
                    }
                  }}
                  onCancel={() => {
                    setOptCtx(null)
                    setMessages(prev => prev.filter(m => m.id !== msg.id))
                    const reply = '알겠습니다! 다른 메뉴를 원하시면 말씀해 주세요.'
                    setMessages(prev => [...prev, { id: nextId(), role: 'ai', type: 'text', text: reply }])
                    speak(reply)
                  }}
                />
              ))}

              {/* 타이핑 인디케이터 */}
              {voiceState === 'processing' && (
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
                  <AIAvatar C={C} />
                  <div style={{
                    background: bubbleBg, borderRadius: '24px 24px 24px 6px',
                    padding: '24px 32px', display: 'flex', gap: 12, alignItems: 'center',
                  }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{
                        width: 16, height: 16, borderRadius: '50%', background: C.textMuted,
                        animation: 'dotBounce 1.2s ease infinite',
                        animationDelay: `${i * 0.2}s`,
                      }} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 입력 영역 */}
            <div style={{ flexShrink: 0, borderTop: `2px solid ${C.border}`, padding: '20px 36px 12px' }}>
              {/* 힌트 / 라이브 텍스트 / 키보드 입력 */}
              {voiceState === 'listening' ? (
                <div style={{
                  minHeight: 64, display: 'flex', alignItems: 'center',
                  flexWrap: 'wrap', gap: 10, marginBottom: 20,
                }}>
                  {liveWords.length === 0
                    ? <span style={{ ...sc(BM.SM, lf), color: C.textMuted, fontStyle: 'italic' }}>듣고 있어요...</span>
                    : liveWords.map((w, i) => (
                        <span key={i} style={{ ...sc(BM.SM, lf), color: C.text, animation: 'wordIn 0.2s ease' }}>{w}</span>
                      ))
                  }
                </div>
              ) : showKeyboard ? (
                <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
                  <input
                    autoFocus
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submitText()}
                    placeholder={getInputHint()}
                    style={{
                      flex: 1, padding: '20px 28px', borderRadius: 24,
                      border: `2px solid ${C.border}`,
                      background: C.bg, color: C.text,
                      ...sc(BM.XS, lf), outline: 'none', fontFamily: FF,
                    }}
                  />
                  <button onClick={submitText} style={{
                    padding: '20px 36px', borderRadius: 24,
                    background: C.primary, color: C.primaryText,
                    border: 'none', cursor: 'pointer', ...sc(NAV.SB, lf), fontFamily: FF,
                  }}>전송</button>
                </div>
              ) : (
                <div style={{
                  marginBottom: 20, ...sc(BM.SM, lf),
                  color: optCtx ? C.primary : C.textMuted,
                  fontWeight: optCtx ? 600 : 500,
                }}>
                  {getInputHint()}
                </div>
              )}

              {/* 컨트롤 버튼 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40, marginBottom: 12 }}>
                {/* 키보드 */}
                <button
                  onClick={() => setShowKeyboard(k => !k)}
                  style={{
                    width: 88, height: 88, borderRadius: '50%',
                    border: `2px solid ${showKeyboard ? C.primary : C.border}`,
                    background: showKeyboard ? C.primaryBg : C.bg,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Keyboard size={44} color={showKeyboard ? C.primary : C.textSub} />
                </button>

                {/* 마이크 */}
                <button
                  onClick={voiceState === 'listening' ? stopVoice : startVoice}
                  disabled={voiceState === 'processing'}
                  style={{
                    width: 128, height: 128, borderRadius: '50%',
                    background: voiceState === 'listening' ? C.negative : C.primary,
                    border: 'none',
                    cursor: voiceState === 'processing' ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: voiceState === 'listening'
                      ? '0 8px 32px rgba(220,38,38,0.5)'
                      : hc ? '0 8px 32px rgba(255,229,0,0.45)' : '0 8px 32px rgba(37,99,235,0.45)',
                    animation: voiceState === 'listening' ? 'micPulse 1.4s ease infinite' : 'none',
                    opacity: voiceState === 'processing' ? 0.5 : 1,
                  }}
                >
                  {voiceState === 'listening'
                    ? <MicOff size={60} color="#fff" />
                    : <Mic size={60} color={C.primaryText} />
                  }
                </button>

                {/* TTS 토글 */}
                <button
                  onClick={() => setTtsOn(v => !v)}
                  style={{
                    width: 88, height: 88, borderRadius: '50%',
                    border: `2px solid ${ttsOn ? C.primary : C.border}`,
                    background: ttsOn ? C.primaryBg : C.bg,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {ttsOn
                    ? <Volume2 size={44} color={C.primary} />
                    : <VolumeX size={44} color={C.textMuted} />
                  }
                </button>
              </div>
            </div>

            {/* 푸터 */}
            <div style={{ textAlign: 'center', padding: '4px 0 36px' }}>
              <button
                onClick={() => setShowKeyboard(true)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  ...sc(BM.XS, lf), color: C.primary, textDecoration: 'underline', fontFamily: FF,
                }}
              >
                음성 명령이 어려우신가요?
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes wordIn    { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes dotBounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-12px)} }
        @keyframes micPulse  { 0%,100%{box-shadow:0 8px 32px rgba(220,38,38,0.5)} 50%{box-shadow:0 8px 56px rgba(220,38,38,0.75)} }
        @keyframes listenRing { 0%,100%{opacity:0.4;transform:scale(1)} 50%{opacity:1;transform:scale(1.05)} }
      `}</style>
    </>
  )
})

export default AIAssistantFAB

// ── AIAvatar ──────────────────────────────────────────────────────────
function AIAvatar({ C }) {
  return (
    <div style={{
      width: 64, height: 64, borderRadius: '50%', background: C.primaryBg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Bot size={36} color={C.primary} />
    </div>
  )
}

// ── ChatMessage ───────────────────────────────────────────────────────
function ChatMessage({
  msg, localItems, isConfirmed, activeOptName, isAwaitingConfirm,
  C, lf, hc, bubbleBg,
  onUpdateOption, onConfirm, onCancel,
}) {
  const items = localItems || msg.items || []

  // 사용자 메시지
  if (msg.role === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{
          background: C.primary, color: C.primaryText,
          borderRadius: '24px 24px 6px 24px',
          padding: '24px 32px', maxWidth: '72%',
          ...sc(BM.XS, lf),
        }}>
          {msg.text}
        </div>
      </div>
    )
  }

  // AI 일반/액션 메시지
  if (msg.type === 'text' || msg.type === 'action') {
    const isAction = msg.type === 'action'
    return (
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
        <AIAvatar C={C} />
        <div style={{
          background: isAction ? C.primaryBg : bubbleBg,
          borderRadius: '24px 24px 24px 6px',
          padding: '24px 32px', maxWidth: '72%',
          ...sc(BM.XS, lf), color: isAction ? C.primary : C.text,
          border: isAction ? `2px solid ${C.primaryBorder}` : 'none',
          display: 'flex', alignItems: 'center', gap: isAction ? 16 : 0,
        }}>
          {isAction && <CreditCard size={36} color={C.primary} />}
          {msg.text}
        </div>
      </div>
    )
  }

  // 주문형 메시지
  if (msg.type === 'order') {
    const item = items[0]
    if (!item) return null
    const unresolvedOpts = (item.menuOptions || []).filter(o => !item.selectedOptions[o.name])
    const allResolved = unresolvedOpts.length === 0

    return (
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <AIAvatar C={C} />
        <div style={{ flex: 1, maxWidth: '84%', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* AI 말풍선 */}
          {msg.reply && (
            <div style={{
              background: bubbleBg, borderRadius: '24px 24px 24px 6px',
              padding: '24px 32px', ...sc(BM.XS, lf), color: C.text,
            }}>
              {msg.reply}
            </div>
          )}

          {/* 주문 카드 */}
          {isConfirmed ? (
            <div style={{
              background: hc ? C.positiveBg : '#F0FDF4',
              border: `2px solid ${C.positiveBorder}`,
              borderRadius: 24, padding: '24px 32px',
              ...sc(BM.XS, lf), color: C.text,
              display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <Check size={36} color={C.positive} />
              장바구니에 담았어요!
            </div>
          ) : (
            <div style={{
              background: hc ? '#141414' : '#FFFFFF',
              border: `2px solid ${C.border}`,
              borderRadius: 28, overflow: 'hidden',
            }}>
              {/* 아이템 정보 */}
              <div style={{ display: 'flex', gap: 24, padding: '28px 28px 22px' }}>
                <div style={{
                  width: 120, height: 120, borderRadius: 22, overflow: 'hidden',
                  background: C.cardAlt, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {item.img
                    ? <img src={item.img} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    : <Coffee size={52} color={C.textMuted} />
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ ...sc(B.SM, lf), color: C.text, marginBottom: 12 }}>{item.name}</div>
                  {/* 선택된 옵션 표시 */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                    {Object.entries(item.selectedOptions || {}).map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {k === '온도' && v.label === 'HOT' && <Flame size={28} color="#dc2626" />}
                        {k === '온도' && v.label === 'ICE' && <Snowflake size={28} color="#0ea5e9" />}
                        <span style={{ ...sc(BM.XS, lf), color: C.textSub }}>{getDisplay(v.label)}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ ...sc(L.XS, lf), color: C.primary }}>{fmt(item.price)} × {item.qty}</div>
                </div>
              </div>

              {/* 미결 옵션 선택 */}
              {unresolvedOpts.map(opt => {
                const isActive = activeOptName === opt.name
                return (
                  <div key={opt.name} style={{ padding: '18px 28px 22px', borderTop: `1px solid ${C.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                      <span style={{
                        ...sc(BM.XS, lf),
                        color: isActive ? C.primary : C.textSub,
                        fontWeight: isActive ? 600 : 500,
                      }}>
                        {opt.name} 선택해 주세요
                      </span>
                      {isActive && (
                        <span style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          background: C.negativeBg, borderRadius: 20, padding: '6px 18px',
                          ...sc(BM.XS, lf), color: C.negative, fontWeight: 600,
                          animation: 'listenRing 1.4s ease infinite',
                        }}>
                          <Mic size={26} color={C.negative} />
                          듣고 있어요
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {(opt.choices || []).map(choice => {
                        const isSel  = item.selectedOptions[opt.name]?.label === choice.label
                        const isTemp = opt.name === '온도'
                        const accent = isTemp && choice.label === 'HOT' ? '#dc2626'
                                     : isTemp && choice.label === 'ICE' ? '#0ea5e9' : null
                        return (
                          <button
                            key={choice.label}
                            onClick={() => onUpdateOption(opt.name, choice)}
                            style={{
                              padding: '18px 32px', borderRadius: 18,
                              background: isSel ? (accent || C.primary) : C.bg,
                              color: isSel ? '#fff' : C.text,
                              border: `2px solid ${isSel ? (accent || C.primary) : C.border}`,
                              cursor: 'pointer', ...sc(NAV.SB, lf), fontFamily: FF,
                              display: 'flex', alignItems: 'center', gap: 10,
                            }}
                          >
                            {isTemp && choice.label === 'HOT' && <Flame size={28} />}
                            {isTemp && choice.label === 'ICE' && <Snowflake size={28} />}
                            {getDisplay(choice.label)}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {/* 확인 / 취소 버튼 */}
              {allResolved && (
                <div style={{ display: 'flex', borderTop: `2px solid ${C.border}` }}>
                  <button
                    onClick={onCancel}
                    style={{
                      flex: 1, padding: '28px', border: 'none', background: 'none',
                      cursor: 'pointer', ...sc(NAV.SB, lf), color: C.textSub,
                      borderRight: `1px solid ${C.border}`, fontFamily: FF,
                    }}
                  >
                    취소
                  </button>
                  <button
                    onClick={() => onConfirm(items)}
                    style={{
                      flex: 2, padding: '28px', border: 'none',
                      background: isAwaitingConfirm ? C.primaryBg : 'none',
                      cursor: 'pointer', ...sc(L.XS, lf), color: C.primary, fontFamily: FF,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                      animation: isAwaitingConfirm ? 'listenRing 1.4s ease infinite' : 'none',
                    }}
                  >
                    {isAwaitingConfirm && <Mic size={32} color={C.primary} />}
                    <Check size={32} /> 넣을까요!
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}
