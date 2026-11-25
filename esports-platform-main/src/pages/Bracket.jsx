import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import '../App.css'

function Bracket() {
  const [searchParams] = useSearchParams()
  const tournamentId = searchParams.get('tournament')

  const [teams, setTeams] = useState([])
  const [matches, setMatches] = useState([])
  const [selectedTeams, setSelectedTeams] = useState([])
  const [tournament, setTournament] = useState(null)
  const [loading, setLoading] = useState(true)

  const user = JSON.parse(
    localStorage.getItem('esports_user')
  )

  const canManage = () => {
    if (!user || !tournament) {
      return false
    }

    if (user.role === 'admin') {
      return true
    }

    return user.email === tournament.creator_email
  }

  const getData = async () => {
    try {
      if (!tournamentId) {
        setLoading(false)
        return
      }

      const tournamentResponse = await fetch(
        'http://127.0.0.1:8000/api/tournaments'
      )

      const teamResponse = await fetch(
        `http://127.0.0.1:8000/api/tournaments/${tournamentId}/teams`
      )

      const matchResponse = await fetch(
        'http://127.0.0.1:8000/api/matches'
      )

      const tournamentData =
        await tournamentResponse.json()

      const teamData =
        await teamResponse.json()

      const matchData =
        await matchResponse.json()

      const selectedTournament =
        (tournamentData.tournaments || []).find(
          (item) =>
            String(item.id) === String(tournamentId)
        )

      setTournament(
        selectedTournament || null
      )

      const approvedTeams =
        (teamData.teams || []).filter(
          (team) => team.status === '승인'
        )

      setTeams(approvedTeams)

      const tournamentMatches =
        (matchData.matches || []).filter(
          (match) =>
            String(match.tournament_id) ===
            String(tournamentId)
        )

      setMatches(tournamentMatches)
    } catch (error) {
      console.error(error)
      alert('대진표 정보를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getData()
  }, [tournamentId])

  const getTeamName = (teamId) => {
    const team = teams.find(
      (item) =>
        Number(item.team_id) === Number(teamId)
    )

    return team ? team.name : '미정'
  }

  const toggleTeam = (teamId) => {
    if (selectedTeams.includes(teamId)) {
      setSelectedTeams(
        selectedTeams.filter(
          (id) => id !== teamId
        )
      )
      return
    }

    if (selectedTeams.length >= 4) {
      alert('최대 4팀까지 선택할 수 있습니다.')
      return
    }

    setSelectedTeams([
      ...selectedTeams,
      teamId
    ])
  }

  const generateBracket = async () => {
    if (!canManage()) {
      alert('대진표를 생성할 권한이 없습니다.')
      return
    }

    if (selectedTeams.length !== 4) {
      alert('승인된 팀 4개를 선택해주세요.')
      return
    }

    try {
      const response = await fetch(
        'http://127.0.0.1:8000/api/bracket/generate',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            tournament_id: Number(tournamentId),
            team_ids: selectedTeams
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        alert(
          data.detail ||
            data.message ||
            '대진표 생성에 실패했습니다.'
        )
        return
      }

      alert('대진표가 생성되었습니다.')

      setSelectedTeams([])

      await getData()
    } catch (error) {
      console.error(error)
      alert('서버에 연결할 수 없습니다.')
    }
  }

  if (loading) {
    return (
      <div className="page">
        <h1>대진표</h1>
        <p>대진표를 불러오는 중입니다.</p>
      </div>
    )
  }

  if (!tournamentId) {
    return (
      <div className="page">
        <h1>대진표</h1>

        <section className="content-card">
          <p>대회 정보가 없습니다.</p>
        </section>
      </div>
    )
  }

  const semifinalMatches = matches
    .filter(
      (match) => Number(match.round) === 1
    )
    .sort(
      (a, b) =>
        Number(a.match_number) -
        Number(b.match_number)
    )

  const finalMatch = matches.find(
    (match) =>
      Number(match.round) === 2 &&
      Number(match.match_number) === 1
  )

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="page-subtitle">
            BRACKET
          </p>

          <h1>대진표</h1>

          <p>
            {tournament
              ? tournament.name
              : '대회 대진표'}
          </p>
        </div>
      </header>

      {matches.length === 0 ? (
        canManage() ? (
          <section className="content-card">
            <h2>대진표 생성</h2>

            <p>
              승인된 팀 4개를 선택해주세요.
            </p>

            {teams.length === 0 ? (
              <p>
                현재 승인된 참가 팀이 없습니다.
              </p>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '10px',
                  marginTop: '20px'
                }}
              >
                {teams.map((team) => {
                  const selected =
                    selectedTeams.includes(
                      team.team_id
                    )

                  return (
                    <button
                      key={team.team_id}
                      type="button"
                      className={
                        selected
                          ? 'primary-button'
                          : 'secondary-button'
                      }
                      onClick={() =>
                        toggleTeam(
                          team.team_id
                        )
                      }
                    >
                      {selected ? '✓ ' : ''}
                      {team.name}
                    </button>
                  )
                })}
              </div>
            )}

            <div
              style={{
                marginTop: '20px'
              }}
            >
              <p>
                선택한 팀:{' '}
                {selectedTeams.length} / 4
              </p>

              <button
                type="button"
                className="primary-button"
                onClick={generateBracket}
                disabled={
                  selectedTeams.length !== 4
                }
              >
                대진표 생성
              </button>
            </div>
          </section>
        ) : (
          <section className="content-card">
            <h2>대진표 준비 중</h2>

            <p>
              아직 대진표가 생성되지 않았습니다.
            </p>

            <p>
              대회 운영자가 대진표를 생성하면
              이곳에서 확인할 수 있습니다.
            </p>
          </section>
        )
      ) : (
        <section className="content-card bracket-content">
          <div className="bracket-layout">
            <div className="bracket-round">
              <h2>준결승</h2>

              <div className="bracket-match-list">
                {semifinalMatches.map((match) => (
                  <article
                    key={match.id}
                    className="tournament-card bracket-match"
                  >
                    <span className="status">
                      경기 {match.match_number} · {match.status}
                    </span>

                    <div className="bracket-team-row">
                      <span>{getTeamName(match.team_a_id)}</span>
                      <strong>{match.team_a_score ?? '-'}</strong>
                    </div>

                    <div className="bracket-team-row">
                      <span>{getTeamName(match.team_b_id)}</span>
                      <strong>{match.team_b_score ?? '-'}</strong>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="bracket-round bracket-final-round">
              <h2>결승</h2>

              <div className="bracket-final-slot">
                {finalMatch ? (
                  <article className="tournament-card bracket-match bracket-final-match">
                    <span className="status">
                      결승 · {finalMatch.status}
                    </span>

                    <div className="bracket-team-row">
                      <span>{getTeamName(finalMatch.team_a_id)}</span>
                      <strong>{finalMatch.team_a_score ?? '-'}</strong>
                    </div>

                    <div className="bracket-team-row">
                      <span>{getTeamName(finalMatch.team_b_id)}</span>
                      <strong>{finalMatch.team_b_score ?? '-'}</strong>
                    </div>
                  </article>
                ) : (
                  <div className="bracket-pending">
                    결승 대기 중입니다.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

export default Bracket
