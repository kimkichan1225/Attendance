import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAttendances } from '../hooks/useAttendances'
import { useUsers } from '../hooks/useUsers'
import { useEvents } from '../hooks/useEvents'

function CheckInPage() {
  const [searchParams] = useSearchParams()
  const eventId = searchParams.get('eventId')

  const { checkInByName } = useAttendances()
  const { users } = useUsers()
  const { getEventById } = useEvents()

  const [event, setEvent] = useState(null)
  const [userName, setUserName] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (eventId) {
      loadEvent()
    }
  }, [eventId])

  const loadEvent = async () => {
    const result = await getEventById(eventId)
    if (result.success) {
      setEvent(result.data)
    } else {
      setError('이벤트를 찾을 수 없습니다.')
    }
  }

  const handleInputChange = (value) => {
    setUserName(value)
    if (value.length > 0) {
      const filtered = users
        .filter(u => u.name.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 5)
      setSuggestions(filtered)
    } else {
      setSuggestions([])
    }
  }

  const handleCheckIn = async (e) => {
    e.preventDefault()
    if (!userName.trim() || !eventId) return

    setLoading(true)
    setError(null)

    const result = await checkInByName(eventId, userName)
    setLoading(false)

    if (result.success) {
      setSuccess(true)
      setUserName('')
      setSuggestions([])

      // 3초 후 성공 메시지 숨기기
      setTimeout(() => {
        setSuccess(false)
      }, 3000)
    } else {
      setError(result.error)
    }
  }

  if (!eventId) {
    return (
      <div className="min-h-[calc(100vh-60px)] bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">📱</div>
          <h1 className="text-2xl font-bold mb-4">출석 체크</h1>
          <p className="text-gray-600 mb-4">
            QR 코드를 스캔하여<br />
            출석체크를 진행해주세요
          </p>
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-700">
              💡 모임 장소의 QR 코드를 스캔하면<br />
              자동으로 출석 페이지로 이동합니다
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (error && !event) {
    return (
      <div className="min-h-[calc(100vh-60px)] bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-xl font-bold mb-2">오류</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-[calc(100vh-60px)] bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-8xl mb-4 animate-bounce">✅</div>
          <h2 className="text-3xl font-bold mb-2 text-green-600">출석 완료!</h2>
          <p className="text-lg text-gray-700 mb-8">출석이 정상적으로 처리되었습니다</p>
          <button
            onClick={() => setSuccess(false)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            다른 사람 출석하기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-60px)] bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="max-w-md mx-auto pt-8">
        {/* 이벤트 정보 */}
        {event && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h1 className="text-2xl font-bold mb-2 text-center">{event.name}</h1>
            {event.description && (
              <p className="text-gray-600 text-center mb-2">{event.description}</p>
            )}
            {event.location && (
              <p className="text-sm text-gray-500 text-center">📍 {event.location}</p>
            )}
          </div>
        )}

        {/* 출석 체크 폼 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-center">출석 체크</h2>

          <form onSubmit={handleCheckIn}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                이름
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => handleInputChange(e.target.value)}
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="이름을 입력하세요"
                disabled={loading}
                autoFocus
              />

              {/* 자동완성 추천 */}
              {suggestions.length > 0 && (
                <ul className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
                  {suggestions.map((user) => (
                    <li
                      key={user.id}
                      onClick={() => {
                        setUserName(user.name)
                        setSuggestions([])
                      }}
                      className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                    >
                      {user.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !userName.trim()}
              className="w-full py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '처리 중...' : '출석하기'}
            </button>
          </form>
        </div>

        {/* 안내 메시지 */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>등록된 이름으로만 출석이 가능합니다</p>
          <p className="mt-1">등록이 필요한 경우 관리자에게 문의하세요</p>
        </div>
      </div>
    </div>
  )
}

export default CheckInPage
