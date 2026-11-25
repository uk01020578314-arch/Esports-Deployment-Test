import { useState } from 'react'

function FastApiTest() {
  const [message, setMessage] = useState('')

  const testFastApi = async () => {
    const response = await fetch('http://127.0.0.1:8000/api/test')
    const data = await response.json()

    setMessage(data.message)
  }

  return (
    <div>
      <h1>FastAPI 연결 테스트</h1>
      <button onClick={testFastApi}>
        FastAPI 테스트
      </button>
      <p>{message}</p>
    </div>
  )
}

export default FastApiTest