import { useState, useEffect } from 'react'
import { useUsers } from '../../hooks/useUsers'
import { useAttendances } from '../../hooks/useAttendances'
import { useToast } from '../../contexts/ToastContext'
import { supabase } from '../../lib/supabase'
import * as XLSX from 'xlsx'

function AttendanceRecords({ userId }) {
  const toast = useToast()
  const [event, setEvent] = useState(null)
  const { users, refresh: refreshUsers } = useUsers(event?.id)
  const {
    attendances,
    fetchAttendancesByEvent,
    manualCheckIn,
    getTodayAbsentUsers,
    deleteAttendance
  } = useAttendances()

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [absentUsers, setAbsentUsers] = useState([])
  const [selectedUserIds, setSelectedUserIds] = useState([])
  const [loading, setLoading] = useState(false)
  const [absentSearchTerm, setAbsentSearchTerm] = useState('')
  const [attendanceSearchTerm, setAttendanceSearchTerm] = useState('')

  useEffect(() => {
    loadEvent()
  }, [userId])

  useEffect(() => {
    if (event) {
      loadAttendances()
      loadAbsentUsers()
    }
  }, [event, selectedDate])

  // users 변경 시 미출석자 목록 업데이트
  useEffect(() => {
    if (event && users.length > 0) {
      loadAbsentUsers()
    }
  }, [users])

  // 자동으로 오늘 날짜로 업데이트
  useEffect(() => {
    const interval = setInterval(() => {
      const today = new Date().toISOString().split('T')[0]
      if (selectedDate !== today) {
        console.log('날짜 자동 업데이트:', today)
        setSelectedDate(today)
      }
    }, 60000) // 1분마다 체크

    return () => clearInterval(interval)
  }, [selectedDate])

  // 실시간 업데이트 구독
  useEffect(() => {
    if (!event) return

    // users 테이블 변경 감지
    const usersSubscription = supabase
      .channel('users-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'users', filter: `event_id=eq.${event.id}` },
        () => {
          console.log('회원 데이터 변경 감지')
          refreshUsers()
        }
      )
      .subscribe()

    // attendances 테이블 변경 감지
    const attendancesSubscription = supabase
      .channel('attendances-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'attendances', filter: `event_id=eq.${event.id}` },
        () => {
          console.log('출석 데이터 변경 감지')
          loadAttendances()
          loadAbsentUsers()
        }
      )
      .subscribe()

    return () => {
      usersSubscription.unsubscribe()
      attendancesSubscription.unsubscribe()
    }
  }, [event])

  const loadEvent = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('admin_user_id', userId)
        .single()

      if (error) throw error
      setEvent(data)
    } catch (error) {
      toast.error(`이벤트 조회 실패: ${error.message}`)
    }
  }

  const loadAttendances = async () => {
    if (!event) return
    setLoading(true)
    await fetchAttendancesByEvent(event.id, selectedDate)
    setLoading(false)
  }

  const loadAbsentUsers = async () => {
    if (!event) return

    // 최신 users 데이터를 직접 조회하여 사용
    const { data: currentUsers, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('event_id', event.id)
      .order('name')

    if (usersError) {
      console.error('회원 조회 실패:', usersError)
      return
    }

    const result = await getTodayAbsentUsers(event.id, currentUsers || [])
    if (result.success) {
      setAbsentUsers(result.data)
    }
  }

  const handleManualCheckIn = async () => {
    if (selectedUserIds.length === 0) {
      toast.warning('출석 처리할 사용자를 선택해주세요.')
      return
    }

    const result = await manualCheckIn(event.id, selectedUserIds)
    if (result.success) {
      toast.success(result.message)
      setSelectedUserIds([])
      loadAttendances()
      loadAbsentUsers()
    } else {
      toast.error(`출석 처리 실패: ${result.error}`)
    }
  }

  const handleQuickCheckIn = async (userId) => {
    const result = await manualCheckIn(event.id, [userId])
    if (result.success) {
      loadAttendances()
      loadAbsentUsers()
    } else {
      toast.error(`출석 처리 실패: ${result.error}`)
    }
  }

  const handleDeleteAttendance = async (attendanceId, userName) => {
    const result = await deleteAttendance(attendanceId)
    if (result.success) {
      toast.success(`${userName}님의 출석이 취소되었습니다.`)
      loadAttendances()
      loadAbsentUsers()
    } else {
      toast.error(`취소 실패: ${result.error}`)
    }
  }

  const toggleUserSelection = (userId) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const exportToExcel = async () => {
    if (!event) {
      toast.warning('이벤트 정보를 불러오는 중입니다.')
      return
    }

    try {
      toast.info('엑셀 파일을 생성하는 중...')

      // 해당 모임의 모든 사용자 가져오기
      const { data: allUsers, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('event_id', event.id)
        .order('name')

      if (usersError) throw usersError

      // 사용자가 없어도 빈 엑셀 파일 생성
      const usersList = allUsers || []

      // 모든 출석 기록 가져오기
      const { data: allAttendances, error } = await supabase
        .from('attendances')
        .select('*, users(name)')
        .eq('event_id', event.id)
        .order('checked_in_at', { ascending: true })

      if (error) throw error

      // 년도별, 날짜별로 그룹화
      const yearMap = {} // { 2025: { dateMap } }

      if (allAttendances && allAttendances.length > 0) {
        allAttendances.forEach(att => {
          const date = new Date(att.checked_in_at)
          const year = date.getFullYear()
          const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
          const userName = att.users.name

          if (!yearMap[year]) {
            yearMap[year] = {
              dateMap: {}
            }
          }

          if (!yearMap[year].dateMap[dateKey]) {
            yearMap[year].dateMap[dateKey] = {}
          }
          yearMap[year].dateMap[dateKey][userName] = 'O'
        })
      }

      // 워크북 생성
      const workbook = XLSX.utils.book_new()

      // 출석 기록이 없으면 빈 시트 생성
      const years = Object.keys(yearMap).length > 0 ? Object.keys(yearMap).sort() : [new Date().getFullYear().toString()]

      // 모든 사용자 이름 목록 (정렬)
      const allUserNames = usersList.length > 0 ? usersList.map(u => u.name).sort() : []

      // 각 년도별로 시트 생성
      years.forEach(year => {
        const yearData = yearMap[year]
        const dateMap = yearData ? yearData.dateMap : {}
        const dates = Object.keys(dateMap).sort()

        // 헤더 생성
        const monthRow = ['이름'] // 1행: 월
        const dayRow = [''] // 2행: 일

        dates.forEach(dateKey => {
          const date = new Date(dateKey)
          const month = `${date.getMonth() + 1}월`
          const day = date.getDate()

          monthRow.push(month)
          dayRow.push(day)
        })

        // 데이터 행 생성 (모든 사용자 포함)
        const dataRows = allUserNames.map(userName => {
          const row = [userName]
          if (dates.length > 0) {
            dates.forEach(dateKey => {
              row.push(dateMap[dateKey][userName] || '-')
            })
          }
          return row
        })

        // 모든 행 합치기
        const allRows = [monthRow, dayRow, ...dataRows]

        // 워크시트 생성
        const worksheet = XLSX.utils.aoa_to_sheet(allRows)

        // 열 너비 설정
        const colWidths = [{ wch: 10 }] // 이름 열
        dates.forEach(() => colWidths.push({ wch: 5 })) // 날짜 열들
        worksheet['!cols'] = colWidths

        // 워크북에 시트 추가
        XLSX.utils.book_append_sheet(workbook, worksheet, year.toString())
      })

      // 엑셀 파일 다운로드
      XLSX.writeFile(workbook, `${event.name}_출석기록.xlsx`)

      toast.success('엑셀 파일이 다운로드되었습니다.')
    } catch (error) {
      toast.error('엑셀 내보내기 실패')
      console.error('엑셀 내보내기 실패:', error)
    }
  }

  // 필터링된 미출석자 목록
  const filteredAbsentUsers = absentUsers.filter(user =>
    user.name.toLowerCase().includes(absentSearchTerm.toLowerCase())
  )

  // 필터링된 출석 기록
  const filteredAttendances = attendances.filter(attendance =>
    attendance.users.name.toLowerCase().includes(attendanceSearchTerm.toLowerCase())
  )

  if (!event) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-6">출석 기록 관리</h2>
        <p className="text-center text-gray-500">모임 정보를 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3">
        <p className="text-xl font-semibold text-gray-800">📚 {event.name}</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          <h2 className="text-2xl font-bold">출석 기록 관리</h2>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <button
              onClick={exportToExcel}
              disabled={attendances.length === 0}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:bg-gray-300 whitespace-nowrap"
            >
              📊 엑셀 내보내기
            </button>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                날짜 선택
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

      {/* 수동 출석 체크 */}
          <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">오늘 미출석자 ({filteredAbsentUsers.length}명)</h3>
              <input
                type="text"
                value={absentSearchTerm}
                onChange={(e) => setAbsentSearchTerm(e.target.value)}
                placeholder="이름 검색"
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-32 md:w-40"
              />
            </div>
            {filteredAbsentUsers.length === 0 ? (
              <p className="text-sm text-gray-600">
                {absentUsers.length === 0 ? '모두 출석했습니다!' : '검색 결과가 없습니다.'}
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-3">
                  {filteredAbsentUsers.map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center gap-2 p-2 bg-white rounded border border-gray-200 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{user.name}</span>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          handleQuickCheckIn(user.id)
                        }}
                        className="ml-auto text-xs text-blue-600 hover:text-blue-800"
                      >
                        ✓
                      </button>
                    </label>
                  ))}
                </div>
                <button
                  onClick={handleManualCheckIn}
                  disabled={selectedUserIds.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
                >
                  선택한 {selectedUserIds.length}명 출석 처리
                </button>
              </>
            )}
          </div>

          {/* 출석 기록 */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold">
                  출석 기록 ({filteredAttendances.length}명)
                </h3>
                <input
                  type="text"
                  value={attendanceSearchTerm}
                  onChange={(e) => setAttendanceSearchTerm(e.target.value)}
                  placeholder="이름 검색"
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-32 md:w-40"
                />
              </div>
            </div>

            {loading ? (
              <p className="text-center text-gray-500">로딩 중...</p>
            ) : filteredAttendances.length === 0 ? (
              <p className="text-center text-gray-500">
                {attendances.length === 0 ? '출석 기록이 없습니다.' : '검색 결과가 없습니다.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4">이름</th>
                      <th className="text-left py-2 px-4">출석 시간</th>
                      <th className="text-right py-2 px-4">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAttendances.map((attendance) => (
                      <tr key={attendance.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{attendance.users.name}</td>
                        <td className="py-3 px-4 text-gray-600">
                          {new Date(attendance.checked_in_at).toLocaleString('ko-KR')}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteAttendance(attendance.id, attendance.users.name)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            취소
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
      </div>
    </div>
  )
}

export default AttendanceRecords
