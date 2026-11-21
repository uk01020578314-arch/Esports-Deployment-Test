# HypeCut

게임 영상과 경기 VOD를 분석해 주요 장면을 찾아 하이라이트 영상으로 만드는 도구입니다. 분석 결과와 컷 목록을 확인하고, 설정을 조정해 다시 렌더링할 수 있습니다.

## 주요 기능

- 긴 영상에서 오디오 크기, 순간 음량 변화, 화면 움직임, 장면 전환 등을 분석합니다.
- 게임별 프로필과 신호 감지 설정을 사용할 수 있습니다.
- 필요한 경우 CLIP 기반 재평가, 음성 인식 같은 선택 기능을 추가할 수 있습니다.
- 웹 화면에서 영상을 올리고 결과를 확인하거나, 명령줄에서 분석·렌더링할 수 있습니다.
- 기본 분석은 로컬에서 실행되며, 업로드 영상과 결과 파일은 로컬 HypeCut 데이터 폴더에 저장됩니다.

## 실행 환경

- Python 3.10 이상
- FFmpeg 설치 및 PATH 등록
- 웹 화면 사용 시 web 옵션으로 의존성 설치

## Windows 설치

PowerShell에서 HypeCut 폴더로 이동해 가상환경을 만들고 설치합니다.

    cd "C:\경로\hypecut-main"
    python -m venv .venv
    .\.venv\Scripts\python.exe -m pip install -e ".[web]"

FFmpeg가 설치되어 있는지 확인합니다.

    ffmpeg -version

## 웹 화면 실행

eSports Platform과 함께 실행할 때는 포트 충돌을 피하기 위해 HypeCut을 8001 포트로 켭니다.

    .\.venv\Scripts\python.exe -m hypecut serve --host 127.0.0.1 --port 8001

브라우저에서 <http://127.0.0.1:8001> 을 엽니다. API 문서는 <http://127.0.0.1:8001/docs> 에서 확인할 수 있습니다. 서버가 실행 중인 PowerShell 창은 열어 두세요.

## eSports Platform과 연결

eSports Platform 백엔드는 기본적으로 http://127.0.0.1:8001 의 HypeCut API에 작업을 요청합니다. 두 프로젝트를 같은 상위 폴더에 두면 백엔드가 hypecut-main 폴더를 기본 경로로 찾습니다. 다른 위치에 설치했다면 백엔드를 실행하는 PowerShell에서 경로를 지정합니다.

    $env:HYPECUT_URL = "http://127.0.0.1:8001"
    $env:HYPECUT_ROOT = "C:\경로\hypecut-main"

하이라이트 생성이 동작하려면 HypeCut 서버와 eSports Platform 백엔드가 모두 실행 중이어야 합니다.

## 명령줄 사용

    .\.venv\Scripts\python.exe -m hypecut cut .\input.mp4 -o .\reel.mp4 --target 120
    .\.venv\Scripts\python.exe -m hypecut analyze .\input.mp4 --json .\plan.json
    .\.venv\Scripts\python.exe -m hypecut profiles
    .\.venv\Scripts\python.exe -m hypecut signals

기본 프로필은 configs 폴더에 있습니다. 분석 결과가 기대와 다르면 프로필의 신호와 컷 설정을 조정해 다시 실행하세요.

## 선택 기능

    .\.venv\Scripts\python.exe -m pip install -e ".[ml]"
    .\.venv\Scripts\python.exe -m pip install -e ".[asr]"
    .\.venv\Scripts\python.exe -m pip install -e ".[ytdlp]"

- ml: CLIP 의미 기반 재평가
- asr: 음성 인식 및 발화 구간 기반 편집
- ytdlp: YouTube·Twitch 영상 주소 입력

선택 기능은 추가 패키지나 모델 다운로드가 필요할 수 있습니다. 세부 옵션은 영문 안내 [README_EN.md](README_EN.md)와 docs 폴더를 참고하세요.

## GitHub에 올리는 파일

소스 코드, 설정, 문서, 테스트, 라이선스 파일을 저장소에 올립니다. .gitignore가 가상환경, 업로드 영상, 생성 영상·작업 데이터, 킬피드 테스트 사진을 제외합니다. 사진은 로컬에 남고 GitHub에는 올라가지 않습니다.

프로젝트는 Apache-2.0 라이선스입니다. 자세한 내용은 [LICENSE](LICENSE)를 확인하세요.
