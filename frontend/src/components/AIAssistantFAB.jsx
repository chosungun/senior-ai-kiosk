import { useState, useRef, forwardRef, useImperativeHandle, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Mic, MicOff, Keyboard, Volume2, VolumeX, Bot, ArrowLeft, Home,
  Check, Flame, Snowflake, Coffee, ShoppingCart,
  CreditCard, Smartphone, Banknote, Loader2, Utensils, ShoppingBag,
  Plus, Minus, X, Delete,
} from 'lucide-react'
import { agentChat, sttAudio, ttsText, createOrder } from '../api'
import { useA11y } from '../context/AccessibilityContext'
import { useIdle } from '../context/IdleContext'
import { useOrderType } from '../context/OrderTypeContext'
import { getC } from '../styles/colors'
import { FF, B, BM, L, NAV, sc } from '../styles/typography'
import ScreenHeader, { HeaderIconButton } from './ScreenHeader'
import StepIndicator from './StepIndicator'
import DineTypeBadge from './DineTypeBadge'
import NumericKeypad, { formatPhoneDigits } from './NumericKeypad'

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

// 여러 메뉴가 한 번에 담긴 경우, 아직 옵션이 정해지지 않은 첫 항목을 찾음 (fromIdx부터 현재 항목 우선 확인 후 다음 항목으로)
function findFirstUnresolved(items, fromIdx = 0) {
  for (let i = fromIdx; i < items.length; i++) {
    const opt = (items[i].menuOptions || []).find(o => !items[i].selectedOptions[o.name])
    if (opt) return { itemIdx: i, optName: opt.name, choices: opt.choices }
  }
  return null
}

// ── 음성 결제 ─────────────────────────────────────────────────────────
const PAY_METHODS = [
  { key: 'card',   label: '카드 결제', icon: CreditCard, match: /카드/ },
  { key: 'simple', label: '간편 결제', icon: Smartphone, match: /간편|삼성페이|페이|폰\s*결제/ },
  { key: 'cash',   label: '현금 결제', icon: Banknote, match: /현금/ },
]

function matchYesNo(text) {
  if (/아니|괜찮|안\s*(할|해|함)|하지\s*않|싫어|필요\s*없|됐어/.test(text)) return false
  if (/네|응|예|좋아|적립|출력|할게|해줘|맞아/.test(text)) return true
  return null
}

function matchDineType(text) {
  if (/포장|테이크아웃|가져갈|나가서|밖에서/.test(text)) return 'takeout'
  if (/먹고\s*갈|매장|여기서|안에서|이곳|가게\s*안/.test(text)) return 'dine_in'
  return null
}

// ── 쿼티(두벌식) 한글 조합 엔진 ──────────────────────────────────────
const CHO_LIST  = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']
const JUNG_LIST = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ']
const JONG_LIST = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']

// 겹받침 (종성 자리에서 다른 자음을 이어 누르면 결합)
const COMPLEX_JONG_FORM = {
  ㄱㅅ: 'ㄳ', ㄴㅈ: 'ㄵ', ㄴㅎ: 'ㄶ',
  ㄹㄱ: 'ㄺ', ㄹㅁ: 'ㄻ', ㄹㅂ: 'ㄼ', ㄹㅅ: 'ㄽ', ㄹㅌ: 'ㄾ', ㄹㅍ: 'ㄿ', ㄹㅎ: 'ㅀ',
  ㅂㅅ: 'ㅄ',
}
const COMPLEX_JONG_SPLIT = {}
Object.entries(COMPLEX_JONG_FORM).forEach(([k, v]) => { COMPLEX_JONG_SPLIT[v] = [k[0], k[1]] })

// 두벌식은 모음 두 개를 이어 눌러 겹모음을 만듦 (예: ㅗ + ㅏ = ㅘ)
const VOWEL_COMBO = {
  ㅗㅏ: 'ㅘ', ㅗㅐ: 'ㅙ', ㅗㅣ: 'ㅚ',
  ㅜㅓ: 'ㅝ', ㅜㅔ: 'ㅞ', ㅜㅣ: 'ㅟ',
  ㅡㅣ: 'ㅢ',
}
const VOWEL_COMBO_SPLIT = {}
Object.entries(VOWEL_COMBO).forEach(([k, v]) => { VOWEL_COMBO_SPLIT[v] = k[0] })

function composeHangul(choIdx, jungChar, jongChar = '') {
  const jungIdx = JUNG_LIST.indexOf(jungChar)
  if (choIdx == null || jungIdx < 0) return ''
  const jongIdx = JONG_LIST.indexOf(jongChar || '')
  return String.fromCharCode(0xAC00 + (choIdx * 21 + jungIdx) * 28 + jongIdx)
}

function initHangulState() {
  return { text: '', cho: null, jung: null, jong: '' }
}

// 아직 확정되지 않고 조합 중인 글자 하나(미리보기)
function previewChar(s) {
  if (s.cho == null) return ''
  if (s.jung == null) return CHO_LIST[s.cho]
  return composeHangul(s.cho, s.jung, s.jong)
}

function hangulFullText(s) { return s.text + previewChar(s) }

// 모음 키 입력 처리
function applyVowel(s, key) {
  // 종성이 이미 붙어있는데 모음이 오면, 종성이 다음 글자의 초성으로 이동
  if (s.cho != null && s.jung != null && s.jong) {
    const split = COMPLEX_JONG_SPLIT[s.jong]
    const remainJong = split ? split[0] : ''
    const movedCho = split ? split[1] : s.jong
    const committed = s.text + composeHangul(s.cho, s.jung, remainJong)
    return { text: committed, cho: CHO_LIST.indexOf(movedCho), jung: key, jong: '' }
  }

  const cho = s.cho != null ? s.cho : CHO_LIST.indexOf('ㅇ')

  if (s.jung != null) {
    const combo = VOWEL_COMBO[s.jung + key]
    if (combo) return { ...s, cho, jung: combo }
    // 겹모음으로 합쳐지지 않으면 지금까지 만든 글자를 확정하고 새로 시작
    const committed = s.text + composeHangul(s.cho, s.jung, '')
    return { text: committed, cho: CHO_LIST.indexOf('ㅇ'), jung: key, jong: '' }
  }

  return { ...s, cho, jung: key }
}

// 자음 키 입력 처리
function applyConsonant(s, letter) {
  if (s.cho != null && s.jung != null) {
    if (s.jong) {
      const combo = COMPLEX_JONG_FORM[s.jong + letter]
      if (combo) return { ...s, jong: combo }
      const committed = s.text + composeHangul(s.cho, s.jung, s.jong)
      return { text: committed, cho: CHO_LIST.indexOf(letter), jung: null, jong: '' }
    }
    return { ...s, jong: letter }
  }

  if (s.cho != null && s.jung == null) {
    // 모음 없이 자음만 있던 상태 → 낱자로 확정하고 새로 시작 (ㅋㅋㅋ 같은 표현 입력 가능)
    const committed = s.text + CHO_LIST[s.cho]
    return { text: committed, cho: CHO_LIST.indexOf(letter), jung: null, jong: '' }
  }

  return { ...s, cho: CHO_LIST.indexOf(letter) }
}

function applySpace(s) {
  const committed = s.cho == null ? s.text : s.text + previewChar(s)
  return { text: committed + ' ', cho: null, jung: null, jong: '' }
}

function applyBackspace(s) {
  if (s.jong) return { ...s, jong: '' }
  if (s.jung != null) return { ...s, jung: VOWEL_COMBO_SPLIT[s.jung] || null }
  if (s.cho != null) return { ...s, cho: null }
  return { ...s, text: s.text.slice(0, -1) }
}

// ── 옵션 선택 중 "이 메뉴 말고 다른 걸로" 취소 의사 매칭 ─────────────────
const CANCEL_INTENT_RE = /취소|다른\s*(거|메뉴|것)|그거\s*말고|안\s*(할래|살래|먹을래)|필요\s*없|빼\s*줘|다시\s*(할래|고를래)|바꿔\s*줘|메뉴\s*바꿔/
function matchCancelIntent(text) {
  return CANCEL_INTENT_RE.test(text)
}

// ── 접근성 음성 명령 (진행 중인 대화 흐름과 무관하게 언제든 인식) ────────────
// '확대'는 사이즈 옵션의 "크게"와 겹치지 않도록 명시적인 확대 표현만 매칭
function matchA11yCommand(text) {
  if (/손이?\s*안\s*닿|너무\s*높|화면\s*(을)?\s*(내려|낮춰)/.test(text)) return 'lower'
  if (/확대|글씨.{0,4}작|글자.{0,4}작|너무\s*작/.test(text)) return 'zoom'
  if (/안\s*보여|안\s*보인다|잘\s*안\s*보|고대비|흐릿/.test(text)) return 'contrast'
  return null
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
  const {
    highContrast, setHighContrast, largeFont, setLargeFont,
    screenLowered, setScreenLowered, volume,
  } = useA11y()
  const idle = useIdle()
  const { orderType, setOrderType } = useOrderType()
  const hc = highContrast
  const lf = largeFont ? 1.2 : 1
  const C = getC(hc)

  const [open, setOpen]             = useState(false)
  const [mode, setMode]             = useState('faq')
  const [messages, setMessages]     = useState([])
  const [voiceState, setVoiceState] = useState('idle')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [liveWords, setLiveWords]   = useState([])
  const [lastUtterance, setLastUtterance] = useState('')
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
  const [awaitingDineType, setAwaitingDineTypeState] = useState(false)

  // 음성 결제 단계: null | 'method' | 'points' | 'phone' | 'processing' | 'receipt' | 'complete'
  const [paymentStep, setPaymentStepState] = useState(null)
  const [paymentMethod, setPaymentMethod]  = useState(null)
  const [pointChoice, setPointChoice]      = useState(null)
  const [phone, setPhone]                  = useState('')
  const [receiptChoice, setReceiptChoice]  = useState(null)
  const [orderNum, setOrderNum]            = useState(null)
  const [paidTotal, setPaidTotal]          = useState(0)

  const hangulRef     = useRef(initHangulState())
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
  const paymentStepRef = useRef(null)
  const awaitingDineTypeRef = useRef(false)

  const setOptCtx = ctx => { optCtxRef.current = ctx; setOptCtxState(ctx) }
  const setPaymentStep = step => { paymentStepRef.current = step; setPaymentStepState(step) }
  const setAwaitingDineType = v => { awaitingDineTypeRef.current = v; setAwaitingDineTypeState(v) }
  const nextId    = () => ++idRef.current

  useImperativeHandle(ref, () => ({ open: (m = 'faq') => { setMode(m); setOpen(true) } }), [])

  // 오버레이가 열려 있는 동안(음성 상담/주문 중)에는 홈 화면의 무응답 감지를 다시 켜서
  // "괜찮으세요?" 되묻기가 동작하도록 함 — 닫히면 홈 화면 대기 상태로 되돌림
  useEffect(() => {
    idle?.setEnabled(open)
  }, [open])

  // 오버레이 열릴 때 초기화 + 인사
  useEffect(() => {
    if (open) {
      setPendingRecs([])
      setOrderItems({})
      setConfirmed({})
      setOptCtx(null)
      setVoiceCart([])
      setShowCartDetail(false)
      setPaymentStep(null)
      setPaymentMethod(null)
      setPointChoice(null)
      setPhone('')
      setReceiptChoice(null)
      setOrderNum(null)
      setPaidTotal(0)
      setLastUtterance('')
      askContinueRef.current = false
      hangulRef.current = initHangulState()
      setInputText('')

      if (mode === 'order' && !orderType) {
        setAwaitingDineType(true)
        const q = '먼저 여쭤볼게요. 매장에서 드시고 가시나요, 포장해 가시나요?'
        setMessages([{ id: nextId(), role: 'ai', type: 'text', text: q }])
        revealWords(q)
        return
      }
      setAwaitingDineType(false)
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
      idle?.notifyActivity()
      if (i >= words.length) clearInterval(revealTimerRef.current)
    }, 200)
  }

  // ── TTS ──────────────────────────────────────────────────────────
  const speak = text => new Promise(resolve => {
    if (!text) { resolve(); return }
    setLastUtterance('')
    revealWords(text)
    if (!ttsOn) { resolve(); return }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }

    // TTS 응답이 안 오거나 오디오 재생 이벤트가 안 터지는 드문 경우에도, 마이크가 영원히
    // "처리 중"으로 멈추지 않도록 하는 안전장치 (resolve는 여러 번 불러도 무해함)
    let settled = false
    const finish = () => { if (settled) return; settled = true; resolve() }
    const safetyTimer = setTimeout(finish, 20000)

    ttsText(text)
      .then(res => {
        const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: 'audio/mpeg' })
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audio.volume = volume
        audioRef.current = audio
        const done = () => { clearTimeout(safetyTimer); URL.revokeObjectURL(url); audioRef.current = null; setIsSpeaking(false); finish() }
        audio.onended = done; audio.onerror = done
        setIsSpeaking(true)
        audio.play().catch(done)
      })
      .catch(() => { clearTimeout(safetyTimer); finish() })
  })

  // ── 음성 인식 ──────────────────────────────────────────────────
  const startVoice = () => {
    setLiveWords([]); liveRef.current = []; finalRef.current = ''
    setTtsWords([])
    setVoiceState('listening'); setShowKeyboard(false)
    idle?.notifyActivity()
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
        idle?.notifyActivity()
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

  // ── 접근성 음성 명령 처리 (확대 / 고대비 / 화면 내리기) ───────────────
  const handleA11yCommand = async cmd => {
    if (cmd === 'zoom') {
      setLargeFont(true)
      await speak('화면 글씨를 확대했어요.')
    } else if (cmd === 'contrast') {
      setHighContrast(true)
      await speak('고대비 모드로 바꿨어요.')
    } else if (cmd === 'lower') {
      setScreenLowered(true)
      await speak('화면을 낮춰 드릴게요.')
    }
  }

  // ── 입력 통합 처리 ─────────────────────────────────────────────
  const processInput = async text => {
    if (!text?.trim()) { setVoiceState('idle'); return }
    setLastUtterance(text)
    setLiveWords([])
    try {
      const a11yCmd = matchA11yCommand(text)
      if (a11yCmd) { setVoiceState('processing'); await handleA11yCommand(a11yCmd); return }
      if (awaitingDineTypeRef.current) {
        setVoiceState('processing'); await handleDineTypeVoice(text); return
      }
      if (paymentStepRef.current && !['processing', 'complete'].includes(paymentStepRef.current)) {
        setVoiceState('processing'); await handlePaymentVoice(text); return
      }
      if (askContinueRef.current) {
        setVoiceState('processing'); await handleContinueDecision(text); return
      }
      const ctx = optCtxRef.current
      if (ctx) { setVoiceState('processing'); await handleOptionVoice(text, ctx); return }
      await processChat(text)
    } catch {
      revealWords('일시적인 오류가 발생했어요. 다시 시도해 주세요.')
    } finally {
      setVoiceState('idle')
    }
  }

  // ── 주문 시작 전 매장 식사 / 포장 여부 확인 ─────────────────────
  const resolveDineType = async type => {
    setAwaitingDineType(false)
    setOrderType(type)
    const greeting = '어떤 메뉴를 주문하고 싶으신가요?'
    setMessages(prev => [...prev, { id: nextId(), role: 'ai', type: 'text', text: greeting }])
    await speak(greeting)
  }

  const handleDineTypeVoice = async text => {
    const type = matchDineType(text)
    if (type) await resolveDineType(type)
    else await speak('다시 말씀해 주세요. "매장에서 먹을게요" 또는 "포장할게요"라고 말씀해 주세요.')
  }

  // ── 담은 뒤 "계속 주문" vs "결제" 의사 확인 ─────────────────────
  const handleContinueDecision = async text => {
    askContinueRef.current = false
    const wantsPayment = /결제|계산|페이|그만|끝낼래|다\s*됐/.test(text)
    if (wantsPayment) {
      await startVoicePayment()
    } else {
      // 결제 의사가 아니면 계속 주문하려는 것으로 보고 바로 이어서 처리
      await processChat(text)
    }
  }

  // ── 음성 결제 흐름: 화면 전환 없이 오버레이 안에서 결제수단→포인트→완료까지 진행 ──
  const startVoicePayment = async () => {
    setShowCartDetail(false)
    setPaymentStep('method')
    await speak('결제수단을 선택해주세요.')
  }

  const selectPaymentMethod = async key => {
    const m = PAY_METHODS.find(x => x.key === key)
    if (!m) return
    setPaymentMethod(key)
    setPaymentStep('points')
    await speak(`${m.label}로 결제할게요. 포인트를 적립하시겠어요?`)
  }

  const selectPoints = async yes => {
    if (yes) {
      setPointChoice('yes')
      setPaymentStep('phone')
      setShowKeyboard(true)
      await speak('적립할 휴대폰 번호를 화면에 입력해 주세요.')
    } else {
      setPointChoice('no')
      await runVoicePayment()
    }
  }

  const submitPhone = async digits => {
    if (digits) setPhone(digits)
    setShowKeyboard(false)
    await runVoicePayment()
  }

  const runVoicePayment = async () => {
    const amount = cartTotalDisplay
    setPaymentStep('processing')
    await speak('결제를 진행할게요. 잠시만 기다려 주세요.')
    try { await createOrder({ items: cartItems, total: amount, payment_method: paymentMethod, dine_type: orderType }) } catch { /* best effort */ }
    const num = '#' + String(Math.floor(1000 + Math.random() * 9000))
    setOrderNum(num)
    setPaidTotal(amount)
    setVoiceCart([])
    setPaymentStep('receipt')
    await speak(`결제가 완료되었습니다. 주문번호는 ${num}, 금액은 ${fmt(amount)}입니다. 영수증을 출력해 드릴까요?`)
  }

  const selectReceipt = async yes => {
    setReceiptChoice(yes ? 'yes' : 'no')
    setPaymentStep('complete')
    await speak(yes ? '영수증을 출력해 드릴게요. 이용해 주셔서 감사합니다!' : '이용해 주셔서 감사합니다!')
  }

  const handlePaymentVoice = async text => {
    const step = paymentStepRef.current
    if (step === 'method') {
      const found = PAY_METHODS.find(m => m.match.test(text))
      if (found) await selectPaymentMethod(found.key)
      else await speak('다시 말씀해 주세요. 카드 결제, 간편 결제, 현금 결제 중에 선택해 주세요.')
    } else if (step === 'points') {
      const yn = matchYesNo(text)
      if (yn === null) await speak('적립하시려면 "네", 안 하시려면 "아니요"라고 말씀해 주세요.')
      else await selectPoints(yn)
    } else if (step === 'phone') {
      const digits = text.replace(/\D/g, '')
      if (digits.length >= 8) await submitPhone(digits)
      else await speak('전화번호를 다시 말씀하시거나 화면에 입력해 주세요. 건너뛰시려면 확인 버튼을 눌러주세요.')
    } else if (step === 'receipt') {
      const yn = matchYesNo(text)
      if (yn === null) await speak('영수증이 필요하시면 "네", 필요 없으시면 "아니요"라고 말씀해 주세요.')
      else await selectReceipt(yn)
    }
  }

  // ── 옵션 선택 중인 메뉴 카드 취소 (담기 전이면 언제든 취소 가능) ───────
  const cancelOrderItem = msgId => {
    setOptCtx(null)
    setMessages(prev => prev.filter(m => m.id !== msgId))
    setOrderItems(prev => {
      const next = { ...prev }
      delete next[msgId]
      return next
    })
  }

  // ── 옵션 음성 처리 ─────────────────────────────────────────────
  const handleOptionVoice = async (text, ctx) => {
    if (matchCancelIntent(text)) {
      cancelOrderItem(ctx.msgId)
      const remaining = text.replace(CANCEL_INTENT_RE, '').trim()
      if (remaining) await processChat(remaining)
      else await speak('알겠습니다! 다른 메뉴를 원하시면 말씀해 주세요.')
      return
    }
    const matched = matchOption(text, ctx.choices)
    if (matched) {
      const currentItems = orderItems[ctx.msgId] || []
      const currentItem  = currentItems[ctx.itemIdx]
      if (!currentItem) { setOptCtx(null); return }

      // 현재 옵션 선택 후 같은 발화에서 나머지 옵션도 한번에 처리
      let newSel = { ...currentItem.selectedOptions, [ctx.optName]: matched }
      const remaining = (currentItem.menuOptions || []).filter(o => !newSel[o.name])
      for (const opt of remaining) {
        const m = matchOption(text, opt.choices)
        if (m) newSel[opt.name] = m
      }

      const updatedItems = currentItems.map((it, i) =>
        i === ctx.itemIdx ? { ...it, selectedOptions: newSel } : it
      )
      setOrderItems(prev => ({ ...prev, [ctx.msgId]: updatedItems }))

      const display = getDisplay(matched.label)
      const next = findFirstUnresolved(updatedItems, ctx.itemIdx)
      if (next) {
        setOptCtx({ msgId: ctx.msgId, ...next })
        await speak(next.itemIdx === ctx.itemIdx
          ? `${display}로 선택했어요. ${next.optName}를 선택해 주세요.`
          : `${display}로 선택했어요. 이어서 ${updatedItems[next.itemIdx].name}의 ${next.optName}를 선택해 주세요.`)
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
      const { class: cls, response: reply, items: rawItems = [], menus: recMenus = [] } = agent

      switch (cls) {

        // ── FAQ: 채팅 말풍선으로 표시
        case 'FAQ':
          addAiMsg(reply)
          await speak(reply)
          break

        // ── 메뉴 추천 제시
        case 'RECOMMEND':
          setPendingRecs(recMenus)
          // 추천 메뉴명은 카드로 이미 보여주므로, 음성으로는 메뉴명을 나열하지 않고 짧게 안내
          await speak(recMenus.length > 0 ? '이런 메뉴는 어떠세요?' : reply)
          break

        // ── 주문
        case 'ORDER': {
          const items = resolveItems(rawItems, menus)
          if (items.length > 0) {
            const msgId = nextId()
            setMessages(prev => [...prev, { id: msgId, role: 'ai', type: 'order', items, reply }])
            setOrderItems(prev => ({ ...prev, [msgId]: items.map(it => ({ ...it })) }))
            // 여러 메뉴가 한 번에 들어와도 옵션이 비어있는 항목이 있으면 항상 이어서 물어봄 (action 표기와 무관하게 안전하게 체크)
            const unresolved = findFirstUnresolved(items)
            if (unresolved) {
              setOptCtx({ msgId, ...unresolved })
              // 옵션이 남아있으면 백엔드 응답 문구 대신 항상 이 문구로 안내(백엔드가 엉뚱한 문구를 줘도 안정적으로 동작하도록)
              await speak('선택하실 옵션을 말씀해주세요.')
            } else {
              setOptCtx(null)
              await speak(reply)
            }
          } else {
            await speak(reply)
          }
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
    hangulRef.current = initHangulState()
    setInputText(''); processInput(text)
  }

  // ── 쿼티 자판 입력 반영 ──────────────────────────────────────────
  const applyHangul = updater => {
    hangulRef.current = updater(hangulRef.current)
    setInputText(hangulFullText(hangulRef.current))
  }
  const pressVowelKey = key => applyHangul(s => applyVowel(s, key))
  const pressConsonantKey = key => applyHangul(s => applyConsonant(s, key))
  const pressSpaceKey = () => applyHangul(applySpace)
  const pressBackspaceKey = () => applyHangul(applyBackspace)

  const getInputHint = () => {
    if (awaitingDineType) return '"매장에서 먹을게요" 또는 "포장할게요"'
    if (paymentStep === 'method') return '카드 결제 / 간편 결제 / 현금 결제'
    if (paymentStep === 'points') return '"네" 또는 "아니요"로 입력하세요'
    if (paymentStep === 'phone') return '휴대폰 번호를 입력하세요 (예: 010-0000-0000)'
    if (paymentStep === 'receipt') return '"네" 또는 "아니요"로 입력하세요'
    if (!optCtx) return '여기에 입력하세요...'
    if (optCtx.type === 'confirm') return '"네" 또는 "아니요"로 입력하세요'
    const hint = optCtx.choices.map(c => getDisplay(c.label)).join(' / ')
    return `${optCtx.optName}: ${hint}`
  }

  // 현재 미확인 주문 (마지막 order 메시지)
  const activeOrderMsg = [...messages].reverse().find(m => m.type === 'order')
  const userWords = voiceState === 'listening'
    ? liveWords
    : (lastUtterance ? lastUtterance.trim().split(/\s+/).filter(Boolean) : [])

  // ── 진행 단계 (메뉴 선택 → 옵션 선택 → 결제) ──────────────────────
  const activeItems = activeOrderMsg ? (orderItems[activeOrderMsg.id] || activeOrderMsg.items || []) : []
  const hasUnresolvedOpts = activeItems.some(it => (it.menuOptions || []).some(o => !it.selectedOptions[o.name]))
  const hasConfirmedItem = Object.keys(confirmed).length > 0
  const voiceStep = paymentStep
    ? 3
    : activeOrderMsg
    ? (hasUnresolvedOpts ? 2 : 3)
    : (hasConfirmedItem ? 3 : 1)

  const overlayBg = hc ? 'rgba(0,0,0,0.93)' : '#FFFFFF'
  const textBoxBg = hc ? 'rgba(20,20,20,0.98)' : 'rgba(255,255,255,0.97)'

  // ── 음성 주문 장바구니 (항상 확인 가능) ───────────────────────────
  const cartItems = onAddToCart ? cart : voiceCart
  const cartTotalDisplay = onAddToCart ? cartTotal : voiceCart.reduce((s, i) => s + i.price * i.qty, 0)
  const cartQtyCount = cartItems.reduce((s, it) => s + it.qty, 0)
  const goToPayment = () => {
    startVoicePayment()
  }
  const changeVoiceCartQty = (i, delta) => setVoiceCart(prev => prev.map((it, idx) =>
    idx === i ? { ...it, qty: Math.max(1, it.qty + delta) } : it
  ))
  const removeVoiceCartItem = i => setVoiceCart(prev => prev.filter((_, idx) => idx !== i))

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
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {orderType && <DineTypeBadge type={orderType} C={C} lf={lf} />}
                  <HeaderIconButton
                    icon={ShoppingCart} badge={cartQtyCount}
                    onClick={() => setShowCartDetail(true)} ariaLabel="장바구니" C={C}
                  />
                </div>
              )
            }
          />

          {paymentStep === 'complete' ? (
          /* ── 결제 완료 화면 (터치로 주문하기의 결제 완료 화면과 동일하게 전체 화면으로 표시) ── */
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 20, padding: '20px 30px',
          }}>
            <div style={{
              width: 200, height: 200, borderRadius: '50%', background: C.primary,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'payPop 0.5s ease-out',
            }}>
              <Check size={100} color={C.primaryText} strokeWidth={3} />
            </div>
            <div style={{ marginTop: 14, fontSize: 56 * lf, fontWeight: 900, color: C.text, textAlign: 'center' }}>결제가 완료되었습니다</div>
            <div style={{ fontSize: 36 * lf, fontWeight: 600, color: C.textSub }}>주문번호 {orderNum}</div>
            <div style={{ marginTop: 8, fontSize: 44 * lf, fontWeight: 800, color: C.primary }}>{fmt(paidTotal)}</div>
            {pointChoice === 'yes' && (
              <div style={{ marginTop: 6, fontSize: 30 * lf, fontWeight: 600, color: C.textSub }}>포인트가 적립되었습니다</div>
            )}
            {receiptChoice === 'yes' && (
              <div style={{ fontSize: 30 * lf, fontWeight: 600, color: C.textSub }}>영수증이 출력됩니다</div>
            )}
            <button onClick={() => { setOpen(false); nav('/kiosk') }} style={{
              marginTop: 40, padding: '32px 72px', borderRadius: 22,
              background: C.primary, color: C.primaryText, border: 'none',
              fontSize: 38 * lf, fontWeight: 800, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
            }}>
              <Home size={36} /> 처음으로
            </button>
          </div>
          ) : (
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
                position: 'relative', flex: 1, maxWidth: screenLowered ? '100%' : '46%',
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

              {/* 캐릭터 영상 — 화면 내리기 사용 중엔 공간 확보를 위해 숨김 */}
              {!screenLowered && (
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
              )}
            </div>

            {/* 매장 식사 / 포장 여부 빠른 선택 버튼 */}
            {awaitingDineType && (
              <div style={{ width: '100%', flexShrink: 0, display: 'flex', gap: 20, justifyContent: 'center' }}>
                <button
                  onClick={() => resolveDineType('dine_in')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '22px 40px', borderRadius: 24, cursor: 'pointer',
                    background: C.primaryBg, border: `3px dashed ${C.primary}`,
                    color: C.primary, ...sc(NAV.SB, lf), fontFamily: FF,
                  }}
                >
                  <Utensils size={30} /> 매장에서 먹을게요
                </button>
                <button
                  onClick={() => resolveDineType('takeout')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '22px 40px', borderRadius: 24, cursor: 'pointer',
                    background: C.primaryBg, border: `3px dashed ${C.primary}`,
                    color: C.primary, ...sc(NAV.SB, lf), fontFamily: FF,
                  }}
                >
                  <ShoppingBag size={30} /> 포장할게요
                </button>
              </div>
            )}

            {/* 추천 메뉴 카드 (사진 크게 + 이름 작게, 3개) */}
            {!awaitingDineType && !paymentStep && pendingRecs.length > 0 && (
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
                      {found && (
                        <span style={{ fontSize: 32 * lf, fontWeight: 700, color: C.primary }}>{fmt(found.price)}</span>
                      )}
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
            {!paymentStep && activeOrderMsg && !confirmed[activeOrderMsg.id] && (
              <div style={{ width: '72%', flexShrink: 0 }}>
                <OrderCard
                  msg={activeOrderMsg}
                  localItems={orderItems[activeOrderMsg.id]}
                  activeOpt={optCtx?.msgId === activeOrderMsg.id ? { itemIdx: optCtx.itemIdx, optName: optCtx.optName } : null}
                  C={C} lf={lf} hc={hc}
                  onUpdateOption={(itemIdx, optName, choice) => {
                    const current = orderItems[activeOrderMsg.id] || []
                    const item = current[itemIdx]
                    if (!item) return
                    const newSel = { ...item.selectedOptions, [optName]: choice }
                    const updated = current.map((it, i) => i === itemIdx ? { ...it, selectedOptions: newSel } : it)
                    setOrderItems(prev => ({ ...prev, [activeOrderMsg.id]: updated }))
                    const next = findFirstUnresolved(updated, itemIdx)
                    if (next) {
                      setOptCtx({ msgId: activeOrderMsg.id, ...next })
                      speak(next.itemIdx === itemIdx
                        ? `다음으로 ${next.optName}를 선택해 주세요.`
                        : `다음으로 ${updated[next.itemIdx].name}의 ${next.optName}를 선택해 주세요.`)
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
                    cancelOrderItem(activeOrderMsg.id)
                    speak('알겠습니다! 다른 메뉴를 원하시면 말씀해 주세요.')
                  }}
                />
              </div>
            )}

            {/* 음성 결제 카드 — 결제수단 → 포인트적립 → (전화번호) → 처리중 → 영수증 */}
            {paymentStep && (
              <div style={{ width: '72%', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {['method', 'points', 'phone'].includes(paymentStep) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', ...sc(BM.SM, lf), color: C.textSub }}>
                    <span>총 결제금액</span>
                    <span style={{ color: C.text, fontWeight: 700 }}>{fmt(cartTotalDisplay)}</span>
                  </div>
                )}
                <VoicePaymentCard
                  step={paymentStep}
                  C={C} lf={lf} hc={hc}
                  onSelectMethod={selectPaymentMethod}
                  onSelectPoints={selectPoints}
                  onSelectReceipt={selectReceipt}
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
              {paymentStep !== 'phone' && (
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
              )}
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

            {/* 자판 입력 영역 — 전화번호 입력 중엔 숫자 자판, 그 외엔 쿼티(두벌식) 자판 */}
            {showKeyboard && paymentStep === 'phone' && (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14, flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: 14 }}>
                  <div style={{
                    flex: 1, padding: '20px 28px', borderRadius: 24,
                    border: `2px solid ${C.border}`,
                    background: C.bg, color: phone ? C.text : C.textMuted,
                    ...sc(BM.SM, lf), fontFamily: FF,
                  }}>
                    {phone ? formatPhoneDigits(phone) : '010-0000-0000'}
                  </div>
                  <button onClick={() => submitPhone()} style={{
                    padding: '20px 36px', borderRadius: 24,
                    background: C.primary, color: C.primaryText,
                    border: 'none', cursor: 'pointer', ...sc(NAV.SB, lf), fontFamily: FF,
                  }}>확인</button>
                </div>
                <NumericKeypad
                  C={C} lf={lf}
                  onDigit={d => setPhone(p => p.length < 11 ? p + d : p)}
                  onBackspace={() => setPhone(p => p.slice(0, -1))}
                />
              </div>
            )}
            {showKeyboard && paymentStep !== 'phone' && (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14, flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: 14 }}>
                  <div style={{
                    flex: 1, padding: '20px 28px', borderRadius: 24,
                    border: `2px solid ${C.border}`,
                    background: C.bg, color: inputText ? C.text : C.textMuted,
                    ...sc(BM.SM, lf), fontFamily: FF,
                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                  }}>
                    {inputText || getInputHint()}
                  </div>
                  <button onClick={submitText} style={{
                    padding: '20px 36px', borderRadius: 24,
                    background: C.primary, color: C.primaryText,
                    border: 'none', cursor: 'pointer', ...sc(NAV.SB, lf), fontFamily: FF,
                  }}>전송</button>
                </div>
                <QwertyKeypad
                  C={C} lf={lf}
                  onVowel={pressVowelKey}
                  onConsonant={pressConsonantKey}
                  onSpace={pressSpaceKey}
                  onBackspace={pressBackspaceKey}
                />
              </div>
            )}
          </div>
          </div>
          )}
        </div>
      )}

      {/* ── 장바구니 상세 화면 ── */}
      {open && showCartDetail && (
        <CartDetailOverlay
          items={cartItems} total={cartTotalDisplay}
          C={C} lf={lf} hc={hc}
          onClose={() => setShowCartDetail(false)}
          onPay={cartItems.length > 0 ? goToPayment : null}
          onChangeQty={onAddToCart ? null : changeVoiceCartQty}
          onRemove={onAddToCart ? null : removeVoiceCartItem}
        />
      )}

      <style>{`
        @keyframes wordIn     { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        @keyframes micPulse   { 0%,100%{box-shadow:0 8px 32px rgba(220,38,38,0.5)} 50%{box-shadow:0 8px 56px rgba(220,38,38,0.75)} }
        @keyframes listenRing { 0%,100%{opacity:0.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.04)} }
        @keyframes payPop     { 0%{transform:scale(0.6);opacity:0} 60%{transform:scale(1.08);opacity:1} 100%{transform:scale(1)} }
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

// ── 쿼티(두벌식) 자판 ─────────────────────────────────────────────────
const QWERTY_ROWS = [
  [
    { type: 'cons', key: 'ㅂ', shift: 'ㅃ' }, { type: 'cons', key: 'ㅈ', shift: 'ㅉ' }, { type: 'cons', key: 'ㄷ', shift: 'ㄸ' },
    { type: 'cons', key: 'ㄱ', shift: 'ㄲ' }, { type: 'cons', key: 'ㅅ', shift: 'ㅆ' },
    { type: 'vowel', key: 'ㅛ' }, { type: 'vowel', key: 'ㅕ' }, { type: 'vowel', key: 'ㅑ' },
    { type: 'vowel', key: 'ㅐ', shift: 'ㅒ' }, { type: 'vowel', key: 'ㅔ', shift: 'ㅖ' },
  ],
  [
    { type: 'cons', key: 'ㅁ' }, { type: 'cons', key: 'ㄴ' }, { type: 'cons', key: 'ㅇ' }, { type: 'cons', key: 'ㄹ' }, { type: 'cons', key: 'ㅎ' },
    { type: 'vowel', key: 'ㅗ' }, { type: 'vowel', key: 'ㅓ' }, { type: 'vowel', key: 'ㅏ' }, { type: 'vowel', key: 'ㅣ' },
  ],
  [
    { type: 'cons', key: 'ㅋ' }, { type: 'cons', key: 'ㅌ' }, { type: 'cons', key: 'ㅊ' }, { type: 'cons', key: 'ㅍ' },
    { type: 'vowel', key: 'ㅠ' }, { type: 'vowel', key: 'ㅜ' }, { type: 'vowel', key: 'ㅡ' },
  ],
]

function QwertyKeypad({ C, lf, onVowel, onConsonant, onSpace, onBackspace }) {
  const [shift, setShift] = useState(false)

  const press = k => {
    const ch = (shift && k.shift) ? k.shift : k.key
    if (k.type === 'cons') onConsonant(ch)
    else onVowel(ch)
    if (shift) setShift(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
      {QWERTY_ROWS.map((row, ri) => (
        <div key={ri} style={{ display: 'flex', gap: 8 }}>
          {row.map((k, ki) => {
            const active = shift && k.shift
            return (
              <button
                key={ki}
                onClick={() => press(k)}
                style={{
                  flex: 1, padding: '16px 0', borderRadius: 14,
                  background: active ? C.primaryBg : C.card,
                  border: `2px solid ${active ? C.primary : C.borderMid}`,
                  color: active ? C.primary : C.text, cursor: 'pointer', fontFamily: FF,
                  ...sc(NAV.SB, lf), fontWeight: 700,
                }}
              >
                {active ? k.shift : k.key}
              </button>
            )
          })}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => setShift(v => !v)}
          style={{
            flex: 1.4, padding: '16px 0', borderRadius: 14,
            background: shift ? C.primary : C.card,
            border: `2px solid ${shift ? C.primary : C.borderMid}`,
            color: shift ? C.primaryText : C.textSub, cursor: 'pointer', fontFamily: FF,
            ...sc(BM.SM, lf), fontWeight: 700,
          }}
        >
          쌍자음
        </button>
        <button
          onClick={onSpace}
          style={{
            flex: 4, padding: '16px 0', borderRadius: 14,
            background: C.card, border: `2px solid ${C.borderMid}`,
            color: C.text, cursor: 'pointer', fontFamily: FF, ...sc(BM.SM, lf),
          }}
        >
          공백
        </button>
        <button
          onClick={onBackspace}
          aria-label="지우기"
          style={{
            flex: 2, padding: '16px 0', borderRadius: 14,
            background: C.card, border: `2px solid ${C.borderMid}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <Delete size={30} color={C.textSub} />
        </button>
      </div>
    </div>
  )
}

// ── 장바구니 상세 화면 ──────────────────────────────────────────────────
function CartDetailOverlay({ items, total, C, lf, hc, onClose, onPay, onChangeQty, onRemove }) {
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
              {onChangeQty ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ ...sc(L.XS, lf), color: C.primary }}>
                    {fmt(it.price * it.qty)}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button onClick={() => onChangeQty(i, -1)} disabled={it.qty <= 1} style={{
                      width: 44, height: 44, borderRadius: '50%', background: C.bg,
                      border: `2px solid ${C.borderMid}`, cursor: it.qty <= 1 ? 'default' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      opacity: it.qty <= 1 ? 0.4 : 1,
                    }}>
                      <Minus size={20} color={C.text} />
                    </button>
                    <span style={{ ...sc(B.SM, lf), color: C.text, minWidth: 44, textAlign: 'center' }}>
                      {it.qty}{unit(it)}
                    </span>
                    <button onClick={() => onChangeQty(i, 1)} style={{
                      width: 44, height: 44, borderRadius: '50%', background: C.primary,
                      border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Plus size={20} color={C.primaryText} />
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ ...sc(L.XS, lf), color: C.primary }}>
                  {fmt(it.price)} × {it.qty}{unit(it)}
                </div>
              )}
            </div>
            {onRemove && (
              <button onClick={() => onRemove(i)} style={{
                width: 48, height: 48, borderRadius: 14, background: 'none', border: 'none',
                cursor: 'pointer', flexShrink: 0, alignSelf: 'flex-start',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <X size={26} color={C.textSub} />
              </button>
            )}
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
  msg, localItems, activeOpt,
  C, lf, hc,
  onUpdateOption, onConfirm, onCancel,
}) {
  const items = localItems || msg.items || []
  if (!items.length) return null

  const isItemResolved = it => (it.menuOptions || []).every(o => it.selectedOptions[o.name])
  const allResolved = items.every(isItemResolved)

  // 여러 개를 한 번에 담아도 항상 옵션 하나 · 항목 하나씩만 순서대로 보여줌
  const activeIdx = !allResolved
    ? (activeOpt?.itemIdx ?? items.findIndex(it => !isItemResolved(it)))
    : -1
  const activeItem = activeIdx >= 0 ? items[activeIdx] : null
  const currentOpt = activeItem
    ? (activeItem.menuOptions || []).find(o => o.name === activeOpt?.optName)
      || (activeItem.menuOptions || []).find(o => !activeItem.selectedOptions[o.name])
    : null

  return (
    <div style={{
      background: hc ? '#141414' : '#FFFFFF',
      border: `2px solid ${C.borderMid}`,
      borderRadius: 28, overflow: 'hidden',
    }}>
      {/* 여러 항목을 한 번에 담았을 때, 전체 진행 상황을 한 줄로 보여주는 진행바 */}
      {items.length > 1 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '20px 28px 0' }}>
          {items.map((it, idx) => {
            const resolved = isItemResolved(it)
            const isCurrent = idx === activeIdx
            return (
              <div key={idx} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 999,
                background: isCurrent ? C.primaryBg : C.bg,
                border: `1.5px solid ${isCurrent ? C.primary : C.border}`,
              }}>
                {resolved && <Check size={16} color={C.primary} />}
                <span style={{
                  fontSize: 24 * lf, lineHeight: 1.3,
                  fontWeight: isCurrent ? 700 : 500,
                  color: isCurrent ? C.primary : C.textSub,
                }}>
                  {it.name} {it.qty}개
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* 지금 결정할 항목 하나만 표시 */}
      {activeItem && (
        <>
          <div style={{ display: 'flex', gap: 24, padding: '24px 28px 20px' }}>
            <div style={{
              width: 100, height: 100, borderRadius: 20, overflow: 'hidden',
              background: C.cardAlt, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {activeItem.img
                ? <img src={activeItem.img} alt={activeItem.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                : <Coffee size={48} color={C.textMuted} />
              }
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                <span style={{ ...sc(B.SM, lf), color: C.text }}>{activeItem.name}</span>
                <button
                  onClick={onCancel}
                  aria-label="메뉴 취소"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: 'none', border: 'none', cursor: 'pointer',
                  }}
                >
                  <X size={22} color={C.textSub} />
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                {Object.entries(activeItem.selectedOptions || {}).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {k === '온도' && v.label === 'HOT' && <Flame size={24} color="#dc2626" />}
                    {k === '온도' && v.label === 'ICE' && <Snowflake size={24} color="#0ea5e9" />}
                    <span style={{ ...sc(BM.SM, lf), color: C.textSub }}>{getDisplay(v.label)}</span>
                  </div>
                ))}
              </div>
              <div style={{ ...sc(L.XS, lf), color: C.primary }}>{fmt(activeItem.price)} × {activeItem.qty}</div>
            </div>
          </div>

          {currentOpt && (
            <div style={{ padding: '16px 28px 20px', borderTop: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={{ ...sc(BM.SM, lf), color: C.primary, fontWeight: 600 }}>
                  {currentOpt.name} 선택해 주세요
                </span>
                <span style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: C.negativeBg, borderRadius: 20, padding: '5px 14px',
                  ...sc(BM.SM, lf), color: C.negative, fontWeight: 600,
                  animation: 'listenRing 1.4s ease infinite',
                }}>
                  <Mic size={22} color={C.negative} />
                  듣는 중
                </span>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {(currentOpt.choices || []).map(choice => {
                  const isSel  = activeItem.selectedOptions[currentOpt.name]?.label === choice.label
                  const isTemp = currentOpt.name === '온도'
                  const accent = isTemp && choice.label === 'HOT' ? '#dc2626'
                               : isTemp && choice.label === 'ICE' ? '#0ea5e9' : null
                  return (
                    <button
                      key={choice.label}
                      onClick={() => onUpdateOption(activeIdx, currentOpt.name, choice)}
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
          )}
        </>
      )}

      {/* 전체 확정 요약 + 확인 / 취소 */}
      {allResolved && (
        <>
          <div style={{ padding: '24px 28px 4px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {items.map((it, idx) => (
              <div key={idx} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 0', borderTop: idx > 0 ? `1px solid ${C.border}` : 'none',
              }}>
                <div>
                  <span style={{ ...sc(BM.SM, lf), color: C.text, fontWeight: 600 }}>{it.name}</span>
                  {Object.values(it.selectedOptions || {}).length > 0 && (
                    <span style={{ ...sc(BM.SM, lf), color: C.textSub }}>
                      {' '}({Object.values(it.selectedOptions).map(v => getDisplay(v.label)).join(', ')})
                    </span>
                  )}
                </div>
                <span style={{ ...sc(BM.SM, lf), color: C.primary }}>{fmt(it.price)} × {it.qty}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', borderTop: `2px solid ${C.border}`, marginTop: 12 }}>
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
        </>
      )}
    </div>
  )
}

// ── 음성 결제 카드 ────────────────────────────────────────────────────
function VoicePaymentCard({
  step,
  C, lf, hc,
  onSelectMethod, onSelectPoints, onSelectReceipt,
}) {
  const cardStyle = {
    background: hc ? '#141414' : '#FFFFFF',
    border: `2px solid ${C.borderMid}`,
    borderRadius: 28, padding: '32px 36px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
  }
  const title = t => <div style={{ ...sc(B.SM, lf), color: C.text, textAlign: 'center' }}>{t}</div>
  const yesNoBtn = (label, primary, onClick) => (
    <button onClick={onClick} style={{
      flex: 1, padding: '24px 0', borderRadius: 20, cursor: 'pointer',
      background: primary ? C.primaryBg : C.bg,
      border: `2px solid ${primary ? C.primary : C.borderMid}`,
      ...sc(NAV.SB, lf), color: primary ? C.primary : C.text, fontFamily: FF,
    }}>{label}</button>
  )

  if (step === 'method') {
    return (
      <div style={cardStyle}>
        {title('결제 수단을 선택해 주세요')}
        <div style={{ display: 'flex', gap: 16, width: '100%' }}>
          {PAY_METHODS.map(m => (
            <button key={m.key} onClick={() => onSelectMethod(m.key)} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
              padding: '24px 12px', borderRadius: 20, cursor: 'pointer',
              background: C.bg, border: `2px solid ${C.borderMid}`, fontFamily: FF,
            }}>
              <m.icon size={36} color={C.primary} />
              <span style={{ ...sc(BM.SM, lf), color: C.text, textAlign: 'center' }}>{m.label}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }
  if (step === 'points') {
    return (
      <div style={cardStyle}>
        {title('포인트를 적립하시겠어요?')}
        <div style={{ display: 'flex', gap: 16, width: '100%' }}>
          {yesNoBtn('적립할게요', true, () => onSelectPoints(true))}
          {yesNoBtn('괜찮아요', false, () => onSelectPoints(false))}
        </div>
      </div>
    )
  }
  if (step === 'processing') {
    return (
      <div style={cardStyle}>
        <Loader2 size={40} color={C.primary} style={{ animation: 'voicePaySpin 0.8s linear infinite' }} />
        {title('결제 처리 중이에요...')}
        <style>{`@keyframes voicePaySpin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }
  if (step === 'receipt') {
    return (
      <div style={{ ...cardStyle, border: 'none' }}>
        {title('영수증을 출력해 드릴까요?')}
        <div style={{ display: 'flex', gap: 16, width: '100%' }}>
          {yesNoBtn('출력할게요', true, () => onSelectReceipt(true))}
          {yesNoBtn('괜찮아요', false, () => onSelectReceipt(false))}
        </div>
      </div>
    )
  }
  return null
}
