import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import '../App.css'

const API_BASE_URL = 'http://127.0.0.1:8000'

function AIHighlightCommunity() {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch(API_BASE_URL + '/api/highlights')
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.detail || '하이라이트 목록을 불러오지 못했습니다.')
        return data.videos || []
      })
      .then((items) => { if (!cancelled) setVideos(items) })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const getDetailUrl = (video) => (
    '/ai-highlight/community/video?video=' + encodeURIComponent(video.id)
  )

  return (
    <main className="highlight-community-page">
      <section className="highlight-community-hero">
        <p className="ai-highlight-eyebrow">ACHI HIGHLIGHT COMMUNITY</p>
        <h1>하이라이트 커뮤니티</h1>
        <p>생성된 경기 하이라이트를 감상하고 영상별 댓글을 나눠보세요.</p>
      </section>
      <section className="highlight-community-content">
        <div className="highlight-community-heading">
          <div><span>COMMUNITY</span><h2>생성된 하이라이트</h2></div>
          <Link to="/ai-highlight">하이라이트 만들기</Link>
        </div>
        {loading && <p className="highlight-community-message">영상을 불러오는 중입니다...</p>}
        {error && <p className="highlight-community-error" role="alert">{error}</p>}
        {!loading && !error && videos.length === 0 && (
          <div className="highlight-community-empty">
            <strong>아직 등록된 하이라이트가 없습니다.</strong>
            <p>첫 영상을 생성하면 이곳에서 함께 볼 수 있어요.</p>
            <Link to="/ai-highlight">하이라이트 생성하기</Link>
          </div>
        )}
        <div className="highlight-community-grid">
          {videos.map((video) => (
            <article className="highlight-community-card" key={video.id}>
              <Link className="highlight-community-poster" to={getDetailUrl(video)}>
                {video.thumbnail_url ? (
                  <img src={API_BASE_URL + video.thumbnail_url} alt={video.title + ' 썸네일'} />
                ) : (
                  <span className="highlight-community-poster-fallback">▶</span>
                )}
                <span className="highlight-community-play">▶ 영상 보기</span>
              </Link>
              <div className="highlight-community-video-info">
                <div><h3>{video.title}</h3><time>{video.created_at}</time></div>
                <span className="highlight-community-comment-count">댓글 {video.comments_count || 0}</span>
              </div>
              <Link className="highlight-community-open-link" to={getDetailUrl(video)}>
                영상과 댓글 보기
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

export default AIHighlightCommunity
