import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// Accessibility context
import { AccessibilityProvider } from './context/AccessibilityContext'
import { IdleProvider } from './context/IdleContext'
import { OrderTypeProvider } from './context/OrderTypeContext'

// 키오스크 화면
import KioskFrame   from './components/KioskFrame'
import KioskHome    from './pages/kiosk/KioskHome'
import KioskOrder   from './pages/kiosk/KioskOrder'
import KioskPayment from './pages/kiosk/KioskPayment'

// 어드민 화면
import AdminLayout  from './pages/admin/AdminLayout'
import AdminLogin   from './pages/admin/AdminLogin'
import AdminMenus   from './pages/admin/AdminMenus'
import AdminFAQ     from './pages/admin/AdminFAQ'
import AdminStore   from './pages/admin/AdminStore'
import AdminOrders  from './pages/admin/AdminOrders'

ReactDOM.createRoot(document.getElementById('root')).render(
  <AccessibilityProvider>
    <BrowserRouter>
      <Routes>
        {/* 키오스크 — KioskFrame: dev에서 1080×1920 프리뷰 프레임, prod에서 투명 통과 */}
        <Route element={<OrderTypeProvider><IdleProvider><KioskFrame /></IdleProvider></OrderTypeProvider>}>
          <Route path="/kiosk"         element={<KioskHome />} />
          <Route path="/kiosk/order"   element={<KioskOrder />} />
          <Route path="/kiosk/payment" element={<KioskPayment />} />
        </Route>

        {/* 어드민 로그인 — 프리뷰 프레임 적용, 접근성 바 없음 */}
        <Route element={<KioskFrame showA11yBar={false} />}>
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* 어드민 — 인증 후 접근, 프리뷰 프레임 적용 */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index               element={<Navigate to="menus" replace />} />
            <Route path="menus"        element={<AdminMenus />} />
            <Route path="faq"          element={<AdminFAQ />} />
            <Route path="store"        element={<AdminStore />} />
            <Route path="orders"       element={<AdminOrders />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/kiosk" replace />} />
      </Routes>
    </BrowserRouter>
  </AccessibilityProvider>
)
