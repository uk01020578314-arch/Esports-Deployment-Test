import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import '../App.css'

function Tournament() {
  const [tournaments, setTournaments] = useState([])
  const [filter, setFilter] = useState('전체')
  const [teams, setTeams] = useState([])
  const [selectedTournament, setSelectedTournament] = useState(null)
  const [registeredTeams, setRegisteredTeams] = useState([])
  const [showRegistered, setShowRegistered] = useState(null)

  const user = JSON.parse(localStorage.getItem('esports_user'))
  const normalizeGame = (game) => (game || '').trim().toLowerCase()

  useEffect(() => {
    const getTournaments = async () => {
      try {
        const response = await fetch(
          'http://127.0.0.1:8000/api/tournaments'
        )

        const data = await response.json()
        setTournaments(data.tournaments || [])
      } catch (error) {
        console.error(
          '대회 목록을 불러오지 못했습니다.',
          error
        )
      }
    }

    getTournaments()
  }, [])

  const getTeams = async () => {
    try {
      const response = await fetch(
        'http://127.0.0.1:8000/api/teams'
      )

      const data = await response.json()
      setTeams(data.teams || [])
    } catch (error) {
      alert('팀 목록을 불러오지 못했습니다.')
    }
  }

  const openJoin = async (tournamentId) => {
    const savedUser = localStorage.getItem('esports_user')

    if (!savedUser) {
      alert('대회에 참가하려면 먼저 로그인해주세요.')
      return
    }

    await getTeams()
    setSelectedTournament(tournamentId)
    setShowRegistered(null)
  }

  const registerTeam = async (team) => {
    if (!selectedTournament) {
      return
    }

    const tournament = tournaments.find(
      (item) => String(item.id) === String(selectedTournament)
    )

    if (!tournament || normalizeGame(team.game) !== normalizeGame(tournament.game)) {
      alert('대회와 같은 게임의 팀만 참가 신청할 수 있습니다.')
      return
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/tournaments/${selectedTournament}/teams`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            team_id: team.id
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        alert(
          data.detail ||
            data.message ||
            '대회 참가 신청에 실패했습니다.'
        )
        return
      }

      alert(data.message || '참가 신청이 완료되었습니다.')

      setSelectedTournament(null)
    } catch (error) {
      alert('서버에 연결할 수 없습니다.')
    }
  }

  const getRegisteredTeams = async (tournamentId) => {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/tournaments/${tournamentId}/teams`
      )

      const data = await response.json()

      setRegisteredTeams(data.teams || [])
      setShowRegistered(tournamentId)
      setSelectedTournament(null)
    } catch (error) {
      alert('참가 팀 목록을 불러오지 못했습니다.')
    }
  }

  const cancelRegistration = async (
    tournamentId,
    teamId
  ) => {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/tournaments/${tournamentId}/teams/${teamId}`,
        {
          method: 'DELETE'
        }
      )

      const data = await response.json()

      if (!response.ok) {
        alert(
          data.detail ||
            data.message ||
            '참가 취소에 실패했습니다.'
        )
        return
      }

      alert(data.message || '참가 신청이 취소되었습니다.')

      getRegisteredTeams(tournamentId)
    } catch (error) {
      alert('서버에 연결할 수 없습니다.')
    }
  }

  const canManage = (tournament) => {
    if (!user || !tournament) {
      return false
    }

    if (user.role === 'admin') {
      return true
    }

    return user.email === tournament.creator_email
  }

  const getStatusClass = (status) => {
    if (status === '모집 중' || status === '모집중') {
      return 'status status-recruiting'
    }

    if (status === '진행 중' || status === '진행중') {
      return 'status status-progress'
    }

    if (status === '종료') {
      return 'status status-finished'
    }

    return 'status status-recruiting'
  }

  const normalizeStatus = (status) => {
    if (status === '모집중') {
      return '모집 중'
    }

    if (status === '진행중') {
      return '진행 중'
    }

    return status || '모집 중'
  }

  const filtered = (
    filter === '전체'
      ? tournaments
      : tournaments.filter(
          (item) =>
            normalizeStatus(item.status) === filter
        )
  )
    .slice()
    .sort((a, b) => {
      const statusOrder = {
        '모집 중': 0,
        '진행 중': 1,
        종료: 2
      }

      return (
        statusOrder[normalizeStatus(a.status)] -
        statusOrder[normalizeStatus(b.status)]
      )
    })

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="page-subtitle">TOURNAMENT</p>

          <h1>대회</h1>

          <p>
            대학생 E스포츠 대회를 확인하고 참가할 수 있습니다.
          </p>
        </div>

        <Link
          to="/tournaments/create"
          className="primary-button"
        >
          대회 만들기
        </Link>
      </header>

      <section className="tournament-list-section">
        <div className="tournament-filter">
          {[
            '전체',
            '모집 중',
            '진행 중',
            '종료'
          ].map((item) => (
            <button
              key={item}
              className={
                filter === item
                  ? 'filter-active'
                  : ''
              }
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-tournament">
            <h2>등록된 대회가 없습니다.</h2>

            <p>
              새로운 대회를 만들어 E스포츠 대회를 시작해보세요.
            </p>

            <Link
              to="/tournaments/create"
              className="primary-button"
            >
              대회 만들기
            </Link>
          </div>
        ) : (
          <div className="tournament-grid">
            {filtered.map((tournament) => {
              const status = normalizeStatus(
                tournament.status
              )
              const compatibleTeams = teams.filter(
                (team) => normalizeGame(team.game) === normalizeGame(tournament.game)
              )

              return (
                <article
                  className="tournament-card"
                  key={tournament.id}
                >
                  <span className={getStatusClass(status)}>
                    {status}
                  </span>

                  <h3>{tournament.name}</h3>

                  <p>
                    {tournament.description ||
                      '대회 설명이 없습니다.'}
                  </p>

                  <div className="card-info">
                    <span>
                      {tournament.game}
                    </span>

                    <span>
                      최대{' '}
                      {tournament.max_participants}명
                    </span>
                  </div>

                  <div className="tournament-date">
                    대회 {tournament.start_date} ~{' '}
                    {tournament.end_date}
                  </div>

                  <div className="tournament-actions">
                    {status === '모집 중' && (
                      <button
                        className="primary-button"
                        onClick={() =>
                          openJoin(tournament.id)
                        }
                      >
                        참가하기
                      </button>
                    )}

                    <button
                      className="secondary-button"
                      onClick={() =>
                        getRegisteredTeams(
                          tournament.id
                        )
                      }
                    >
                      참가 팀 확인
                    </button>

                    <Link
                      to={`/schedule?tournament=${tournament.id}`}
                      className="secondary-button"
                    >
                      경기 일정
                    </Link>

                    <Link
                      to={`/bracket?tournament=${tournament.id}`}
                      className="secondary-button"
                    >
                      대진표
                    </Link>

                    <Link
                      to={`/results?tournament=${tournament.id}`}
                      className="secondary-button"
                    >
                      경기 결과
                    </Link>

                    <Link
                      to={`/tournaments/${tournament.id}`}
                      className="secondary-button"
                    >
                      대회 상세보기
                    </Link>

                    {canManage(tournament) && (
                      <Link
                        to={`/tournaments/${tournament.id}/manage`}
                        className="secondary-button"
                      >
                        대회 관리
                      </Link>
                    )}
                  </div>

                  {selectedTournament ===
                    tournament.id && createPortal(
                    <div
                      className="tournament-popup"
                      onClick={(event) => {
                        if (event.target === event.currentTarget) {
                          setSelectedTournament(null)
                        }
                      }}
                    >
                      <div className="tournament-popup-content">
                        <div className="tournament-popup-header">
                          <div>
                            <p className="page-subtitle">
                              JOIN TOURNAMENT
                            </p>

                            <h3>
                              참가할 팀 선택
                            </h3>
                          </div>

                          <button
                            className="popup-close"
                            onClick={() =>
                              setSelectedTournament(
                                null
                              )
                            }
                          >
                            ×
                          </button>
                        </div>

                        {compatibleTeams.length === 0 ? (
                          <div className="empty-tournament">
                            <p>
                              {tournament.game} 게임에 등록된 팀이 없습니다.
                            </p>

                            <Link
                              to="/teams/create"
                              className="primary-button"
                              onClick={() =>
                                setSelectedTournament(
                                  null
                                )
                              }
                            >
                              팀 만들기
                            </Link>
                          </div>
                        ) : (
                          <div className="popup-team-list">
                            {compatibleTeams.map((team) => (
                              <div
                                className="popup-team-item"
                                key={team.id}
                              >
                                <div>
                                  <strong>
                                    {team.name}
                                  </strong>

                                  <p>
                                    {team.game} · 주장{' '}
                                    {team.captain}
                                  </p>
                                </div>

                                <button
                                  className="primary-button"
                                  onClick={() =>
                                    registerTeam(
                                      team
                                    )
                                  }
                                >
                                  신청
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>,
                    document.body
                  )}

                  {showRegistered ===
                    tournament.id && createPortal(
                    <div
                      className="tournament-popup"
                      onClick={(event) => {
                        if (event.target === event.currentTarget) {
                          setShowRegistered(null)
                        }
                      }}
                    >
                      <div className="tournament-popup-content">
                        <div className="tournament-popup-header">
                          <div>
                            <p className="page-subtitle">
                              REGISTERED TEAMS
                            </p>

                            <h3>
                              참가 신청 팀
                            </h3>
                          </div>

                          <button
                            className="popup-close"
                            onClick={() =>
                              setShowRegistered(null)
                            }
                          >
                            ×
                          </button>
                        </div>

                        {registeredTeams.length ===
                        0 ? (
                          <div className="empty-tournament">
                            <p>
                              아직 참가 신청한 팀이
                              없습니다.
                            </p>
                          </div>
                        ) : (
                          <div className="popup-team-list">
                            {registeredTeams.map(
                              (team) => (
                                <div
                                  className="popup-team-item"
                                  key={
                                    team.team_id
                                  }
                                >
                                  <div>
                                    <strong>
                                      {team.name}
                                    </strong>

                                    <p>
                                      {team.game} · 주장{' '}
                                      {team.captain}
                                    </p>

                                    <p>
                                      팀원{' '}
                                      {
                                        team.members
                                          .length
                                      }
                                      명 · 신청 상태{' '}
                                      {team.status}
                                    </p>
                                  </div>

                                  {user &&
                                    (user.role ===
                                      'admin' ||
                                      user.email ===
                                        tournament.creator_email) && (
                                      <button
                                        className="cancel-button"
                                        onClick={() =>
                                          cancelRegistration(
                                            tournament.id,
                                            team.team_id
                                          )
                                        }
                                      >
                                        참가 취소
                                      </button>
                                    )}
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>,
                    document.body
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

export default Tournament
