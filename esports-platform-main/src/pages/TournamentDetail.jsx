import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import '../App.css'

function TournamentDetail() {
  const { id } = useParams()
  const [tournament, setTournament] = useState(null)
  const [teams, setTeams] = useState([])
  const [myTeams, setMyTeams] = useState([])
  const [registeredTeams, setRegisteredTeams] = useState([])
  const [selectedTeam, setSelectedTeam] = useState('')
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
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
  useEffect(() => {
    const getData = async () => {
      try {
        const tournamentResponse = await fetch(
          'http://127.0.0.1:8000/api/tournaments'
        )
        const tournamentData =
          await tournamentResponse.json()
        const selectedTournament =
          tournamentData.tournaments.find(
            (item) =>
              String(item.id) === String(id)
          )
        setTournament(
          selectedTournament || null
        )
        const teamResponse = await fetch(
          `http://127.0.0.1:8000/api/tournaments/${id}/teams`
        )
        const teamData =
          await teamResponse.json()
        const registered =
          teamData.teams || []
        setRegisteredTeams(registered)
        const allTeamResponse = await fetch(
          'http://127.0.0.1:8000/api/teams'
        )
        const allTeamData =
          await allTeamResponse.json()
        const allTeams =
          allTeamData.teams || []
        setTeams(allTeams)
        if (user) {
          const userTeams = allTeams.filter(
            (team) =>
              team.captain === user.name
          )
          setMyTeams(userTeams)
        }
      } catch (error) {
        console.error(
          '대회 정보를 불러오지 못했습니다.',
          error
        )
      } finally {
        setLoading(false)
      }
    }
    getData()
  }, [id])
  const isAlreadyRegistered = (teamId) => {
    return registeredTeams.some(
      (team) =>
        String(team.team_id) === String(teamId)
    )
  }
  const handleJoin = async () => {
    if (!user) {
      alert('대회에 참가하려면 먼저 로그인해주세요.')
      return
    }
    if (!tournament) {
      return
    }
    if (tournament.status !== '모집중') {
      alert('현재 참가 신청을 받지 않는 대회입니다.')
      return
    }
    if (!selectedTeam) {
      alert('참가할 팀을 선택해주세요.')
      return
    }
    if (isAlreadyRegistered(selectedTeam)) {
      alert('이미 참가 신청한 팀입니다.')
      return
    }
    setJoining(true)
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/tournaments/${id}/teams`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            team_id: Number(selectedTeam)
          })
        }
      )
      const data = await response.json()
      if (!response.ok) {
        alert(
          data.detail ||
            data.message ||
            '참가 신청에 실패했습니다.'
        )
        return
      }
      alert(data.message || '대회 참가 신청이 완료되었습니다.')
      const teamResponse = await fetch(
        `http://127.0.0.1:8000/api/tournaments/${id}/teams`
      )
      const teamData =
        await teamResponse.json()
      setRegisteredTeams(
        teamData.teams || []
      )
      setSelectedTeam('')
    } catch (error) {
      console.error(error)
      alert('서버에 연결할 수 없습니다.')
    } finally {
      setJoining(false)
    }
  }
  if (loading) {
    return (
      <div className="page">
        <h1>대회 정보를 불러오는 중...</h1>
      </div>
    )
  }
  if (!tournament) {
    return (
      <div className="page">
        <div className="empty-tournament">
          <h2>대회를 찾을 수 없습니다.</h2>
          <Link
            to="/tournaments"
            className="primary-button"
          >
            대회 목록으로
          </Link>
        </div>
      </div>
    )
  }
  const canJoin =
    tournament.status === '모집중'
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="page-subtitle">
            TOURNAMENT DETAIL
          </p>
          <h1>{tournament.name}</h1>
          <p>
            {tournament.description ||
              '대회 설명이 없습니다.'}
          </p>
        </div>
        <Link
          to="/tournaments"
          className="secondary-button"
        >
          대회 목록
        </Link>
      </header>
      <section className="content-card">
        <h2>대회 정보</h2>
        <div
          style={{
            marginBottom: '20px'
          }}
        >
          <span className="status">
            현재 상태: {tournament.status || '모집중'}
          </span>
        </div>
        <div className="card-info">
          <span>
            게임: {tournament.game}
          </span>
          <span>
            최대 참가자: {tournament.max_participants}명
          </span>
        </div>
        <p>
          대회 기간: {tournament.start_date} ~{' '}
          {tournament.end_date}
        </p>
        <p>
          현재 참가 팀: {registeredTeams.length}팀
        </p>
      </section>
      <section className="content-card">
        <h2>대회 참가</h2>
        {!user ? (
          <div className="empty-tournament">
            <p>
              대회에 참가하려면 로그인이 필요합니다.
            </p>
            <Link
              to="/login"
              className="primary-button"
            >
              로그인
            </Link>
          </div>
        ) : !canJoin ? (
          <div className="empty-tournament">
            <h3>
              현재 참가 신청을 받지 않습니다.
            </h3>
            <p>
              {tournament.status === '진행중'
                ? '현재 대회가 진행 중입니다.'
                : '종료된 대회입니다.'}
            </p>
          </div>
        ) : myTeams.length === 0 ? (
          <div className="empty-tournament">
            <h3>참가할 팀이 없습니다.</h3>
            <p>
              먼저 팀을 만든 후 대회에 참가 신청할 수 있습니다.
            </p>
            <Link
              to="/teams/create"
              className="primary-button"
            >
              팀 만들기
            </Link>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gap: '16px',
              marginTop: '20px'
            }}
          >
            <div className="form-group">
              <label>참가할 팀 선택</label>
              <select
                value={selectedTeam}
                onChange={(e) =>
                  setSelectedTeam(e.target.value)
                }
              >
                <option value="">
                  팀을 선택해주세요
                </option>
                {myTeams.map((team) => {
                  const registered =
                    isAlreadyRegistered(team.id)
                  return (
                    <option
                      key={team.id}
                      value={team.id}
                      disabled={registered}
                    >
                      {team.name}
                      {registered
                        ? ' - 이미 신청함'
                        : ''}
                    </option>
                  )
                })}
              </select>
            </div>
            <button
              className="primary-button"
              onClick={handleJoin}
              disabled={joining}
            >
              {joining
                ? '참가 신청 중...'
                : '참가 신청'}
            </button>
            <p>
              참가 신청 후 대회 운영자의 승인을 기다려야 합니다.
            </p>
          </div>
        )}
      </section>
      <section className="content-card">
        <h2>대회 메뉴</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(2, 1fr)',
            gap: '16px',
            marginTop: '20px'
          }}
        >
          <Link
            to={`/bracket?tournament=${id}`}
            className="secondary-button"
          >
            대진표
          </Link>
          <Link
            to={`/schedule?tournament=${id}`}
            className="secondary-button"
          >
            경기 일정
          </Link>
          <Link
            to={`/results?tournament=${id}`}
            className="secondary-button"
          >
            경기 결과
          </Link>
          <Link
            to={`/tournaments/${id}/teams`}
            className="secondary-button"
          >
            {canManage()
              ? '참가 팀 관리'
              : '참가 팀 보기'}
          </Link>
          {canManage() && (
            <Link
              to={`/matches?tournament=${id}`}
              className="secondary-button"
            >
              경기 관리
            </Link>
          )}
        </div>
      </section>
      <section className="content-card">
        <h2>참가 팀</h2>
        {registeredTeams.length === 0 ? (
          <div className="empty-tournament">
            <h3>참가 팀이 없습니다.</h3>
            <p>
              아직 참가 신청한 팀이 없습니다.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gap: '16px',
              marginTop: '20px'
            }}
          >
            {registeredTeams.map((team) => (
              <div
                key={team.team_id}
                className="tournament-card"
              >
                <h3>{team.name}</h3>
                <p>
                  게임: {team.game}
                </p>
                <p>
                  주장: {team.captain}
                </p>
                <p>
                  팀원: {team.members.length}명
                </p>
                <p>
                  신청 상태: {team.status}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
export default TournamentDetail
