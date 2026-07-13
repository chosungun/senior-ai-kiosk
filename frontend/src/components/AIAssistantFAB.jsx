import { useState, useRef, forwardRef, useImperativeHandle, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Mic, MicOff, Keyboard, Volume2, VolumeX, Bot, ArrowLeft, Home,
  Check, Flame, Snowflake, Coffee, ShoppingCart,
} from 'lucide-react'
import { agentChat, sttAudio, ttsText } from '../api'
import { useA11y } from '../context/AccessibilityContext'
import { getC } from '../styles/colors'
import { FF, B, BM, L, NAV, sc } from '../styles/typography'
import ScreenHeader, { HeaderIconButton } from './ScreenHeader'
import StepIndicator from './StepIndicator'

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

function findMenu(name, menus) {
  return menus.find(m => m.name === name || m.name.includes(name) || name.includes(m.name))
}

const FAQ_SUGGESTIONS = [
  '화장실 어디에요?',
  '와이파이 비밀번호 뭐예요?',
  '텀블러 가져오면 할인 돼요?',
]

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
    let tempLabel = tempOpt ? (tempOpt.value === 'HOT' ? 'HOT' : 'ICE') : null
    const selectedOptions = {}
    if (tempLabel) selectedOptions['온도'] = { label: tempLabel, price: 0 }
    spokenOpts.forEach(so => {
      if (so.name === '온도') return
      const menuOpt = (found.options || []).find(o => o.name === so.name)
      const choice = menuOpt?.choices?.find(c => c.label === so.value || c.label === (so.value || '').toUpperCase())
      if (choice) selectedOptions[so.name] = choice
    })
    // found.options 없고 hasTemp인 경우 온도 옵션 자동 생성 (FALLBACK 대응)
    let menuOptions = found.options || []
    if (hasTempMenu && !menuOptions.some(o => o.name === '온도')) {
      menuOptions = [{ name: '온도', choices: [{ label: 'HOT', price: 0 }, { label: 'ICE', price: 0 }] }, ...menuOptions]
    }
    return {
      id: `${found.id}-${Date.now()}-${idx}`,
      menuId: found.id, name: found.name, price: found.price,
      qty: pi.qty || 1,
      temp: tempLabel === 'HOT' ? '따뜻하게' : tempLabel === 'ICE' ? '시원하게' : null,
      selectedOptions, img: found.img, menuOptions,
    }
  }).filter(Boolean)
}

// ── 말하는 영상 핑퐁 재생 (끝에서 되감아 처음으로, 순간 점프 없이 자연스럽게 루프) ──
function PingPongVideo({ src, style }) {
  const videoRef = useRef(null)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    let dir = 1
    let lastTs = null
    let raf = requestAnimationFrame(step)

    function step(ts) {
      if (dir === -1) {
        if (lastTs == null) lastTs = ts
        const dt = (ts - lastTs) / 1000
        lastTs = ts
        const next = v.currentTime - dt
        if (next <= 0) {
          v.currentTime = 0
          dir = 1
          lastTs = null
          v.play().catch(() => {})
        } else {
          v.currentTime = next
        }
      }
      raf = requestAnimationFrame(step)
    }

    const onEnded = () => { dir = -1; lastTs = null }
    v.addEventListener('ended', onEnded)
    v.play().catch(() => {})

    return () => {
      v.removeEventListener('ended', onEnded)
      cancelAnimationFrame(raf)
    }
  }, [src])

  return <video ref={videoRef} src={src} muted playsInline style={style} />
}

// ── 컴포넌트 ──────────────────────────────────────────────────────────
const AIAssistantFAB = forwardRef(function AIAssistantFAB({
  menus = [], onAddToCart, cart = [], cartTotal = 0, bottomOffset = 48, showFab = true,
}, ref) {
  const nav = useNavigate()
  const { highContrast, largeFont } = useA11y()
  const hc = highContrast
  const lf = largeFont ? 1.2 : 1
  const C = getC(hc)

  const [open, setOpen]             = useState(false)
  const [mode, setMode]             = useState('faq')
  const [messages, setMessages]     = useState([])
  const [voiceState, setVoiceState] = useState('idle')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [liveWords, setLiveWords]   = useState([])
  const [ttsWords, setTtsWords]     = useState([])
  const [showKeyboard, setShowKeyboard] = useState(false)
  const [inputText, setInputText]   = useState('')
  const [ttsOn, setTtsOn]           = useState(true)
  const [orderItems, setOrderItems] = useState({})
  const [optCtx, setOptCtxState]    = useState(null)
  const [confirmed, setConfirmed]   = useState({})
  const [pendingRecs, setPendingRecs] = useState([])
  const [voiceCart, setVoiceCart]   = useState([])
  const [showCartDetail, setShowCartDetail] = useState(false)

  const recRef        = useRef(null)
  const mrRef         = useRef(null)
  const chunksRef     = useRef([])
  const finalRef      = useRef('')
  const liveRef       = useRef([])
  const idRef         = useRef(2)
  const audioRef      = useRef(null)
  const optCtxRef     = useRef(null)
  const askContinueRef = useRef(false)
  const revealTimerRef = useRef(null)

  const setOptCtx = ctx => { optCtxRef.current = ctx; setOptCtxState(ctx) }
  const nextId    = () => ++idRef.current

  useImperativeHandle(ref, () => ({ open: (m = 'faq') => { setMode(m); setOpen(true) } }), [])

  // 오버레이 열릴 때 초기화 + 인사
  useEffect(() => {
    if (open) {
      setPendingRecs([])
      setOrderItems({})
      setConfirmed({})
      setOptCtx(null)
      setVoiceCart([])
      setShowCartDetail(false)
      askContinueRef.current = false
      const greeting = mode === 'order'
        ? '안녕하세요! 어떤 메뉴를 주문하고 싶으신가요?'
        : '안녕하세요! 매장 이용에 대해 궁금한 점을 물어보세요.'
      setMessages([{ id: nextId(), role: 'ai', type: 'text', text: greeting }])
      revealWords(greeting)
    }
  }, [open, mode])

  // ── 단어별 출력 ───────────────────────────────────────────────────
  const revealWords = text => {
    if (revealTimerRef.current) clearInterval(revealTimerRef.current)
    setTtsWords([])
    const words = (text || '').trim().split(/\s+/).filter(Boolean)
    if (!words.length) return
    let i = 0
    revealTimerRef.current = setInterval(() => {
      i++
      setTtsWords(words.slice(0, i))
      if (i >= words.length) clearInterval(revealTimerRef.current)
    }, 200)
  }

  // ── TTS ──────────────────────────────────────────────────────────
  const speak = text => new Promise(resolve => {
    if (!text) { resolve(); return }
    revealWords(text)
    if (!ttsOn) { resolve(); return }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    ttsText(text)
      .then(res => {
        const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: 'audio/mpeg' })
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audioRef.current = audio
        const done = () => { URL.revokeObjectURL(url); audioRef.current = null; setIsSpeaking(false); resolve() }
        audio.onended = done; audio.onerror = done
        setIsSpeaking(true)
        audio.play().catch(done)
      })
      .catch(resolve)
  })

  // ── 음성 인식 ──────────────────────────────────────────────────
  const startVoice = () => {
    setLiveWords([]); liveRef.current = []; finalRef.current = ''
    setTtsWords([])
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
      rec.onend  = () => {
        const text = finalRef.current || liveRef.current.join(' ')
        if (!text.trim()) {
          setVoiceState('idle')
          revealWords('말씀을 듣지 못했어요. 마이크 버튼을 다시 눌러 말씀해 주세요.')
        } else {
          processInput(text)
        }
      }
      rec.onerror = e => {
        setVoiceState('idle')
        const msg = e.error === 'not-allowed'
          ? '마이크 권한이 필요해요. 브라우저에서 마이크를 허용해 주세요.'
          : e.error === 'no-speech'
          ? '말씀을 듣지 못했어요. 다시 눌러 말씀해 주세요.'
          : '음성 인식에 실패했어요. 키보드로 입력해 주세요.'
        revealWords(msg)
      }
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
    if (askContinueRef.current) {
      setVoiceState('processing'); await handleContinueDecision(text); setVoiceState('idle'); return
    }
    const ctx = optCtxRef.current
    if (ctx) { setVoiceState('processing'); await handleOptionVoice(text, ctx); setVoiceState('idle'); return }
    await processChat(text)
  }

  // ── 담은 뒤 "계속 주문" vs "결제" 의사 확인 ─────────────────────
  const handleContinueDecision = async text => {
    askContinueRef.current = false
    const wantsPayment = /결제|계산|페이|그만|끝낼래|다\s*됐/.test(text)
    if (wantsPayment) {
      const total = voiceCart.reduce((s, i) => s + i.price * i.qty, 0)
      await speak('결제 화면으로 이동할게요.')
      nav('/kiosk/payment', { state: { cart: voiceCart, total } })
    } else {
      // 결제 의사가 아니면 계속 주문하려는 것으로 보고 바로 이어서 처리
      await processChat(text)
    }
  }

  // ── 옵션 음성 처리 ─────────────────────────────────────────────
  const handleOptionVoice = async (text, ctx) => {
    const matched = matchOption(text, ctx.choices)
    if (matched) {
      const currentItems = orderItems[ctx.msgId] || []
      const currentItem  = currentItems[0]
      if (!currentItem) { setOptCtx(null); return }

      // 현재 옵션 선택 후 같은 발화에서 나머지 옵션도 한번에 처리
      let newSel = { ...currentItem.selectedOptions, [ctx.optName]: matched }
      const remaining = (currentItem.menuOptions || []).filter(o => !newSel[o.name])
      for (const opt of remaining) {
        const m = matchOption(text, opt.choices)
        if (m) newSel[opt.name] = m
      }

      setOrderItems(prev => ({
        ...prev,
        [ctx.msgId]: prev[ctx.msgId].map((it, i) =>
          i === 0 ? { ...it, selectedOptions: newSel } : it
        ),
      }))

      const display = getDisplay(matched.label)
      const stillUnresolved = (currentItem.menuOptions || []).find(o => !newSel[o.name])
      if (stillUnresolved) {
        setOptCtx({ msgId: ctx.msgId, optName: stillUnresolved.name, choices: stillUnresolved.choices })
        await speak(`${display}로 선택했어요. ${stillUnresolved.name}를 선택해 주세요.`)
      } else {
        setOptCtx(null)
        await speak(`${display}로 선택했어요. 아래 담기 버튼을 눌러주세요.`)
      }
    } else {
      const hint = ctx.choices.map(c => getDisplay(c.label)).join(' 또는 ')
      await speak(`다시 말씀해 주세요. ${hint} 중에 선택해 주세요.`)
    }
  }

  // ── 일반 대화(AI) 처리 ─────────────────────────────────────────
  const processChat = async text => {
    // 현재 메시지 추가 전에 히스토리 캡처
    const history = messages
      .filter(m => m.type === 'text' && m.text)
      .slice(-6)
      .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }))

    setVoiceState('processing')
    setPendingRecs([])
    setMessages(prev => [...prev, { id: nextId(), role: 'user', type: 'text', text }])
    const addAiMsg = reply =>
      setMessages(prev => [...prev, { id: nextId(), role: 'ai', type: 'text', text: reply }])
    try {
      const { data: agent } = await agentChat(text, {
        cart: cart.map(c => ({ menu: c.name, qty: c.qty })),
        total: cartTotal,
        history,
        mode,
      })
      const { class: cls, response: reply, action, items: rawItems = [], menus: recMenus = [] } = agent

      switch (cls) {

        // ── FAQ: 채팅 말풍선으로 표시
        case 'FAQ':
          addAiMsg(reply)
          await speak(reply)
          break

        // ── 메뉴 추천 제시
        case 'RECOMMEND':
          setPendingRecs(recMenus)
          await speak(reply)
          break

        // ── 주문
        case 'ORDER': {
          const items = resolveItems(rawItems, menus)
          if (items.length > 0) {
            const msgId = nextId()
            setMessages(prev => [...prev, { id: msgId, role: 'ai', type: 'order', items, reply }])
            setOrderItems(prev => ({ ...prev, [msgId]: items.map(it => ({ ...it })) }))
            if (action === 'ask_options') {
              const firstUnresolved = (items[0].menuOptions || []).find(o => !items[0].selectedOptions[o.name])
              if (firstUnresolved) setOptCtx({ msgId, optName: firstUnresolved.name, choices: firstUnresolved.choices })
            } else {
              setOptCtx(null)
            }
          }
          await speak(reply)
          break
        }

        // ── fallback / unclear
        default:
          await speak(reply)
          break
      }
    } catch {
      const errMsg = '일시적인 오류가 발생했어요. 다시 시도해 주세요.'
      if (mode === 'faq') addAiMsg(errMsg)
      await speak(errMsg)
    }
    setVoiceState('idle')
  }

  const submitText = () => {
    const text = inputText.trim()
    if (!text) return
    setInputText(''); processInput(text)
  }

  const getInputHint = () => {
    if (!optCtx) return '여기에 입력하세요...'
    if (optCtx.type === 'confirm') return '"네" 또는 "아니요"로 입력하세요'
    const hint = optCtx.choices.map(c => getDisplay(c.label)).join(' / ')
    return `${optCtx.optName}: ${hint}`
  }

  // 현재 미확인 주문 (마지막 order 메시지)
  const activeOrderMsg = [...messages].reverse().find(m => m.type === 'order')
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user' && m.type === 'text')
  const userWords = voiceState === 'listening'
    ? liveWords
    : (lastUserMsg ? lastUserMsg.text.trim().split(/\s+/).filter(Boolean) : [])

  // ── 진행 단계 (메뉴 선택 → 옵션 선택 → 결제) ──────────────────────
  const activeItems = activeOrderMsg ? (orderItems[activeOrderMsg.id] || activeOrderMsg.items || []) : []
  const activeItem = activeItems[0]
  const hasUnresolvedOpts = !!activeItem && (activeItem.menuOptions || []).some(o => !activeItem.selectedOptions[o.name])
  const hasConfirmedItem = Object.keys(confirmed).length > 0
  const voiceStep = activeOrderMsg
    ? (hasUnresolvedOpts ? 2 : 3)
    : (hasConfirmedItem ? 3 : 1)

  const overlayBg = hc ? 'rgba(0,0,0,0.93)' : '#FFFFFF'
  const textBoxBg = hc ? 'rgba(20,20,20,0.98)' : 'rgba(255,255,255,0.97)'

  // ── 음성 주문 장바구니 (항상 확인 가능) ───────────────────────────
  const cartItems = onAddToCart ? cart : voiceCart
  const cartTotalDisplay = onAddToCart ? cartTotal : voiceCart.reduce((s, i) => s + i.price * i.qty, 0)
  const cartQtyCount = cartItems.reduce((s, it) => s + it.qty, 0)
  const goToPayment = () => {
    setShowCartDetail(false)
    nav('/kiosk/payment', { state: { cart: cartItems, total: cartTotalDisplay } })
  }

  return (
    <>
      {/* FAB 버튼 */}
      {!open && showFab && (
        <div style={{
          position: 'absolute', bottom: bottomOffset, right: 48, zIndex: 20,
          display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16,
        }}>
          <div style={{
            background: hc ? C.card : '#fff', border: `2px solid ${C.border}`,
            borderRadius: 32, padding: '14px 32px',
            ...sc(BM.SM, lf), color: C.text, whiteSpace: 'nowrap',
            boxShadow: '0 4px 20px rgba(0,0,0,0.14)',
          }}>
            도움이 필요하신가요?
          </div>
          <button
            onClick={() => { setMode('faq'); setOpen(true) }}
            style={{
              width: 120, height: 120, borderRadius: '50%',
              background: C.primary, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: hc ? '0 8px 40px rgba(255,229,0,0.5)' : '0 8px 40px rgba(37,99,235,0.5)',
              position: 'relative',
            }}
          >
            <Bot size={60} color={C.primaryText} />
          </button>
        </div>
      )}

      {/* 음성 오버레이 */}
      {open && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 55,
          background: overlayBg,
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          display: 'flex', flexDirection: 'column',
          fontFamily: FF,
        }}>

          {/* ── 상단 헤더 (터치로 주문하기 화면과 동일한 헤더 디자인) ── */}
          <ScreenHeader
            C={C} lf={lf}
            left={
              <HeaderIconButton
                icon={Home}
                onClick={() => { setOpen(false); nav('/kiosk') }} ariaLabel="처음으로" C={C}
              />
            }
            right={
              mode === 'order' && (
                <HeaderIconButton
                  icon={ShoppingCart} badge={cartQtyCount}
                  onClick={() => setShowCartDetail(true)} ariaLabel="장바구니" C={C}
                />
              )
            }
          />

          <div style={{
            flex: 1, minHeight: 0, width: '100%',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '36px 48px', overflow: 'hidden',
          }}>

          {/* ── 진행 단계 인디케이터 (주문 모드에서만) ── */}
          {mode === 'order' && <StepIndicator steps={VOICE_STEPS} current={voiceStep} C={C} lf={lf} />}

          {/* ── 전체 콘텐츠: 귀·파동·상태·텍스트박스·주문카드·마이크·키보드 ── */}
          <div style={{
            flex: 1, width: '100%',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'space-evenly',
          }}>
            {/* 캐릭터 영상(오른쪽) + AI 말풍선(왼쪽, 아바타가 하는 말) */}
            <div style={{
              width: '100%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0,
            }}>
              <div style={{
                position: 'relative', flex: 1, maxWidth: '46%',
                background: textBoxBg, borderRadius: '28px 28px 0 28px',
                border: `2px solid ${C.borderMid}`,
                padding: '28px 32px', minHeight: 120,
                display: 'flex', flexWrap: 'wrap', gap: 10, alignContent: 'flex-start',
              }}>
                {voiceState === 'listening' ? (
                  <span style={{ ...sc(BM.SM, lf), color: C.textMuted, fontStyle: 'italic' }}>
                    듣고 있어요... (말이 끝나면 자동으로 전송돼요)
                  </span>
                ) : ttsWords.length > 0 ? (
                  ttsWords.map((w, i) => (
                    <span
                      key={i}
                      style={{ ...sc(BM.SM, lf), color: C.text, animation: 'wordIn 0.22s ease forwards' }}
                    >
                      {w}
                    </span>
                  ))
                ) : voiceState === 'processing' ? (
                  <span style={{ ...sc(BM.SM, lf), color: C.textMuted, fontStyle: 'italic' }}>
                    생각 중이에요...
                  </span>
                ) : (
                  <span style={{ ...sc(BM.SM, lf), color: C.textMuted, fontStyle: 'italic' }}>
                    AI 도우미가 응답합니다...
                  </span>
                )}
              </div>

              <div style={{
                width: mode === 'order' ? 540 : 580,
                height: mode === 'order' ? 540 : 580,
                marginLeft: -40,
                borderRadius: 40,
                background: C.cardAlt,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, overflow: 'hidden',
              }}>
                {isSpeaking ? (
                  <PingPongVideo
                    key={`${mode}-speech`}
                    src={mode === 'order' ? '/Order_speech.mp4' : '/FAQ_speech.mp4'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <video
                    key={`${mode}-idle`}
                    src={mode === 'order' ? '/Order.mp4' : '/FAQ.mp4'}
                    autoPlay loop muted playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}
              </div>
            </div>

            {/* 추천 메뉴 카드 (사진 크게 + 이름 작게, 3개) */}
            {pendingRecs.length > 0 && (
              <div style={{
                width: '100%', flexShrink: 0,
                display: 'flex', gap: 20, justifyContent: 'center',
              }}>
                {pendingRecs.map(name => {
                  const found = findMenu(name, menus)
                  return (
                    <button
                      key={name}
                      onClick={() => { setPendingRecs([]); processInput(name) }}
                      style={{
                        width: 280, flexShrink: 0,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                        padding: 14, borderRadius: 24, cursor: 'pointer',
                        background: C.card, border: `2px solid ${C.borderMid}`,
                      }}
                    >
                      <div style={{
                        width: '100%', aspectRatio: '1 / 1', borderRadius: 18, overflow: 'hidden',
                        background: C.cardAlt, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {found?.img
                          ? <img src={found.img} alt={name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          : <Coffee size={72} color={C.textMuted} />
                        }
                      </div>
                      <span style={{ fontSize: 40 * lf, fontWeight: 600, color: C.text, textAlign: 'center' }}>{name}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* 자주 하는 질문 (FAQ 모드, 아직 질문 전) */}
            {mode === 'faq' && !messages.some(m => m.role === 'user') && (
              <div style={{
                width: '72%', flexShrink: 0,
                display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center',
              }}>
                {FAQ_SUGGESTIONS.map(q => (
                  <button
                    key={q}
                    onClick={() => processInput(q)}
                    style={{
                      padding: '18px 28px', borderRadius: 22,
                      background: C.primaryBg, border: `3px dashed ${C.primary}`,
                      color: C.primary, cursor: 'pointer',
                      ...sc(NAV.SB, lf), fontFamily: FF,
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* 대기 중인 주문 카드 (옵션 선택 패널) — 사용자 발화 박스보다 위에 표시 */}
            {activeOrderMsg && !confirmed[activeOrderMsg.id] && (
              <div style={{ width: '72%', flexShrink: 0 }}>
                <OrderCard
                  msg={activeOrderMsg}
                  localItems={orderItems[activeOrderMsg.id]}
                  activeOptName={optCtx?.msgId === activeOrderMsg.id ? optCtx.optName : null}
                  C={C} lf={lf} hc={hc}
                  onUpdateOption={(optName, choice) => {
                    const current = orderItems[activeOrderMsg.id] || []
                    const item = current[0]
                    if (!item) return
                    const newSel = { ...item.selectedOptions, [optName]: choice }
                    setOrderItems(prev => ({
                      ...prev,
                      [activeOrderMsg.id]: prev[activeOrderMsg.id].map((it, i) =>
                        i === 0 ? { ...it, selectedOptions: newSel } : it
                      ),
                    }))
                    const nextUnresolved = (item.menuOptions || []).find(o => !newSel[o.name])
                    if (nextUnresolved) {
                      setOptCtx({ msgId: activeOrderMsg.id, optName: nextUnresolved.name, choices: nextUnresolved.choices })
                      speak(`다음으로 ${nextUnresolved.name}를 선택해 주세요.`)
                    } else {
                      setOptCtx(null)
                      speak('아래 담기 버튼을 눌러주세요.')
                    }
                  }}
                  onConfirm={rawItems => {
                    // 선택한 옵션 가격 반영
                    const items = rawItems.map(it => {
                      const extra = Object.values(it.selectedOptions || {})
                        .reduce((s, o) => s + (o.price || 0), 0)
                      return { ...it, price: it.price + extra }
                    })
                    setConfirmed(prev => ({ ...prev, [activeOrderMsg.id]: true }))
                    setOptCtx(null)
                    if (onAddToCart) {
                      onAddToCart(items)
                      const names = items.map(i => {
                        const unit = (i.menuOptions || []).some(o => o.name === '온도') ? '잔' : '개'
                        return `${i.name} ${i.qty}${unit}`
                      }).join(', ')
                      speak(`${names} 장바구니에 담았어요!`)
                    } else {
                      const names = items.map(i => {
                        const unit = (i.menuOptions || []).some(o => o.name === '온도') ? '잔' : '개'
                        return `${i.name} ${i.qty}${unit}`
                      }).join(', ')
                      setVoiceCart(prev => [...prev, ...items])
                      askContinueRef.current = true
                      speak(`${names} 담았어요! 계속 주문하시겠어요, 아니면 결제하시겠어요?`)
                    }
                  }}
                  onCancel={() => {
                    setOptCtx(null)
                    setMessages(prev => prev.filter(m => m.id !== activeOrderMsg.id))
                    speak('알겠습니다! 다른 메뉴를 원하시면 말씀해 주세요.')
                  }}
                />
              </div>
            )}

            {/* 사용자 발화 박스 (내가 하는 말) */}
            <div style={{
              width: '72%', flexShrink: 0,
              background: textBoxBg,
              borderRadius: 32,
              border: `2px solid ${C.borderMid}`,
              padding: '40px 44px',
              minHeight: 220,
              display: 'flex', flexWrap: 'wrap', gap: 12,
              alignItems: 'flex-start', alignContent: 'flex-start',
            }}>
              {userWords.length > 0
                ? userWords.map((w, i) => (
                    <span
                      key={i}
                      style={{ ...sc(BM.SM, lf), color: C.text, animation: 'wordIn 0.22s ease forwards' }}
                    >
                      {w}
                    </span>
                  ))
                : (
                    <span style={{ ...sc(BM.SM, lf), color: C.textMuted, fontStyle: 'italic' }}>
                      마이크 버튼을 눌러 말씀해 주세요...
                    </span>
                  )
              }
            </div>

            {/* 자판 토글 + 마이크 버튼 (탭하면 시작, 말이 끝나면 자동으로 인식 종료) + 음성 안내 토글 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
              <button
                onClick={() => setShowKeyboard(k => !k)}
                aria-label="키보드로 입력하기"
                style={{
                  width: 60, height: 60, borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${showKeyboard ? C.primary : C.border}`,
                  background: showKeyboard ? C.primaryBg : C.bg,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Keyboard size={28} color={showKeyboard ? C.primary : C.textMuted} />
              </button>
              <button
                onClick={() => {
                  if (voiceState === 'processing') return
                  if (voiceState === 'listening') stopVoice()
                  else startVoice()
                }}
                disabled={voiceState === 'processing'}
                style={{
                  width: 168, height: 168, borderRadius: '50%', flexShrink: 0,
                  background: voiceState === 'listening' ? C.negative : C.primary,
                  border: 'none',
                  cursor: voiceState === 'processing' ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  userSelect: 'none', touchAction: 'none',
                  animation: voiceState === 'listening' ? 'micPulse 1.4s ease infinite' : 'none',
                  opacity: voiceState === 'processing' ? 0.5 : 1,
                }}
              >
                {voiceState === 'listening'
                  ? <MicOff size={68} color="#fff" />
                  : <Mic size={68} color={C.primaryText} />
                }
              </button>
              <button
                onClick={() => setTtsOn(v => !v)}
                aria-label="음성 안내 켜기/끄기"
                style={{
                  width: 60, height: 60, borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${ttsOn ? C.primary : C.border}`,
                  background: ttsOn ? C.primaryBg : C.bg,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {ttsOn
                  ? <Volume2 size={28} color={C.primary} />
                  : <VolumeX size={28} color={C.textMuted} />
                }
              </button>
            </div>

            {/* 키보드 입력 영역 */}
            {showKeyboard && (
              <div style={{ width: '100%', display: 'flex', gap: 14, flexShrink: 0 }}>
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
                    ...sc(BM.SM, lf), outline: 'none', fontFamily: FF,
                  }}
                />
                <button onClick={submitText} style={{
                  padding: '20px 36px', borderRadius: 24,
                  background: C.primary, color: C.primaryText,
                  border: 'none', cursor: 'pointer', ...sc(NAV.SB, lf), fontFamily: FF,
                }}>전송</button>
              </div>
            )}
          </div>
          </div>
        </div>
      )}

      {/* ── 장바구니 상세 화면 ── */}
      {open && showCartDetail && (
        <CartDetailOverlay
          items={cartItems} total={cartTotalDisplay}
          C={C} lf={lf} hc={hc}
          onClose={() => setShowCartDetail(false)}
          onPay={cartItems.length > 0 ? goToPayment : null}
        />
      )}

      <style>{`
        @keyframes wordIn     { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        @keyframes micPulse   { 0%,100%{box-shadow:0 8px 32px rgba(220,38,38,0.5)} 50%{box-shadow:0 8px 56px rgba(220,38,38,0.75)} }
        @keyframes listenRing { 0%,100%{opacity:0.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.04)} }
      `}</style>
    </>
  )
})

export default AIAssistantFAB

// ── 진행 단계 인디케이터 ────────────────────────────────────────────────
const VOICE_STEPS = [
  { n: 1, label: '메뉴 선택' },
  { n: 2, label: '옵션 선택' },
  { n: 3, label: '결제' },
]

// ── 장바구니 상세 화면 ──────────────────────────────────────────────────
function CartDetailOverlay({ items, total, C, lf, hc, onClose, onPay }) {
  const unit = it => (it.menuOptions || []).some(o => o.name === '온도') ? '잔' : '개'
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 70,
      background: hc ? '#000' : '#FFFFFF',
      display: 'flex', flexDirection: 'column',
      fontFamily: FF,
    }}>
      {/* 헤더 (터치로 주문하기 화면과 동일한 헤더 디자인) */}
      <ScreenHeader
        C={C} lf={lf} title="장바구니"
        left={<HeaderIconButton icon={ArrowLeft} onClick={onClose} ariaLabel="뒤로가기" C={C} />}
      />

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '36px 48px', overflow: 'hidden' }}>

      {/* 아이템 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {items.length === 0 ? (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            ...sc(BM.SM, lf), color: C.textMuted,
          }}>
            장바구니가 비어있어요
          </div>
        ) : items.map((it, i) => (
          <div key={it.id || i} style={{
            display: 'flex', gap: 24, padding: '20px 24px',
            background: hc ? 'rgba(20,20,20,0.98)' : C.card,
            border: `2px solid ${C.border}`, borderRadius: 24,
          }}>
            <div style={{
              width: 96, height: 96, borderRadius: 18, overflow: 'hidden',
              background: C.cardAlt, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {it.img
                ? <img src={it.img} alt={it.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                : <Coffee size={44} color={C.textMuted} />
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...sc(B.SM, lf), color: C.text, marginBottom: 8 }}>{it.name}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {Object.entries(it.selectedOptions || {}).map(([k, v]) => (
                  <span key={k} style={{ ...sc(BM.SM, lf), color: C.textSub }}>
                    {k === '온도' ? getDisplay(v.label) : v.label}
                  </span>
                ))}
              </div>
              <div style={{ ...sc(L.XS, lf), color: C.primary }}>
                {fmt(it.price)} × {it.qty}{unit(it)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 합계 + 결제 */}
      {items.length > 0 && (
        <div style={{ flexShrink: 0, paddingTop: 24, borderTop: `2px solid ${C.border}` }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
          }}>
            <span style={{ ...sc(BM.SM, lf), color: C.textSub }}>총 결제 금액</span>
            <span style={{ ...sc(B.MD, lf), color: C.text, fontWeight: 700 }}>{fmt(total)}</span>
          </div>
          {onPay && (
            <button
              onClick={onPay}
              style={{
                width: '100%', padding: '24px', borderRadius: 24, border: 'none',
                background: C.primary, color: C.primaryText,
                cursor: 'pointer', ...sc(NAV.SB, lf), fontFamily: FF,
              }}
            >
              결제하러 가기
            </button>
          )}
        </div>
      )}
      </div>
    </div>
  )
}

// ── OrderCard ─────────────────────────────────────────────────────────
function OrderCard({
  msg, localItems, activeOptName,
  C, lf, hc,
  onUpdateOption, onConfirm, onCancel,
}) {
  const items = localItems || msg.items || []
  const item = items[0]
  if (!item) return null

  const unresolvedOpts = (item.menuOptions || []).filter(o => !item.selectedOptions[o.name])
  const allResolved = unresolvedOpts.length === 0

  return (
    <div style={{
      background: hc ? '#141414' : '#FFFFFF',
      border: `2px solid ${C.borderMid}`,
      borderRadius: 28, overflow: 'hidden',
    }}>
      {/* 아이템 정보 */}
      <div style={{ display: 'flex', gap: 24, padding: '24px 28px 20px' }}>
        <div style={{
          width: 100, height: 100, borderRadius: 20, overflow: 'hidden',
          background: C.cardAlt, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {item.img
            ? <img src={item.img} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            : <Coffee size={48} color={C.textMuted} />
          }
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ ...sc(B.SM, lf), color: C.text, marginBottom: 10 }}>{item.name}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            {Object.entries(item.selectedOptions || {}).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {k === '온도' && v.label === 'HOT' && <Flame size={24} color="#dc2626" />}
                {k === '온도' && v.label === 'ICE' && <Snowflake size={24} color="#0ea5e9" />}
                <span style={{ ...sc(BM.SM, lf), color: C.textSub }}>{getDisplay(v.label)}</span>
              </div>
            ))}
          </div>
          <div style={{ ...sc(L.XS, lf), color: C.primary }}>{fmt(item.price)} × {item.qty}</div>
        </div>
      </div>

      {/* 미결 옵션 */}
      {unresolvedOpts.map(opt => {
        const isActive = activeOptName === opt.name
        return (
          <div key={opt.name} style={{ padding: '16px 28px 20px', borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <span style={{ ...sc(BM.SM, lf), color: isActive ? C.primary : C.textSub, fontWeight: isActive ? 600 : 500 }}>
                {opt.name} 선택해 주세요
              </span>
              {isActive && (
                <span style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: C.negativeBg, borderRadius: 20, padding: '5px 14px',
                  ...sc(BM.SM, lf), color: C.negative, fontWeight: 600,
                  animation: 'listenRing 1.4s ease infinite',
                }}>
                  <Mic size={22} color={C.negative} />
                  듣는 중
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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
                      padding: '16px 28px', borderRadius: 16,
                      background: isSel ? (accent || C.primary) : C.bg,
                      color: isSel ? '#fff' : C.text,
                      border: `2px solid ${isSel ? (accent || C.primary) : C.border}`,
                      cursor: 'pointer', ...sc(NAV.SB, lf), fontFamily: FF,
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}
                  >
                    {isTemp && choice.label === 'HOT' && <Flame size={24} />}
                    {isTemp && choice.label === 'ICE' && <Snowflake size={24} />}
                    {getDisplay(choice.label)}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* 확인 / 취소 */}
      {allResolved && (
        <div style={{ display: 'flex', borderTop: `2px solid ${C.border}` }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '26px', border: 'none', background: 'none',
              cursor: 'pointer', ...sc(NAV.SB, lf), color: C.textSub,
              borderRight: `1px solid ${C.border}`, fontFamily: FF,
            }}
          >
            취소
          </button>
          <button
            onClick={() => onConfirm(items)}
            style={{
              flex: 2, padding: '26px', border: 'none', background: 'none',
              cursor: 'pointer', ...sc(L.XS, lf), color: C.primary, fontFamily: FF,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}
          >
            <Check size={30} /> 넣기
          </button>
        </div>
      )}
    </div>
  )
}
