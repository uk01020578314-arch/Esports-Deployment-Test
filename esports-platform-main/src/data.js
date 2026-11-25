const defaultTournaments = [
  {
    id: 'default-1',
    name: '2026 대학생 LOL 챔피언십',
    game: 'League of Legends',
    description: '대학생을 대상으로 진행하는 리그 오브 레전드 대회입니다.',
    recruitStart: '2026-09-20',
    recruitEnd: '2026-10-05',
    tournamentStart: '2026-10-10',
    tournamentEnd: '2026-10-18',
    teamSize: 5,
    status: '모집 중',
  },
  {
    id: 'default-2',
    name: '대학 발로란트 아마추어 대회',
    game: 'Valorant',
    description: '대학생 팀을 위한 발로란트 아마추어 대회입니다.',
    recruitStart: '2026-09-25',
    recruitEnd: '2026-10-12',
    tournamentStart: '2026-10-17',
    tournamentEnd: '2026-10-25',
    teamSize: 5,
    status: '모집 중',
  },
]

export function getTournaments() {
  const saved = localStorage.getItem('esports_tournaments')
  if (!saved) {
    localStorage.setItem('esports_tournaments', JSON.stringify(defaultTournaments))
    return defaultTournaments
  }
  return JSON.parse(saved)
}

export function saveTournament(tournament) {
  const tournaments = getTournaments()
  const updated = [tournament, ...tournaments]
  localStorage.setItem('esports_tournaments', JSON.stringify(updated))
  return tournament
}

export function getTeams() {
  const saved = localStorage.getItem('esports_teams')
  return saved ? JSON.parse(saved) : []
}

export function saveTeam(team) {
  const teams = getTeams()
  const updated = [team, ...teams]
  localStorage.setItem('esports_teams', JSON.stringify(updated))
  return team
}

export function getCurrentUser() {
  const saved = localStorage.getItem('esports_user')
  return saved ? JSON.parse(saved) : null
}

export function loginUser(user) {
  localStorage.setItem('esports_user', JSON.stringify(user))
}

export function logoutUser() {
  localStorage.removeItem('esports_user')
}
