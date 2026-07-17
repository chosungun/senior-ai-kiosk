import { createContext, useContext, useState, useCallback } from 'react'

const OrderTypeCtx = createContext(null)

// 매장 식사 / 포장 여부 — 주문 화면(터치·음성) 진입 시 한 번 물어보고, 홈으로 돌아오면 초기화됨
export function OrderTypeProvider({ children }) {
  const [orderType, setOrderType] = useState(null) // 'dine_in' | 'takeout' | null

  const resetOrderType = useCallback(() => setOrderType(null), [])

  return (
    <OrderTypeCtx.Provider value={{ orderType, setOrderType, resetOrderType }}>
      {children}
    </OrderTypeCtx.Provider>
  )
}

export const useOrderType = () => useContext(OrderTypeCtx)
