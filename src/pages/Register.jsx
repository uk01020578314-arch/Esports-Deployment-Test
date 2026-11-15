import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '../Auth.css'

function Register() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')

  const handleRegister = async (event) => {
  event.preventDefault()

  if (password !== passwordConfirm) {
    alert('비밀번호가 일치하지 않습니다.')
    return
  }

  try {
    const response = await fetch('http://127.0.0.1:8000/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        email,
        password
      })
    })

    const data = await response.json()
if (!response.ok) {
  alert('회원가입에 실패했습니다.')
  return
}

if (data.message !== '회원가입 성공') {
  alert(data.message)
  return
}

alert(data.message)
navigate('/login')
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

        <p className="gaming-auth-subtitle">CREATE YOUR ACCOUNT</p>
        <h1>회원가입</h1>
        <p className="gaming-auth-description">
          대학생 E스포츠 대회의 새로운 시작
        </p>

        <form onSubmit={handleRegister} className="gaming-auth-form">
          <div className="gaming-field">
            <label>이름</label>
            <input
              type="text"
              placeholder="이름을 입력하세요"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="gaming-field">
            <label>이메일</label>
            <input
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="gaming-field">
            <label>비밀번호</label>
            <input
              type="password"
              placeholder="비밀번호를 입력하세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="gaming-field">
            <label>비밀번호 확인</label>
            <input
              type="password"
              placeholder="비밀번호를 다시 입력하세요"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="gaming-primary-button">
            회원가입
          </button>
        </form>

        <div className="gaming-auth-footer">
          <span>이미 계정이 있으신가요?</span>
          <Link to="/login">로그인</Link>
        </div>

        <Link to="/" className="gaming-home-link">
          메인으로 돌아가기
        </Link>
      </section>
    </main>
  )
}

export default Register
