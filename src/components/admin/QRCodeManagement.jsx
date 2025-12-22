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
      </div>
    </div>
  )
}

export default QRCodeManagement
