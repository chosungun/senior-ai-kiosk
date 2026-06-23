import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

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
