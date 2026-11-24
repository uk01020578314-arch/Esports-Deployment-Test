import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import '../App.css'

function Team({ user, view = 'teams' }) {
  const isMyPage = view === 'mypage'
  const [teams, setTeams] = useState([])
  const [applications, setApplications] = useState([])
  const [myTeamJoinRequests, setMyTeamJoinRequests] = useState([])
  const [pendingJoinRequests, setPendingJoinRequests] = useState({})
  const [teamGameFilter, setTeamGameFilter] = useState('전체 게임')
  const [applicationGameFilter, setApplicationGameFilter] = useState('전체 게임')
  const [teamSearchQuery, setTeamSearchQuery] = useState('')
  const [applicationSearchQuery, setApplicationSearchQuery] = useState('')
  const [gamePicker, setGamePicker] = useState(null)

  useEffect(() => {
    const getTeams = async () => {
      try {
        const response = await fetch(
          'http://127.0.0.1:8000/api/teams'
        )

        if (!response.ok) {
          throw new Error('팀 목록을 불러오지 못했습니다.')
        }

        const data = await response.json()

        setTeams(
          Array.isArray(data.teams)
            ? data.teams
            : []
        )
      } catch (error) {
        console.error(
          '팀 목록을 불러오지 못했습니다.',
          error
        )

        setTeams([])
      }
    }

    getTeams()
  }, [])

  useEffect(() => {
    if (!user || teams.length === 0) {
      setMyTeamJoinRequests([])
      setPendingJoinRequests({})
      return
    }

    const getTeamJoinRequests = async () => {
      try {
        const myRequestsResponse = await fetch(
          `http://127.0.0.1:8000/api/team-join-requests?applicant_name=${encodeURIComponent(user.name)}`
        )

        if (myRequestsResponse.ok) {
          const myRequestsData = await myRequestsResponse.json()
          setMyTeamJoinRequests(myRequestsData.applications || [])
        }

        const captainTeams = teams.filter(
          (team) => team.captain === user.name
        )
        const requestsByTeam = {}

        await Promise.all(
          captainTeams.map(async (team) => {
            try {
              const response = await fetch(
                `http://127.0.0.1:8000/api/teams/${team.id}/join-requests?captain_name=${encodeURIComponent(user.name)}`
              )

              if (response.ok) {
                const data = await response.json()
                requestsByTeam[team.id] = data.applications || []
              }
            } catch (error) {
              console.error('팀 가입 신청을 불러오지 못했습니다.', error)
            }
          })
        )

        setPendingJoinRequests(requestsByTeam)
      } catch (error) {
        console.error('팀 가입 신청을 불러오지 못했습니다.', error)
      }
    }

    getTeamJoinRequests()
  }, [user, teams])

  useEffect(() => {
    const getApplications = async () => {
      if (!user || teams.length === 0) {
        setApplications([])
        return
      }

      try {
        const tournamentResponse = await fetch(
          'http://127.0.0.1:8000/api/tournaments'
        )

        if (!tournamentResponse.ok) {
          throw new Error(
            '대회 목록을 불러오지 못했습니다.'
          )
        }

        const tournamentData =
          await tournamentResponse.json()

        const myTeams = teams.filter(
          (team) =>
            team &&
            team.captain &&
            team.captain === user.name
        )

        const result = []

        for (
          const tournament of
          tournamentData.tournaments || []
        ) {
          try {
            const response = await fetch(
              `http://127.0.0.1:8000/api/tournaments/${tournament.id}/teams`
            )

            if (!response.ok) {
              continue
            }

            const data = await response.json()

            for (
              const registeredTeam of
              data.teams || []
            ) {
              const myTeam = myTeams.find(
                (team) =>
                  String(team.id) ===
                  String(registeredTeam.team_id)
              )

              if (myTeam) {
                result.push({
                  tournament,
                  team: myTeam,
                  status:
                    registeredTeam.status || '대기'
                })
              }
            }
          } catch (error) {
            console.error(
              '참가 신청 정보를 불러오지 못했습니다.',
              error
            )
          }
        }

        setApplications(result)
      } catch (error) {
        console.error(
          '참가 신청 현황을 불러오지 못했습니다.',
          error
        )

        setApplications([])
      }
    }

    getApplications()
  }, [user, teams])

  const getStatusClass = (status) => {
    if (status === '승인') {
      return 'status approved'
    }

    if (status === '거절') {
      return 'status rejected'
    }

    return 'status pending'
  }

  const supportedGames = [
    'League of Legends',
    'Valorant',
    'PUBG',
    'Overwatch 2',
    'World of Tanks',
    '기타'
  ]
  const teamGames = [...new Set([
    ...supportedGames,
    ...teams.map((team) => team.game || '기타')
  ])]
  const applicationGames = [...new Set([
    ...supportedGames,
    ...applications.map((application) => application.team?.game || '기타')
  ])]

  const normalizedTeamSearchQuery = teamSearchQuery.trim().toLocaleLowerCase()
  const normalizedApplicationSearchQuery = applicationSearchQuery
    .trim()
    .toLocaleLowerCase()
  const visibleTeams = teams.filter((team) => {
    const matchesGame =
      teamGameFilter === '전체 게임' ||
      (team.game || '기타') === teamGameFilter
    const matchesSearch =
      !normalizedTeamSearchQuery ||
      (team.name || '').toLocaleLowerCase().includes(normalizedTeamSearchQuery)

    return matchesGame && matchesSearch
  })

  const activeApplications = applications.filter(
    (application) => application.tournament?.status !== '종료'
  )
  const completedApplications = applications.filter(
    (application) => application.tournament?.status === '종료'
  )

  const filterApplicationsByGame = (items) =>
    items.filter((application) => {
      const matchesGame =
        applicationGameFilter === '전체 게임' ||
        (application.team?.game || '기타') === applicationGameFilter
      const matchesSearch =
        !normalizedApplicationSearchQuery ||
        (application.team?.name || '')
          .toLocaleLowerCase()
          .includes(normalizedApplicationSearchQuery)

      return matchesGame && matchesSearch
    })

  const visibleActiveApplications = filterApplicationsByGame(activeApplications)
  const visibleCompletedApplications = filterApplicationsByGame(completedApplications)

  const renderApplicationCards = (items) => (
    <div className="team-grid">
      {items.map((application, index) => (
        <article
          className="team-card"
          key={
            application.tournament?.id && application.team?.id
              ? `${application.tournament.id}-${application.team.id}`
              : index
          }
        >
          <span className="team-game">
            {application.team?.game || '기타'}
          </span>

          <h3>{application.tournament?.name || '대회'}</h3>

          <p>신청 팀: {application.team?.name || '팀'}</p>

          <p>
            대회 기간: {application.tournament?.start_date || '-'} ~{' '}
            {application.tournament?.end_date || '-'}
          </p>

          <p>
            신청 상태:{' '}
            <span className={getStatusClass(application.status)}>
              {application.status || '대기'}
            </span>
          </p>

          {application.tournament?.id && (
            <Link
              to={`/tournaments/${application.tournament.id}`}
              className="secondary-button"
            >
              대회 상세보기
            </Link>
          )}
        </article>
      ))}
    </div>
  )

  const handleTeamAction = async (team, memberName, action) => {
    if (!user) {
      alert('로그인 후 이용해주세요.')
      return
    }

    const isExpulsion = action === 'expel'
    const confirmation = isExpulsion
      ? `${memberName}님을 ${team.name} 팀에서 추방할까요?`
      : `${team.name} 팀에서 탈퇴할까요?`

    if (!window.confirm(confirmation)) {
      return
    }

    const url = isExpulsion
      ? `http://127.0.0.1:8000/api/teams/${team.id}/members/${encodeURIComponent(memberName)}`
      : `http://127.0.0.1:8000/api/teams/${team.id}/leave`
    const requestBody = isExpulsion
      ? { captain_name: user.name }
      : { member_name: user.name }

    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.detail || data.message || '팀 변경에 실패했습니다.'
        )
      }

      setTeams((currentTeams) =>
        currentTeams.map((currentTeam) =>
          currentTeam.id === team.id
            ? data.team
            : currentTeam
        )
      )
      alert(data.message)
    } catch (error) {
      alert(error.message || '서버에 연결할 수 없습니다.')
    }
  }

  const handleJoinTeam = async (team) => {
    if (!user) {
      alert('팀에 가입하려면 먼저 로그인해주세요.')
      return
    }

    if (!window.confirm(`${team.name} 팀에 가입 신청을 보낼까요?`)) {
      return
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/teams/${team.id}/join-requests`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ applicant_name: user.name })
        }
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || data.message || '가입 신청에 실패했습니다.')
      }

      setMyTeamJoinRequests((currentRequests) => [
        ...currentRequests.filter(
          (application) => application.team_id !== team.id
        ),
        data.application
      ])
      alert(data.message)
    } catch (error) {
      alert(error.message || '서버에 연결할 수 없습니다.')
    }
  }

  const handleApproveJoinRequest = async (team, application) => {
    if (!user) {
      return
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/teams/${team.id}/join-requests/${application.id}/approve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ captain_name: user.name })
        }
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || data.message || '가입 승인에 실패했습니다.')
      }

      setTeams((currentTeams) =>
        currentTeams.map((currentTeam) =>
          currentTeam.id === team.id ? data.team : currentTeam
        )
      )
      setPendingJoinRequests((currentRequests) => ({
        ...currentRequests,
        [team.id]: (currentRequests[team.id] || []).filter(
          (item) => item.id !== application.id
        )
      }))
      alert(data.message)
    } catch (error) {
      alert(error.message || '서버에 연결할 수 없습니다.')
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="page-subtitle">
            {isMyPage ? 'MY PAGE' : 'TEAM'}
          </p>

          <h1>{isMyPage ? '마이페이지' : '팀'}</h1>

          <p>
            {isMyPage
              ? `${user?.name || '회원'}님의 대회 참가 신청과 완료 기록입니다.`
              : '게임별 등록 팀과 팀 정보를 확인할 수 있습니다.'}
          </p>
        </div>

        {!isMyPage && (
          <Link to="/teams/create" className="primary-button">
            팀 만들기
          </Link>
        )}
      </header>

      <section className="team-section team-list-only">
        {!isMyPage && (
        <div className="team-list-card">
          <div className="section-title">
            <div>
              <p>TEAM LIST</p>

              <h2>등록된 팀</h2>
            </div>
            <div className="team-list-controls">
              <input
                className="team-search-input"
                type="search"
                aria-label="팀 이름 검색"
                placeholder="팀 이름 검색"
                value={teamSearchQuery}
                onChange={(event) => setTeamSearchQuery(event.target.value)}
              />
              <button
                className="team-game-filter-button"
                type="button"
                onClick={() => setGamePicker('teams')}
              >
                {teamGameFilter === '전체 게임' ? '게임 선택' : teamGameFilter} ▾
              </button>
            </div>
          </div>

          {teams.length > 0 ? (
            visibleTeams.length > 0 ? (
              <div className="team-grid">
                {visibleTeams.map((team, index) => {
                const teamMembers =
                  Array.isArray(team.members)
                    ? team.members
                    : []
                const isCaptain = user?.name === team.captain
                const isTeamMember = teamMembers.includes(user?.name)
                const myJoinRequest = myTeamJoinRequests.find(
                  (application) => application.team_id === team.id
                )
                const teamRequests = pendingJoinRequests[team.id] || []

                return (
                  <article
                    className="team-card"
                    key={team.id || index}
                  >
                    <span className="team-game">
                      {team.game || '기타'}
                    </span>

                    <h3>
                      {team.name ||
                        '이름 없는 팀'}
                    </h3>

                    <p>
                      주장{' '}
                      {team.captain ||
                        '미등록'}
                    </p>

                    <div className="team-member-heading">
                      <strong>팀원 {teamMembers.length}명</strong>
                    </div>
                    <div className="team-member-list">
                      {teamMembers.map((member, memberIndex) => (
                        <div
                          className="team-member-row"
                          key={`${member}-${memberIndex}`}
                        >
                          <span>{member}</span>
                          {user &&
                            team.captain === user.name &&
                            member !== team.captain && (
                              <button
                                className="team-member-action"
                                type="button"
                                onClick={() =>
                                  handleTeamAction(team, member, 'expel')
                                }
                              >
                                추방
                              </button>
                            )}
                          {user &&
                            user.name === member &&
                            user.name !== team.captain && (
                              <button
                                className="team-member-action"
                                type="button"
                                onClick={() =>
                                  handleTeamAction(team, member, 'leave')
                                }
                              >
                                팀 탈퇴
                              </button>
                            )}
                        </div>
                      ))}
                    </div>

                    {isCaptain && teamRequests.length > 0 && (
                      <div className="team-join-requests">
                        <strong>팀 가입 신청 {teamRequests.length}건</strong>
                        {teamRequests.map((application) => (
                          <div
                            className="team-member-row"
                            key={application.id}
                          >
                            <span>{application.applicant_name}</span>
                            <button
                              className="team-member-action"
                              type="button"
                              onClick={() =>
                                handleApproveJoinRequest(team, application)
                              }
                            >
                              승인
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {user && !isCaptain && !isTeamMember && (
                      <div className="team-join-action">
                        {myJoinRequest?.status === '대기' ? (
                          <span className="team-join-pending">
                            승인 대기 중
                          </span>
                        ) : (
                          <button
                            className="team-member-action"
                            type="button"
                            onClick={() => handleJoinTeam(team)}
                          >
                            팀 가입
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                )
              })}
              </div>
            ) : (
              <div className="empty-tournament">
                <p>검색 또는 게임 조건에 맞는 팀이 없습니다.</p>
              </div>
            )
          ) : (
            <div className="empty-tournament">
              <p>
                현재 등록된 팀이 없습니다.
              </p>
            </div>
          )}
        </div>
        )}

        {isMyPage && (
        <>
        <div className="team-list-card">
          <div className="section-title">
            <div>
              <p>MY APPLICATIONS</p>

              <h2>내 참가 신청 현황</h2>
            </div>
            <div className="team-list-controls">
              <input
                className="team-search-input"
                type="search"
                aria-label="참가 신청 팀 검색"
                placeholder="팀 이름 검색"
                value={applicationSearchQuery}
                onChange={(event) => setApplicationSearchQuery(event.target.value)}
              />
              <button
                className="team-game-filter-button"
                type="button"
                onClick={() => setGamePicker('applications')}
              >
                {applicationGameFilter === '전체 게임'
                  ? '게임 선택'
                  : applicationGameFilter} ▾
              </button>
            </div>
          </div>

          {!user ? (
            <div className="empty-tournament">
              <p>
                로그인하면 참가 신청 현황을
                확인할 수 있습니다.
              </p>
            </div>
          ) : visibleActiveApplications.length > 0 ? (
            renderApplicationCards(visibleActiveApplications)
          ) : (
            <div className="empty-tournament">
              <p>
                검색 조건에 맞는 진행 중인 참가 신청이 없습니다.
              </p>
            </div>
          )}
        </div>

        <div className="team-list-card">
          <div className="section-title">
            <div>
              <p>COMPLETED TOURNAMENTS</p>
              <h2>완료한 대회</h2>
            </div>
          </div>

          {!user ? (
            <div className="empty-tournament">
              <p>로그인하면 완료한 대회를 확인할 수 있습니다.</p>
            </div>
          ) : completedApplications.length > 0 ? (
            visibleCompletedApplications.length > 0 ? (
              renderApplicationCards(visibleCompletedApplications)
            ) : (
              <div className="empty-tournament">
                <p>검색 조건에 맞는 완료한 대회가 없습니다.</p>
              </div>
            )
          ) : (
            <div className="empty-tournament">
              <p>완료한 대회가 없습니다.</p>
            </div>
          )}
        </div>
        </>
        )}
      </section>

      {gamePicker && (
        <div
          className="team-game-picker-overlay"
          onClick={() => setGamePicker(null)}
        >
          <div
            className="team-game-picker-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-game-picker-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="team-game-picker-header">
              <h2 id="team-game-picker-title">게임 선택</h2>
              <button
                className="team-game-picker-close"
                type="button"
                aria-label="닫기"
                onClick={() => setGamePicker(null)}
              >
                ×
              </button>
            </div>

            <div className="team-game-picker-options">
              {[
                '전체 게임',
                ...(gamePicker === 'teams' ? teamGames : applicationGames)
              ].map((game) => {
                const selectedGame = gamePicker === 'teams'
                  ? teamGameFilter
                  : applicationGameFilter

                return (
                  <button
                    className={
                      selectedGame === game
                        ? 'team-game-picker-option selected'
                        : 'team-game-picker-option'
                    }
                    type="button"
                    key={game}
                    onClick={() => {
                      if (gamePicker === 'teams') {
                        setTeamGameFilter(game)
                      } else {
                        setApplicationGameFilter(game)
                      }

                      setGamePicker(null)
                    }}
                  >
                    {game}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Team
