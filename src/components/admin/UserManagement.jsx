import { useState, useEffect } from 'react'
import { useUsers } from '../../hooks/useUsers'
import { useToast } from '../../contexts/ToastContext'
import { supabase } from '../../lib/supabase'

function UserManagement({ userId }) {
  const toast = useToast()
  const [eventId, setEventId] = useState(null)
  const { users, loading, addUser, deleteUser } = useUsers(eventId)
  const [newUserName, setNewUserName] = useState('')
  const [adding, setAdding] = useState(false)
  const [attendanceCounts, setAttendanceCounts] = useState({})
  const [selectedUser, setSelectedUser] = useState(null)
  const [userAttendances, setUserAttendances] = useState([])
  const [showModal, setShowModal] = useState(false)

  // 이벤트 ID 가져오기
  useEffect(() => {
    const loadEvent = async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('id')
          .eq('admin_user_id', userId)
          .single()

        if (error) throw error
        setEventId(data.id)
      } catch (error) {
        toast.error('이벤트 정보를 불러올 수 없습니다.')
      }
    }

    if (userId) {
      loadEvent()
    }
  }, [userId])

  useEffect(() => {
    if (users.length > 0) {
      loadAttendanceCounts()
    }
  }, [users])

  const loadAttendanceCounts = async () => {
    if (!eventId) return

    try {
      const { data, error } = await supabase
        .from('attendances')
        .select('user_id')
        .eq('event_id', eventId)

      if (error) throw error

      // 사용자별 출석 횟수 계산
      const counts = {}
      data.forEach(attendance => {
        counts[attendance.user_id] = (counts[attendance.user_id] || 0) + 1
      })

      setAttendanceCounts(counts)
    } catch (error) {
      console.error('출석 횟수 조회 실패:', error)
    }
  }

  const handleAttendanceClick = async (user) => {
    setSelectedUser(user)
    setShowModal(true)

    try {
      const { data, error } = await supabase
        .from('attendances')
        .select('id, checked_in_at, events(name)')
        .eq('user_id', user.id)
        .order('checked_in_at', { ascending: false })

      if (error) throw error
      setUserAttendances(data || [])
    } catch (error) {
      toast.error('출석 내역 조회 실패')
      console.error('출석 내역 조회 실패:', error)
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedUser(null)
    setUserAttendances([])
  }

  const handleAddUser = async (e) => {
    e.preventDefault()
    if (!newUserName.trim()) return

    setAdding(true)
    const result = await addUser(newUserName)
    setAdding(false)

    if (result.success) {
      setNewUserName('')
      toast.success('사용자가 추가되었습니다.')
      loadAttendanceCounts()
    } else {
      toast.error(`추가 실패: ${result.error}`)
    }
  }

  const handleDeleteUser = async (userId, userName) => {
    const result = await deleteUser(userId)
    if (result.success) {
      toast.success(`${userName}님이 삭제되었습니다.`)
      loadAttendanceCounts()
    } else {
      toast.error(`삭제 실패: ${result.error}`)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">사용자 관리</h2>

      {/* 사용자 추가 폼 */}
      <form onSubmit={handleAddUser} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            placeholder="이름 입력"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={adding}
          />
          <button
            type="submit"
            disabled={adding || !newUserName.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {adding ? '추가 중...' : '추가'}
          </button>
        </div>
      </form>

      {/* 사용자 목록 */}
      {loading ? (
        <p className="text-center text-gray-500">로딩 중...</p>
      ) : users.length === 0 ? (
        <p className="text-center text-gray-500">등록된 사용자가 없습니다.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-4">이름</th>
                <th className="text-left py-2 px-4">등록일</th>
                <th className="text-center py-2 px-4">출석 횟수</th>
                <th className="text-right py-2 px-4">작업</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{user.name}</td>
                  <td className="py-3 px-4 text-gray-600">
                    {new Date(user.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleAttendanceClick(user)}
                      disabled={!attendanceCounts[user.id]}
                      className={`inline-flex items-center justify-center px-3 py-1 text-sm font-semibold rounded-full transition-colors ${
                        attendanceCounts[user.id]
                          ? 'text-blue-800 bg-blue-100 hover:bg-blue-200 cursor-pointer'
                          : 'text-gray-500 bg-gray-100 cursor-default'
                      }`}
                    >
                      {attendanceCounts[user.id] || 0}회
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleDeleteUser(user.id, user.name)}
                      className="text-red-600 hover:text-red-800"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-sm text-gray-600">
            총 {users.length}명의 사용자가 등록되어 있습니다.
          </p>
        </div>
      )}

      {/* 출석 내역 모달 */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] flex flex-col">
            {/* 모달 헤더 */}
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">{selectedUser.name}님의 출석 내역</h3>
                <button
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                총 {userAttendances.length}회 출석
              </p>
            </div>

            {/* 모달 바디 */}
            <div className="flex-1 overflow-y-auto p-6">
              {userAttendances.length === 0 ? (
                <p className="text-center text-gray-500">출석 기록이 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  {userAttendances.map((attendance, index) => (
                    <div
                      key={attendance.id}
                      className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {new Date(attendance.checked_in_at).toLocaleDateString('ko-KR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              weekday: 'short'
                            })}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(attendance.checked_in_at).toLocaleTimeString('ko-KR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <span className="text-2xl text-gray-400">
                          #{userAttendances.length - index}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 모달 푸터 */}
            <div className="p-6 border-t">
              <button
                onClick={closeModal}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManagement
