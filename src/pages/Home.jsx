import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import '../App.css'

function Home() {
  const [tournaments, setTournaments] = useState([])

  const normalizeStatus = (status) => {
    if (status === '모집중') {
      return '모집 중'
    }

    if (status === '진행중') {
      return '진행 중'
    }

    return status || '모집 중'
  }

  const getStatusClass = (status) => {
    if (status === '모집 중') {
      return 'status status-recruiting'
    }

    if (status === '진행 중') {
      return 'status status-progress'
    }

    if (status === '종료') {
      return 'status status-finished'
    }

    return 'status status-recruiting'
  }

  useEffect(() => {
    const getTournaments = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/tournaments')
        const data = await response.json()

        const newestTournaments = [...data.tournaments]
          .sort((a, b) => Number(b.id) - Number(a.id))

        setTournaments(newestTournaments.slice(0, 3))
      } catch (error) {
        console.error('대회 목록을 불러오지 못했습니다.', error)
      }
    }

    getTournaments()
  }, [])

  return (
    <div className="app">
      <main>
        <section className="hero-section">
          <div>
            <p className="hero-subtitle">UNIVERSITY E-SPORTS</p>

            <h1>
              대학 E스포츠 대회를
              <br />
              한 곳에서
            </h1>

            <p className="hero-description">
              대학생을 위한 E스포츠 대회 운영 플랫폼입니다.
              <br />
              대회 참가부터 팀 관리, 경기 일정과 결과까지 관리할 수 있습니다.
            </p>

            <div className="hero-buttons">
              <Link to="/tournaments" className="primary-button">
                대회 둘러보기
              </Link>

              <Link to="/tournaments/create" className="secondary-button">
                대회 만들기
              </Link>
            </div>
          </div>
        </section>

        <section className="tournament-section">
          <div className="section-title">
            <div>
              <p>TOURNAMENT</p>
              <h2>진행 중인 대회</h2>
            </div>

            <Link to="/tournaments" className="more-button">
              전체보기 →
            </Link>
          </div>

          {tournaments.length ? (
            <div className="tournament-list">
              {tournaments.map((item, index) => (
                <Link
                  to={`/tournaments/${item.id}`}
                  className="tournament-card home-tournament-card"
                  key={item.id || index}
                >
                  <span className={getStatusClass(normalizeStatus(item.status))}>
                    {normalizeStatus(item.status)}
                  </span>

                  <h3>{item.name}</h3>

                  <p>
                    {item.description || '대회 설명이 없습니다.'}
                  </p>

                  <div className="card-info">
                    <span>{item.game}</span>
                    <span>
                      최대 {item.max_participants}명
                    </span>
                  </div>

                  <div className="tournament-date">
                    대회 {item.start_date} ~ {item.end_date}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-tournament">
              <p>현재 진행 중인 대회가 없습니다.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default Home
