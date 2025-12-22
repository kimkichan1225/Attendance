import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'

export function useUsers(eventId = null) {
  const toast = useToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // 사용자 목록 조회
  const fetchUsers = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('users')
        .select('*')
        .order('name')

      // eventId가 있으면 해당 이벤트의 사용자만 조회
      if (eventId) {
        query = query.eq('event_id', eventId)
      }

      const { data, error } = await query

      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      setError(err.message)
      toast.error(`사용자 조회 실패: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 사용자 추가
  const addUser = async (name) => {
    if (!eventId) {
      toast.error('이벤트 정보가 필요합니다.')
      return { success: false, error: '이벤트 정보가 없습니다.' }
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          name: name.trim(),
          event_id: eventId
        })
        .select()
        .single()

      if (error) throw error
      setUsers([...users, data])
      return { success: true, data }
    } catch (err) {
      toast.error(`사용자 추가 실패: ${err.message}`)
      return { success: false, error: err.message }
    }
  }

  // 사용자 삭제
  const deleteUser = async (userId) => {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (error) throw error
      setUsers(users.filter(u => u.id !== userId))
      return { success: true }
    } catch (err) {
      toast.error(`사용자 삭제 실패: ${err.message}`)
      return { success: false, error: err.message }
    }
  }

  // 이름으로 사용자 찾기
  const getUserByName = async (name) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('name', name.trim())
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  useEffect(() => {
    if (eventId) {
      fetchUsers()
    }
  }, [eventId])

  return {
    users,
    loading,
    error,
    addUser,
    deleteUser,
    getUserByName,
    refresh: fetchUsers
  }
}
