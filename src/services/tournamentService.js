export const tournamentService = {
  getAll: async () => {
    const response = await fetch('http://127.0.0.1:8000/api/tournaments')

    if (!response.ok) {
      throw new Error('대회 목록을 불러오지 못했습니다.')
    }

    const data = await response.json()
    return data.tournaments
  },

  create: async (data) => {
    const response = await fetch('http://127.0.0.1:8000/api/tournaments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      throw new Error('대회 생성에 실패했습니다.')
    }

    return await response.json()
  }
}