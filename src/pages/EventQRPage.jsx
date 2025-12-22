import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useEvents } from '../hooks/useEvents'

function EventQRPage() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const { getEventById } = useEvents()

  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEvent()
  }, [eventId])

  const loadEvent = async () => {
    const result = await getEventById(eventId)
    if (result.success) {
      setEvent(result.data)
    }
    setLoading(false)
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600">로딩 중...</p>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-xl font-bold mb-2">이벤트를 찾을 수 없습니다</h2>
          <button
            onClick={() => navigate('/admin')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            관리자 페이지로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* 인쇄 스타일 */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-page {
            margin: 0;
            padding: 2rem;
          }
        }
      `}</style>

      <div className="min-h-screen bg-white print-page">
        {/* 상단 버튼 (인쇄 시 숨김) */}
        <div className="no-print bg-white border-b p-4">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <button
              onClick={() => navigate('/admin')}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              ← 돌아가기
            </button>
            <button
              onClick={handlePrint}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              🖨️ 인쇄하기
            </button>
          </div>
        </div>

        {/* QR 코드 본문 */}
        <div className="flex items-center justify-center p-8">
          <div className="text-center max-w-2xl">
            {/* 이벤트 정보 */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-4">{event.name}</h1>
              {event.description && (
                <p className="text-xl text-gray-600 mb-2">{event.description}</p>
              )}
              {event.location && (
                <p className="text-lg text-gray-500">📍 {event.location}</p>
              )}
            </div>

            {/* QR 코드 */}
            <div className="bg-white p-8 rounded-lg border-4 border-gray-200 inline-block mb-6">
              <QRCodeSVG
                value={event.qr_code_data}
                size={400}
                level="H"
                includeMargin={true}
              />
            </div>

            {/* 안내 문구 */}
            <div className="mt-8 space-y-4">
              <h2 className="text-2xl font-semibold">출석 체크 방법</h2>
              <div className="bg-blue-50 p-6 rounded-lg text-left">
                <ol className="space-y-3 text-lg">
                  <li className="flex items-start">
                    <span className="font-bold mr-2">1.</span>
                    <span>스마트폰 카메라로 위 QR 코드를 스캔하세요</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold mr-2">2.</span>
                    <span>자동으로 출석 페이지가 열립니다</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold mr-2">3.</span>
                    <span>이름을 입력하고 "출석하기" 버튼을 누르세요</span>
                  </li>
                </ol>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <p className="text-sm text-gray-700">
                  💡 <strong>주의:</strong> 등록된 이름으로만 출석이 가능합니다.<br />
                  등록이 필요한 경우 관리자에게 문의하세요.
                </p>
              </div>
            </div>

            {/* 인쇄용 추가 정보 */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                생성일: {new Date(event.created_at).toLocaleDateString('ko-KR')}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Event ID: {event.id}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default EventQRPage
