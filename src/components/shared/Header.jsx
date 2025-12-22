import { Link, useLocation } from 'react-router-dom'

function Header() {
  const location = useLocation()

  // QR 코드 출력 페이지에서는 헤더 숨김
  if (location.pathname.includes('/event/') && location.pathname.includes('/qr')) {
    return null
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          {/* 로고/제목 */}
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl">✓</span>
            <span className="text-xl font-bold text-gray-800">출석체크</span>
          </Link>

          {/* 네비게이션 메뉴 */}
          <nav className="flex space-x-4">
            <Link
              to="/check-in"
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                location.pathname === '/check-in' || location.pathname === '/'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              출석하기
            </Link>
            <Link
              to="/admin"
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                location.pathname === '/admin'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              관리자
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}

export default Header
