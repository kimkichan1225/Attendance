import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ToastProvider } from './contexts/ToastContext'
import Header from './components/shared/Header'
import CheckInPage from './pages/CheckInPage'
import AdminPage from './pages/AdminPage'
import EventQRPage from './pages/EventQRPage'

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<Navigate to="/check-in" replace />} />
          <Route path="/check-in" element={<CheckInPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/event/:eventId/qr" element={<EventQRPage />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}

export default App
