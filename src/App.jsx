import { useState, useCallback, useRef, useEffect } from "react";

// ============================================================
// CONSTANTS
// ============================================================
const POSITIONS = ["OH", "MB", "OP", "S", "L"];
const SCORE_TYPES = ["스파이크", "서브에이스", "블로킹", "상대실수", "기타"];
const ZONES = [
  { id: 1, label: "1존", x: 66.6, y: 66.6 },
  { id: 2, label: "2존", x: 66.6, y: 33.3 },
  { id: 3, label: "3존", x: 33.3, y: 33.3 },
  { id: 4, label: "4존", x: 0,    y: 33.3 },
  { id: 5, label: "5존", x: 0,    y: 66.6 },
  { id: 6, label: "6존", x: 33.3, y: 66.6 },
];

const ROTATION_SLOTS = [
  { slot: 0, label: "P1(서버)", zone: "1존" },
  { slot: 1, label: "P2", zone: "6존" },
  { slot: 2, label: "P3", zone: "5존" },
  { slot: 3, label: "P4", zone: "4존" },
  { slot: 4, label: "P5", zone: "3존" },
  { slot: 5, label: "P6", zone: "2존" },
];

const SLOT_POSITIONS = [
  { top: "62%", left: "75%" },
  { top: "62%", left: "50%" },
  { top: "62%", left: "25%" },
  { top: "28%", left: "25%" },
  { top: "28%", left: "50%" },
  { top: "28%", left: "75%" },
];

const COLORS = {
  bg: "#0a0e1a",
  surface: "#111827",
  card: "#1a2235",
  border: "#1e293b",
  accent: "#3b82f6",
  accentGlow: "#60a5fa",
  success: "#10b981",
  danger: "#ef4444",
  warn: "#f59e0b",
  text: "#f1f5f9",
  muted: "#64748b",
  libero: "#8b5cf6",
};

// ============================================================
// UTILITIES
// ============================================================
function getZoneFromXY(x, y, isOurCourt) {
  const normX = x / 100;
  const normY = isOurCourt ? (y - 50) / 50 : y / 50;
  const col = normX < 0.333 ? 0 : normX < 0.666 ? 1 : 2;
  const row = normY < 0.5 ? 0 : 1;
  if (isOurCourt) {
    const map = [[4,3,2],[5,6,1]];
    return map[row][col];
  } else {
    const map = [[4,3,2],[5,6,1]];
    return map[row][col];
  }
}

function rotateArray(arr, steps = 1) {
  const n = arr.length;
  const s = ((steps % n) + n) % n;
  return [...arr.slice(s), ...arr.slice(0, s)];
}

function initSet(myPlayers, opponentPlayers, myServes, liberoId, liberoReplaceId) {
  return {
    myRotation: myPlayers.slice(0, 6),
    opponentRotation: opponentPlayers.slice(0, 6),
    myScore: 0,
    oppScore: 0,
    myServes,
    rallies: [],
    liberoId,
    liberoReplaceId,
  };
}

// ============================================================
// SUBCOMPONENTS
// ============================================================

// ── Top Tab Bar ──────────────────────────────────────────────
function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display:"flex", gap:4, background:COLORS.surface, padding:"4px", borderRadius:12, overflowX:"auto" }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          flex:1, padding:"8px 14px", borderRadius:8, border:"none", cursor:"pointer", fontSize:13, fontWeight:600,
          fontFamily:"'Pretendard', sans-serif", whiteSpace:"nowrap", transition:"all .2s",
          background: active===t.id ? COLORS.accent : "transparent",
          color: active===t.id ? "#fff" : COLORS.muted,
        }}>{t.label}</button>
      ))}
    </div>
  );
}

// ── Player Badge ─────────────────────────────────────────────
function PlayerBadge({ player, size=36, onClick, selected, style={} }) {
  if (!player) return <div style={{ width:size, height:size }} />;
  const isLibero = player.position === "L";
  const bg = selected ? COLORS.accent : isLibero ? COLORS.libero : COLORS.card;
  return (
    <div onClick={onClick} style={{
      width:size, height:size, borderRadius:"50%", background:bg,
      border:`2px solid ${selected ? COLORS.accentGlow : isLibero ? "#a78bfa" : COLORS.border}`,
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      cursor:onClick?"pointer":"default", transition:"all .15s",
      boxShadow: selected ? `0 0 12px ${COLORS.accent}88` : "none",
      fontSize:9, fontFamily:"'Pretendard', sans-serif", color:"#fff", ...style,
    }}>
      <span style={{ fontSize:11, fontWeight:700 }}>#{player.number}</span>
      <span style={{ fontSize:8, color:"#cbd5e1", opacity:.8 }}>{player.position}</span>
    </div>
  );
}

// ── Court Diagram ────────────────────────────────────────────
function CourtDiagram({ rotation, liberoId, liberoReplaceId, size=280, label="우리팀" }) {
  const courtH = size * 0.45;
  return (
    <div style={{ fontFamily:"'Pretendard', sans-serif" }}>
      <div style={{ fontSize:11, color:COLORS.muted, marginBottom:4, textAlign:"center" }}>{label}</div>
      <div style={{
        width:size, height:courtH*2+4, borderRadius:8, overflow:"hidden",
        border:`1.5px solid ${COLORS.border}`, position:"relative",
      }}>
        {/* 상대 코트 */}
        <div style={{ width:"100%", height:courtH, background:"#0f1929", position:"relative", borderBottom:`2px solid ${COLORS.accent}44` }}>
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:10, color:COLORS.muted, opacity:.4 }}>상대 코트</span>
          </div>
          {/* net */}
        </div>
        {/* 우리 코트 */}
        <div style={{ width:"100%", height:courtH, background:"#0d1f35", position:"relative" }}>
          {/* 존 라인 */}
          <div style={{ position:"absolute", top:0, left:"33.3%", width:1, height:"100%", background:COLORS.border, opacity:.4 }} />
          <div style={{ position:"absolute", top:0, left:"66.6%", width:1, height:"100%", background:COLORS.border, opacity:.4 }} />
          <div style={{ position:"absolute", top:"50%", left:0, width:"100%", height:1, background:COLORS.border, opacity:.4 }} />
          {/* 선수 뱃지 */}
          {rotation.map((player, i) => {
            const pos = SLOT_POSITIONS[i];
            const isLiberoSlot = player && player.id === liberoId;
            const replacePlayer = rotation.find(p => p && p.id === liberoReplaceId);
            const showLibero = isLiberoSlot;
            return player ? (
              <div key={i} style={{
                position:"absolute", top:pos.top, left:pos.left,
                transform:"translate(-50%,-50%)", zIndex:2,
              }}>
                <PlayerBadge player={player} size={32} />
              </div>
            ) : null;
          })}
        </div>
        {/* 네트 라인 */}
        <div style={{ position:"absolute", top:"50%", left:0, width:"100%", height:3, background:`linear-gradient(90deg, transparent, ${COLORS.accent}, transparent)`, transform:"translateY(-50%)" }} />
      </div>
    </div>
  );
}

// ── Heatmap ──────────────────────────────────────────────────
function HeatmapView({ rallies, width=280 }) {
  const canvasRef = useRef();
  const height = width * 0.5;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);

    // 코트 배경
    ctx.fillStyle = "#0d1f35";
    ctx.fillRect(0, 0, width, height);

    // 존 라인
    ctx.strokeStyle = "#1e3a5f";
    ctx.lineWidth = 1;
    [width/3, width*2/3].forEach(x => { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,height); ctx.stroke(); });
    [height/2].forEach(y => { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(width,y); ctx.stroke(); });

    // 히트 포인트
    rallies.forEach(r => {
      if (r.hitX == null || r.hitY == null) return;
      const px = (r.hitX / 100) * width;
      const py = (r.hitY / 100) * height;
      const grad = ctx.createRadialGradient(px, py, 0, px, py, 22);
      grad.addColorStop(0, "rgba(239,68,68,0.7)");
      grad.addColorStop(1, "rgba(239,68,68,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, 22, 0, Math.PI*2);
      ctx.fill();
    });

    // 존 번호
    const zoneLabels = [[1,"67%","67%"],[2,"67%","17%"],[3,"50%","17%"],[4,"17%","17%"],[5,"17%","67%"],[6,"50%","67%"]];
    ctx.fillStyle = "rgba(100,116,139,0.5)";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    zoneLabels.forEach(([z,lx,ly]) => {
      const px = parseFloat(lx)/100*width;
      const py = parseFloat(ly)/100*height;
      ctx.fillText(`${z}존`, px, py);
    });
  }, [rallies, width]);

  const zoneCount = {};
  rallies.forEach(r => { if (r.zone) zoneCount[r.zone] = (zoneCount[r.zone]||0)+1; });

  return (
    <div>
      <canvas ref={canvasRef} width={width} height={height} style={{ borderRadius:8, border:`1px solid ${COLORS.border}`, display:"block" }} />
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:8 }}>
        {[1,2,3,4,5,6].map(z => (
          <div key={z} style={{
            padding:"4px 10px", borderRadius:6, background:COLORS.card,
            border:`1px solid ${COLORS.border}`, fontSize:12, color:COLORS.text,
            fontFamily:"'Pretendard', sans-serif",
          }}>
            <span style={{ color:COLORS.muted }}>{z}존 </span>
            <span style={{ color:COLORS.danger, fontWeight:700 }}>{zoneCount[z]||0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Score Log ────────────────────────────────────────────────
function ScoreLog({ rallies, myPlayers, oppPlayers }) {
  if (!rallies.length) return (
    <div style={{ textAlign:"center", padding:24, color:COLORS.muted, fontSize:13, fontFamily:"'Pretendard', sans-serif" }}>
      아직 기록된 랠리가 없어요
    </div>
  );
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:320, overflowY:"auto" }}>
      {[...rallies].reverse().map((r, i) => {
        const isOurs = r.scorer === "us";
        const player = isOurs
          ? myPlayers.find(p => p && p.id === r.playerId)
          : oppPlayers.find(p => p && p.id === r.playerId);
        return (
          <div key={i} style={{
            display:"flex", alignItems:"center", gap:10, padding:"8px 12px",
            borderRadius:8, background:COLORS.card, border:`1px solid ${COLORS.border}`,
            fontFamily:"'Pretendard', sans-serif",
          }}>
            <div style={{
              width:6, height:6, borderRadius:"50%", flexShrink:0,
              background: isOurs ? COLORS.success : COLORS.danger,
              boxShadow: `0 0 6px ${isOurs ? COLORS.success : COLORS.danger}`,
            }} />
            <span style={{ fontSize:12, color:isOurs?COLORS.success:COLORS.danger, fontWeight:700, width:36, flexShrink:0 }}>
              {isOurs ? "득점" : "실점"}
            </span>
            <span style={{ fontSize:12, color:COLORS.text, flex:1 }}>{r.type}</span>
            {player && <span style={{ fontSize:11, color:COLORS.muted }}>#{player.number} {player.name}</span>}
            {r.zone && <span style={{ fontSize:11, color:COLORS.warn, background:`${COLORS.warn}22`, padding:"2px 6px", borderRadius:4 }}>{r.zone}존</span>}
          </div>
        );
      })}
    </div>
  );
}

// ── Court Tap Input ──────────────────────────────────────────
function CourtTapInput({ onTap, label="공이 떨어진 위치를 탭하세요" }) {
  const [tapPos, setTapPos] = useState(null);
  const ref = useRef();

  const handleTap = (e) => {
    const rect = ref.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    const isOurHalf = y > 50;
    const zone = getZoneFromXY(x, y, isOurHalf);
    setTapPos({ x, y });
    onTap({ x, y, zone, isOurCourt: isOurHalf });
  };

  return (
    <div>
      <div style={{ fontSize:12, color:COLORS.muted, marginBottom:6, textAlign:"center", fontFamily:"'Pretendard', sans-serif" }}>{label}</div>
      <div ref={ref} onClick={handleTap} onTouchStart={handleTap} style={{
        width:"100%", aspectRatio:"2/1", borderRadius:8, border:`2px solid ${COLORS.accent}`,
        background:"#0d1f35", position:"relative", cursor:"crosshair", overflow:"hidden",
      }}>
        {/* 상대 코트 */}
        <div style={{ position:"absolute", top:0, left:0, right:0, height:"50%", background:"#0f1929", borderBottom:`2px dashed ${COLORS.accent}44` }}>
          <span style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", fontSize:10, color:COLORS.muted, opacity:.5 }}>상대 코트</span>
        </div>
        {/* 우리 코트 */}
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"50%" }}>
          <span style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", fontSize:10, color:COLORS.muted, opacity:.5 }}>우리 코트</span>
        </div>
        {/* 존 라인 */}
        <div style={{ position:"absolute", top:0, left:"33.3%", width:1, height:"100%", background:COLORS.border }} />
        <div style={{ position:"absolute", top:0, left:"66.6%", width:1, height:"100%", background:COLORS.border }} />
        {/* 네트 */}
        <div style={{ position:"absolute", top:"50%", left:0, right:0, height:3, background:`linear-gradient(90deg,transparent,${COLORS.accent},transparent)`, transform:"translateY(-50%)" }} />
        {/* 탭 표시 */}
        {tapPos && (
          <div style={{
            position:"absolute", left:`${tapPos.x}%`, top:`${tapPos.y}%`,
            width:16, height:16, borderRadius:"50%", background:COLORS.danger,
            transform:"translate(-50%,-50%)", border:"2px solid #fff",
            boxShadow:`0 0 10px ${COLORS.danger}`,
          }} />
        )}
      </div>
    </div>
  );
}

// ── Rally Input Modal ────────────────────────────────────────
function RallyModal({ isOpen, onClose, onSubmit, myRotation, oppRotation, myPlayers, oppPlayers }) {
  const [step, setStep] = useState(0);
  const [scorer, setScorer] = useState(null);
  const [type, setType] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [hitPos, setHitPos] = useState(null);

  useEffect(() => { if (isOpen) { setStep(0); setScorer(null); setType(null); setPlayerId(null); setHitPos(null); } }, [isOpen]);

  if (!isOpen) return null;

  const currentPlayers = scorer === "us" ? myRotation.filter(Boolean) : oppRotation.filter(Boolean);

  const handleSubmit = () => {
    onSubmit({ scorer, type, playerId, hitX: hitPos?.x, hitY: hitPos?.y, zone: hitPos?.zone });
    onClose();
  };

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,.7)", zIndex:100,
      display:"flex", alignItems:"flex-end", fontFamily:"'Pretendard', sans-serif",
    }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:"100%", maxWidth:480, margin:"0 auto", background:COLORS.surface,
        borderRadius:"20px 20px 0 0", padding:"20px 16px 32px", maxHeight:"85vh", overflowY:"auto",
      }}>
        {/* Handle */}
        <div style={{ width:36, height:4, borderRadius:2, background:COLORS.border, margin:"0 auto 16px" }} />

        {/* Step 0: 득점/실점 */}
        {step === 0 && (
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:COLORS.text, marginBottom:16, textAlign:"center" }}>득점 / 실점</div>
            <div style={{ display:"flex", gap:10 }}>
              {[{id:"us",label:"우리팀 득점",color:COLORS.success},{id:"opp",label:"상대팀 득점",color:COLORS.danger}].map(s => (
                <button key={s.id} onClick={() => { setScorer(s.id); setStep(1); }} style={{
                  flex:1, padding:"18px 8px", borderRadius:12, border:`2px solid ${s.color}44`,
                  background:`${s.color}18`, color:s.color, fontSize:15, fontWeight:700, cursor:"pointer",
                }}>{s.label}</button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: 득점 유형 */}
        {step === 1 && (
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:COLORS.text, marginBottom:16, textAlign:"center" }}>득점 유형</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {SCORE_TYPES.map(t => (
                <button key={t} onClick={() => { setType(t); setStep(2); }} style={{
                  padding:"12px 16px", borderRadius:10, border:`1.5px solid ${COLORS.border}`,
                  background: type===t ? COLORS.accent : COLORS.card,
                  color: COLORS.text, fontSize:14, fontWeight:600, cursor:"pointer",
                }}>{t}</button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: 선수 선택 */}
        {step === 2 && (
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:COLORS.text, marginBottom:4, textAlign:"center" }}>
              {scorer==="us" ? "우리팀" : "상대팀"} 공격 선수
            </div>
            <div style={{ fontSize:12, color:COLORS.muted, marginBottom:12, textAlign:"center" }}>선택 안 해도 됩니다</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8, justifyContent:"center", marginBottom:16 }}>
              {currentPlayers.map(p => (
                <div key={p.id} onClick={() => setPlayerId(playerId===p.id ? null : p.id)} style={{
                  padding:"8px 14px", borderRadius:8, cursor:"pointer",
                  background: playerId===p.id ? COLORS.accent : COLORS.card,
                  border:`1.5px solid ${playerId===p.id ? COLORS.accent : COLORS.border}`,
                  color:COLORS.text, fontSize:13, fontWeight:600,
                }}>#{p.number} {p.name}</div>
              ))}
            </div>
            <button onClick={() => setStep(3)} style={{
              width:"100%", padding:"13px", borderRadius:10, background:COLORS.accent,
              border:"none", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer",
            }}>다음 →</button>
          </div>
        )}

        {/* Step 3: 위치 탭 */}
        {step === 3 && (
          <div>
            <CourtTapInput onTap={pos => { setHitPos(pos); }} />
            {hitPos && (
              <div style={{ marginTop:8, textAlign:"center", fontSize:13, color:COLORS.warn, fontWeight:600 }}>
                {hitPos.isOurCourt ? "우리 코트" : "상대 코트"} {hitPos.zone}존 선택됨
              </div>
            )}
            <div style={{ display:"flex", gap:8, marginTop:14 }}>
              <button onClick={() => { setHitPos(null); handleSubmit(); }} style={{
                flex:1, padding:"13px", borderRadius:10, background:COLORS.card,
                border:`1px solid ${COLORS.border}`, color:COLORS.muted, fontSize:13, cursor:"pointer",
              }}>위치 생략</button>
              <button onClick={handleSubmit} disabled={!hitPos} style={{
                flex:2, padding:"13px", borderRadius:10, background: hitPos ? COLORS.accent : COLORS.border,
                border:"none", color:"#fff", fontSize:14, fontWeight:700, cursor: hitPos?"pointer":"not-allowed",
              }}>기록 완료 ✓</button>
            </div>
          </div>
        )}

        {/* 뒤로 버튼 */}
        {step > 0 && (
          <button onClick={() => setStep(s=>s-1)} style={{
            marginTop:12, width:"100%", padding:"10px", borderRadius:8, background:"transparent",
            border:`1px solid ${COLORS.border}`, color:COLORS.muted, fontSize:13, cursor:"pointer",
          }}>← 뒤로</button>
        )}
      </div>
    </div>
  );
}

// ── Setup: Player Pool ───────────────────────────────────────
function PlayerPoolSetup({ players, onChange, title, maxCount=10 }) {
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [position, setPosition] = useState("OH");

  const addPlayer = () => {
    if (!number) return;
    const newP = { id: Date.now(), name: name||`#${number}`, number, position };
    onChange([...players, newP]);
    setName(""); setNumber("");
  };

  return (
    <div style={{ fontFamily:"'Pretendard', sans-serif" }}>
      <div style={{ fontSize:15, fontWeight:700, color:COLORS.text, marginBottom:12 }}>{title}</div>
      {/* 입력 */}
      <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap" }}>
        <input value={number} onChange={e=>setNumber(e.target.value)} placeholder="번호" type="number" style={{
          width:60, padding:"8px 10px", borderRadius:8, border:`1px solid ${COLORS.border}`,
          background:COLORS.card, color:COLORS.text, fontSize:13,
        }} />
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="이름 (선택)" style={{
          flex:1, minWidth:80, padding:"8px 10px", borderRadius:8, border:`1px solid ${COLORS.border}`,
          background:COLORS.card, color:COLORS.text, fontSize:13,
        }} />
        <select value={position} onChange={e=>setPosition(e.target.value)} style={{
          padding:"8px 10px", borderRadius:8, border:`1px solid ${COLORS.border}`,
          background:COLORS.card, color:COLORS.text, fontSize:13,
        }}>
          {POSITIONS.map(p => <option key={p}>{p}</option>)}
        </select>
        <button onClick={addPlayer} disabled={players.length>=maxCount} style={{
          padding:"8px 14px", borderRadius:8, background:COLORS.accent, border:"none",
          color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer",
        }}>추가</button>
      </div>
      {/* 리스트 */}
      <div style={{ display:"flex", flexDirection:"column", gap:4, maxHeight:200, overflowY:"auto" }}>
        {players.map((p, i) => (
          <div key={p.id} style={{
            display:"flex", alignItems:"center", gap:8, padding:"8px 10px",
            borderRadius:8, background:COLORS.card, border:`1px solid ${COLORS.border}`,
          }}>
            <span style={{ fontSize:12, color:COLORS.muted, width:24 }}>{i+1}</span>
            <span style={{ fontSize:13, fontWeight:700, color:COLORS.text }}>#{p.number}</span>
            <span style={{ fontSize:13, color:COLORS.text, flex:1 }}>{p.name}</span>
            <span style={{
              fontSize:11, padding:"2px 6px", borderRadius:4,
              background: p.position==="L" ? `${COLORS.libero}33` : `${COLORS.accent}22`,
              color: p.position==="L" ? "#a78bfa" : COLORS.accent,
            }}>{p.position}</span>
            <button onClick={() => onChange(players.filter((_,j)=>j!==i))} style={{
              padding:"2px 8px", borderRadius:6, background:`${COLORS.danger}22`,
              border:"none", color:COLORS.danger, fontSize:12, cursor:"pointer",
            }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Setup: Lineup ─────────────────────────────────────────────
function LineupSetup({ pool, lineup, onChange, liberoId, onLiberoChange, liberoReplaceId, onLiberoReplaceChange }) {
  const slotLabels = ["P1\n서버", "P2", "P3", "P4", "P5", "P6"];
  const [selecting, setSelecting] = useState(null);

  const assignPlayer = (slotIdx, player) => {
    const newLineup = [...lineup];
    // 이미 다른 슬롯에 있으면 제거
    const existingIdx = newLineup.findIndex(p => p && p.id === player.id);
    if (existingIdx !== -1) newLineup[existingIdx] = null;
    newLineup[slotIdx] = player;
    onChange(newLineup);
    setSelecting(null);
  };

  return (
    <div style={{ fontFamily:"'Pretendard', sans-serif" }}>
      <div style={{ fontSize:14, color:COLORS.muted, marginBottom:12 }}>선수를 슬롯에 배치하세요 (P1이 첫 서버)</div>

      {/* 코트 슬롯 */}
      <div style={{
        display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6,
        background:"#0d1f35", borderRadius:10, padding:10, border:`1.5px solid ${COLORS.accent}44`,
        position:"relative", marginBottom:12,
      }}>
        {/* 네트 표시 */}
        <div style={{
          gridColumn:"1/-1", height:3, background:`linear-gradient(90deg,transparent,${COLORS.accent},transparent)`,
          borderRadius:2, margin:"4px 0",
        }} />
        {/* 전위 (P4,P5,P6) */}
        {[3,4,5].map(i => (
          <div key={i} onClick={() => setSelecting(selecting===i?null:i)} style={{
            height:56, borderRadius:8, border:`1.5px dashed ${selecting===i?COLORS.accent:COLORS.border}`,
            background: lineup[i] ? `${COLORS.accent}18` : COLORS.card,
            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
            cursor:"pointer", transition:"all .15s",
            boxShadow: selecting===i ? `0 0 12px ${COLORS.accent}44` : "none",
          }}>
            {lineup[i] ? (
              <>
                <span style={{ fontSize:12, fontWeight:700, color:COLORS.text }}>#{lineup[i].number}</span>
                <span style={{ fontSize:10, color:COLORS.muted }}>{lineup[i].name}</span>
                <span style={{ fontSize:9, color:COLORS.accent }}>{lineup[i].position}</span>
              </>
            ) : (
              <span style={{ fontSize:10, color:COLORS.muted }}>{slotLabels[i]}</span>
            )}
          </div>
        ))}
        {/* 후위 (P1,P2,P3) */}
        {[0,1,2].map(i => (
          <div key={i} onClick={() => setSelecting(selecting===i?null:i)} style={{
            height:56, borderRadius:8, border:`1.5px dashed ${selecting===i?COLORS.accent:i===0?COLORS.warn:COLORS.border}`,
            background: lineup[i] ? `${i===0?COLORS.warn:COLORS.accent}18` : COLORS.card,
            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
            cursor:"pointer", transition:"all .15s",
          }}>
            {lineup[i] ? (
              <>
                <span style={{ fontSize:12, fontWeight:700, color:COLORS.text }}>#{lineup[i].number}</span>
                <span style={{ fontSize:10, color:COLORS.muted }}>{lineup[i].name}</span>
                <span style={{ fontSize:9, color:i===0?COLORS.warn:COLORS.accent }}>{lineup[i].position}{i===0?" ★":""}</span>
              </>
            ) : (
              <span style={{ fontSize:10, color:COLORS.muted }}>{slotLabels[i]}</span>
            )}
          </div>
        ))}
      </div>

      {/* 선수 선택 팝업 */}
      {selecting !== null && (
        <div style={{ background:COLORS.card, borderRadius:10, padding:10, marginBottom:12, border:`1px solid ${COLORS.accent}` }}>
          <div style={{ fontSize:12, color:COLORS.muted, marginBottom:8 }}>P{selecting+1} 슬롯에 배치할 선수 선택:</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {pool.map(p => (
              <button key={p.id} onClick={() => assignPlayer(selecting, p)} style={{
                padding:"6px 12px", borderRadius:8,
                background: lineup.find(l=>l&&l.id===p.id) ? `${COLORS.muted}33` : `${COLORS.accent}22`,
                border:`1px solid ${COLORS.border}`, color:COLORS.text, fontSize:12, cursor:"pointer",
              }}>#{p.number} {p.name} <span style={{color:COLORS.accent}}>({p.position})</span></button>
            ))}
            <button onClick={() => { const newL=[...lineup]; newL[selecting]=null; onChange(newL); setSelecting(null); }} style={{
              padding:"6px 12px", borderRadius:8, background:`${COLORS.danger}22`,
              border:`1px solid ${COLORS.danger}44`, color:COLORS.danger, fontSize:12, cursor:"pointer",
            }}>비우기</button>
          </div>
        </div>
      )}

      {/* 리베로 설정 */}
      <div style={{ background:COLORS.card, borderRadius:10, padding:10, border:`1px solid ${COLORS.libero}44` }}>
        <div style={{ fontSize:13, fontWeight:600, color:"#a78bfa", marginBottom:8 }}>리베로 설정</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, color:COLORS.muted, marginBottom:4 }}>리베로</div>
            <select value={liberoId||""} onChange={e=>onLiberoChange(e.target.value||null)} style={{
              width:"100%", padding:"8px", borderRadius:8, background:COLORS.surface,
              border:`1px solid ${COLORS.libero}44`, color:COLORS.text, fontSize:12,
            }}>
              <option value="">없음</option>
              {pool.filter(p=>p.position==="L").map(p=><option key={p.id} value={p.id}>#{p.number} {p.name}</option>)}
              {pool.filter(p=>p.position!=="L").map(p=><option key={p.id} value={p.id}>#{p.number} {p.name}</option>)}
            </select>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, color:COLORS.muted, marginBottom:4 }}>교체 대상 (MB)</div>
            <select value={liberoReplaceId||""} onChange={e=>onLiberoReplaceChange(e.target.value||null)} style={{
              width:"100%", padding:"8px", borderRadius:8, background:COLORS.surface,
              border:`1px solid ${COLORS.border}`, color:COLORS.text, fontSize:12,
            }}>
              <option value="">없음</option>
              {pool.map(p=><option key={p.id} value={p.id}>#{p.number} {p.name}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Analysis View ────────────────────────────────────────────
function AnalysisView({ sets, myPlayers, oppPlayers }) {
  const [setFilter, setSetFilter] = useState("all");

  const allRallies = setFilter === "all"
    ? sets.flatMap(s => s.rallies)
    : (sets[parseInt(setFilter)] || { rallies: [] }).rallies;

  const oppAttacks = allRallies.filter(r => r.scorer === "opp" && r.hitX != null);
  const serveTally = {};
  allRallies.filter(r => r.scorer==="opp" && r.type==="서브에이스").forEach(r => {
    const pid = r.playerId;
    if (pid) serveTally[pid] = (serveTally[pid]||0)+1;
  });

  const rotStats = {};
  sets.forEach(s => {
    s.rallies.forEach((r, i) => {
      const rot = r.rotationIdx ?? 0;
      if (!rotStats[rot]) rotStats[rot] = { us:0, opp:0 };
      if (r.scorer==="us") rotStats[rot].us++;
      else rotStats[rot].opp++;
    });
  });

  const typeStats = {};
  allRallies.forEach(r => {
    typeStats[r.type] = (typeStats[r.type]||0)+1;
  });

  const setTabs = [{ id:"all", label:"전체" }, ...sets.map((_,i) => ({ id:String(i), label:`${i+1}세트` }))];

  return (
    <div style={{ fontFamily:"'Pretendard', sans-serif", display:"flex", flexDirection:"column", gap:16 }}>
      {/* 세트 필터 */}
      <TabBar tabs={setTabs} active={setFilter} onChange={setSetFilter} />

      {/* 상대 공격 히트맵 */}
      <div style={{ background:COLORS.card, borderRadius:14, padding:16, border:`1px solid ${COLORS.border}` }}>
        <div style={{ fontSize:14, fontWeight:700, color:COLORS.text, marginBottom:12 }}>
          📍 상대팀 공격 히트맵
        </div>
        <HeatmapView rallies={oppAttacks} width={280} />
        <div style={{ marginTop:8, fontSize:12, color:COLORS.muted }}>
          총 {oppAttacks.length}회 공격 기록
        </div>
      </div>

      {/* 서브 타겟 */}
      <div style={{ background:COLORS.card, borderRadius:14, padding:16, border:`1px solid ${COLORS.border}` }}>
        <div style={{ fontSize:14, fontWeight:700, color:COLORS.text, marginBottom:12 }}>
          🎯 상대팀 서브 타겟
        </div>
        {Object.keys(serveTally).length === 0 ? (
          <div style={{ fontSize:12, color:COLORS.muted }}>서브에이스 기록 없음</div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {Object.entries(serveTally).sort((a,b)=>b[1]-a[1]).map(([pid,cnt]) => {
              const p = myPlayers.find(mp=>String(mp?.id)===String(pid));
              return (
                <div key={pid} style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:13, color:COLORS.text, width:80 }}>
                    {p ? `#${p.number} ${p.name}` : `ID:${pid}`}
                  </span>
                  <div style={{ flex:1, height:8, borderRadius:4, background:COLORS.surface, overflow:"hidden" }}>
                    <div style={{ width:`${Math.min(cnt*20,100)}%`, height:"100%", background:COLORS.danger, borderRadius:4 }} />
                  </div>
                  <span style={{ fontSize:13, color:COLORS.danger, fontWeight:700, width:20 }}>{cnt}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 로테이션별 득실 */}
      <div style={{ background:COLORS.card, borderRadius:14, padding:16, border:`1px solid ${COLORS.border}` }}>
        <div style={{ fontSize:14, fontWeight:700, color:COLORS.text, marginBottom:12 }}>
          🔄 로테이션별 득실점
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {[0,1,2,3,4,5].map(rot => {
            const stat = rotStats[rot] || { us:0, opp:0 };
            const total = stat.us + stat.opp;
            return (
              <div key={rot} style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:12, color:COLORS.muted, width:32 }}>R{rot+1}</span>
                <div style={{ flex:1, height:8, borderRadius:4, background:COLORS.surface, overflow:"hidden", display:"flex" }}>
                  <div style={{ width: total ? `${stat.us/total*100}%` : "0%", background:COLORS.success, transition:"width .3s" }} />
                  <div style={{ width: total ? `${stat.opp/total*100}%` : "0%", background:COLORS.danger, transition:"width .3s" }} />
                </div>
                <span style={{ fontSize:12, color:COLORS.success, width:24, textAlign:"right" }}>+{stat.us}</span>
                <span style={{ fontSize:12, color:COLORS.danger, width:24, textAlign:"right" }}>-{stat.opp}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 득점 유형 */}
      <div style={{ background:COLORS.card, borderRadius:14, padding:16, border:`1px solid ${COLORS.border}` }}>
        <div style={{ fontSize:14, fontWeight:700, color:COLORS.text, marginBottom:12 }}>
          📊 득점 유형 분포
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
          {Object.entries(typeStats).map(([type, cnt]) => (
            <div key={type} style={{
              padding:"6px 12px", borderRadius:8, background:COLORS.surface,
              border:`1px solid ${COLORS.border}`, fontSize:13, color:COLORS.text,
            }}>
              {type} <span style={{ color:COLORS.accent, fontWeight:700 }}>{cnt}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function VolleyballApp() {
  const [screen, setScreen] = useState("home"); // home | setup | game | analysis
  const [setupStep, setSetupStep] = useState(0); // 0:우리선수풀 1:우리라인업 2:상대선수풀 3:상대라인업 4:서브권

  // Player pools
  const [myPool, setMyPool] = useState([]);
  const [oppPool, setOppPool] = useState([]);

  // Lineups (6 slots)
  const [myLineup, setMyLineup] = useState(Array(6).fill(null));
  const [oppLineup, setOppLineup] = useState(Array(6).fill(null));

  // Libero settings
  const [myLiberoId, setMyLiberoId] = useState(null);
  const [myLiberoReplaceId, setMyLiberoReplaceId] = useState(null);

  // Game state
  const [sets, setSets] = useState([]);
  const [currentSetIdx, setCurrentSetIdx] = useState(0);
  const [firstServeUs, setFirstServeUs] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("score"); // score | rotation | log | analysis

  const currentSet = sets[currentSetIdx];

  // ── 로테이션 적용 (리베로 교체 포함) ──
  const getDisplayRotation = (rotation, liberoId, liberoReplaceId) => {
    if (!liberoId) return rotation;
    return rotation.map((p, i) => {
      if (!p) return p;
      // 슬롯 0,1,2 = 후위 → 리베로 IN
      const isBack = i <= 2;
      if (p.id === liberoReplaceId && isBack) {
        return myPool.find(mp => String(mp.id) === String(liberoId)) || p;
      }
      if (p.id === liberoId && !isBack) {
        return myPool.find(mp => String(mp.id) === String(liberoReplaceId)) || p;
      }
      return p;
    });
  };

  // ── 경기 시작 ──
  const startGame = () => {
    const newSet = {
      myRotation: myLineup.slice(),
      oppRotation: oppLineup.slice(),
      myScore: 0,
      oppScore: 0,
      myServes: firstServeUs,
      rallies: [],
      liberoId: myLiberoId,
      liberoReplaceId: myLiberoReplaceId,
    };
    setSets([newSet]);
    setCurrentSetIdx(0);
    setScreen("game");
    setActiveTab("score");
  };

  // ── 랠리 기록 ──
  const recordRally = useCallback((data) => {
    setSets(prev => {
      const updated = [...prev];
      const s = { ...updated[currentSetIdx] };
      const isOurs = data.scorer === "us";

      // 서브권 변경 감지 → 로테이션
      let newRotation = s.myRotation.slice();
      let newMyServes = s.myServes;

      if (isOurs && !s.myServes) {
        // 상대 서브 → 우리 득점 → 로테이션!
        newRotation = rotateArray(s.myRotation, 1);
        newMyServes = true;
      } else if (!isOurs && s.myServes) {
        // 우리 서브 → 실점 → 서브권 넘어감
        newMyServes = false;
      }

      s.myRotation = newRotation;
      s.myServes = newMyServes;
      s.myScore = isOurs ? s.myScore + 1 : s.myScore;
      s.oppScore = !isOurs ? s.oppScore + 1 : s.oppScore;
      s.rallies = [...s.rallies, { ...data, rotationIdx: s.myRotation.indexOf(s.myRotation[0]) }];

      updated[currentSetIdx] = s;
      return updated;
    });
  }, [currentSetIdx]);

  // ── 세트 종료 ──
  const endSet = () => {
    if (currentSetIdx >= 4) return;
    setSets(prev => {
      const newSet = {
        myRotation: myLineup.slice(),
        oppRotation: oppLineup.slice(),
        myScore: 0,
        oppScore: 0,
        myServes: !prev[currentSetIdx].myServes,
        rallies: [],
        liberoId: myLiberoId,
        liberoReplaceId: myLiberoReplaceId,
      };
      return [...prev, newSet];
    });
    setCurrentSetIdx(i => i+1);
  };

  const displayRotation = currentSet
    ? getDisplayRotation(currentSet.myRotation, currentSet.liberoId, currentSet.liberoReplaceId)
    : [];

  // ============================================================
  // RENDER
  // ============================================================

  // ── HOME ──
  if (screen === "home") return (
    <div style={{
      minHeight:"100vh", background:COLORS.bg, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", padding:24, fontFamily:"'Pretendard', sans-serif",
    }}>
      <div style={{ textAlign:"center", maxWidth:340 }}>
        {/* 로고 */}
        <div style={{
          width:80, height:80, borderRadius:20, background:`linear-gradient(135deg, ${COLORS.accent}, #6366f1)`,
          display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px",
          boxShadow:`0 0 40px ${COLORS.accent}44`, fontSize:36,
        }}>🏐</div>
        <div style={{ fontSize:26, fontWeight:800, color:COLORS.text, marginBottom:6, letterSpacing:-0.5 }}>
          VolleyStat
        </div>
        <div style={{ fontSize:14, color:COLORS.muted, marginBottom:40, lineHeight:1.6 }}>
          실시간 배구 경기 분석 시스템<br/>6인제 전용
        </div>

        <button onClick={() => setScreen("setup")} style={{
          width:"100%", padding:"16px", borderRadius:14, fontSize:16, fontWeight:700,
          background:`linear-gradient(135deg, ${COLORS.accent}, #6366f1)`,
          border:"none", color:"#fff", cursor:"pointer", marginBottom:12,
          boxShadow:`0 4px 20px ${COLORS.accent}44`,
        }}>새 경기 시작</button>

        {sets.length > 0 && (
          <button onClick={() => setScreen("game")} style={{
            width:"100%", padding:"14px", borderRadius:14, fontSize:15, fontWeight:600,
            background:COLORS.card, border:`1px solid ${COLORS.border}`, color:COLORS.text, cursor:"pointer",
          }}>진행 중인 경기 계속</button>
        )}
      </div>
    </div>
  );

  // ── SETUP ──
  if (screen === "setup") {
    const setupSteps = ["우리팀 선수 풀", "우리팀 라인업", "상대팀 선수 풀", "상대팀 라인업", "서브권 설정"];
    return (
      <div style={{ minHeight:"100vh", background:COLORS.bg, padding:"16px 16px 32px", fontFamily:"'Pretendard', sans-serif" }}>
        {/* 헤더 */}
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
          <button onClick={() => setScreen("home")} style={{ background:"transparent", border:"none", color:COLORS.muted, fontSize:20, cursor:"pointer" }}>←</button>
          <div style={{ fontSize:18, fontWeight:700, color:COLORS.text }}>경기 설정</div>
        </div>

        {/* 스텝 인디케이터 */}
        <div style={{ display:"flex", gap:4, marginBottom:20 }}>
          {setupSteps.map((s, i) => (
            <div key={i} style={{
              flex:1, height:4, borderRadius:2,
              background: i <= setupStep ? COLORS.accent : COLORS.border, transition:"background .3s",
            }} />
          ))}
        </div>

        <div style={{ fontSize:16, fontWeight:700, color:COLORS.text, marginBottom:16 }}>{setupSteps[setupStep]}</div>

        {setupStep === 0 && <PlayerPoolSetup players={myPool} onChange={setMyPool} title="우리팀 선수 등록 (최대 10명)" maxCount={10} />}
        {setupStep === 1 && <LineupSetup pool={myPool} lineup={myLineup} onChange={setMyLineup} liberoId={myLiberoId} onLiberoChange={setMyLiberoId} liberoReplaceId={myLiberoReplaceId} onLiberoReplaceChange={setMyLiberoReplaceId} />}
        {setupStep === 2 && <PlayerPoolSetup players={oppPool} onChange={setOppPool} title="상대팀 선수 등록" maxCount={15} />}
        {setupStep === 3 && <LineupSetup pool={oppPool} lineup={oppLineup} onChange={setOppLineup} liberoId={null} onLiberoChange={()=>{}} liberoReplaceId={null} onLiberoReplaceChange={()=>{}} />}
        {setupStep === 4 && (
          <div>
            <div style={{ fontSize:14, color:COLORS.muted, marginBottom:20 }}>첫 번째 서브권을 선택하세요</div>
            <div style={{ display:"flex", gap:12 }}>
              {[{v:true,label:"우리팀 서브"},{v:false,label:"상대팀 서브"}].map(opt => (
                <button key={String(opt.v)} onClick={() => setFirstServeUs(opt.v)} style={{
                  flex:1, padding:"20px 8px", borderRadius:14, border:`2px solid ${firstServeUs===opt.v?COLORS.accent:COLORS.border}`,
                  background: firstServeUs===opt.v ? `${COLORS.accent}22` : COLORS.card,
                  color: firstServeUs===opt.v ? COLORS.accent : COLORS.muted,
                  fontSize:15, fontWeight:700, cursor:"pointer", transition:"all .2s",
                }}>{opt.label}</button>
              ))}
            </div>
          </div>
        )}

        {/* 네비게이션 */}
        <div style={{ display:"flex", gap:10, marginTop:24 }}>
          {setupStep > 0 && (
            <button onClick={() => setSetupStep(s=>s-1)} style={{
              flex:1, padding:"14px", borderRadius:12, background:COLORS.card,
              border:`1px solid ${COLORS.border}`, color:COLORS.muted, fontSize:14, cursor:"pointer",
            }}>← 이전</button>
          )}
          {setupStep < 4 ? (
            <button onClick={() => setSetupStep(s=>s+1)} style={{
              flex:2, padding:"14px", borderRadius:12, background:COLORS.accent,
              border:"none", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer",
            }}>다음 →</button>
          ) : (
            <button onClick={startGame} style={{
              flex:2, padding:"14px", borderRadius:12,
              background:`linear-gradient(135deg, ${COLORS.success}, #059669)`,
              border:"none", color:"#fff", fontSize:15, fontWeight:700, cursor:"pointer",
              boxShadow:`0 4px 20px ${COLORS.success}44`,
            }}>🏐 경기 시작!</button>
          )}
        </div>
      </div>
    );
  }

  // ── GAME ──
  if (screen === "game" && currentSet) {
    const setTabs = sets.map((_,i) => ({ id:String(i), label:`${i+1}세트` }));
    const gameTabs = [
      { id:"score", label:"스코어" },
      { id:"rotation", label:"로테이션" },
      { id:"log", label:"기록" },
      { id:"analysis", label:"분석" },
    ];

    return (
      <div style={{ minHeight:"100vh", background:COLORS.bg, paddingBottom:100, fontFamily:"'Pretendard', sans-serif" }}>
        {/* 헤더 */}
        <div style={{
          background:COLORS.surface, borderBottom:`1px solid ${COLORS.border}`,
          padding:"12px 16px", position:"sticky", top:0, zIndex:10,
        }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <button onClick={() => setScreen("home")} style={{ background:"transparent", border:"none", color:COLORS.muted, fontSize:18, cursor:"pointer" }}>←</button>
            <div style={{ fontSize:15, fontWeight:700, color:COLORS.text }}>VolleyStat</div>
            <button onClick={() => setScreen("analysis")} style={{
              padding:"6px 12px", borderRadius:8, background:`${COLORS.accent}22`,
              border:`1px solid ${COLORS.accent}44`, color:COLORS.accent, fontSize:12, cursor:"pointer",
            }}>분석 📊</button>
          </div>

          {/* 세트 탭 */}
          <div style={{ display:"flex", gap:4, marginBottom:10, overflowX:"auto" }}>
            {setTabs.map(t => (
              <button key={t.id} onClick={() => setCurrentSetIdx(parseInt(t.id))} style={{
                padding:"5px 14px", borderRadius:6, border:"none", cursor:"pointer", fontSize:12, fontWeight:600,
                background: currentSetIdx===parseInt(t.id) ? COLORS.accent : COLORS.card,
                color: currentSetIdx===parseInt(t.id) ? "#fff" : COLORS.muted,
                flexShrink:0,
              }}>{t.label}</button>
            ))}
            {sets.length < 5 && (
              <button onClick={endSet} style={{
                padding:"5px 14px", borderRadius:6, border:`1px dashed ${COLORS.border}`,
                background:"transparent", color:COLORS.muted, fontSize:12, cursor:"pointer", flexShrink:0,
              }}>+ 다음 세트</button>
            )}
          </div>

          {/* 스코어보드 */}
          <div style={{
            display:"flex", alignItems:"center", justifyContent:"center", gap:20,
            background:COLORS.card, borderRadius:14, padding:"12px 16px",
            border:`1px solid ${COLORS.border}`,
          }}>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:11, color:COLORS.muted, marginBottom:2 }}>우리팀</div>
              <div style={{ fontSize:40, fontWeight:900, color:COLORS.success, lineHeight:1 }}>{currentSet.myScore}</div>
            </div>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:20, color:COLORS.muted }}>:</div>
              <div style={{
                fontSize:10, marginTop:4, padding:"2px 8px", borderRadius:4,
                background: currentSet.myServes ? `${COLORS.success}22` : `${COLORS.danger}22`,
                color: currentSet.myServes ? COLORS.success : COLORS.danger,
              }}>{currentSet.myServes ? "우리 서브" : "상대 서브"}</div>
            </div>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:11, color:COLORS.muted, marginBottom:2 }}>상대팀</div>
              <div style={{ fontSize:40, fontWeight:900, color:COLORS.danger, lineHeight:1 }}>{currentSet.oppScore}</div>
            </div>
          </div>
        </div>

        {/* 탭 */}
        <div style={{ padding:"12px 16px 0" }}>
          <TabBar tabs={gameTabs} active={activeTab} onChange={setActiveTab} />
        </div>

        {/* 탭 컨텐츠 */}
        <div style={{ padding:"12px 16px" }}>
          {activeTab === "score" && (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {/* 득점/실점 빠른 기록 */}
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={() => setModalOpen(true)} style={{
                  flex:1, padding:"20px 8px", borderRadius:14, border:"none", cursor:"pointer",
                  background:`linear-gradient(135deg, ${COLORS.success}cc, #059669cc)`,
                  color:"#fff", fontSize:16, fontWeight:800, boxShadow:`0 4px 20px ${COLORS.success}44`,
                }}>
                  득점 기록<br/><span style={{fontSize:11,opacity:.8}}>탭해서 기록</span>
                </button>
              </div>
              {/* 히트맵 미리보기 */}
              <div style={{ background:COLORS.card, borderRadius:14, padding:14, border:`1px solid ${COLORS.border}` }}>
                <div style={{ fontSize:13, fontWeight:600, color:COLORS.text, marginBottom:10 }}>이번 세트 공격 히트맵</div>
                <HeatmapView rallies={currentSet.rallies.filter(r=>r.hitX!=null)} width={280} />
              </div>
            </div>
          )}

          {activeTab === "rotation" && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {/* 우리팀 */}
              <div style={{ background:COLORS.card, borderRadius:14, padding:14, border:`1px solid ${COLORS.border}` }}>
                <div style={{ fontSize:13, fontWeight:600, color:COLORS.text, marginBottom:10 }}>우리팀 현재 로테이션</div>
                <div style={{
                  display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6,
                  background:"#0d1f35", borderRadius:10, padding:10,
                }}>
                  <div style={{ gridColumn:"1/-1", height:2, background:`linear-gradient(90deg,transparent,${COLORS.accent},transparent)`, borderRadius:1, margin:"2px 0 6px" }} />
                  {/* 전위: 슬롯 3,4,5 */}
                  {[3,4,5].map(i => {
                    const p = displayRotation[i];
                    return (
                      <div key={i} style={{
                        height:52, borderRadius:8, background:COLORS.surface,
                        border:`1px solid ${COLORS.border}`,
                        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                      }}>
                        {p ? <>
                          <span style={{ fontSize:13, fontWeight:700, color:COLORS.text }}>#{p.number}</span>
                          <span style={{ fontSize:10, color:COLORS.muted }}>{p.name}</span>
                          <span style={{ fontSize:9, color:COLORS.accent }}>{p.position}</span>
                        </> : <span style={{ fontSize:10, color:COLORS.border }}>-</span>}
                      </div>
                    );
                  })}
                  {/* 후위: 슬롯 0,1,2 */}
                  {[0,1,2].map(i => {
                    const p = displayRotation[i];
                    const isServer = i === 0 && currentSet.myServes;
                    return (
                      <div key={i} style={{
                        height:52, borderRadius:8,
                        background: isServer ? `${COLORS.warn}22` : COLORS.surface,
                        border:`1px solid ${isServer ? COLORS.warn : COLORS.border}`,
                        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                      }}>
                        {p ? <>
                          <span style={{ fontSize:13, fontWeight:700, color:COLORS.text }}>#{p.number}</span>
                          <span style={{ fontSize:10, color:COLORS.muted }}>{p.name}</span>
                          <span style={{ fontSize:9, color:isServer?COLORS.warn:COLORS.accent }}>{p.position}{isServer?" ★":""}</span>
                        </> : <span style={{ fontSize:10, color:COLORS.border }}>-</span>}
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop:8, fontSize:11, color:COLORS.muted }}>
                  ★ = 현재 서버 위치 | 로테이션 {currentSet.rallies.filter(r=>r.scorer==="us"&&!currentSet.myServes).length + 1}번째
                </div>
              </div>

              {/* 상대팀 */}
              <div style={{ background:COLORS.card, borderRadius:14, padding:14, border:`1px solid ${COLORS.border}` }}>
                <div style={{ fontSize:13, fontWeight:600, color:COLORS.text, marginBottom:10 }}>상대팀 추정 로테이션</div>
                <div style={{
                  display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6,
                  background:"#0d1f35", borderRadius:10, padding:10,
                }}>
                  <div style={{ gridColumn:"1/-1", height:2, background:`linear-gradient(90deg,transparent,${COLORS.danger},transparent)`, borderRadius:1, margin:"2px 0 6px" }} />
                  {[3,4,5,0,1,2].map(i => {
                    const p = currentSet.oppRotation[i];
                    return (
                      <div key={i} style={{
                        height:52, borderRadius:8, background:COLORS.surface,
                        border:`1px solid ${COLORS.border}`,
                        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                      }}>
                        {p ? <>
                          <span style={{ fontSize:13, fontWeight:700, color:COLORS.text }}>#{p.number}</span>
                          <span style={{ fontSize:10, color:COLORS.muted }}>{p.name}</span>
                          <span style={{ fontSize:9, color:COLORS.danger }}>{p.position||"?"}</span>
                        </> : <span style={{ fontSize:11, color:COLORS.border }}>미확인</span>}
                      </div>
                    );
                  })}
                </div>
                {/* 상대 선수 빠른 추가 */}
                <button onClick={() => {
                  const num = prompt("상대 선수 번호:");
                  if (!num) return;
                  const pos = prompt("포지션 (OH/MB/OP/S/L/?):", "?");
                  setOppPool(prev => [...prev, { id:Date.now(), name:`#${num}`, number:num, position:pos||"?" }]);
                }} style={{
                  marginTop:8, width:"100%", padding:"8px", borderRadius:8,
                  background:`${COLORS.danger}22`, border:`1px dashed ${COLORS.danger}44`,
                  color:COLORS.danger, fontSize:12, cursor:"pointer",
                }}>+ 상대 선수 추가</button>
              </div>
            </div>
          )}

          {activeTab === "log" && (
            <div style={{ background:COLORS.card, borderRadius:14, padding:14, border:`1px solid ${COLORS.border}` }}>
              <div style={{ fontSize:13, fontWeight:600, color:COLORS.text, marginBottom:10 }}>랠리 기록</div>
              <ScoreLog rallies={currentSet.rallies} myPlayers={myPool} oppPlayers={oppPool} />
            </div>
          )}

          {activeTab === "analysis" && (
            <AnalysisView sets={sets} myPlayers={myPool} oppPlayers={oppPool} />
          )}
        </div>

        {/* FAB - 득점 버튼 */}
        {activeTab !== "analysis" && (
          <button onClick={() => setModalOpen(true)} style={{
            position:"fixed", bottom:24, right:20, width:64, height:64, borderRadius:"50%",
            background:`linear-gradient(135deg, ${COLORS.accent}, #6366f1)`,
            border:"none", color:"#fff", fontSize:28, cursor:"pointer", zIndex:20,
            boxShadow:`0 4px 24px ${COLORS.accent}88`,
          }}>+</button>
        )}

        {/* Rally Modal */}
        <RallyModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={recordRally}
          myRotation={displayRotation}
          oppRotation={currentSet.oppRotation}
          myPlayers={myPool}
          oppPlayers={oppPool}
        />
      </div>
    );
  }

  // ── ANALYSIS (전체) ──
  if (screen === "analysis") return (
    <div style={{ minHeight:"100vh", background:COLORS.bg, padding:"16px 16px 32px", fontFamily:"'Pretendard', sans-serif" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
        <button onClick={() => setScreen("game")} style={{ background:"transparent", border:"none", color:COLORS.muted, fontSize:20, cursor:"pointer" }}>←</button>
        <div style={{ fontSize:18, fontWeight:700, color:COLORS.text }}>경기 분석</div>
      </div>
      <AnalysisView sets={sets} myPlayers={myPool} oppPlayers={oppPool} />
    </div>
  );

  return null;
}