import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'

export function useUsers() {
  const toast = useToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // 사용자 목록 조회
  const fetchUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name')

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
    try {
      const { data, error } = await supabase
        .from('users')
        .insert({ name: name.trim() })
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
    fetchUsers()
  }, [])

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
