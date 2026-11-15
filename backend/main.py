from fastapi import FastAPI, HTTPException, UploadFile, File, Request
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import os
import shutil
import subprocess
import time
import uuid
import requests
import yt_dlp
from sqlalchemy import create_engine, Column, Integer, String, Text
from sqlalchemy.orm import sessionmaker, declarative_base
from fastapi.middleware.cors import CORSMiddleware
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
from urllib.parse import quote

DATABASE_URL = "sqlite:///./esports.db"

engine = create_engine(DATABASE_URL)

with engine.connect():
    print("SQLite 연결 성공")

Base = declarative_base()

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    role = Column(String, default="user")


class Tournament(Base):
    __tablename__ = "tournaments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    game = Column(String)
    description = Column(Text)
    start_date = Column(String)
    end_date = Column(String)
    max_participants = Column(Integer)
    creator_email = Column(String)
    status = Column(String, default="모집중")


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    game = Column(String)
    captain = Column(String)
    members = Column(Text)


class TeamJoinApplication(Base):
    __tablename__ = "team_join_applications"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, index=True)
    applicant_name = Column(String, index=True)
    status = Column(String, default="대기")


class Registration(Base):
    __tablename__ = "registrations"

    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer)
    team_id = Column(Integer)
    status = Column(String, default="대기")


class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(String)
    team_a_id = Column(Integer, nullable=True)
    team_b_id = Column(Integer, nullable=True)
    team_a_score = Column(Integer, default=0)
    team_b_score = Column(Integer, default=0)
    status = Column(String, default="예정")
    winner_id = Column(Integer, nullable=True)
    round = Column(Integer, default=1)
    match_number = Column(Integer, default=1)
    next_match_id = Column(Integer, nullable=True)


class AppSetting(Base):
    __tablename__ = "app_settings"

    key = Column(String, primary_key=True)
    value = Column(String)


class HighlightComment(Base):
    __tablename__ = "highlight_comments"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(String, index=True)
    author = Column(String)
    content = Column(Text)
    created_at = Column(String)


PASSWORD_HASH_PREFIX = "pbkdf2_sha256"
PASSWORD_HASH_ITERATIONS = 310_000


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        PASSWORD_HASH_ITERATIONS
    )

    return (
        f"{PASSWORD_HASH_PREFIX}${PASSWORD_HASH_ITERATIONS}$"
        f"{salt.hex()}${digest.hex()}"
    )


def verify_password(password: str, saved_password: str) -> tuple[bool, bool]:
    if saved_password.startswith(f"{PASSWORD_HASH_PREFIX}$"):
        try:
            _, iterations, salt_hex, digest_hex = saved_password.split("$", 3)
            expected_digest = bytes.fromhex(digest_hex)
            actual_digest = hashlib.pbkdf2_hmac(
                "sha256",
                password.encode("utf-8"),
                bytes.fromhex(salt_hex),
                int(iterations)
            )
        except (ValueError, TypeError):
            return False, False

        return hmac.compare_digest(actual_digest, expected_digest), False

    return hmac.compare_digest(
        password.encode("utf-8"),
        saved_password.encode("utf-8")
    ), True


Base.metadata.create_all(bind=engine)


with sqlite3.connect("esports.db") as connection:
    cursor = connection.cursor()

    cursor.execute("PRAGMA table_info(users)")
    columns = [column[1] for column in cursor.fetchall()]

    if "role" not in columns:
        cursor.execute(
            "ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'"
        )

    cursor.execute(
        "UPDATE users SET role = 'user' WHERE role IS NULL OR role = ''"
    )

    connection.commit()


with sqlite3.connect("esports.db") as connection:
    cursor = connection.cursor()

    cursor.execute("PRAGMA table_info(matches)")
    columns = [column[1] for column in cursor.fetchall()]

    if "round" not in columns:
        cursor.execute(
            "ALTER TABLE matches ADD COLUMN round INTEGER DEFAULT 1"
        )

    if "match_number" not in columns:
        cursor.execute(
            "ALTER TABLE matches ADD COLUMN match_number INTEGER DEFAULT 1"
        )

    if "next_match_id" not in columns:
        cursor.execute(
            "ALTER TABLE matches ADD COLUMN next_match_id INTEGER"
        )

    connection.commit()


with sqlite3.connect("esports.db") as connection:
    cursor = connection.cursor()

    cursor.execute("PRAGMA table_info(teams)")
    columns = [column[1] for column in cursor.fetchall()]

    if "game" not in columns:
        cursor.execute(
            "ALTER TABLE teams ADD COLUMN game TEXT"
        )

    if "members" not in columns:
        cursor.execute(
            "ALTER TABLE teams ADD COLUMN members TEXT"
        )

    connection.commit()


with sqlite3.connect("esports.db") as connection:
    cursor = connection.cursor()

    cursor.execute("PRAGMA table_info(tournaments)")
    columns = [column[1] for column in cursor.fetchall()]

    if "creator_email" not in columns:
        cursor.execute(
            "ALTER TABLE tournaments ADD COLUMN creator_email TEXT"
        )

    if "status" not in columns:
        cursor.execute(
            "ALTER TABLE tournaments ADD COLUMN status TEXT DEFAULT '모집중'"
        )

    cursor.execute(
        "UPDATE tournaments SET status = '모집중' WHERE status IS NULL OR status = ''"
    )

    connection.commit()


with sqlite3.connect("esports.db") as connection:
    cursor = connection.cursor()

    cursor.execute("PRAGMA table_info(registrations)")
    columns = [column[1] for column in cursor.fetchall()]

    if "status" not in columns:
        cursor.execute(
            "ALTER TABLE registrations ADD COLUMN status TEXT DEFAULT '대기'"
        )

    cursor.execute(
        "UPDATE registrations SET status = '대기' WHERE status IS NULL OR status = ''"
    )

    connection.commit()


app = FastAPI()

HIGHLIGHTS_DIR = Path(
    os.environ.get("HIGHLIGHTS_DIR", Path(__file__).resolve().parent / "highlights")
).resolve()
VIDEOS_DIR = Path(__file__).resolve().parent / "videos"
HYPECUT_URL = os.environ.get("HYPECUT_URL", "http://127.0.0.1:8001")
HYPECUT_ROOT = Path(
    os.environ.get(
        "HYPECUT_ROOT",
        Path(__file__).resolve().parents[2] / "hypecut-main",
    )
).resolve()
HYPECUT_DATA_DIR = Path(
    os.environ.get("HYPECUT_DATA_DIR", HYPECUT_ROOT / "hypecut-data")
).resolve()

HIGHLIGHTS_DIR.mkdir(parents=True, exist_ok=True)
VIDEOS_DIR.mkdir(parents=True, exist_ok=True)

app.mount(
    "/highlights",
    StaticFiles(directory=str(HIGHLIGHTS_DIR)),
    name="highlights"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "ACHI.GG API"}


@app.get("/api/test")
def test():
    return {"message": "FastAPI 연결 성공"}


@app.post("/api/register")
def register(user: dict):
    db = SessionLocal()

    existing_user = db.query(User).filter(
        User.email == user["email"]
    ).first()

    if existing_user:
        db.close()

        return {
            "message": "이미 가입된 이메일입니다."
        }

    new_user = User(
        name=user["name"],
        email=user["email"],
        password=hash_password(user["password"]),
        role="user"
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    db.close()

    return {
        "message": "회원가입 성공"
    }


@app.post("/api/admin/setup")
def setup_admin(data: dict):
    setup_key = os.environ.get("ACHI_ADMIN_SETUP_KEY", "")
    provided_key = data.get("setup_key", "")

    if not setup_key:
        raise HTTPException(
            status_code=503,
            detail="서버에 관리자 초기 설정 키가 지정되지 않았습니다."
        )

    if not isinstance(provided_key, str) or not hmac.compare_digest(
        setup_key.encode("utf-8"),
        provided_key.encode("utf-8")
    ):
        raise HTTPException(
            status_code=403,
            detail="관리자 초기 설정 키가 올바르지 않습니다."
        )

    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = data.get("password", "")

    if not name or not email or not isinstance(password, str):
        raise HTTPException(
            status_code=400,
            detail="이름, 이메일, 비밀번호를 모두 입력해주세요."
        )

    if len(password) < 8:
        raise HTTPException(
            status_code=400,
            detail="비밀번호는 8자 이상이어야 합니다."
        )

    db = SessionLocal()

    try:
        setup_complete = db.query(AppSetting).filter(
            AppSetting.key == "admin_setup_complete",
            AppSetting.value == "true"
        ).first()

        if setup_complete:
            raise HTTPException(
                status_code=409,
                detail="관리자 초기 설정은 이미 완료되었습니다."
            )

        admin_user = db.query(User).filter(
            User.role == "admin"
        ).first()
        existing_user = db.query(User).filter(
            User.email.ilike(email)
        ).first()

        if admin_user:
            if existing_user and existing_user.id != admin_user.id:
                raise HTTPException(
                    status_code=409,
                    detail="입력한 이메일은 다른 계정에서 사용 중입니다."
                )

            admin_user.name = name
            admin_user.email = email
            admin_user.password = hash_password(password)
            message = "관리자 계정 정보가 업데이트되었습니다."
        elif existing_user:
            password_matches, is_legacy = verify_password(
                password,
                existing_user.password or ""
            )

            if not password_matches:
                raise HTTPException(
                    status_code=401,
                    detail="기존 계정의 비밀번호가 올바르지 않습니다."
                )

            existing_user.role = "admin"
            if is_legacy:
                existing_user.password = hash_password(password)
            message = "기존 계정이 관리자로 설정되었습니다."
        else:
            db.add(User(
                name=name,
                email=email,
                password=hash_password(password),
                role="admin"
            ))
            message = "관리자 계정이 생성되었습니다."

        db.merge(AppSetting(
            key="admin_setup_complete",
            value="true"
        ))
        db.commit()
    finally:
        db.close()

    os.environ.pop("ACHI_ADMIN_SETUP_KEY", None)

    return {
        "message": message
    }


@app.post("/api/login")
def login(user: dict):
    db = SessionLocal()

    saved_user = db.query(User).filter(
        User.email == user["email"]
    ).first()

    if not saved_user:
        db.close()

        return {
            "message": "이메일 또는 비밀번호가 올바르지 않습니다."
        }

    password_matches, is_legacy = verify_password(
        user["password"],
        saved_user.password or ""
    )

    if not password_matches:
        db.close()

        return {
            "message": "이메일 또는 비밀번호가 올바르지 않습니다."
        }

    if is_legacy:
        saved_user.password = hash_password(user["password"])
        db.commit()

    result = {
        "message": "로그인 성공",
        "user": {
            "id": saved_user.id,
            "name": saved_user.name,
            "email": saved_user.email,
            "role": saved_user.role or "user"
        }
    }

    db.close()

    return result


@app.post("/api/tournaments")
def create_tournament(tournament: dict):
    db = SessionLocal()

    new_tournament = Tournament(
        name=tournament["name"],
        game=tournament["game"],
        description=tournament["description"],
        start_date=tournament["start_date"],
        end_date=tournament["end_date"],
        max_participants=tournament["max_participants"],
        creator_email=tournament.get("creator_email", ""),
        status=tournament.get("status", "모집중")
    )

    db.add(new_tournament)
    db.commit()
    db.refresh(new_tournament)

    result = {
        "id": new_tournament.id,
        "name": new_tournament.name,
        "game": new_tournament.game,
        "description": new_tournament.description,
        "start_date": new_tournament.start_date,
        "end_date": new_tournament.end_date,
        "max_participants": new_tournament.max_participants,
        "creator_email": new_tournament.creator_email,
        "status": new_tournament.status
    }

    db.close()

    return {
        "message": "대회 생성 성공",
        "tournament": result
    }


@app.get("/api/tournaments")
def get_tournaments():
    db = SessionLocal()

    saved_tournaments = db.query(Tournament).all()

    result = []

    for tournament in saved_tournaments:
        result.append({
            "id": tournament.id,
            "name": tournament.name,
            "game": tournament.game,
            "description": tournament.description,
            "start_date": tournament.start_date,
            "end_date": tournament.end_date,
            "max_participants": tournament.max_participants,
            "creator_email": tournament.creator_email,
            "status": tournament.status or "모집중"
        })

    db.close()

    return {
        "tournaments": result
    }


@app.patch("/api/tournaments/{tournament_id}")
def update_tournament(tournament_id: int, tournament: dict):
    db = SessionLocal()

    saved_tournament = db.query(Tournament).filter(
        Tournament.id == tournament_id
    ).first()

    if not saved_tournament:
        db.close()

        return {
            "detail": "대회를 찾을 수 없습니다."
        }

    user_email = tournament.get("user_email", "")
    user_role = tournament.get("user_role", "user")

    if user_role != "admin" and saved_tournament.creator_email != user_email:
        db.close()

        return {
            "detail": "이 대회를 수정할 권한이 없습니다."
        }

    saved_tournament.name = tournament.get(
        "name",
        saved_tournament.name
    )

    saved_tournament.game = tournament.get(
        "game",
        saved_tournament.game
    )

    saved_tournament.description = tournament.get(
        "description",
        saved_tournament.description
    )

    saved_tournament.start_date = tournament.get(
        "start_date",
        saved_tournament.start_date
    )

    saved_tournament.end_date = tournament.get(
        "end_date",
        saved_tournament.end_date
    )

    if "max_participants" in tournament:
        saved_tournament.max_participants = int(
            tournament["max_participants"]
        )

    if "status" in tournament:
        saved_tournament.status = tournament["status"]

    db.commit()
    db.refresh(saved_tournament)

    result = {
        "id": saved_tournament.id,
        "name": saved_tournament.name,
        "game": saved_tournament.game,
        "description": saved_tournament.description,
        "start_date": saved_tournament.start_date,
        "end_date": saved_tournament.end_date,
        "max_participants": saved_tournament.max_participants,
        "creator_email": saved_tournament.creator_email,
        "status": saved_tournament.status
    }

    db.close()

    return {
        "message": "대회 정보가 수정되었습니다.",
        "tournament": result
    }


@app.delete("/api/tournaments/{tournament_id}")
def delete_tournament(tournament_id: int, user: dict):
    db = SessionLocal()

    saved_tournament = db.query(Tournament).filter(
        Tournament.id == tournament_id
    ).first()

    if not saved_tournament:
        db.close()

        return {
            "detail": "대회를 찾을 수 없습니다."
        }

    user_email = user.get("user_email", "")
    user_role = user.get("user_role", "user")

    if user_role != "admin" and saved_tournament.creator_email != user_email:
        db.close()

        return {
            "detail": "이 대회를 삭제할 권한이 없습니다."
        }

    db.query(Registration).filter(
        Registration.tournament_id == tournament_id
    ).delete()

    db.query(Match).filter(
        Match.tournament_id == str(tournament_id)
    ).delete()

    db.delete(saved_tournament)
    db.commit()
    db.close()

    return {
        "message": "대회가 삭제되었습니다."
    }


@app.post("/api/teams")
def create_team(team: dict):
    db = SessionLocal()

    members = team.get("members", [])

    new_team = Team(
        name=team["name"],
        game=team.get("game", ""),
        captain=team["captain"],
        members=json.dumps(members, ensure_ascii=False)
    )

    db.add(new_team)
    db.commit()
    db.refresh(new_team)
    db.close()

    return {
        "message": "팀 생성 성공",
        "team": {
            "id": new_team.id,
            "name": new_team.name,
            "game": new_team.game,
            "captain": new_team.captain,
            "members": members
        }
    }


@app.get("/api/teams")
def get_teams():
    db = SessionLocal()

    saved_teams = db.query(Team).all()

    result = []

    for team in saved_teams:
        try:
            members = json.loads(team.members) if team.members else []
        except:
            members = []

        result.append({
            "id": team.id,
            "name": team.name,
            "game": team.game,
            "captain": team.captain,
            "members": members
        })

    db.close()

    return {
        "teams": result
    }


@app.post("/api/teams/{team_id}/join-requests")
def apply_to_join_team(team_id: int, request: dict):
    db = SessionLocal()
    team = db.query(Team).filter(Team.id == team_id).first()

    if not team:
        db.close()
        raise HTTPException(status_code=404, detail="팀을 찾을 수 없습니다.")

    applicant_name = request.get("applicant_name")

    if not isinstance(applicant_name, str) or not applicant_name.strip():
        db.close()
        raise HTTPException(status_code=400, detail="가입 신청자 이름을 입력해주세요.")

    applicant_name = applicant_name.strip()

    if applicant_name == team.captain:
        db.close()
        raise HTTPException(status_code=409, detail="팀장은 본인 팀에 가입 신청할 수 없습니다.")

    matching_users = db.query(User).filter(User.name == applicant_name).limit(2).all()

    if not matching_users:
        db.close()
        raise HTTPException(status_code=404, detail="가입된 사용자를 찾을 수 없습니다.")

    if len(matching_users) > 1:
        db.close()
        raise HTTPException(status_code=409, detail="같은 이름의 계정이 여러 개 있어 가입 신청할 수 없습니다.")

    try:
        members = json.loads(team.members) if team.members else []
    except (TypeError, json.JSONDecodeError):
        members = []

    if applicant_name in members:
        db.close()
        raise HTTPException(status_code=409, detail="이미 팀원으로 등록되어 있습니다.")

    existing_application = db.query(TeamJoinApplication).filter(
        TeamJoinApplication.team_id == team_id,
        TeamJoinApplication.applicant_name == applicant_name
    ).order_by(TeamJoinApplication.id.desc()).first()

    if existing_application and existing_application.status in ("대기", "승인"):
        db.close()
        raise HTTPException(status_code=409, detail="이미 가입 신청했거나 팀원으로 등록되어 있습니다.")

    if existing_application:
        existing_application.status = "대기"
        application = existing_application
    else:
        application = TeamJoinApplication(
            team_id=team_id,
            applicant_name=applicant_name,
            status="대기"
        )
        db.add(application)

    db.commit()
    result = {
        "id": application.id,
        "team_id": application.team_id,
        "applicant_name": application.applicant_name,
        "status": application.status
    }
    db.close()

    return {"message": "팀 가입 신청을 보냈습니다.", "application": result}


@app.get("/api/team-join-requests")
def get_my_team_join_requests(applicant_name: str):
    db = SessionLocal()
    applications = db.query(TeamJoinApplication).filter(
        TeamJoinApplication.applicant_name == applicant_name
    ).all()
    result = [
        {
            "id": application.id,
            "team_id": application.team_id,
            "applicant_name": application.applicant_name,
            "status": application.status
        }
        for application in applications
    ]
    db.close()

    return {"applications": result}


@app.get("/api/teams/{team_id}/join-requests")
def get_team_join_requests(team_id: int, captain_name: str):
    db = SessionLocal()
    team = db.query(Team).filter(Team.id == team_id).first()

    if not team:
        db.close()
        raise HTTPException(status_code=404, detail="팀을 찾을 수 없습니다.")

    if captain_name != team.captain:
        db.close()
        raise HTTPException(status_code=403, detail="팀장만 가입 신청을 확인할 수 있습니다.")

    applications = db.query(TeamJoinApplication).filter(
        TeamJoinApplication.team_id == team_id,
        TeamJoinApplication.status == "대기"
    ).all()
    result = [
        {
            "id": application.id,
            "team_id": application.team_id,
            "applicant_name": application.applicant_name,
            "status": application.status
        }
        for application in applications
    ]
    db.close()

    return {"applications": result}


@app.post("/api/teams/{team_id}/join-requests/{application_id}/approve")
def approve_team_join_request(team_id: int, application_id: int, request: dict):
    db = SessionLocal()
    team = db.query(Team).filter(Team.id == team_id).first()

    if not team:
        db.close()
        raise HTTPException(status_code=404, detail="팀을 찾을 수 없습니다.")

    if request.get("captain_name") != team.captain:
        db.close()
        raise HTTPException(status_code=403, detail="팀장만 가입 신청을 승인할 수 있습니다.")

    application = db.query(TeamJoinApplication).filter(
        TeamJoinApplication.id == application_id,
        TeamJoinApplication.team_id == team_id
    ).first()

    if not application or application.status != "대기":
        db.close()
        raise HTTPException(status_code=404, detail="대기 중인 가입 신청을 찾을 수 없습니다.")

    try:
        members = json.loads(team.members) if team.members else []
    except (TypeError, json.JSONDecodeError):
        members = []

    if application.applicant_name not in members:
        members.append(application.applicant_name)
    team.members = json.dumps(members, ensure_ascii=False)
    application.status = "승인"
    db.commit()
    result = {
        "id": team.id,
        "name": team.name,
        "game": team.game,
        "captain": team.captain,
        "members": members
    }
    approved_application = {
        "id": application.id,
        "team_id": application.team_id,
        "applicant_name": application.applicant_name,
        "status": application.status
    }
    db.close()

    return {
        "message": f"{approved_application['applicant_name']}님 가입을 승인했습니다.",
        "team": result,
        "application": approved_application
    }


@app.delete("/api/teams/{team_id}/members/{member_name}")
def remove_team_member(team_id: int, member_name: str, request: dict):
    db = SessionLocal()
    team = db.query(Team).filter(Team.id == team_id).first()

    if not team:
        db.close()
        raise HTTPException(status_code=404, detail="팀을 찾을 수 없습니다.")

    if request.get("captain_name") != team.captain:
        db.close()
        raise HTTPException(status_code=403, detail="팀장만 팀원을 추방할 수 있습니다.")

    if member_name == team.captain:
        db.close()
        raise HTTPException(status_code=400, detail="팀장은 추방할 수 없습니다.")

    try:
        members = json.loads(team.members) if team.members else []
    except (TypeError, json.JSONDecodeError):
        members = []

    if member_name not in members:
        db.close()
        raise HTTPException(status_code=404, detail="팀원을 찾을 수 없습니다.")

    members.remove(member_name)
    approved_application = db.query(TeamJoinApplication).filter(
        TeamJoinApplication.team_id == team_id,
        TeamJoinApplication.applicant_name == member_name,
        TeamJoinApplication.status == "승인"
    ).order_by(TeamJoinApplication.id.desc()).first()
    if approved_application:
        approved_application.status = "종료"
    team.members = json.dumps(members, ensure_ascii=False)
    db.commit()
    result = {
        "id": team.id,
        "name": team.name,
        "game": team.game,
        "captain": team.captain,
        "members": members
    }
    db.close()

    return {"message": f"{member_name}님을 팀에서 내보냈습니다.", "team": result}


@app.delete("/api/teams/{team_id}/leave")
def leave_team(team_id: int, request: dict):
    db = SessionLocal()
    team = db.query(Team).filter(Team.id == team_id).first()

    if not team:
        db.close()
        raise HTTPException(status_code=404, detail="팀을 찾을 수 없습니다.")

    member_name = request.get("member_name", "")

    if not member_name or member_name == team.captain:
        db.close()
        raise HTTPException(status_code=403, detail="팀원 계정으로만 탈퇴할 수 있습니다.")

    try:
        members = json.loads(team.members) if team.members else []
    except (TypeError, json.JSONDecodeError):
        members = []

    if member_name not in members:
        db.close()
        raise HTTPException(status_code=404, detail="팀원으로 등록되어 있지 않습니다.")

    members.remove(member_name)
    approved_application = db.query(TeamJoinApplication).filter(
        TeamJoinApplication.team_id == team_id,
        TeamJoinApplication.applicant_name == member_name,
        TeamJoinApplication.status == "승인"
    ).order_by(TeamJoinApplication.id.desc()).first()
    if approved_application:
        approved_application.status = "종료"
    team.members = json.dumps(members, ensure_ascii=False)
    db.commit()
    result = {
        "id": team.id,
        "name": team.name,
        "game": team.game,
        "captain": team.captain,
        "members": members
    }
    db.close()

    return {"message": "팀에서 탈퇴했습니다.", "team": result}

@app.post("/api/tournaments/{tournament_index}/teams")
def register_team(tournament_index: int, registration: dict):
    db = SessionLocal()

    existing_registration = db.query(Registration).filter(
        Registration.tournament_id == tournament_index,
        Registration.team_id == registration["team_id"]
    ).first()

    if existing_registration:
        db.close()

        return {
            "message": "이미 참가 신청한 팀입니다."
        }

    new_registration = Registration(
        tournament_id=tournament_index,
        team_id=registration["team_id"],
        status="대기"
    )

    db.add(new_registration)
    db.commit()
    db.refresh(new_registration)
    db.close()

    return {
        "message": "대회 참가 신청 성공",
        "registration": {
            "id": new_registration.id,
            "tournament_id": new_registration.tournament_id,
            "team_id": new_registration.team_id,
            "status": new_registration.status
        }
    }


@app.get("/api/tournaments/{tournament_index}/teams")
def get_registered_teams(tournament_index: int):
    db = SessionLocal()

    saved_registrations = db.query(Registration).filter(
        Registration.tournament_id == tournament_index
    ).all()

    result = []

    for registration in saved_registrations:
        team = db.query(Team).filter(
            Team.id == registration.team_id
        ).first()

        if team:
            try:
                members = json.loads(team.members) if team.members else []
            except:
                members = []

            result.append({
                "registration_id": registration.id,
                "team_id": team.id,
                "name": team.name,
                "game": team.game,
                "captain": team.captain,
                "members": members,
                "status": registration.status or "대기"
            })

    db.close()

    return {
        "teams": result
    }


@app.patch("/api/tournaments/{tournament_index}/teams/{team_id}/approve")
def approve_registration(tournament_index: int, team_id: int):
    db = SessionLocal()

    registration = db.query(Registration).filter(
        Registration.tournament_id == tournament_index,
        Registration.team_id == team_id
    ).first()

    if not registration:
        db.close()

        return {
            "message": "참가 신청 내역을 찾을 수 없습니다."
        }

    registration.status = "승인"
    db.commit()
    db.refresh(registration)
    db.close()

    return {
        "message": "참가 신청이 승인되었습니다.",
        "status": registration.status
    }


@app.patch("/api/tournaments/{tournament_index}/teams/{team_id}/reject")
def reject_registration(tournament_index: int, team_id: int):
    db = SessionLocal()

    registration = db.query(Registration).filter(
        Registration.tournament_id == tournament_index,
        Registration.team_id == team_id
    ).first()

    if not registration:
        db.close()

        return {
            "message": "참가 신청 내역을 찾을 수 없습니다."
        }

    registration.status = "거절"
    db.commit()
    db.refresh(registration)
    db.close()

    return {
        "message": "참가 신청이 거절되었습니다.",
        "status": registration.status
    }


@app.delete("/api/tournaments/{tournament_index}/teams/{team_id}")
def cancel_registration(tournament_index: int, team_id: int):
    db = SessionLocal()

    registration = db.query(Registration).filter(
        Registration.tournament_id == tournament_index,
        Registration.team_id == team_id
    ).first()

    if not registration:
        db.close()

        return {
            "message": "참가 신청 내역을 찾을 수 없습니다."
        }

    db.delete(registration)
    db.commit()
    db.close()

    return {
        "message": "대회 참가가 취소되었습니다."
    }


@app.post("/api/matches")
def create_match(match: dict):
    db = SessionLocal()

    if match["team_a_id"] == match["team_b_id"]:
        db.close()

        return {
            "message": "서로 다른 팀을 선택해주세요."
        }

    new_match = Match(
        tournament_id=str(match["tournament_id"]),
        team_a_id=int(match["team_a_id"]),
        team_b_id=int(match["team_b_id"]),
        team_a_score=0,
        team_b_score=0,
        status="예정",
        winner_id=None,
        round=1,
        match_number=1,
        next_match_id=None
    )

    db.add(new_match)
    db.commit()
    db.refresh(new_match)
    db.close()

    return {
        "message": "경기가 생성되었습니다.",
        "match": {
            "id": new_match.id,
            "tournament_id": new_match.tournament_id,
            "team_a_id": new_match.team_a_id,
            "team_b_id": new_match.team_b_id,
            "team_a_score": new_match.team_a_score,
            "team_b_score": new_match.team_b_score,
            "status": new_match.status,
            "winner_id": new_match.winner_id,
            "round": new_match.round,
            "match_number": new_match.match_number,
            "next_match_id": new_match.next_match_id
        }
    }


@app.get("/api/matches")
def get_matches():
    db = SessionLocal()

    tournaments = db.query(Match.tournament_id).distinct().all()

    for tournament_row in tournaments:
        tournament_id = tournament_row[0]

        semifinal_matches = db.query(Match).filter(
            Match.tournament_id == tournament_id,
            Match.round == 1
        ).order_by(Match.match_number).all()

        finished_semifinals = [
            item for item in semifinal_matches
            if item.status == "종료"
            and item.winner_id is not None
        ]

        if len(finished_semifinals) >= 2:
            winners = [
                finished_semifinals[0].winner_id,
                finished_semifinals[1].winner_id
            ]

            final_match = db.query(Match).filter(
                Match.tournament_id == tournament_id,
                Match.round == 2,
                Match.match_number == 1
            ).first()

            if final_match is None:
                final_match = Match(
                    tournament_id=tournament_id,
                    team_a_id=winners[0],
                    team_b_id=winners[1],
                    team_a_score=0,
                    team_b_score=0,
                    status="예정",
                    winner_id=None,
                    round=2,
                    match_number=1,
                    next_match_id=None
                )

                db.add(final_match)

            elif final_match.status != "종료":
                final_match.team_a_id = winners[0]
                final_match.team_b_id = winners[1]

    db.commit()

    saved_matches = db.query(Match).all()

    result = []

    for match in saved_matches:
        result.append({
            "id": match.id,
            "tournament_id": match.tournament_id,
            "team_a_id": match.team_a_id,
            "team_b_id": match.team_b_id,
            "team_a_score": match.team_a_score,
            "team_b_score": match.team_b_score,
            "status": match.status,
            "winner_id": match.winner_id,
            "round": match.round,
            "match_number": match.match_number,
            "next_match_id": match.next_match_id
        })

    db.close()

    return {
        "matches": result
    }


@app.patch("/api/matches/{match_id}")
def update_match(match_id: int, match: dict):
    db = SessionLocal()

    saved_match = db.query(Match).filter(
        Match.id == match_id
    ).first()

    if not saved_match:
        db.close()

        return {
            "message": "경기를 찾을 수 없습니다."
        }

    if saved_match.team_a_id is None or saved_match.team_b_id is None:
        db.close()

        return {
            "message": "아직 두 팀이 모두 정해지지 않은 경기입니다."
        }

    team_a_score = int(match["team_a_score"])
    team_b_score = int(match["team_b_score"])

    if team_a_score < 0 or team_b_score < 0:
        db.close()

        return {
            "message": "점수는 0 이상이어야 합니다."
        }

    saved_match.team_a_score = team_a_score
    saved_match.team_b_score = team_b_score

    if team_a_score == team_b_score:
        saved_match.status = "진행 중"
        saved_match.winner_id = None
    elif team_a_score > team_b_score:
        saved_match.status = "종료"
        saved_match.winner_id = saved_match.team_a_id
    else:
        saved_match.status = "종료"
        saved_match.winner_id = saved_match.team_b_id

    db.commit()

    if saved_match.status == "종료" and saved_match.round == 1:
        semifinal_matches = db.query(Match).filter(
            Match.tournament_id == saved_match.tournament_id,
            Match.round == 1
        ).order_by(Match.match_number).all()

        finished_semifinals = [
            item for item in semifinal_matches
            if item.status == "종료"
            and item.winner_id is not None
        ]

        if len(finished_semifinals) == 2:
            final_match = db.query(Match).filter(
                Match.tournament_id == saved_match.tournament_id,
                Match.round == 2
            ).first()

            winners = [
                item.winner_id
                for item in finished_semifinals
            ]

            if not final_match:
                final_match = Match(
                    tournament_id=saved_match.tournament_id,
                    team_a_id=winners[0],
                    team_b_id=winners[1],
                    team_a_score=0,
                    team_b_score=0,
                    status="예정",
                    winner_id=None,
                    round=2,
                    match_number=1,
                    next_match_id=None
                )

                db.add(final_match)
            else:
                final_match.team_a_id = winners[0]
                final_match.team_b_id = winners[1]

            db.commit()

    db.refresh(saved_match)
    db.close()

    return {
        "message": "경기 결과가 저장되었습니다.",
        "match": {
            "id": saved_match.id,
            "tournament_id": saved_match.tournament_id,
            "team_a_id": saved_match.team_a_id,
            "team_b_id": saved_match.team_b_id,
            "team_a_score": saved_match.team_a_score,
            "team_b_score": saved_match.team_b_score,
            "status": saved_match.status,
            "winner_id": saved_match.winner_id,
            "round": saved_match.round,
            "match_number": saved_match.match_number,
            "next_match_id": saved_match.next_match_id
        }
    }


@app.post("/api/bracket/generate")
def generate_bracket(data: dict):
    db = SessionLocal()

    tournament_id = str(data["tournament_id"])
    team_ids = data["team_ids"]

    if len(team_ids) != 4:
        db.close()

        return {
            "message": "4개의 팀을 선택해야 합니다."
        }

    existing_matches = db.query(Match).filter(
        Match.tournament_id == tournament_id
    ).all()

    if existing_matches:
        db.close()

        return {
            "message": "이미 해당 대회의 경기가 존재합니다."
        }

    semifinal_1 = Match(
        tournament_id=tournament_id,
        team_a_id=int(team_ids[0]),
        team_b_id=int(team_ids[1]),
        team_a_score=0,
        team_b_score=0,
        status="예정",
        winner_id=None,
        round=1,
        match_number=1,
        next_match_id=None
    )

    semifinal_2 = Match(
        tournament_id=tournament_id,
        team_a_id=int(team_ids[2]),
        team_b_id=int(team_ids[3]),
        team_a_score=0,
        team_b_score=0,
        status="예정",
        winner_id=None,
        round=1,
        match_number=2,
        next_match_id=None
    )

    db.add(semifinal_1)
    db.add(semifinal_2)
    db.commit()

    db.refresh(semifinal_1)
    db.refresh(semifinal_2)

    final_match = Match(
        tournament_id=tournament_id,
        team_a_id=None,
        team_b_id=None,
        team_a_score=0,
        team_b_score=0,
        status="예정",
        winner_id=None,
        round=2,
        match_number=1,
        next_match_id=None
    )

    db.add(final_match)
    db.commit()

    db.refresh(final_match)

    semifinal_1.next_match_id = final_match.id
    semifinal_2.next_match_id = final_match.id

    db.commit()
    db.close()

    return {
        "message": "대진표가 생성되었습니다.",
        "matches": [
            {
                "id": semifinal_1.id,
                "round": 1,
                "match_number": 1
            },
            {
                "id": semifinal_2.id,
                "round": 1,
                "match_number": 2
            },
            {
                "id": final_match.id,
                "round": 2,
                "match_number": 1
            }
        ]
    }

# ==========================================
# AI 하이라이트 생성
# ==========================================

GAME_PROFILES = {
    "lol": "moba",
    "valorant": "fps-shooter",
    "pubg": "pubg",
    "overwatch2": "fps-shooter",
    "worldoftanks": "default",
    "other": "default",
}


def get_game_profile(game: str) -> str:
    return GAME_PROFILES.get(game.lower(), "default")


def find_video_file(video_id: str):
    """
    yt-dlp가 실제로 생성한 영상 파일을 찾는다.
    """
    candidates = list(VIDEOS_DIR.glob(f"{video_id}.*"))

    # 임시 파일이나 자막 등은 제외
    video_candidates = [
        p for p in candidates
        if p.suffix.lower() in [".mp4", ".mkv", ".webm", ".mov"]
    ]

    if not video_candidates:
        return None

    # 가장 최근 파일 사용
    return max(video_candidates, key=lambda p: p.stat().st_mtime)


def download_youtube(url: str):
    """
    YouTube 영상을 backend/videos에 다운로드한다.
    """

    ydl_opts = {
        "format": "bestvideo[height<=720]+bestaudio/best",
        "merge_output_format": "mp4",
        "outtmpl": str(VIDEOS_DIR / "%(id)s.%(ext)s"),
        "js_runtimes": {
            "node": {}
        },
        "noplaylist": True,

        # 불필요한 다운로드 로그 숨기기
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        video_id = info.get("id")

    video_path = find_video_file(video_id)

    if not video_path:
        raise RuntimeError("YouTube 영상 다운로드 후 MP4 파일을 찾을 수 없습니다.")

    return video_path


def submit_hypecut(video_path: Path, profile: str):
    """
    다운로드된 영상을 HypeCut 서버에 업로드하고 job ID를 반환한다.
    """

    hypecut_profile = str(HYPECUT_ROOT / "configs" / f"{profile}.yaml")

    data = {
        "target_duration": "60",
        "max_clips": "2",
        "clips_per_reel": "2",
        "min_duration": "30",
        "max_duration": "60",
        "refiners": "diversity,pacing,similarity",
        "profile": hypecut_profile,
        "snap_to_shots": "true",
    }

    with open(video_path, "rb") as video_file:
        files = {
            "file": (
                video_path.name,
                video_file,
                "video/mp4"
            )
        }

        response = requests.post(
            f"{HYPECUT_URL}/api/jobs",
            files=files,
            data=data,
            timeout=120
        )

    if response.status_code >= 400:
        raise RuntimeError(
            f"HypeCut 작업 생성 실패: "
            f"{response.status_code} / {response.text}"
        )

    result = response.json()

    job_id = result.get("job_id") or result.get("id")

    if not job_id:
        raise RuntimeError(
            f"HypeCut 응답에서 job_id를 찾을 수 없습니다: {result}"
        )

    return job_id


def wait_for_hypecut(job_id: str, timeout_seconds: int = 1800):
    """
    HypeCut 작업이 완료될 때까지 상태를 확인한다.
    """

    start_time = time.time()
    last_reported_progress = -0.2

    while time.time() - start_time < timeout_seconds:

        response = requests.get(
            f"{HYPECUT_URL}/api/jobs/{job_id}",
            timeout=30
        )

        if response.status_code >= 400:
            raise RuntimeError(
                f"HypeCut 상태 확인 실패: "
                f"{response.status_code} / {response.text}"
            )

        result = response.json()

        status = str(result.get("status", "")).lower()

        progress_value = result.get("progress")
        try:
            progress = max(0.0, min(1.0, float(progress_value)))
        except (TypeError, ValueError):
            progress = None

        # HypeCut reports progress from 0.0 to 1.0. Log only at roughly
        # 20-point intervals so a long job does not flood the API terminal.
        if progress is not None:
            if progress >= last_reported_progress + 0.2 or status in ["done", "completed", "success"]:
                message = result.get("message") or status
                print(
                    f"[HypeCut] job={job_id}, "
                    f"progress={round(progress * 100)}%, "
                    f"status={status}, step={message}"
                )
                last_reported_progress = progress
        elif status in ["failed", "error", "cancelled"]:
            print(f"[HypeCut] job={job_id}, status={status}")

        if status in ["done", "completed", "success"]:
            return result

        if status in ["failed", "error", "cancelled"]:
            raise RuntimeError(
                f"HypeCut 작업 실패: {result}"
            )

        time.sleep(3)

    raise TimeoutError(
        f"HypeCut 작업이 {timeout_seconds}초 안에 완료되지 않았습니다."
    )


def make_video_thumbnail(video_path: Path):
    thumbnail_path = video_path.with_suffix(".jpg")
    if thumbnail_path.exists():
        return thumbnail_path

    try:
        subprocess.run(
            [
                "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                "-ss", "1", "-i", str(video_path),
                "-frames:v", "1", "-vf", "scale=480:-2",
                "-q:v", "4", str(thumbnail_path),
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=20,
        )
    except (OSError, subprocess.SubprocessError):
        return None

    return thumbnail_path if thumbnail_path.is_file() else None


def collect_hypecut_outputs(job_id: str, game: str = "other"):
    """
    HypeCut의 출력 MP4들을 찾아 highlights/{job_id}로 복사한다.
    """

    hypecut_output_dir = HYPECUT_DATA_DIR / "outputs"

    if not hypecut_output_dir.exists():
        raise RuntimeError(
            f"HypeCut 출력 폴더가 없습니다: {hypecut_output_dir}"
        )

    output_files = sorted(
        hypecut_output_dir.glob(f"{job_id}.part*.mp4")
    )

    if not output_files:
        # 혹시 part 이름이 다른 경우 job_id가 들어간 MP4도 확인
        output_files = sorted(
            [
                p for p in hypecut_output_dir.glob(f"{job_id}*.mp4")
                if p.is_file()
            ]
        )

    if not output_files:
        raise RuntimeError(
            f"HypeCut에서 생성된 MP4 파일을 찾을 수 없습니다. "
            f"job_id={job_id}"
        )

    destination_dir = HIGHLIGHTS_DIR / job_id
    destination_dir.mkdir(parents=True, exist_ok=True)
    metadata_path = destination_dir / "_metadata.json"
    metadata_path.write_text(
        json.dumps({"game": game}, ensure_ascii=False),
        encoding="utf-8",
    )

    result_files = []

    for source_file in output_files:
        destination_file = destination_dir / source_file.name

        shutil.copy2(
            source_file,
            destination_file
        )
        make_video_thumbnail(destination_file)

        result_files.append(
            f"/highlights/{job_id}/{destination_file.name}"
        )

    return result_files


def get_highlight_game(path: Path):
    metadata_path = path.parent / "_metadata.json"
    try:
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        if metadata.get("game"):
            return str(metadata["game"]).lower()
    except (OSError, json.JSONDecodeError):
        pass

    hypecut_output_dir = HYPECUT_DATA_DIR / "outputs"
    job_id = path.parent.name
    sidecars = sorted(hypecut_output_dir.glob(f"{job_id}.part*.hypecut.json"))
    if not sidecars:
        return ""

    try:
        result = json.loads(sidecars[0].read_text(encoding="utf-8"))
        signals = set(result.get("signals", []))
    except (OSError, json.JSONDecodeError, AttributeError):
        return ""

    if "lol_action" in signals:
        return "lol"
    if signals == {"audio_transient", "valorant_killfeed"}:
        return "pubg"
    if "valorant_killfeed" in signals and "flash" in signals:
        # Valorant and Overwatch 2 share the fps-shooter profile in HypeCut.
        return "fps-shooter"
    return ""


@app.get("/api/highlights")
def list_highlights():
    files = sorted(HIGHLIGHTS_DIR.rglob("*.mp4"), key=lambda p: p.stat().st_mtime, reverse=True)
    db = SessionLocal()
    try:
        videos = []
        for path in files:
            video_id = path.relative_to(HIGHLIGHTS_DIR).as_posix()
            count = db.query(HighlightComment).filter(HighlightComment.video_id == video_id).count()
            game = get_highlight_game(path)
            game_names = {
                "lol": "리그 오브 레전드",
                "valorant": "발로란트",
                "pubg": "PUBG",
                "overwatch2": "오버워치 2",
                "worldoftanks": "월드 오브 탱크",
                "other": "기타 게임",
                "fps-shooter": "발로란트·오버워치 2",
            }
            game_name = game_names.get(game, "게임 프로필 확인 불가")
            part_number = path.stem.rsplit("part", 1)[-1]
            thumbnail_path = make_video_thumbnail(path)
            thumbnail_id = path.relative_to(HIGHLIGHTS_DIR).with_suffix(".jpg").as_posix()
            videos.append({
                "id": video_id,
                "title": f"{game_name} 하이라이트 {part_number}",
                "game_name": game_name,
                "video_url": "/highlights/" + quote(video_id, safe="/"),
                "thumbnail_url": (
                    "/highlights/" + quote(thumbnail_id, safe="/")
                    if thumbnail_path else None
                ),
                "created_at": time.strftime("%Y-%m-%d %H:%M", time.localtime(path.stat().st_mtime)),
                "comments_count": count,
            })
        return {"videos": videos}
    finally:
        db.close()


@app.get("/api/highlight-comments")
def list_highlight_comments(video_id: str):
    db = SessionLocal()
    try:
        rows = db.query(HighlightComment).filter(
            HighlightComment.video_id == video_id
        ).order_by(HighlightComment.id.desc()).all()
        return {"comments": [
            {"id": row.id, "author": row.author, "content": row.content, "created_at": row.created_at}
            for row in rows
        ]}
    finally:
        db.close()


@app.post("/api/highlight-comments")
def create_highlight_comment(payload: dict):
    video_id = str(payload.get("video_id", "")).strip()
    content = str(payload.get("content", "")).strip()
    author = str(payload.get("author", "")).strip() or "익명"
    video_path = (HIGHLIGHTS_DIR / video_id).resolve()
    if not video_id or not video_path.is_relative_to(HIGHLIGHTS_DIR.resolve()):
        raise HTTPException(status_code=400, detail="영상 정보가 올바르지 않습니다.")
    if video_path.suffix.lower() != ".mp4" or not video_path.is_file():
        raise HTTPException(status_code=404, detail="하이라이트 영상을 찾을 수 없습니다.")
    if not content:
        raise HTTPException(status_code=400, detail="댓글 내용을 입력해주세요.")
    if len(content) > 1000:
        raise HTTPException(status_code=400, detail="댓글은 1000자 이내로 작성해주세요.")

    db = SessionLocal()
    try:
        row = HighlightComment(
            video_id=video_id, author=author[:80], content=content,
            created_at=time.strftime("%Y-%m-%d %H:%M"),
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return {"comment": {
            "id": row.id, "author": row.author, "content": row.content, "created_at": row.created_at
        }}
    finally:
        db.close()


@app.post("/api/highlight")
async def create_highlight(
    request: Request,
    video_file: UploadFile = File(None)
):
    """
    AI 하이라이트 생성 API

    지원 방식

    1. JSON
       {
           "url": "YouTube URL",
           "game": "lol"
       }

    2. multipart/form-data
       video_file = 영상 파일
       game = lol / valorant / pubg / overwatch2 / worldoftanks / other
    """

    content_type = request.headers.get("content-type", "")

    url = ""
    game = "other"

    if "multipart/form-data" in content_type:

        form = await request.form()

        url = str(form.get("url", "") or "")
        game = str(form.get("game", "other") or "other")

        # Request에서 가져온 파일이 우선
        form_video = form.get("video_file")

        if form_video is not None and hasattr(form_video, "filename"):
            video_file = form_video

    else:

        try:
            body = await request.json()

            url = str(body.get("url", "") or "")
            game = str(body.get("game", "other") or "other")

        except Exception:
            body = {}

    if not url and not video_file:
        return {
            "success": False,
            "message": "YouTube URL 또는 영상 파일을 입력해주세요."
        }

    try:

        # ------------------------------------------
        # 1. 영상 준비
        # ------------------------------------------

        if video_file and video_file.filename:
            if Path(video_file.filename).suffix.lower() != ".mp4":
                return {
                    "success": False,
                    "message": "MP4 형식의 영상 파일만 업로드할 수 있습니다."
                }

            video_path = VIDEOS_DIR / f"{uuid.uuid4().hex}.mp4"

            with open(video_path, "wb") as buffer:
                shutil.copyfileobj(
                    video_file.file,
                    buffer
                )

        else:

            print(f"[Highlight] 하이라이트 생성 시작 {url}")

            video_path = download_youtube(url)

        print(
            f"[Highlight] 영상 준비 완료: {video_path}"
        )

        # ------------------------------------------
        # 2. 게임 프로필 결정
        # ------------------------------------------

        profile = get_game_profile(game)

        print(
            f"[Highlight] game={game}, "
            f"profile={profile}"
        )

        # ------------------------------------------
        # 3. HypeCut 작업 생성
        # ------------------------------------------

        job_id = submit_hypecut(
            video_path,
            profile
        )

        print(
            f"[Highlight] HypeCut job 생성: {job_id}"
        )

        # ------------------------------------------
        # 4. HypeCut 완료 대기
        # ------------------------------------------

        job_result = wait_for_hypecut(job_id)


        if int(job_result.get("parts") or 0) == 0:
            detail = job_result.get("message") or "선택된 하이라이트가 없습니다."
            print(f"[Highlight] HypeCut 결과 없음 | {detail}")
            return {
                "success": False,
                "message": "이 영상에서 뚜렷한 하이라이트 장면을 찾지 못했습니다. 다른 영상으로 다시 시도해 주세요.",
                "job_id": job_id,
                "detail": detail,
            }

        print(
            f"[Highlight] HypeCut 완료 | "
            f"상태={job_result.get('status')} | "
            f"결과 클립={job_result.get('parts', 0)}개"
        )

        # ------------------------------------------
        # 5. 결과 MP4 복사
        # ------------------------------------------

        output_urls = collect_hypecut_outputs(
            job_id,
            game,
        )

        print(
            f"[Highlight] 하이라이트 생성 완료 | "
            f"결과 {len(output_urls)}개"
        )

        return {
            "success": True,
            "job_id": job_id,
            "game": game,
            "profile": profile,
            "status": "done",
            "videos": output_urls,
            "video_url": output_urls[0] if output_urls else None,
        }

    except Exception as e:

        print(
            f"[Highlight ERROR] {type(e).__name__}: {e}"
        )

        return {
            "success": False,
            "message": str(e)
        }
