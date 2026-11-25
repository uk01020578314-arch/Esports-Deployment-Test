import { getCurrentUser, loginUser, logoutUser } from '../data'

export const authService = {
  getCurrentUser,
  login: (user) => loginUser(user),
  logout: logoutUser,
}
