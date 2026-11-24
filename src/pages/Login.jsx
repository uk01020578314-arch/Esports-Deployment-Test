import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authService } from '../services/authService'
import '../Auth.css'

function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!email || !password) {
      alert('이메일과 비밀번호를 입력해주세요.')
      return
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password
        })
      })

      const data = await response.json()

      if (data.message !== '로그인 성공') {
        alert(data.message)
        return
      }

      alert(data.message)
      onLogin(data.user)
      navigate('/')
    } catch (error) {
      alert('서버에 연결할 수 없습니다.')
    }
  }

  return (
    <main className="gaming-auth-page">
      <div className="gaming-auth-background">
        <span className="gaming-orb orb-one"></span>
        <span className="gaming-orb orb-two"></span>
        <span className="gaming-grid"></span>
      </div>

      <section className="gaming-auth-card">
        <div className="gaming-auth-logo">
          ACHI<span>.GG</span>
        </div>

        <p className="gaming-auth-subtitle">WELCOME BACK</p>
        <h1>로그인</h1>
        <p className="gaming-auth-description">
          E스포츠 대회와 팀 관리를 시작해보세요
        </p>

        <form onSubmit={handleSubmit} className="gaming-auth-form">
          <div className="gaming-field">
            <label>이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
            />
          </div>

          <div className="gaming-field">
            <label>비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              required
            />
          </div>

          <button type="submit" className="gaming-primary-button">
            로그인
          </button>
        </form>

        <Link to="/register" className="gaming-secondary-button">
          회원가입
        </Link>

        <Link to="/" className="gaming-home-link">
          메인으로 돌아가기
        </Link>
      </section>
    </main>
  )
}

export default Login