import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 현재 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // 회원가입 (모임 이름 포함)
  const signUp = async (username, password, groupName) => {
    try {
      // 아이디를 이메일 형식으로 변환
      const email = `${username}@attendance.local`

      // 1. 사용자 생성
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) throw authError

      // 2. 이벤트(모임) 생성
      if (authData.user) {
        const qrCodeData = `${window.location.origin}/check-in?eventId=${crypto.randomUUID()}`

        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .insert({
            name: groupName,
            qr_code_data: qrCodeData,
            admin_user_id: authData.user.id,
            is_active: true
          })
          .select()
          .single()

        if (eventError) {
          console.error('이벤트 생성 실패:', eventError)
          // 이벤트 생성 실패해도 회원가입은 성공
        } else {
          // QR 코드를 실제 이벤트 ID로 업데이트
          const actualQrCodeData = `${window.location.origin}/check-in?eventId=${eventData.id}`
          await supabase
            .from('events')
            .update({ qr_code_data: actualQrCodeData })
            .eq('id', eventData.id)
        }
      }

      return { success: true, data: authData }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // 로그인
  const signIn = async (username, password) => {
    try {
      // 아이디를 이메일 형식으로 변환
      const email = `${username}@attendance.local`

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // 로그아웃
  const signOut = async () => {
    try {
      // Supabase 로그아웃 시도
      await supabase.auth.signOut({ scope: 'local' })
    } catch (error) {
      // 에러 무시하고 계속 진행
      console.log('로그아웃 API 에러 무시:', error.message)
    }

    // 로컬 스토리지에서 Supabase 세션 수동 삭제
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key)
        }
      })
    } catch (storageError) {
      console.log('로컬 스토리지 정리 에러:', storageError)
    }

    // 상태 즉시 업데이트
    setUser(null)

    return { success: true }
  }

  // 이메일에서 아이디 추출
  const getUsername = () => {
    if (!user?.email) return null
    return user.email.replace('@attendance.local', '')
  }

  return {
    user,
    username: getUsername(),
    loading,
    signUp,
    signIn,
    signOut
  }
}
