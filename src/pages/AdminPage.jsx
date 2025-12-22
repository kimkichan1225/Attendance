import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../contexts/ToastContext'
import UserManagement from '../components/admin/UserManagement'
import QRCodeManagement from '../components/admin/QRCodeManagement'
import AttendanceRecords from '../components/admin/AttendanceRecords'

function AdminPage() {
  const toast = useToast()
  const { user, username, loading, signUp, signIn, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('qrcode')
  const [authMode, setAuthMode] = useState('login') // 'login' or 'signup'
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [groupName, setGroupName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    const result = await signIn(userId, password)
    setSubmitting(false)

    if (result.success) {
      setUserId('')
      setPassword('')
    } else {
      toast.error(`로그인 실패: ${result.error}`)
    }
  }

  const handleSignUp = async (e) => {
    e.preventDefault()

    if (!userId.trim()) {
      toast.warning('아이디를 입력해주세요.')
      return
    }

    if (!groupName.trim()) {
      toast.warning('모임 이름을 입력해주세요.')
      return
    }

    if (password !== confirmPassword) {
      toast.warning('비밀번호가 일치하지 않습니다.')
      return
    }

    if (password.length < 6) {
      toast.warning('비밀번호는 최소 6자 이상이어야 합니다.')
      return
    }

    setSubmitting(true)
    const result = await signUp(userId, password, groupName)
    setSubmitting(false)

    if (result.success) {
      toast.success('회원가입이 완료되었습니다! 로그인해주세요.')
      setAuthMode('login')
      setUserId('')
      setPassword('')
      setConfirmPassword('')
      setGroupName('')
    } else {
      toast.error(`회원가입 실패: ${result.error}`)
    }
  }

  const handleLogout = async () => {
    await signOut()
    setActiveTab('qrcode')
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-60px)] bg-gray-50 flex items-center justify-center p-4">
        <p className="text-gray-600">로딩 중...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-60px)] bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold text-center mb-6">
            {authMode === 'login' ? '관리자 로그인' : '관리자 회원가입'}
          </h1>

          {authMode === 'login' ? (
            <form onSubmit={handleLogin}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  아이디
                </label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="admin123"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  비밀번호
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="비밀번호 입력"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {submitting ? '로그인 중...' : '로그인'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignUp}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  모임 이름 *
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="예: 알고리즘 스터디"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  아이디
                </label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="admin123"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  비밀번호
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="최소 6자 이상"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  비밀번호 확인
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="비밀번호 재입력"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
              >
                {submitting ? '가입 중...' : '회원가입'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'signup' : 'login')
                setUserId('')
                setPassword('')
                setConfirmPassword('')
                setGroupName('')
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {authMode === 'login'
                ? '계정이 없으신가요? 회원가입'
                : '이미 계정이 있으신가요? 로그인'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 관리자 서브헤더 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-semibold text-gray-700">관리자 대시보드</h1>
              <p className="text-sm text-gray-500">@{username}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-red-600 hover:text-red-800 font-medium"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('qrcode')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'qrcode'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              QR 코드
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'attendance'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              출석 기록
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              회원 관리
            </button>
          </div>
        </div>
      </div>

      {/* 컨텐츠 */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'qrcode' && <QRCodeManagement userId={user.id} />}
        {activeTab === 'attendance' && <AttendanceRecords userId={user.id} />}
        {activeTab === 'users' && <UserManagement />}
      </div>
    </div>
  )
}

export default AdminPage
