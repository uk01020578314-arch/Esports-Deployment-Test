import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '../Auth.css'

function AdminSetup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [setupKey, setSetupKey] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (password !== passwordConfirm) {
      alert('비밀번호가 일치하지 않습니다.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(
        'http://127.0.0.1:8000/api/admin/setup',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name,
            email,
            password,
            setup_key: setupKey
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        alert(data.detail || '관리자 계정 설정에 실패했습니다.')
        return
      }

      alert(data.message)
      navigate('/login')
    } catch (error) {
      console.error(error)
      alert('서버에 연결할 수 없습니다.')
    } finally {
      setIsSubmitting(false)
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

        <p className="gaming-auth-subtitle">INITIAL ADMIN SETUP</p>
        <h1>관리자 계정 설정</h1>
        <p className="gaming-auth-description">
          초기 설정 키로 관리자 계정을 한 번 설정합니다. 기존 관리자 정보 갱신, 일반 계정 승격 또는 새 관리자 생성을 할 수 있습니다.
        </p>

        <form onSubmit={handleSubmit} className="gaming-auth-form">
          <div className="gaming-field">
            <label htmlFor="admin-name">이름</label>
            <input
              id="admin-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>

          <div className="gaming-field">
            <label htmlFor="admin-email">이메일</label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="gaming-field">
            <label htmlFor="admin-password">비밀번호</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              autoComplete="new-password"
              required
            />
          </div>

          <div className="gaming-field">
            <label htmlFor="admin-password-confirm">비밀번호 확인</label>
            <input
              id="admin-password-confirm"
              type="password"
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
              minLength={8}
              autoComplete="new-password"
              required
            />
          </div>

          <div className="gaming-field">
            <label htmlFor="admin-setup-key">초기 설정 키</label>
            <input
              id="admin-setup-key"
              type="password"
              value={setupKey}
              onChange={(event) => setSetupKey(event.target.value)}
              autoComplete="off"
              required
            />
          </div>

          <button
            type="submit"
            className="gaming-primary-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? '설정 중...' : '관리자 계정 설정'}
          </button>
        </form>

        <Link to="/login" className="gaming-home-link">
          로그인으로 돌아가기
        </Link>
      </section>
    </main>
  )
}

export default AdminSetup
