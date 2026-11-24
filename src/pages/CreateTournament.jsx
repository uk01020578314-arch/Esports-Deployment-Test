import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { tournamentService } from '../services/tournamentService'
import '../App.css'

function CreateTournament({ user }) {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '',
    game: 'League of Legends',
    description: '',
    recruitStart: '',
    recruitEnd: '',
    tournamentStart: '',
    tournamentEnd: '',
    teamSize: 5
  })

  const update = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!user) {
      alert('대회를 만들려면 먼저 로그인해주세요.')
      navigate('/login')
      return
    }

    if (!form.name || !form.recruitStart || !form.recruitEnd || !form.tournamentStart || !form.tournamentEnd) {
      alert('필수 정보를 입력해주세요.')
      return
    }

    try {
      await tournamentService.create({
        name: form.name,
        game: form.game,
        description: form.description,
        start_date: form.tournamentStart,
        end_date: form.tournamentEnd,
        max_participants: Number(form.teamSize),
        creator_email: user.email
      })

      alert('대회가 생성되었습니다.')
      navigate('/tournaments')
    } catch (error) {
      alert('대회 생성에 실패했습니다.')
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="page-subtitle">TOURNAMENT</p>
          <h1>대회 만들기</h1>
          <p>새로운 E스포츠 대회를 생성할 수 있습니다.</p>
        </div>
      </header>

      <section className="create-tournament-section">
        <form className="form-card" onSubmit={handleSubmit}>
          <h2>대회 기본 정보</h2>

          <div className="form-group">
            <label>대회 이름 *</label>
            <input
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="대회 이름을 입력하세요."
            />
          </div>

          <div className="form-group">
            <label>게임 *</label>
            <select
              value={form.game}
              onChange={(e) => update('game', e.target.value)}
            >
              <option>League of Legends</option>
              <option>Valorant</option>
              <option>PUBG</option>
              <option>Overwatch 2</option>
              <option>World of Tanks</option>
              <option>기타</option>
            </select>
          </div>

          <div className="form-group">
            <label>대회 설명</label>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="대회에 대한 설명을 입력하세요."
            />
          </div>

          <div className="form-group">
            <label>모집 기간 *</label>
            <div className="date-group">
              <input
                type="date"
                value={form.recruitStart}
                onChange={(e) => update('recruitStart', e.target.value)}
              />
              <span>~</span>
              <input
                type="date"
                value={form.recruitEnd}
                onChange={(e) => update('recruitEnd', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>대회 기간 *</label>
            <div className="date-group">
              <input
                type="date"
                value={form.tournamentStart}
                onChange={(e) => update('tournamentStart', e.target.value)}
              />
              <span>~</span>
              <input
                type="date"
                value={form.tournamentEnd}
                onChange={(e) => update('tournamentEnd', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>팀당 참가 인원</label>
            <div className="number-input">
              <input
                type="number"
                min="1"
                value={form.teamSize}
                onChange={(e) => update('teamSize', e.target.value)}
              />
              <span>명</span>
            </div>
          </div>

          <div className="form-buttons">
            <Link to="/tournaments" className="cancel-button">
              취소
            </Link>

            <button className="primary-button" type="submit">
              대회 생성
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default CreateTournament
