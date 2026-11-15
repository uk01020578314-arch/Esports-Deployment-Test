import { getTeams, saveTeam } from '../data'

export const teamService = {
  getAll: () => getTeams(),
  create: (data) => saveTeam(data),
}
