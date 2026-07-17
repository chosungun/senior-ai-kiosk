import axios from 'axios'

// timeout 없으면 네트워크가 끊겨도 요청이 영원히 응답을 기다려서, 음성 주문 화면의 마이크가
// 계속 "처리 중" 상태로 멈춰버리는 문제가 생김 — 반드시 유한한 시간 안에 실패 처리되도록 함
const api = axios.create({ baseURL: '/api', timeout: 20000 })

api.interceptors.request.use(config => {
  const token = localStorage.getItem('admin_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && window.location.pathname.startsWith('/admin')) {
      localStorage.removeItem('admin_token')
      window.location.href = '/admin/login'
    }
    return Promise.reject(err)
  }
)

// ── 인증 ─────────────────────────────────────────────────────────
export const adminLogin = (username, password) =>
  api.post('/auth/login', { username, password })

// ── 메뉴 ─────────────────────────────────────────────────────────
export const getMenus      = (category) => api.get('/menus/', { params: { category } })
export const createMenu    = (data)     => api.post('/menus/', data)
export const updateMenu    = (id, data) => api.patch(`/menus/${id}`, data)
export const deleteMenu    = (id)       => api.delete(`/menus/${id}`)

// ── FAQ ──────────────────────────────────────────────────────────
export const getFaqs       = ()         => api.get('/faqs/')
export const createFaq     = (data)     => api.post('/faqs/', data)
export const updateFaq     = (id, data) => api.patch(`/faqs/${id}`, data)
export const deleteFaq     = (id)       => api.delete(`/faqs/${id}`)

// ── 매장정보 ─────────────────────────────────────────────────────
export const getStore      = ()         => api.get('/store/')
export const updateStore   = (data)     => api.patch('/store/', data)

// ── 주문 ─────────────────────────────────────────────────────────
export const getOrders     = ()         => api.get('/orders/')
export const createOrder   = (data)     => api.post('/orders/', data)

// ── AI Agent ─────────────────────────────────────────────────────
export const agentChat     = (text, state) => api.post('/agent/chat', { text, state })

// ── 음성 ─────────────────────────────────────────────────────────
export const sttAudio = (blob) => {
  const form = new FormData()
  form.append('audio', blob, 'audio.webm')
  return api.post('/voice/stt', form)
}
export const ttsText  = (text) => api.post('/voice/tts', { text }, { responseType: 'blob' })
