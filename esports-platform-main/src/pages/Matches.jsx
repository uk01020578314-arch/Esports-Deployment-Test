import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

function Matches() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const tournamentId = searchParams.get("tournament");

  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [scores, setScores] = useState({});
  const [tournament, setTournament] = useState(null);

  const user = JSON.parse(
    localStorage.getItem("esports_user")
  );

  const canManage = () => {
    if (!user || !tournament) {
      return false;
    }

    if (user.role === "admin") {
      return true;
    }

    return user.email === tournament.creator_email;
  };

  useEffect(() => {
    getData();
  }, [tournamentId]);

  const getData = async () => {
    try {
      const matchesResponse = await fetch(
        "http://127.0.0.1:8000/api/matches"
      );

      const teamsResponse = await fetch(
        "http://127.0.0.1:8000/api/teams"
      );

      const tournamentsResponse = await fetch(
        "http://127.0.0.1:8000/api/tournaments"
      );

      const matchesData = await matchesResponse.json();
      const teamsData = await teamsResponse.json();
      const tournamentsData =
        await tournamentsResponse.json();

      const selectedTournament =
        (tournamentsData.tournaments || []).find(
          (item) =>
            String(item.id) === String(tournamentId)
        );

      setTournament(
        selectedTournament || null
      );

      const allMatches = matchesData.matches || [];

      const filteredMatches = tournamentId
        ? allMatches.filter(
            (match) =>
              String(match.tournament_id) ===
                String(tournamentId) ||
              (String(tournamentId) === "1" &&
                String(match.tournament_id) ===
                  "default-1")
          )
        : allMatches;

      setMatches(filteredMatches);
      setTeams(teamsData.teams || []);

      const scoreData = {};

      filteredMatches.forEach((match) => {
        scoreData[match.id] = {
          team_a_score: match.team_a_score,
          team_b_score: match.team_b_score,
        };
      });

      setScores(scoreData);
    } catch (error) {
      console.error(
        "경기 정보를 불러오지 못했습니다.",
        error
      );
    }
  };

  const getTeamName = (teamId) => {
    const team = teams.find(
      (item) =>
        Number(item.id) === Number(teamId)
    );

    return team ? team.name : "알 수 없는 팀";
  };

  const changeScore = (
    matchId,
    team,
    value
  ) => {
    if (!canManage()) {
      return;
    }

    setScores((current) => ({
      ...current,
      [matchId]: {
        ...current[matchId],
        [team]: value,
      },
    }));
  };

  const saveResult = async (matchId) => {
    if (!canManage()) {
      alert("경기 결과를 수정할 권한이 없습니다.");
      return;
    }

    const score = scores[matchId];

    if (!score) {
      return;
    }

    const teamAScore = Number(
      score.team_a_score
    );

    const teamBScore = Number(
      score.team_b_score
    );

    if (
      teamAScore < 0 ||
      teamBScore < 0
    ) {
      alert("점수는 0 이상이어야 합니다.");
      return;
    }

    if (teamAScore === teamBScore) {
      alert(
        "동점으로는 경기를 종료할 수 없습니다."
      );
      return;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/matches/${matchId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            team_a_score: teamAScore,
            team_b_score: teamBScore,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.message ||
            "결과 저장에 실패했습니다."
        );
        return;
      }

      alert("경기 결과가 저장되었습니다.");

      getData();
    } catch (error) {
      console.error(error);
      alert("서버에 연결할 수 없습니다.");
    }
  };

  const finalMatch = matches.find(
    (match) =>
      Number(match.round) === 2 &&
      Number(match.match_number) === 1
  );

  const winnerTeam =
    finalMatch &&
    finalMatch.status === "종료"
      ? finalMatch.team_a_score >
        finalMatch.team_b_score
        ? finalMatch.team_a_id
        : finalMatch.team_b_id
      : null;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="page-subtitle">
            MATCH
          </p>

          <h1>
            {canManage()
              ? "경기 관리"
              : "경기 결과"}
          </h1>

          <p>
            {canManage()
              ? "대회 경기 일정과 결과를 관리할 수 있습니다."
              : "대회 경기 일정과 결과를 확인할 수 있습니다."}
          </p>
        </div>

        {canManage() && (
          <button
            className="primary-button"
            onClick={() =>
              navigate(
                tournamentId
                  ? `/matches/create?tournament=${tournamentId}`
                  : "/matches/create"
              )
            }
          >
            + 경기 생성
          </button>
        )}
      </header>

      {matches.length === 0 ? (
        <section className="team-list-card">
          <div className="empty-tournament">
            <h3>등록된 경기가 없습니다.</h3>

            <p>
              {canManage()
                ? "경기 생성 버튼을 눌러 새로운 경기를 등록해주세요."
                : "아직 등록된 경기가 없습니다."}
            </p>
          </div>
        </section>
      ) : (
        <section className="team-list-card">
          <div className="section-title">
            <div>
              <p>MATCH LIST</p>

              <h2>등록된 경기</h2>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: "16px",
            }}
          >
            {matches.map((match) => (
              <article
                key={match.id}
                style={{
                  padding: "24px",
                  border:
                    "1px solid rgba(148, 163, 184, 0.18)",
                  borderRadius: "14px",
                  background:
                    "linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.7))",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                    marginBottom: "24px",
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#94a3b8",
                      }}
                    >
                      MATCH #{match.id}
                    </span>
                  </div>

                  <span
                    style={{
                      padding: "6px 12px",
                      borderRadius: "20px",
                      background:
                        match.status === "종료"
                          ? "rgba(34, 197, 94, 0.12)"
                          : "rgba(34, 211, 238, 0.12)",
                      border:
                        match.status === "종료"
                          ? "1px solid rgba(34, 197, 94, 0.25)"
                          : "1px solid rgba(34, 211, 238, 0.25)",
                      color:
                        match.status === "종료"
                          ? "#86efac"
                          : "#67e8f9",
                      fontSize: "13px",
                      fontWeight: "600",
                    }}
                  >
                    {match.status}
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "1fr auto 1fr",
                    alignItems: "center",
                    gap: "20px",
                  }}
                >
                  <div
                    style={{
                      textAlign: "right",
                      fontSize: "20px",
                      fontWeight: "700",
                      color: "#f8fafc",
                    }}
                  >
                    {getTeamName(
                      match.team_a_id
                    )}
                  </div>

                  <div
                    style={{
                      minWidth: "150px",
                      textAlign: "center",
                    }}
                  >
                    {canManage() ? (
                      <>
                        <div
                          style={{
                            display: "flex",
                            justifyContent:
                              "center",
                            alignItems:
                              "center",
                            gap: "10px",
                          }}
                        >
                          <input
                            type="number"
                            min="0"
                            value={
                              scores[match.id]
                                ?.team_a_score ??
                              0
                            }
                            onChange={(e) =>
                              changeScore(
                                match.id,
                                "team_a_score",
                                e.target.value
                              )
                            }
                            style={{
                              width: "55px",
                              padding: "8px",
                              textAlign:
                                "center",
                              background:
                                "#0f172a",
                              border:
                                "1px solid #334155",
                              borderRadius:
                                "8px",
                              color: "#fff",
                              fontSize:
                                "18px",
                              fontWeight:
                                "700",
                            }}
                          />

                          <span
                            style={{
                              color:
                                "#64748b",
                              fontSize:
                                "20px",
                            }}
                          >
                            :
                          </span>

                          <input
                            type="number"
                            min="0"
                            value={
                              scores[match.id]
                                ?.team_b_score ??
                              0
                            }
                            onChange={(e) =>
                              changeScore(
                                match.id,
                                "team_b_score",
                                e.target.value
                              )
                            }
                            style={{
                              width: "55px",
                              padding: "8px",
                              textAlign:
                                "center",
                              background:
                                "#0f172a",
                              border:
                                "1px solid #334155",
                              borderRadius:
                                "8px",
                              color: "#fff",
                              fontSize:
                                "18px",
                              fontWeight:
                                "700",
                            }}
                          />
                        </div>

                        <button
                          onClick={() =>
                            saveResult(
                              match.id
                            )
                          }
                          style={{
                            marginTop:
                              "12px",
                            padding:
                              "8px 16px",
                            border: "none",
                            borderRadius:
                              "8px",
                            background:
                              "linear-gradient(135deg, #2563eb, #7c3aed)",
                            color: "#fff",
                            fontSize:
                              "13px",
                            fontWeight:
                              "600",
                            cursor:
                              "pointer",
                          }}
                        >
                          결과 저장
                        </button>
                      </>
                    ) : (
                      <div
                        style={{
                          fontSize: "24px",
                          fontWeight: "700",
                          color: "#f8fafc",
                        }}
                      >
                        {match.team_a_score} :{" "}
                        {match.team_b_score}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      textAlign: "left",
                      fontSize: "20px",
                      fontWeight: "700",
                      color: "#f8fafc",
                    }}
                  >
                    {getTeamName(
                      match.team_b_id
                    )}
                  </div>
                </div>

                {match.status === "종료" && (
                  <div
                    style={{
                      marginTop: "20px",
                      paddingTop: "16px",
                      borderTop:
                        "1px solid rgba(148, 163, 184, 0.15)",
                      textAlign: "center",
                    }}
                  >
                    <span
                      style={{
                        color: "#86efac",
                        fontWeight: "700",
                      }}
                    >
                      승리팀:{" "}
                      {match.team_a_score >
                      match.team_b_score
                        ? getTeamName(
                            match.team_a_id
                          )
                        : getTeamName(
                            match.team_b_id
                          )}
                    </span>
                  </div>
                )}
              </article>
            ))}
          </div>

          {winnerTeam && (
            <div
              style={{
                marginTop: "32px",
                padding: "32px",
                textAlign: "center",
                borderRadius: "16px",
                border:
                  "1px solid rgba(250, 204, 21, 0.3)",
                background:
                  "linear-gradient(135deg, rgba(250, 204, 21, 0.08), rgba(245, 158, 11, 0.05))",
              }}
            >
              <div
                style={{
                  fontSize: "40px",
                  marginBottom: "12px",
                }}
              >
                🏆
              </div>

              <p
                style={{
                  margin: 0,
                  color: "#facc15",
                  fontSize: "14px",
                  fontWeight: "600",
                }}
              >
                TOURNAMENT CHAMPION
              </p>

              <h2
                style={{
                  margin: "8px 0 0",
                  color: "#fff",
                  fontSize: "28px",
                }}
              >
                {getTeamName(winnerTeam)}
              </h2>

              <p
                style={{
                  margin: "8px 0 0",
                  color: "#94a3b8",
                }}
              >
                최종 우승팀
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default Matches;