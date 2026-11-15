import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import '../App.css'

function Schedule() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const tournamentId = searchParams.get('tournament')

  const [tournaments, setTournaments] = useState([])
  const [matches, setMatches] = useState([])
  const [teams, setTeams] = useState([])

  useEffect(() => {
    const getData = async () => {
      try {
        const [tournamentResponse, matchResponse, teamResponse] =
          await Promise.all([
            fetch('http://127.0.0.1:8000/api/tournaments'),
            fetch('http://127.0.0.1:8000/api/matches'),
            fetch('http://127.0.0.1:8000/api/teams')
          ])

        const tournamentData = await tournamentResponse.json()
        const matchData = await matchResponse.json()
        const teamData = await teamResponse.json()

        setTournaments(tournamentData.tournaments || [])
        setMatches(matchData.matches || [])
        setTeams(teamData.teams || [])
      } catch (error) {
        console.error('경기 일정을 불러오지 못했습니다.', error)
      }
    }

    getData()
  }, [])

  const getTeamName = (teamId) => {
    const team = teams.find(
      (item) => Number(item.id) === Number(teamId)
    )

    return team ? team.name : '미정'
  }

  if (!tournamentId) {
    return (
      <div className="page">
        <header className="page-header">
          <div>
            <p className="page-subtitle">SCHEDULE</p>
            <h1>경기 일정</h1>
            <p>일정을 확인할 대회를 선택해주세요.</p>
          </div>
        </header>

        <section className="content-card">
          <h2>대회 목록</h2>

          {tournaments.length === 0 ? (
            <div className="empty-tournament">
              <h2>등록된 대회가 없습니다.</h2>
            </div>
          ) : (
            <div className="tournament-grid">
              {tournaments.map((tournament) => (
                <div
                  key={tournament.id}
                  className="tournament-card"
                  style={{ cursor: 'pointer' }}
                  onClick={() =>
                    navigate(
                      `/schedule?tournament=${tournament.id}`
                    )
                  }
                >
                  <span className="status">
                    경기 일정
                  </span>

                  <h3>{tournament.name}</h3>

                  <p>
                    {tournament.game}
                  </p>

                  <p>
                    {tournament.start_date} ~ {tournament.end_date}
                  </p>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={(event) => {
                      event.stopPropagation()

                      navigate(
                        `/schedule?tournament=${tournament.id}`
                      )
                    }}
                  >
                    경기 일정 보기
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    )
  }

  const tournament = tournaments.find(
    (item) => String(item.id) === String(tournamentId)
  )

  const tournamentMatches = matches
    .filter(
      (match) =>
        String(match.tournament_id) === String(tournamentId)
    )
    .sort((a, b) => {
      if (Number(a.round) !== Number(b.round)) {
        return Number(a.round) - Number(b.round)
      }

      return Number(a.match_number) - Number(b.match_number)
    })

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="page-subtitle">SCHEDULE</p>

          <h1>
            {tournament
              ? tournament.name
              : '경기 일정'}
          </h1>

          <p>
            대회의 경기 일정을 확인할 수 있습니다.
          </p>
        </div>
      </header>

      <section className="content-card">
        <button
          type="button"
          className="secondary-button"
          onClick={() => navigate('/schedule')}
          style={{ marginBottom: '20px' }}
        >
          ← 대회 목록
        </button>

        <h2>경기 일정</h2>

        {tournamentMatches.length === 0 ? (
          <div className="empty-tournament">
            <h2>등록된 경기가 없습니다.</h2>
            <p>
              대진표가 생성되면 경기 일정이 표시됩니다.
            </p>
          </div>
        ) : (
          <div className="tournament-grid">
            {tournamentMatches.map((match) => (
              <div
                key={match.id}
                className="tournament-card"
              >
                <span className="status">
                  {Number(match.round) === 1
                    ? '준결승'
                    : '결승'}
                </span>

                <h3>
                  경기 {match.match_number}
                </h3>

                <div className="card-info">
                  <span>
                    {getTeamName(match.team_a_id)}
                  </span>

                  <strong>
                    {match.status === '종료'
                      ? `${match.team_a_score} : ${match.team_b_score}`
                      : 'VS'}
                  </strong>

                  <span>
                    {getTeamName(match.team_b_id)}
                  </span>
                </div>

                <p>
                  상태: {match.status}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default Schedule
