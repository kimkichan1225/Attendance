import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'

export function useEvents() {
  const toast = useToast()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // 이벤트 목록 조회
  const fetchEvents = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setEvents(data || [])
    } catch (err) {
      setError(err.message)
      toast.error(`이벤트 조회 실패: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 이벤트 추가
  const addEvent = async (eventData) => {
    try {
      // QR 코드 데이터 생성 (이벤트 ID가 자동 생성되므로 임시로 UUID 생성)
      const tempId = crypto.randomUUID()
      const qrCodeData = `${window.location.origin}/check-in?eventId=${tempId}`

      const { data, error } = await supabase
        .from('events')
        .insert({
          name: eventData.name,
          description: eventData.description || null,
          location: eventData.location || null,
          qr_code_data: qrCodeData,
          is_active: true
        })
        .select()
        .single()

      if (error) throw error

      // QR 코드 데이터를 실제 ID로 업데이트
      const actualQrCodeData = `${window.location.origin}/check-in?eventId=${data.id}`
      const { data: updatedData, error: updateError } = await supabase
        .from('events')
        .update({ qr_code_data: actualQrCodeData })
        .eq('id', data.id)
        .select()
        .single()

      if (updateError) throw updateError

      setEvents([updatedData, ...events])
      return { success: true, data: updatedData }
    } catch (err) {
      toast.error(`이벤트 추가 실패: ${err.message}`)
      return { success: false, error: err.message }
    }
  }

  // 이벤트 삭제
  const deleteEvent = async (eventId) => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)

      if (error) throw error
      setEvents(events.filter(e => e.id !== eventId))
      return { success: true }
    } catch (err) {
      toast.error(`이벤트 삭제 실패: ${err.message}`)
      return { success: false, error: err.message }
    }
  }

  // 이벤트 활성화/비활성화
  const toggleEventActive = async (eventId, isActive) => {
    try {
      const { data, error } = await supabase
        .from('events')
        .update({ is_active: isActive })
        .eq('id', eventId)
        .select()
        .single()

      if (error) throw error
      setEvents(events.map(e => e.id === eventId ? data : e))
      return { success: true, data }
    } catch (err) {
      toast.error(`이벤트 상태 변경 실패: ${err.message}`)
      return { success: false, error: err.message }
    }
  }

  // ID로 이벤트 찾기
  const getEventById = async (eventId) => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  return {
    events,
    loading,
    error,
    addEvent,
    deleteEvent,
    toggleEventActive,
    getEventById,
    refresh: fetchEvents
  }
}
