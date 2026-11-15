import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import '../App.css'

function TournamentManage() {
  const { tournamentId } = useParams()
  const navigate = useNavigate()

  const [tournament, setTournament] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [changingStatus, setChangingStatus] = useState(false)

  const [form, setForm] = useState({
    name: '',
    game: '',
    description: '',
    start_date: '',
    end_date: '',
    max_participants: '',
    status: '모집중'
  })

  const user = JSON.parse(
    localStorage.getItem('esports_user')
  )

  useEffect(() => {
    const getTournament = async () => {
      try {
        const response = await fetch(
          'http://127.0.0.1:8000/api/tournaments'
        )

        if (!response.ok) {
          throw new Error('대회 정보를 불러오지 못했습니다.')
        }

        const data = await response.json()

        const found = data.tournaments.find(
          (item) =>
            String(item.id) === String(tournamentId)
        )

        if (found) {
          setTournament(found)

          setForm({
            name: found.name || '',
            game: found.game || '',
            description: found.description || '',
            start_date: found.start_date || '',
            end_date: found.end_date || '',
            max_participants: found.max_participants || '',
            status: found.status || '모집중'
          })
        }
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    getTournament()
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

  const updateForm = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value
    }))
  }

  const updateTournament = async (newStatus = null) => {
    if (!canManage()) {
      alert('이 대회를 관리할 권한이 없습니다.')
      return
    }

    const statusToSave =
      newStatus !== null ? newStatus : form.status

    if (!form.name || !form.start_date || !form.end_date) {
      alert('필수 정보를 입력해주세요.')
      return
    }

    try {
      if (newStatus !== null) {
        setChangingStatus(true)
      }

      const response = await fetch(
        `http://127.0.0.1:8000/api/tournaments/${tournamentId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: form.name,
            game: form.game,
            description: form.description,
            start_date: form.start_date,
            end_date: form.end_date,
            max_participants: Number(form.max_participants),
            status: statusToSave,
            user_email: user.email,
            user_role: user.role
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        alert(
          data.detail ||
            '대회 수정에 실패했습니다.'
        )
        return
      }

      setTournament(data.tournament)

      setForm({
        name: data.tournament.name || '',
        game: data.tournament.game || '',
        description: data.tournament.description || '',
        start_date: data.tournament.start_date || '',
        end_date: data.tournament.end_date || '',
        max_participants:
          data.tournament.max_participants || '',
        status:
          data.tournament.status || '모집중'
      })

      setEditing(false)

      if (newStatus !== null) {
        alert(
          `대회 상태가 "${statusToSave}"로 변경되었습니다.`
        )
      } else {
        alert('대회 정보가 수정되었습니다.')
      }
    } catch (error) {
      console.error(error)

      if (newStatus !== null) {
        alert('대회 상태 변경 중 오류가 발생했습니다.')
      } else {
        alert('대회 수정 중 오류가 발생했습니다.')
      }
    } finally {
      setChangingStatus(false)
    }
  }

  const handleStatusChange = (status) => {
    if (status === tournament.status) {
      return
    }

    const message =
      status === '종료'
        ? '대회를 종료하시겠습니까?\n종료 후에는 참가 신청을 받을 수 없습니다.'
        : `대회 상태를 "${status}"로 변경하시겠습니까?`

    const confirmed = window.confirm(message)

    if (!confirmed) {
      return
    }

    setForm((current) => ({
      ...current,
      status
    }))

    updateTournament(status)
  }

  const handleUpdate = async () => {
    await updateTournament()
  }

  const handleDelete = async () => {
    if (!canManage()) {
      alert('이 대회를 관리할 권한이 없습니다.')
      return
    }

    const confirmed = window.confirm(
      '정말 이 대회를 삭제하시겠습니까?'
    )

    if (!confirmed) {
      return
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/tournaments/${tournamentId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_email: user.email,
            user_role: user.role
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        alert(
          data.detail ||
            '대회 삭제에 실패했습니다.'
        )
        return
      }

      alert('대회가 삭제되었습니다.')
      navigate('/tournaments')
    } catch (error) {
      console.error(error)
      alert('대회 삭제 중 오류가 발생했습니다.')
    }
  }

  const getStatusClass = (status) => {
    if (status === '모집중') {
      return 'tournament-status recruiting'
    }

    if (status === '진행중') {
      return 'tournament-status ongoing'
    }

    if (status === '종료') {
      return 'tournament-status ended'
    }

    return 'tournament-status recruiting'
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

  if (!canManage()) {
    return (
      <div className="page">
        <header className="page-header">
          <div>
            <p className="page-subtitle">
              TOURNAMENT MANAGEMENT
            </p>

            <h1>접근 권한 없음</h1>

            <p>
              이 대회를 관리할 권한이 없습니다.
            </p>
          </div>
        </header>

        <Link
          to="/tournaments"
          className="primary-button"
        >
          대회 목록으로
        </Link>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="page-subtitle">
            TOURNAMENT MANAGEMENT
          </p>

          <h1>대회 관리</h1>

          <p>
            생성한 대회의 정보와 진행 상태를 관리할 수 있습니다.
          </p>
        </div>

        <Link
          to="/tournaments"
          className="secondary-button"
        >
          대회 목록
        </Link>
      </header>

      <section className="form-card">

        {!editing ? (
          <>
            <h2>{tournament.name}</h2>

            <div className="manage-status-box">
              <div className="manage-status-header">
                <div>
                  <p className="manage-status-label">
                    CURRENT STATUS
                  </p>

                  <h3>현재 대회 상태</h3>
                </div>

                <span
                  className={getStatusClass(
                    tournament.status
                  )}
                >
                  {tournament.status || '모집중'}
                </span>
              </div>

              <div className="status-change-buttons">
                <button
                  type="button"
                  className={`status-change-button recruiting ${
                    tournament.status === '모집중'
                      ? 'active'
                      : ''
                  }`}
                  disabled={changingStatus}
                  onClick={() =>
                    handleStatusChange('모집중')
                  }
                >
                  <span className="status-dot" />
                  모집중
                </button>

                <button
                  type="button"
                  className={`status-change-button ongoing ${
                    tournament.status === '진행중'
                      ? 'active'
                      : ''
                  }`}
                  disabled={changingStatus}
                  onClick={() =>
                    handleStatusChange('진행중')
                  }
                >
                  <span className="status-dot" />
                  진행중
                </button>

                <button
                  type="button"
                  className={`status-change-button ended ${
                    tournament.status === '종료'
                      ? 'active'
                      : ''
                  }`}
                  disabled={changingStatus}
                  onClick={() =>
                    handleStatusChange('종료')
                  }
                >
                  <span className="status-dot" />
                  종료
                </button>
              </div>

              <p className="status-help">
                상태를 선택하면 대회 목록과 참가 신청 화면에
                바로 반영됩니다.
              </p>
            </div>

            <div className="card-info">
              <span>{tournament.game}</span>

              <span>
                최대 {tournament.max_participants}명
              </span>
            </div>

            <p>
              {tournament.description ||
                '대회 설명이 없습니다.'}
            </p>

            <div className="tournament-date">
              대회 {tournament.start_date} ~{' '}
              {tournament.end_date}
            </div>

            <div className="manage-button-area">
              <button
                className="primary-button"
                onClick={() => setEditing(true)}
              >
                대회 정보 수정
              </button>

              <Link
                to={`/tournaments/${tournamentId}/teams`}
                className="secondary-button"
              >
                참가 팀 관리
              </Link>

              <Link
                to={`/bracket?tournament=${tournamentId}`}
                className="secondary-button"
              >
                대진표 관리
              </Link>
            </div>

            <div className="manage-danger-area">
              <button
                className="delete-button"
                onClick={handleDelete}
              >
                대회 삭제
              </button>
            </div>
          </>
        ) : (
          <>
            <h2>대회 정보 수정</h2>

            <div className="form-group">
              <label>대회 이름 *</label>

              <input
                value={form.name}
                onChange={(e) =>
                  updateForm(
                    'name',
                    e.target.value
                  )
                }
              />
            </div>

            <div className="form-group">
              <label>게임 *</label>

              <select
                value={form.game}
                onChange={(e) =>
                  updateForm(
                    'game',
                    e.target.value
                  )
                }
              >
                <option>
                  League of Legends
                </option>

                <option>
                  Valorant
                </option>

                <option>
                  PUBG
                </option>

                <option>
                  Overwatch 2
                </option>

                <option>
                  World of Tanks
                </option>

                <option>
                  기타
                </option>
              </select>
            </div>

            <div className="form-group">
              <label>대회 설명</label>

              <textarea
                value={form.description}
                onChange={(e) =>
                  updateForm(
                    'description',
                    e.target.value
                  )
                }
              />
            </div>

            <div className="form-group">
              <label>대회 시작일 *</label>

              <input
                type="date"
                value={form.start_date}
                onChange={(e) =>
                  updateForm(
                    'start_date',
                    e.target.value
                  )
                }
              />
            </div>

            <div className="form-group">
              <label>대회 종료일 *</label>

              <input
                type="date"
                value={form.end_date}
                onChange={(e) =>
                  updateForm(
                    'end_date',
                    e.target.value
                  )
                }
              />
            </div>

            <div className="form-group">
              <label>최대 참가 인원</label>

              <input
                type="number"
                min="1"
                value={form.max_participants}
                onChange={(e) =>
                  updateForm(
                    'max_participants',
                    e.target.value
                  )
                }
              />
            </div>

            <div className="form-group">
              <label>대회 상태</label>

              <select
                value={form.status}
                onChange={(e) =>
                  updateForm(
                    'status',
                    e.target.value
                  )
                }
              >
                <option value="모집중">
                  모집중
                </option>

                <option value="진행중">
                  진행중
                </option>

                <option value="종료">
                  종료
                </option>
              </select>
            </div>

            <div className="form-buttons">
              <button
                className="primary-button"
                onClick={handleUpdate}
              >
                저장
              </button>

              <button
                className="secondary-button"
                onClick={() =>
                  setEditing(false)
                }
              >
                취소
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

export default TournamentManage
