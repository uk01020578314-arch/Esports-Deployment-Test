import { useState, useEffect } from 'react'
import { Navigate, Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/Header'
import Home from './pages/Home'
import Tournament from './pages/Tournament'
import CreateTournament from './pages/CreateTournament'
import Team from './pages/Team'
import CreateTeam from './pages/CreateTeam'
import Schedule from './pages/Schedule'
import Results from './pages/Results'
import Login from './pages/Login'
import Register from './pages/Register'
import AdminSetup from './pages/AdminSetup'
import './App.css'
import FastApiTest from './pages/FastApiTest'
import Matches from './pages/Matches'
import CreateMatch from './pages/CreateMatch'
import Bracket from './pages/Bracket'
import TournamentDetail from './pages/TournamentDetail'
import TournamentManage from './pages/TournamentManage'
import TournamentTeamsManage from './pages/TournamentTeamsManage'
import AIHighlight from './pages/AIHighlight'
import AIHighlightCommunity from './pages/AIHighlightCommunity'
import AIHighlightVideoDetail from './pages/AIHighlightVideoDetail'

function App() {
  const location = useLocation()
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('achi_theme') || 'dark'
  })

  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('esports_user')
    return saved ? JSON.parse(saved) : null
  })

  useEffect(() => {
    if (user) {
      localStorage.setItem('esports_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('esports_user')
    }
  }, [user])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('achi_theme', theme)
  }, [theme])

  return (
    <>
      <Header
        user={user}
        onLogout={() => setUser(null)}
      />

      <button
        className="theme-toggle"
        type="button"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      <Routes>
        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/tournaments"
          element={<Tournament />}
        />

        <Route
          path="/tournaments/create"
          element={<CreateTournament user={user} />}
        />

        <Route
          path="/tournaments/:tournamentId/manage"
          element={<TournamentManage />}
        />

        <Route
          path="/tournaments/:tournamentId/teams"
          element={<TournamentTeamsManage />}
        />

        <Route
          path="/tournaments/:id"
          element={<TournamentDetail />}
        />

        <Route
          path="/teams"
          element={<Team user={user} />}
        />

        <Route
          path="/mypage"
          element={
            user
              ? <Team user={user} view="mypage" />
              : <Navigate to="/login" replace />
          }
        />

        <Route
          path="/teams/create"
          element={<CreateTeam user={user} />}
        />

        <Route
          path="/schedule"
          element={<Schedule />}
        />

        <Route
          path="/results"
          element={<Results />}
        />

        <Route
          path="/matches"
          element={<Matches />}
        />

        <Route
          path="/matches/create"
          element={<CreateMatch />}
        />

        <Route
          path="/bracket"
          element={<Bracket />}
        />

        <Route
          path="/login"
          element={<Login onLogin={setUser} />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/admin-setup"
          element={<AdminSetup />}
        />

        <Route
          path="/fastapi-test"
          element={<FastApiTest />}
        />
        <Route
          path="/ai-highlight/community"
          element={<AIHighlightCommunity />}
        />
        <Route
          path="/ai-highlight/community/video"
          element={<AIHighlightVideoDetail user={user} />}
        />
</Routes>

      <div hidden={location.pathname !== '/ai-highlight'}>
        <AIHighlight />
      </div>
    </>
  )
}

export default App
