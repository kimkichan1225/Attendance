import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../contexts/ToastContext'
import { supabase } from '../../lib/supabase'

function QRCodeManagement({ userId }) {
  const toast = useToast()
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadEvent()
  }, [userId])

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
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    navigate(`/event/${event.id}/qr`)
  }

  const downloadQR = () => {
    const svg = document.getElementById('main-qr-code')
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
      const pngFile = canvas.toDataURL('image/png')

      const downloadLink = document.createElement('a')
      downloadLink.download = `QR_${event.name}.png`
      downloadLink.href = pngFile
      downloadLink.click()
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  const toggleActive = async () => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ is_active: !event.is_active })
        .eq('id', event.id)

      if (error) throw error

      setEvent({ ...event, is_active: !event.is_active })
      toast.success(event.is_active ? '모임이 비활성화되었습니다.' : '모임이 활성화되었습니다.')
    } catch (error) {
      toast.error('상태 변경 실패: ' + error.message)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== event.name) {
      toast.warning('모임 이름을 정확히 입력해주세요.')
      return
    }

    setDeleting(true)

    try {
      // 1. 이벤트 삭제 (cascade로 users, attendances도 삭제됨)
      const { error: eventError } = await supabase
        .from('events')
        .delete()
        .eq('id', event.id)

      if (eventError) throw eventError

      toast.success('모임이 삭제되었습니다.')

      // 2. 로그아웃
      await supabase.auth.signOut()

      // 3. 홈으로 이동
      navigate('/')
    } catch (error) {
      console.error('삭제 실패:', error)
      toast.error(`삭제 실패: ${error.message}`)
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-center text-gray-500">로딩 중...</p>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">QR 코드</h2>
        <p className="text-center text-gray-500">모임 정보를 찾을 수 없습니다.</p>
        <p className="text-center text-sm text-gray-400 mt-2">
          회원가입 시 문제가 발생했을 수 있습니다. 관리자에게 문의하세요.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 md:p-6">
      <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">QR 코드 관리</h2>

      <div className="flex flex-col gap-6">
        {/* QR 코드 */}
        <div>
          <div className="bg-gray-50 rounded-lg p-4 md:p-8 flex items-center justify-center">
            <div className="bg-white p-3 md:p-4 rounded-lg shadow-lg">
              <QRCodeSVG
                id="main-qr-code"
                value={event.qr_code_data}
                size={Math.min(250, window.innerWidth - 100)}
                level="H"
                includeMargin={true}
              />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <button
              onClick={handlePrint}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm md:text-base"
            >
              🖨️ QR 코드 인쇄하기
            </button>
            <button
              onClick={downloadQR}
              className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm md:text-base"
            >
              📥 QR 코드 다운로드
            </button>
            <button
              onClick={toggleActive}
              className={`w-full px-4 py-3 text-white rounded-lg font-medium text-sm md:text-base ${
                event.is_active
                  ? 'bg-gray-600 hover:bg-gray-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {event.is_active ? '❌ 모임 비활성화' : '✅ 모임 활성화'}
            </button>
          </div>
        </div>

        {/* 모임 정보 */}
        <div>
          <div className="space-y-4">
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-2">모임 정보</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-500">모임 이름</p>
                  <p className="text-lg font-medium">{event.name}</p>
                </div>
                {event.description && (
                  <div>
                    <p className="text-sm text-gray-500">설명</p>
                    <p className="text-gray-700">{event.description}</p>
                  </div>
                )}
                {event.location && (
                  <div>
                    <p className="text-sm text-gray-500">장소</p>
                    <p className="text-gray-700">📍 {event.location}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">상태</p>
                  <span
                    className={`inline-block px-3 py-1 text-sm rounded-full ${
                      event.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {event.is_active ? '✅ 활성' : '❌ 비활성'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">사용 방법</h4>
              <ol className="space-y-2 text-sm text-blue-800">
                <li>1. QR 코드를 다운로드하거나 인쇄하세요</li>
                <li>2. 모임 장소에 QR 코드를 부착하세요</li>
                <li>3. 회원들이 QR 코드를 스캔하여 출석하세요</li>
                <li>4. "출석 기록" 탭에서 출석 확인 가능</li>
              </ol>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>💡 팁:</strong> QR 코드는 영구적으로 사용 가능합니다.
                매번 새로 만들 필요 없이 같은 QR 코드를 계속 사용하세요!
              </p>
            </div>

            <div className="text-xs text-gray-400">
              <p>생성일: {new Date(event.created_at).toLocaleString('ko-KR')}</p>
              <p>이벤트 ID: {event.id}</p>
            </div>
          </div>
        </div>

        {/* 위험 구역 - 계정 삭제 */}
        <div className="border-t pt-6">
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <h3 className="text-lg font-semibold text-red-900 mb-2">⚠️ 위험 구역</h3>
            <p className="text-sm text-red-800 mb-4">
              관리자 계정과 모임을 삭제하면 모든 회원 정보와 출석 기록이 영구적으로 삭제됩니다.
              이 작업은 되돌릴 수 없습니다.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm md:text-base"
            >
              🗑️ 관리자 탈퇴 및 모임 삭제
            </button>
          </div>
        </div>
      </div>

      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-bold text-red-900 mb-4">
                정말로 삭제하시겠습니까?
              </h3>
              <div className="space-y-4">
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <p className="text-sm text-red-800 mb-2">
                    <strong>다음 데이터가 영구적으로 삭제됩니다:</strong>
                  </p>
                  <ul className="text-sm text-red-800 list-disc list-inside space-y-1">
                    <li>모임 정보</li>
                    <li>모든 회원 정보</li>
                    <li>모든 출석 기록</li>
                    <li>QR 코드 데이터</li>
                  </ul>
                </div>

                <div>
                  <p className="text-sm text-gray-700 mb-2">
                    삭제를 확인하려면 모임 이름 <strong className="text-red-600">"{event.name}"</strong>을(를) 입력하세요:
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="모임 이름 입력"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    disabled={deleting}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false)
                      setDeleteConfirmText('')
                    }}
                    disabled={deleting}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting || deleteConfirmText !== event.name}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {deleting ? '삭제 중...' : '영구 삭제'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default QRCodeManagement
