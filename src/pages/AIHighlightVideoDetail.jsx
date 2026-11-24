import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import '../App.css'

const API_BASE_URL = 'http://127.0.0.1:8000'

function AIHighlightVideoDetail({ user }) {
  const [searchParams] = useSearchParams()
  const videoId = searchParams.get('video') || ''
  const [video, setVideo] = useState(null)
  const [comments, setComments] = useState([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!videoId) {
        setError('영상 정보가 없습니다.')
        setLoading(false)
        return
      }
      try {
        const videoResponse = await fetch(API_BASE_URL + '/api/highlights')
        const videoData = await videoResponse.json()
        if (!videoResponse.ok) throw new Error(videoData.detail || '영상 목록을 불러오지 못했습니다.')
        const selected = (videoData.videos || []).find((item) => item.id === videoId)
        if (!selected) throw new Error('하이라이트 영상을 찾을 수 없습니다.')

        const query = new URLSearchParams({ video_id: videoId })
        const commentResponse = await fetch(API_BASE_URL + '/api/highlight-comments?' + query)
        const commentData = await commentResponse.json()
        if (!commentResponse.ok) throw new Error(commentData.detail || '댓글을 불러오지 못했습니다.')

        if (!cancelled) {
          setVideo(selected)
          setComments(commentData.comments || [])
        }
      } catch (err) {
        if (!cancelled) setError(err.message || '영상을 불러오지 못했습니다.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [videoId])

  const submitComment = async (event) => {
    event.preventDefault()
    const content = draft.trim()
    if (!content || !video) return
    setSending(true)
    setError('')
    try {
      const response = await fetch(API_BASE_URL + '/api/highlight-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_id: video.id,
          author: user?.name || '익명',
          content,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || '댓글을 등록하지 못했습니다.')
      setComments((current) => [data.comment, ...current])
      setDraft('')
    } catch (err) {
      setError(err.message || '댓글을 등록하지 못했습니다.')
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="highlight-community-page highlight-video-detail-page">
      <section className="highlight-community-hero">
        <p className="ai-highlight-eyebrow">ACHI HIGHLIGHT COMMUNITY</p>
        <h1>{video?.title || '하이라이트 영상'}</h1>
        {video?.created_at && <p>{video.created_at}</p>}
      </section>
      <section className="highlight-video-detail-content">
        <Link className="highlight-video-back-link" to="/ai-highlight/community">
          ← 커뮤니티로 돌아가기
        </Link>
        {loading && <p className="highlight-community-message">영상을 불러오는 중입니다...</p>}
        {error && !video && <p className="highlight-community-error" role="alert">{error}</p>}
        {video && (
          <div className="highlight-video-detail-layout">
            <article className="highlight-video-player-card">
              <video
                controls
                autoPlay={false}
                preload="metadata"
                poster={video.thumbnail_url ? API_BASE_URL + video.thumbnail_url : undefined}
                src={API_BASE_URL + video.video_url}
              />
              <h2>{video.title}</h2>
              <time>{video.created_at}</time>
            </article>
            <section className="highlight-video-comments-panel">
              <h2>댓글 <span>{comments.length}</span></h2>
              <form onSubmit={submitComment}>
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  maxLength={1000}
                  placeholder="이 영상에 댓글을 남겨보세요."
                  aria-label="댓글 내용"
                />
                <button type="submit" disabled={sending || !draft.trim()}>
                  {sending ? '등록 중...' : '댓글 등록'}
                </button>
              </form>
              {error && <p className="highlight-community-error" role="alert">{error}</p>}
              <div className="highlight-comment-list">
                {comments.length === 0 ? (
                  <p>첫 댓글을 남겨보세요.</p>
                ) : comments.map((comment) => (
                  <article className="highlight-comment" key={comment.id}>
                    <div><strong>{comment.author}</strong><time>{comment.created_at}</time></div>
                    <p>{comment.content}</p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  )
}

export default AIHighlightVideoDetail
