# Esports Platform

React와 FastAPI로 만든 e스포츠 대회·팀 관리 웹 애플리케이션입니다. 회원가입과 로그인, 팀 관리, 대회 참가, 경기·대진표 관리, 하이라이트 생성 및 커뮤니티 기능을 제공합니다.

## 주요 기능

- 회원가입, 로그인, 관리자 설정
- 대회 생성·조회·참가 및 참가 팀 관리
- 팀 생성·조회·가입 신청 및 관리
- 경기 일정, 경기 결과, 대진표 관리
- 영상 파일 또는 YouTube 주소로 하이라이트 생성
- 하이라이트 커뮤니티와 댓글

## 실행 환경

- Node.js 20.19 이상 또는 22.12 이상
- Python 3.10 이상
- Windows PowerShell 기준 명령을 아래에 안내합니다.
- YouTube 영상 다운로드에는 `ffmpeg`가 필요합니다.
- 하이라이트 생성 기능은 별도 HypeCut 서버가 필요합니다.

## 설치 및 실행

각 서버는 별도 PowerShell 창에서 실행하고, 실행 중인 창은 닫지 마세요.

### 1. 백엔드 API

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install fastapi uvicorn sqlalchemy requests yt-dlp python-multipart
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

API 확인 주소는 <http://127.0.0.1:8000/api/test> 입니다.

### 2. 프런트엔드

프로젝트 루트에서 별도 PowerShell 창을 열고 실행합니다.

```powershell
npm.cmd install
npm.cmd run dev
```

브라우저에서 <http://localhost:5173> 을 엽니다. PowerShell 실행 정책이 `npm`을 차단하면 `npm.cmd`를 사용하세요.

### 3. HypeCut 하이라이트 서버

HypeCut 저장소를 이 프로젝트 폴더와 같은 상위 폴더에 두세요. 예를 들어 두 폴더가 `C:\Projects` 아래에 함께 있으면 자동으로 경로를 찾습니다. HypeCut을 별도 위치에 둔 경우 백엔드 PowerShell에서 경로를 지정할 수 있습니다.

```powershell
$env:HYPECUT_ROOT = "C:\경로\hypecut-main"
$env:HYPECUT_URL = "http://127.0.0.1:8001"
```

HypeCut 프로젝트의 설치된 가상환경에서 실행합니다.

```powershell
python -m hypecut serve --host 127.0.0.1 --port 8001
```

HypeCut을 먼저 켠 다음 백엔드와 프런트엔드를 실행하면 하이라이트 생성 요청이 HypeCut API로 전달됩니다. 게임 프로필 및 생성 결과는 HypeCut 저장 폴더를 사용합니다.

## 업로드되는 파일과 제외되는 파일

GitHub에는 애플리케이션 코드, 설정 파일, 의존성 잠금 파일(`package-lock.json`), 문서 및 정적 공개 자산이 올라갑니다. 다음 로컬 파일과 생성 데이터는 `.gitignore`로 제외합니다.

- `node_modules`, `dist`, Python 가상환경 및 캐시
- SQLite 데이터베이스와 백업
- 업로드한 원본 영상, 생성한 하이라이트 및 HypeCut 작업 데이터
- `.env` 환경변수 파일과 로그

기존 데이터베이스와 영상은 저장소에 포함되지 않습니다. 백엔드 실행 시 SQLite 데이터베이스와 필요한 폴더가 로컬에서 생성됩니다.

## 설정 메모

- 백엔드 기본 주소: `http://127.0.0.1:8000`
- HypeCut 기본 주소: `http://127.0.0.1:8001`
- `HYPECUT_URL`, `HYPECUT_ROOT`, `HYPECUT_DATA_DIR`, `HIGHLIGHTS_DIR` 환경변수로 HypeCut 및 저장 경로를 조정할 수 있습니다.
- YouTube 다운로드 및 영상 인코딩은 네트워크, 영상 제공처, `ffmpeg` 설치 상태에 따라 달라질 수 있습니다.
