import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import '../App.css'

function CreateMatch() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [tournaments, setTournaments] = useState([])
  const [teams, setTeams] = useState([])
  const [tournamentId, setTournamentId] = useState(
    searchParams.get('tournament') || ''
  )
  const [teamA, setTeamA] = useState('')
  const [teamB, setTeamB] = useState('')
  const [loading, setLoading] = useState(true)

  const user = JSON.parse(
    localStorage.getItem('esports_user')
  )

  const isAdmin =
    user && user.role === 'admin'

  const canAccess =
    user && (
      user.role === 'admin' ||
      user.role === 'user'
    )

  useEffect(() => {
    if (!canAccess) {
      setLoading(false)
      return
    }

    const getData = async () => {
      try {
        const [tournamentResponse, teamResponse] =
          await Promise.all([
            fetch(
              'http://127.0.0.1:8000/api/tournaments'
            ),
            fetch(
              'http://127.0.0.1:8000/api/teams'
            )
          ])

        const tournamentData =
          await tournamentResponse.json()

        const teamData =
          await teamResponse.json()

        const allTournaments =
          tournamentData.tournaments || []

        const availableTournaments =
          isAdmin
            ? allTournaments
            : allTournaments.filter(
                (tournament) =>
                  tournament.creator_email ===
                  user.email
              )

        setTournaments(
          availableTournaments
        )

        setTeams(
          teamData.teams || []
        )

        const selectedTournamentId =
          searchParams.get('tournament')

        if (
          selectedTournamentId &&
          availableTournaments.some(
            (tournament) =>
              String(tournament.id) ===
              String(selectedTournamentId)
          )
        ) {
          setTournamentId(
            selectedTournamentId
          )
        } else if (
          availableTournaments.length > 0
        ) {
          setTournamentId(
            String(
              availableTournaments[0].id
            )
          )
        } else {
          setTournamentId('')
        }
      } catch (error) {
        console.error(
          '데이터를 불러오지 못했습니다.',
          error
        )

        alert(
          '데이터를 불러오지 못했습니다.'
        )
      } finally {
        setLoading(false)
      }
    }

    getData()
  }, [])

  const createMatch = async (event) => {
    event.preventDefault()

    if (!canAccess) {
      alert(
        '경기를 생성할 권한이 없습니다.'
      )
      return
    }

    if (!tournamentId) {
      alert('대회를 선택해주세요.')
      return
    }

    const selectedTournament =
      tournaments.find(
        (tournament) =>
          String(tournament.id) ===
          String(tournamentId)
      )

    if (!selectedTournament) {
      alert(
        '해당 대회를 관리할 권한이 없습니다.'
      )
      return
    }

    if (
      !isAdmin &&
      selectedTournament.creator_email !==
        user.email
    ) {
      alert(
        '본인이 생성한 대회만 관리할 수 있습니다.'
      )
      return
    }

    if (!teamA || !teamB) {
      alert(
        '팀 A와 팀 B를 모두 선택해주세요.'
      )
      return
    }

    if (teamA === teamB) {
      alert(
        '서로 다른 팀을 선택해주세요.'
      )
      return
    }

    const match = {
      tournament_id: tournamentId,
      team_a_id: Number(teamA),
      team_b_id: Number(teamB)
    }

    try {
      const response = await fetch(
        'http://127.0.0.1:8000/api/matches',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json'
          },
          body: JSON.stringify(match)
        }
      )

      const data =
        await response.json()

      if (!response.ok) {
        alert(
          data.message ||
            data.detail ||
            '경기 생성에 실패했습니다.'
        )
        return
      }

      alert('경기가 생성되었습니다.')

      navigate(
        `/matches?tournament=${tournamentId}`
      )
    } catch (error) {
      console.error(error)
      alert(
        '서버에 연결할 수 없습니다.'
      )
    }
  }

  if (loading) {
    return (
      <div className="page">
        <h1>경기 생성</h1>
        <p>
          권한을 확인하는 중입니다.
        </p>
      </div>
    )
  }

  if (!canAccess) {
    return (
      <div className="page">
        <section className="content-card">
          <div className="empty-tournament">
            <h2>
              경기 생성 권한이 없습니다.
            </h2>

            <p>
              대회 생성자 또는 관리자만
              경기를 생성할 수 있습니다.
            </p>

            <button
              type="button"
              className="primary-button"
              onClick={() =>
                navigate('/tournaments')
              }
            >
              대회 목록으로
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="page-subtitle">
            MATCH
          </p>

          <h1>경기 생성</h1>

          <p>
            대회에서 진행할 경기를
            등록할 수 있습니다.
          </p>
        </div>
      </header>

      <section className="team-section">
        <div className="team-create-card">
          <h2>경기 만들기</h2>

          {tournaments.length === 0 ? (
            <div className="empty-tournament">
              <h3>
                관리할 수 있는 대회가 없습니다.
              </h3>

              <p>
                본인이 생성한 대회가 있어야
                경기를 생성할 수 있습니다.
              </p>
            </div>
          ) : (
            <form onSubmit={createMatch}>
              <div className="form-group">
                <label>대회</label>

                <select
                  value={tournamentId}
                  onChange={(e) =>
                    setTournamentId(
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    대회를 선택하세요
                  </option>

                  {tournaments.map(
                    (tournament) => (
                      <option
                        key={tournament.id}
                        value={
                          tournament.id
                        }
                      >
                        {tournament.name}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="form-group">
                <label>팀 A</label>

                <select
                  value={teamA}
                  onChange={(e) =>
                    setTeamA(
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    팀 A를 선택하세요
                  </option>

                  {teams.map((team) => (
                    <option
                      key={team.id}
                      value={team.id}
                    >
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>팀 B</label>

                <select
                  value={teamB}
                  onChange={(e) =>
                    setTeamB(
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    팀 B를 선택하세요
                  </option>

                  {teams.map((team) => (
                    <option
                      key={team.id}
                      value={team.id}
                    >
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>경기 일시</label>

                <input
                  type="datetime-local"
                />
              </div>

              <div className="form-buttons">
                <button
                  className="cancel-button"
                  type="button"
                  onClick={() =>
                    navigate(
                      tournamentId
                        ? `/matches?tournament=${tournamentId}`
                        : '/matches'
                    )
                  }
                >
                  취소
                </button>

                <button
                  className="primary-button"
                  type="submit"
                >
                  경기 생성
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  )
}

export default CreateMatch