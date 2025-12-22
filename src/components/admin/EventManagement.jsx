import { useState } from 'react'
import { useEvents } from '../../hooks/useEvents'
import { QRCodeSVG } from 'qrcode.react'
import { useNavigate } from 'react-router-dom'

function EventManagement() {
  const { events, loading, addEvent, deleteEvent, toggleEventActive } = useEvents()
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: ''
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setSubmitting(true)
    const result = await addEvent(formData)
    setSubmitting(false)

    if (result.success) {
      setFormData({ name: '', description: '', location: '' })
      setShowForm(false)
      alert('이벤트가 생성되었습니다.')
    } else {
      alert(`생성 실패: ${result.error}`)
    }
  }

  const handleDeleteEvent = async (eventId, eventName) => {
    if (!confirm(`"${eventName}" 이벤트를 삭제하시겠습니까?\n관련된 모든 출석 기록도 함께 삭제됩니다.`)) return

    const result = await deleteEvent(eventId)
    if (result.success) {
      alert('삭제되었습니다.')
    } else {
      alert(`삭제 실패: ${result.error}`)
    }
  }

  const handleToggleActive = async (eventId, currentStatus) => {
    const result = await toggleEventActive(eventId, !currentStatus)
    if (!result.success) {
      alert(`상태 변경 실패: ${result.error}`)
    }
  }

  const handleViewQR = (eventId) => {
    navigate(`/event/${eventId}/qr`)
  }

  const downloadQR = (qrCodeData, eventName) => {
    const svg = document.getElementById(`qr-${qrCodeData}`)
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
      downloadLink.download = `QR_${eventName}.png`
      downloadLink.href = pngFile
      downloadLink.click()
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">이벤트 관리</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          {showForm ? '취소' : '+ 새 이벤트'}
        </button>
      </div>

      {/* 이벤트 생성 폼 */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이벤트 이름 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="예: 알고리즘 스터디"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                설명
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="이벤트 설명"
                rows="2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                장소
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="예: 3층 회의실"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300"
            >
              {submitting ? '생성 중...' : '이벤트 생성'}
            </button>
          </div>
        </form>
      )}

      {/* 이벤트 목록 */}
      {loading ? (
        <p className="text-center text-gray-500">로딩 중...</p>
      ) : events.length === 0 ? (
        <p className="text-center text-gray-500">생성된 이벤트가 없습니다.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow"
            >
              <div className="mb-3">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold">{event.name}</h3>
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      event.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {event.is_active ? '활성' : '비활성'}
                  </span>
                </div>
                {event.description && (
                  <p className="text-sm text-gray-600 mb-1">{event.description}</p>
                )}
                {event.location && (
                  <p className="text-sm text-gray-500">📍 {event.location}</p>
                )}
              </div>

              {/* QR 코드 미리보기 */}
              <div className="bg-white p-2 rounded border border-gray-200 mb-3 flex justify-center">
                <QRCodeSVG
                  id={`qr-${event.qr_code_data}`}
                  value={event.qr_code_data}
                  size={120}
                  level="H"
                  includeMargin={true}
                />
              </div>

              {/* 버튼들 */}
              <div className="space-y-2">
                <button
                  onClick={() => handleViewQR(event.id)}
                  className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  QR 코드 크게 보기 / 인쇄
                </button>
                <button
                  onClick={() => downloadQR(event.qr_code_data, event.name)}
                  className="w-full px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                >
                  QR 코드 다운로드
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleActive(event.id, event.is_active)}
                    className="flex-1 px-3 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                  >
                    {event.is_active ? '비활성화' : '활성화'}
                  </button>
                  <button
                    onClick={() => handleDeleteEvent(event.id, event.name)}
                    className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
                    삭제
                  </button>
                </div>
              </div>

              <p className="mt-3 text-xs text-gray-500">
                생성일: {new Date(event.created_at).toLocaleDateString('ko-KR')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default EventManagement
