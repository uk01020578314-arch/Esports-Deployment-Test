import { useEffect, useState } from 'react'
import '../App.css'

const API_URL = 'http://127.0.0.1:8000/api/highlight'
const FILE_BASE_URL = 'http://127.0.0.1:8000'

const formatElapsedTime = (totalSeconds) => {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return minutes + ':' + seconds
}

function AIHighlight() {
  const [game, setGame] = useState('lol')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [videoFile, setVideoFile] = useState(null)

  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    if (!loading) {
      setElapsedSeconds(0)
      return undefined
    }

    const timer = window.setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1)
    }, 1000)

    return () => window.clearInterval(timer)
  }, [loading])

  const createHighlight = async (event) => {
    event.preventDefault()

    if (!youtubeUrl.trim() && !videoFile) {
      setError('YouTube 영상 URL 또는 영상 파일을 선택해주세요.')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const formData = new FormData()

      formData.append('game', game)

      if (videoFile) {
        formData.append('video_file', videoFile)
      } else {
        formData.append('url', youtubeUrl.trim())
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
          data.detail ||
          '하이라이트 생성에 실패했습니다.'
        )
      }

      setResult(data)
    } catch (requestError) {
      setError(
        requestError.message ||
        'AI 하이라이트 서버에 연결할 수 없습니다.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null

    if (file && !file.name.toLowerCase().endsWith('.mp4')) {
      setVideoFile(null)
      setError('MP4 형식의 영상 파일만 업로드할 수 있습니다.')
      event.target.value = ''
      return
    }

    setVideoFile(file)
    setError('')

    if (file) {
      setYoutubeUrl('')
    }
  }

  const handleYoutubeChange = (event) => {
    const value = event.target.value

    setYoutubeUrl(value)
    setError('')

    if (value.trim()) {
      setVideoFile(null)

      const fileInput = document.getElementById('highlight-video-file')

      if (fileInput) {
        fileInput.value = ''
      }
    }
  }

  return (
    <main className="ai-highlight-page">

      <section className="ai-highlight-hero">
        <p className="ai-highlight-eyebrow">
          ACHI AI STUDIO
        </p>

        <h1>AI 하이라이트</h1>

        <p>
          경기 영상을 AI로 분석하여 주요 장면을 자동으로 찾아
          하이라이트 영상을 만들어줍니다.
        </p>
      </section>

      <section className="ai-highlight-content">

        <form
          className="ai-highlight-form"
          onSubmit={createHighlight}
        >

          {/* 게임 선택 */}
          <div className="ai-highlight-field">

            <label htmlFor="highlight-game">
              게임 선택
            </label>

            <select
              id="highlight-game"
              value={game}
              onChange={(event) => setGame(event.target.value)}
              disabled={loading}
            >
              <option value="lol">
                League of Legends
              </option>

              <option value="valorant">
                Valorant
              </option>

              <option value="pubg">
                PUBG
              </option>

              <option value="overwatch2">
                Overwatch 2
              </option>

              <option value="worldoftanks">
                World of Tanks
              </option>

              <option value="other">
                기타
              </option>
            </select>

          </div>


          {/* YouTube URL */}
          <div className="ai-highlight-url-row">

            <input
              id="highlight-youtube-url"
              type="url"
              value={youtubeUrl}
              onChange={handleYoutubeChange}
              placeholder="YouTube 영상 URL을 입력하세요"
              disabled={loading}
            />

            <button
              className="ai-highlight-submit"
              type="submit"
              disabled={loading}
            >
              {loading
                ? '분석 중...'
                : '하이라이트 생성'}
            </button>

          </div>


          {/* 파일 업로드 */}
          <div className="ai-highlight-upload-section">

            <label
              className="ai-highlight-upload-title"
              htmlFor="highlight-video-file"
            >
              영상 파일
            </label>

            <label
              htmlFor="highlight-video-file"
              className={`ai-highlight-upload-box ${
                videoFile ? 'has-file' : ''
              }`}
            >

              <div className="ai-highlight-upload-icon">
                📁
              </div>

              <div className="ai-highlight-upload-text">

                <strong>
                  {videoFile
                    ? videoFile.name
                    : '영상 파일을 선택하세요'}
                </strong>

                <span>
                  MP4 파일 업로드
                </span>

              </div>

            </label>

            <input
              id="highlight-video-file"
              type="file"
              accept=".mp4,video/mp4"
              onChange={handleFileChange}
              disabled={loading}
              className="ai-highlight-file-input"
            />

          </div>


          {loading && (
            <div className="ai-highlight-status">
              <div className="ai-highlight-spinner" />

              <div>
                <strong>
                  하이라이트를 생성하고 있습니다.
                </strong>

                <p>
                  예상 제작 시간: 약 2~8분 (영상 길이와 PC 성능에 따라 달라질 수 있습니다.)
                </p>
                <p className="ai-highlight-elapsed">
                  현재 경과 시간: {formatElapsedTime(elapsedSeconds)}
                </p>
              </div>
            </div>
          )}


          {error && (
            <div
              className="ai-highlight-error"
              role="alert"
            >
              {error}
            </div>
          )}

        </form>


        {/* 결과 */}
        {result && (
          <section className="ai-highlight-result">

            <div className="ai-highlight-result-header">

              <div>
                <p className="ai-highlight-result-label">
                  GENERATION COMPLETE
                </p>

                <h2>
                  하이라이트 생성 완료
                </h2>
              </div>

              <span className="ai-highlight-success-badge">
                완료
              </span>

            </div>


            {result.videos?.length > 0 ? (

              <div className="ai-highlight-video-grid">

                {result.videos.map((videoUrl, index) => {

                  const fullUrl =
                    videoUrl.startsWith('http')
                      ? videoUrl
                      : `${FILE_BASE_URL}${videoUrl}`

                  return (
                    <article
                      className="ai-highlight-video-card"
                      key={videoUrl}
                    >

                      <div className="ai-highlight-video-number">
                        HIGHLIGHT {index + 1}
                      </div>

                      <video
                        controls
                        preload="metadata"
                        src={fullUrl}
                      />

                      <a
                        href={fullUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="ai-highlight-video-link"
                      >
                        영상 열기
                      </a>

                    </article>
                  )
                })}

              </div>

            ) : result.video_url ? (

              <div className="ai-highlight-video-card">

                <video
                  controls
                  preload="metadata"
                  src={
                    result.video_url.startsWith('http')
                      ? result.video_url
                      : `${FILE_BASE_URL}${result.video_url}`
                  }
                />

              </div>

            ) : (

              <p>
                생성은 완료되었지만 결과 영상을 찾을 수 없습니다.
              </p>

            )}

          </section>
        )}

      </section>

    </main>
  )
}

export default AIHighlight
