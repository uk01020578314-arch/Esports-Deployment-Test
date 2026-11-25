import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'

function Header({ user, onLogout }) {
  const [activeMenu, setActiveMenu] = useState(null)
  const navigate = useNavigate()

  const handleLogout = () => {
    authService.logout()
    onLogout()
    navigate('/')
  }

  return (
    <div
      className="header-menu-area"
      onMouseLeave={() => setActiveMenu(null)}
    >
      <header className="header">
        <Link to="/" className="logo">ACHI</Link>

        <nav>
          <div
            className="nav-item"
            onMouseEnter={() => setActiveMenu('tournament')}
          >
            대회
          </div>

          <div
            className="nav-item"
            onMouseEnter={() => setActiveMenu('team')}
          >
            팀
          </div>

          <div
            className="nav-item"
            onMouseEnter={() => setActiveMenu('schedule')}
          >
            일정
          </div>

          <div
            className="nav-item"
            onMouseEnter={() => setActiveMenu('result')}
          >
            결과
          </div>

          <a
            className="nav-item"
            href="https://op.gg/ko"
            target="_blank"
            rel="noopener noreferrer"
          >
            전적 검색
          </a>

          <div
            className="nav-item ai-highlight-nav"
            role="button"
            tabIndex={0}
            aria-haspopup="true"
            aria-expanded={activeMenu === 'highlight'}
            onMouseEnter={() => setActiveMenu('highlight')}
            onClick={() => setActiveMenu('highlight')}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                setActiveMenu('highlight')
              }
            }}
          >
            AI 하이라이트
          </div>
        </nav>

        {user ? (
          <div className="header-user">
            <Link to="/mypage" className="header-account-link">
              {user.name}님
            </Link>

            <button
              className="login-button"
              onClick={handleLogout}
            >
              로그아웃
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="login-button"
          >
            로그인
          </Link>
        )}
      </header>

      {activeMenu && (
        <div className="mega-menu">
          <div className="mega-menu-inner">

            {activeMenu === 'tournament' && (
              <div className="mega-menu-column">
                <h3>대회</h3>
                <Link to="/tournaments">
                  대회 목록
                </Link>
                <Link to="/tournaments/create">
                  대회 만들기
                </Link>
              </div>
            )}

            {activeMenu === 'team' && (
              <div className="mega-menu-column">
                <h3>팀</h3>
                <Link to="/teams">
                  팀 목록
                </Link>
                <Link to="/teams/create">
                  팀 만들기
                </Link>
              </div>
            )}

            {activeMenu === 'schedule' && (
              <div className="mega-menu-column">
                <h3>일정</h3>
                <Link to="/schedule">
                  경기 일정
                </Link>
              </div>
            )}

            {activeMenu === 'result' && (
              <div className="mega-menu-column">
                <h3>결과</h3>
                <Link to="/results">
                  경기 결과
                </Link>
              </div>
            )}

            {activeMenu === 'highlight' && (
              <div className="mega-menu-column">
                <h3>AI 하이라이트</h3>
                <Link to="/ai-highlight" onClick={() => setActiveMenu(null)}>하이라이트 생성</Link>
                <Link to="/ai-highlight/community" onClick={() => setActiveMenu(null)}>커뮤니티</Link>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  )
}

export default Header
