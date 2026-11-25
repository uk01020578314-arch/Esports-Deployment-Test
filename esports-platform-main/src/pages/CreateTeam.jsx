import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '../App.css'

function CreateTeam({ user }) {
  const [name, setName] = useState('')
  const [game, setGame] = useState('League of Legends')
  const [members, setMembers] = useState('')
  const navigate = useNavigate()

  const createTeam = async (event) => {
    event.preventDefault()

    if (!user) {
      alert('팀을 만들려면 먼저 로그인해주세요.')
      return
    }

    if (!name.trim()) {
      alert('팀 이름을 입력해주세요.')
      return
    }

    const memberList = members
      ? members
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : []

    const team = {
      name: name.trim(),
      game,
      members: memberList,
      captain: user.name
    }

    try {
      const response = await fetch(
        'http://127.0.0.1:8000/api/teams',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(team)
        }
      )

      const data = await response.json()

      if (!response.ok) {
        alert(data.message || '팀 생성에 실패했습니다.')
        return
      }

      alert(data.message || '팀이 생성되었습니다.')
      navigate('/teams')
    } catch (error) {
      console.error(error)
      alert('서버에 연결할 수 없습니다.')
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="page-subtitle">TEAM</p>
          <h1>팀 만들기</h1>
          <p>대회에 참가할 팀 정보를 입력해주세요.</p>
        </div>

        <Link to="/teams" className="secondary-button">
          팀 목록
        </Link>
      </header>

      <section className="team-section team-create-only">
        <div className="team-create-card">
          <h2>새 팀 정보</h2>

          <form onSubmit={createTeam}>
            <div className="form-group">
              <label htmlFor="team-name">팀 이름</label>
              <input
                id="team-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="팀 이름을 입력하세요"
              />
            </div>

            <div className="form-group">
              <label htmlFor="team-game">게임</label>
              <select
                id="team-game"
                value={game}
                onChange={(event) => setGame(event.target.value)}
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
              <label htmlFor="team-members">팀원</label>
              <input
                id="team-members"
                value={members}
                onChange={(event) => setMembers(event.target.value)}
                placeholder="쉼표로 구분해 입력하세요"
              />
            </div>

            <button className="primary-button" type="submit">
              팀 생성
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}

export default CreateTeam
