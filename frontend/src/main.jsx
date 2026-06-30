import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/theme.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// 키오스크 화면
import KioskHome    from './pages/kiosk/KioskHome'
import KioskOrder   from './pages/kiosk/KioskOrder'

// 어드민 화면
import AdminLayout  from './pages/admin/AdminLayout'
import AdminMenus   from './pages/admin/AdminMenus'
import AdminFAQ     from './pages/admin/AdminFAQ'
import AdminStore   from './pages/admin/AdminStore'
import AdminOrders  from './pages/admin/AdminOrders'

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      {/* 키오스크 */}
      <Route path="/kiosk"       element={<KioskHome />} />
      <Route path="/kiosk/order" element={<KioskOrder />} />

      {/* 어드민 */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index               element={<Navigate to="menus" replace />} />
        <Route path="menus"        element={<AdminMenus />} />
        <Route path="faq"          element={<AdminFAQ />} />
        <Route path="store"        element={<AdminStore />} />
        <Route path="orders"       element={<AdminOrders />} />
      </Route>

      <Route path="*" element={<Navigate to="/kiosk" replace />} />
    </Routes>
  </BrowserRouter>
)
