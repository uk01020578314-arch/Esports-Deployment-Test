import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import '../App.css'

function TournamentTeamsManage() {
  const { tournamentId } = useParams()

  const [tournament, setTournament] = useState(null)
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)

  const user = JSON.parse(localStorage.getItem('esports_user'))

  useEffect(() => {
    const loadData = async () => {
      try {
        const tournamentResponse = await fetch(
          'http://127.0.0.1:8000/api/tournaments'
        )

        if (!tournamentResponse.ok) {
          throw new Error('대회 정보를 불러오지 못했습니다.')
        }

        const tournamentData = await tournamentResponse.json()

        const foundTournament = tournamentData.tournaments.find(
          (item) => String(item.id) === String(tournamentId)
        )

        if (!foundTournament) {
          setLoading(false)
          return
        }

        setTournament(foundTournament)

        const teamResponse = await fetch(
          `http://127.0.0.1:8000/api/tournaments/${tournamentId}/teams`
        )

        if (!teamResponse.ok) {
          throw new Error('참가 팀 정보를 불러오지 못했습니다.')
        }

        const teamData = await teamResponse.json()

        setTeams(teamData.teams || [])
      } catch (error) {
        console.error(error)
        alert('참가 팀 정보를 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [tournamentId])

  const canManage = () => {
    if (!user || !tournament) {
      return false
    }

    if (user.role === 'admin') {
      return true
    }

    return user.email === tournament.creator_email
  }

  const approveRegistration = async (teamId) => {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/tournaments/${tournamentId}/teams/${teamId}/approve`,
        {
          method: 'PATCH'
        }
      )

      const data = await response.json()

      if (!response.ok) {
        alert(data.message || '승인에 실패했습니다.')
        return
      }

      alert(data.message)

      setTeams((current) =>
        current.map((team) =>
          team.team_id === teamId
            ? { ...team, status: '승인' }
            : team
        )
      )
    } catch (error) {
      console.error(error)
      alert('서버에 연결할 수 없습니다.')
    }
  }

  const rejectRegistration = async (teamId) => {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/tournaments/${tournamentId}/teams/${teamId}/reject`,
        {
          method: 'PATCH'
        }
      )

      const data = await response.json()

      if (!response.ok) {
        alert(data.message || '거절에 실패했습니다.')
        return
      }

      alert(data.message)

      setTeams((current) =>
        current.map((team) =>
          team.team_id === teamId
            ? { ...team, status: '거절' }
            : team
        )
      )
    } catch (error) {
      console.error(error)
      alert('서버에 연결할 수 없습니다.')
    }
  }

  const cancelRegistration = async (teamId) => {
    const confirmed = window.confirm(
      '이 팀의 대회 참가를 취소하시겠습니까?'
    )

    if (!confirmed) {
      return
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/tournaments/${tournamentId}/teams/${teamId}`,
        {
          method: 'DELETE'
        }
      )

      const data = await response.json()

      if (!response.ok) {
        alert(data.message || '참가 취소에 실패했습니다.')
        return
      }

      alert(data.message || '참가가 취소되었습니다.')

      setTeams((current) =>
        current.filter((team) => team.team_id !== teamId)
      )
    } catch (error) {
      console.error(error)
      alert('서버에 연결할 수 없습니다.')
    }
  }

  if (loading) {
    return (
      <div className="page">
        <h1>참가 팀 정보를 불러오는 중...</h1>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="page">
        <header className="page-header">
          <div>
            <p className="page-subtitle">TEAM MANAGEMENT</p>
            <h1>대회를 찾을 수 없습니다.</h1>
          </div>
        </header>

        <Link to="/tournaments" className="primary-button">
          대회 목록으로
        </Link>
      </div>
    )
  }

  if (!canManage()) {
    return (
      <div className="page">
        <header className="page-header">
          <div>
            <p className="page-subtitle">TEAM MANAGEMENT</p>
            <h1>접근 권한 없음</h1>
            <p>이 대회의 참가 팀을 관리할 권한이 없습니다.</p>
          </div>
        </header>

        <Link to="/tournaments" className="primary-button">
          대회 목록으로
        </Link>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="page-subtitle">TEAM MANAGEMENT</p>
          <h1>참가 팀 관리</h1>
          <p>{tournament.name}</p>
        </div>

        <div>
          <Link
            to={`/tournaments/${tournamentId}/manage`}
            className="secondary-button"
          >
            대회 관리
          </Link>

          <Link
            to="/tournaments"
            className="secondary-button"
            style={{ marginLeft: '10px' }}
          >
            대회 목록
          </Link>
        </div>
      </header>

      <section className="tournament-list-section">
        <div className="form-card">
          <h2>참가 팀</h2>

          <div className="card-info">
            <span>{tournament.game}</span>
            <span>참가 팀 {teams.length}개</span>
            <span>최대 {tournament.max_participants}명</span>
          </div>
        </div>

        {teams.length === 0 ? (
          <div className="empty-tournament">
            <h2>참가 신청한 팀이 없습니다.</h2>
            <p>
              아직 이 대회에 참가 신청한 팀이 없습니다.
            </p>
          </div>
        ) : (
          <div className="tournament-grid">
            {teams.map((team) => (
              <article
                className="tournament-card"
                key={team.team_id}
              >
                <span className="status">
                  상태: {team.status || '대기'}
                </span>

                <h3>{team.name}</h3>

                <div className="card-info">
                  <span>{team.game}</span>
                  <span>
                    팀원 {team.members?.length || 0}명
                  </span>
                </div>

                <p>
                  주장: {team.captain}
                </p>

                <p>
                  팀원:
                </p>

                {team.members && team.members.length > 0 ? (
                  <div>
                    {team.members.map((member, index) => (
                      <p key={index}>
                        {member}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p>등록된 팀원이 없습니다.</p>
                )}

                <div style={{ marginTop: '15px' }}>
                  {team.status === '대기' && (
                    <>
                      <button
                        className="primary-button"
                        onClick={() =>
                          approveRegistration(team.team_id)
                        }
                      >
                        승인
                      </button>

                      <button
                        className="secondary-button"
                        onClick={() =>
                          rejectRegistration(team.team_id)
                        }
                        style={{ marginLeft: '10px' }}
                      >
                        거절
                      </button>
                    </>
                  )}

                  {team.status === '승인' && (
                    <p>이 팀은 참가 승인되었습니다.</p>
                  )}

                  {team.status === '거절' && (
                    <p>이 팀의 참가 신청은 거절되었습니다.</p>
                  )}

                  <button
                    className="cancel-button"
                    onClick={() =>
                      cancelRegistration(team.team_id)
                    }
                    style={{ marginTop: '10px' }}
                  >
                    참가 취소
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default TournamentTeamsManage