import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'

export function useAttendances() {
  const toast = useToast()
  const [attendances, setAttendances] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // 특정 이벤트의 출석 기록 조회
  const fetchAttendancesByEvent = async (eventId, date = null) => {
    try {
      setLoading(true)
      let query = supabase
        .from('attendances')
        .select(`
          *,
          users (id, name),
          events (id, name)
        `)
        .eq('event_id', eventId)
        .order('checked_in_at', { ascending: false })

      // 날짜 필터링
      if (date) {
        const startOfDay = `${date}T00:00:00`
        const endOfDay = `${date}T23:59:59`
        query = query.gte('checked_in_at', startOfDay).lte('checked_in_at', endOfDay)
      }

      const { data, error } = await query

      if (error) throw error
      setAttendances(data || [])
      return { success: true, data }
    } catch (err) {
      setError(err.message)
      toast.error(`출석 기록 조회 실패: ${err.message}`)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  // 사용자 체크인 (이름으로)
  const checkInByName = async (eventId, userName) => {
    try {
      // 1. 이벤트 확인
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .eq('is_active', true)
        .single()

      if (eventError || !event) {
        return { success: false, error: '유효하지 않은 이벤트이거나 비활성화된 이벤트입니다.' }
      }

      // 2. 사용자 확인
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('name', userName.trim())
        .single()

      if (userError || !user) {
        return { success: false, error: '등록되지 않은 사용자입니다.' }
      }

      // 3. 출석 기록 생성
      const { data, error } = await supabase
        .from('attendances')
        .insert({
          event_id: eventId,
          user_id: user.id
        })
        .select(`
          *,
          users (id, name),
          events (id, name)
        `)
        .single()

      if (error) {
        // 중복 출석 체크 (unique constraint violation)
        if (error.code === '23505') {
          return { success: false, error: '이미 오늘 출석하셨습니다.' }
        }
        throw error
      }

      return { success: true, data }
    } catch (err) {
      const errorMsg = err.message || '출석 처리 중 오류가 발생했습니다.'
      toast.error(`체크인 실패: ${errorMsg}`)
      return { success: false, error: errorMsg }
    }
  }

  // 관리자 수동 출석 처리 (여러 사용자 일괄)
  const manualCheckIn = async (eventId, userIds) => {
    try {
      const results = []

      for (const userId of userIds) {
        const { data, error } = await supabase
          .from('attendances')
          .insert({
            event_id: eventId,
            user_id: userId
          })
          .select(`
            *,
            users (id, name),
            events (id, name)
          `)
          .single()

        if (error && error.code !== '23505') {
          // 중복이 아닌 다른 에러
          results.push({ userId, success: false, error: error.message })
        } else if (error && error.code === '23505') {
          // 중복 출석 (이미 출석함)
          results.push({ userId, success: false, error: '이미 출석함' })
        } else {
          results.push({ userId, success: true, data })
        }
      }

      // 출석 기록 새로고침
      const successCount = results.filter(r => r.success).length

      return {
        success: true,
        results,
        message: `${successCount}명의 출석이 처리되었습니다.`
      }
    } catch (err) {
      toast.error(`수동 출석 처리 실패: ${err.message}`)
      return { success: false, error: err.message }
    }
  }

  // 오늘 미출석자 조회
  const getTodayAbsentUsers = async (eventId, allUsers) => {
    try {
      const today = new Date().toISOString().split('T')[0]

      const { data: todayAttendances, error } = await supabase
        .from('attendances')
        .select('user_id')
        .eq('event_id', eventId)
        .gte('checked_in_at', `${today}T00:00:00`)
        .lte('checked_in_at', `${today}T23:59:59`)

      if (error) throw error

      const attendedUserIds = new Set(todayAttendances.map(a => a.user_id))
      const absentUsers = allUsers.filter(user => !attendedUserIds.has(user.id))

      return { success: true, data: absentUsers }
    } catch (err) {
      toast.error(`미출석자 조회 실패: ${err.message}`)
      return { success: false, error: err.message }
    }
  }

  // 출석 기록 삭제 (취소)
  const deleteAttendance = async (attendanceId) => {
    try {
      const { error } = await supabase
        .from('attendances')
        .delete()
        .eq('id', attendanceId)

      if (error) throw error
      setAttendances(attendances.filter(a => a.id !== attendanceId))
      return { success: true }
    } catch (err) {
      toast.error(`출석 기록 삭제 실패: ${err.message}`)
      return { success: false, error: err.message }
    }
  }

  return {
    attendances,
    loading,
    error,
    fetchAttendancesByEvent,
    checkInByName,
    manualCheckIn,
    getTodayAbsentUsers,
    deleteAttendance
  }
}
