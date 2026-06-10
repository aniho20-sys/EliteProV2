import React, { useState } from "react";
import {
  Moon, Sun, Search, Bell, ChevronRight, MessageCircle, Send,
  LayoutGrid, ClipboardList, Calendar, MoreHorizontal,
  Dumbbell, Trophy, Flame, Scale, CalendarPlus
} from "lucide-react";

const FONT = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Inter:wght@400;500;600;700&display=swap');
`;

export default function EliteProStudent() {
  const [dark, setDark] = useState(false);
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useState("home");
  const [note, setNote] = useState("");

  const t = dark
    ? {
        bg: "#101014", surface: "#1A1A21", surfaceAlt: "#22222B",
        ink: "#F2F2F5", sub: "#9A9AA8", line: "#2C2C36", navBg: "#16161C",
      }
    : {
        bg: "#F6F7F9", surface: "#FFFFFF", surfaceAlt: "#F1F2F6",
        ink: "#17171E", sub: "#6E6E7C", line: "#E7E8EE", navBg: "#FFFFFF",
      };

  const brandGrad = "linear-gradient(100deg,#5B5BD6 0%,#9A4FC0 48%,#F0703C 100%)";

  const ping = (m) => { setToast(m); setTimeout(() => setToast(null), 1800); };

  const sessionsUsed = 6, sessionsTotal = 10;
  const pct = (sessionsUsed / sessionsTotal) * 100;

  const stats = [
    { n: "0", label: "This week", icon: Flame, color: "#F0703C" },
    { n: "5", label: "Total", icon: Dumbbell, color: "#5B5BD6" },
    { n: "70kg", label: "Weight", icon: Scale, color: "#D6456B" },
    { n: "4", label: "PRs", icon: Trophy, color: "#C7A23A" },
  ];

  const workouts = [
    { name: "Lower Body Strength", date: "1 Jun", rpe: 7, status: "Partial", color: "#E89B3C" },
    { name: "Mobility & Core", date: "25 May", rpe: 7, status: "Done", color: "#3FA46A" },
    { name: "Full Body A", date: "18 May", rpe: 5, status: "Done", color: "#3FA46A" },
  ];

  const prs = [
    { name: "KB Deadlift", val: "32kg", date: "18 May" },
    { name: "Box Squat", val: "6kg", date: "18 May" },
    { name: "Goblet Squat", val: "5kg", date: "25 May" },
    { name: "Split Squat", val: "5kg", date: "25 May" },
  ];

  const sec = { padding: "22px 20px 0" };
  const head = (title, action) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
      <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 16 }}>{title}</span>
      {action && (
        <button onClick={() => ping(action)} style={{ border: "none", background: "none", color: t.sub, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
          {action}
        </button>
      )}
    </div>
  );

  return (
    <div style={{
      minHeight: "100vh", background: t.bg, color: t.ink,
      fontFamily: "'Inter', sans-serif", maxWidth: 430, margin: "0 auto",
      position: "relative", paddingBottom: 96, transition: "background .25s,color .25s",
    }}>
      <style>{FONT}</style>

      {/* Top bar */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 6px" }}>
        <div style={{
          fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em",
          background: brandGrad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>ElitePro</div>
        <div style={{ display: "flex", gap: 6 }}>
          {[{ icon: dark ? Sun : Moon, fn: () => setDark(!dark) }, { icon: Search, fn: () => ping("Search") }, { icon: Bell, fn: () => ping("Notifications") }].map(({ icon: I, fn }, i) => (
            <button key={i} onClick={fn} style={{
              width: 38, height: 38, borderRadius: 12, border: `1px solid ${t.line}`,
              background: t.surface, color: t.sub, display: "grid", placeItems: "center", cursor: "pointer",
            }}><I size={17} /></button>
          ))}
        </div>
      </header>

      {/* Greeting */}
      <div style={{ padding: "14px 20px 4px" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: t.sub, letterSpacing: ".08em", textTransform: "uppercase" }}>Wed 10 June</div>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 26, margin: "4px 0 0", letterSpacing: "-0.01em" }}>
          Hey, Wan
        </h1>
      </div>

      {/* Hero: sessions package */}
      <div style={{ padding: "16px 20px 0" }}>
        <div style={{ borderRadius: 20, padding: 2, background: brandGrad }}>
          <div style={{ borderRadius: 18, background: t.surface, padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#9A4FC0" }}>
                Your package
              </span>
              <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 22 }}>
                {sessionsTotal - sessionsUsed}
                <span style={{ fontSize: 13, fontWeight: 600, color: t.sub }}> sessions left</span>
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 99, background: t.surfaceAlt, overflow: "hidden", marginBottom: 14 }}>
              <div style={{ width: `${pct}%`, height: "100%", borderRadius: 99, background: brandGrad }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12.5, color: t.sub }}>No sessions booked today</span>
              <button onClick={() => ping("Book session")} style={{
                border: "none", borderRadius: 12, padding: "9px 16px",
                background: brandGrad, color: "#fff", fontWeight: 700, fontSize: 13.5,
                display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
              }}>
                <CalendarPlus size={15} /> Book session
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Compact stat strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, padding: "14px 20px 0" }}>
        {stats.map((s) => (
          <button key={s.label} onClick={() => ping(s.label)} style={{
            background: t.surface, border: `1px solid ${t.line}`, borderRadius: 14,
            padding: "10px 4px 9px", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: "pointer",
          }}>
            <s.icon size={15} color={s.color} strokeWidth={2.2} />
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 17, color: t.ink }}>{s.n}</span>
            <span style={{ fontSize: 10.5, fontWeight: 600, color: t.sub }}>{s.label}</span>
          </button>
        ))}
      </div>

      {/* Recent workouts */}
      <div style={sec}>
        {head("Recent workouts", "View all")}
        <div style={{ background: t.surface, border: `1px solid ${t.line}`, borderRadius: 18, overflow: "hidden" }}>
          {workouts.map((w, i) => (
            <button key={i} onClick={() => ping(w.name)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 12,
              padding: "13px 14px", border: "none", background: "none", cursor: "pointer", textAlign: "left",
              borderTop: i ? `1px solid ${t.line}` : "none", color: t.ink,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14.5 }}>{w.name}</div>
                <div style={{ fontSize: 12, color: t.sub, marginTop: 1.5 }}>{w.date} · RPE {w.rpe}/10</div>
              </div>
              <span style={{
                fontSize: 10.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase",
                color: w.color, background: `${w.color}1A`, borderRadius: 99, padding: "3px 9px",
              }}>{w.status}</span>
              <ChevronRight size={16} color={t.sub} />
            </button>
          ))}
        </div>
      </div>

      {/* Personal records */}
      <div style={sec}>
        {head("Personal records", "All PRs")}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {prs.map((p) => (
            <div key={p.name} style={{
              background: t.surface, border: `1px solid ${t.line}`, borderRadius: 16, padding: "12px 14px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                <Trophy size={12} color="#C7A23A" />
                <span style={{ fontSize: 12, fontWeight: 600, color: t.sub, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
              </div>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 20 }}>{p.val}</div>
              <div style={{ fontSize: 10.5, color: t.sub, marginTop: 1 }}>{p.date}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Body stats */}
      <div style={sec}>
        {head("Body stats", "Details")}
        <div style={{
          background: t.surface, border: `1px solid ${t.line}`, borderRadius: 18,
          display: "grid", gridTemplateColumns: "repeat(3,1fr)", padding: "6px 0",
        }}>
          {[["Weight", "70kg"], ["Body fat", "15%"], ["Chest", "78cm"], ["Waist", "78cm"], ["Arms", "34cm"], ["Legs", "43cm"]].map(([k, v], i) => (
            <div key={k} style={{
              padding: "10px 14px",
              borderTop: i > 2 ? `1px solid ${t.line}` : "none",
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: t.sub }}>{k}</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginTop: 1 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Coach notes */}
      <div style={sec}>
        {head("Coach notes")}
        <div style={{ background: t.surface, border: `1px solid ${t.line}`, borderRadius: 18, padding: "6px 14px 12px" }}>
          {[
            { who: "Ani", msg: "Great control on the hip CARs today — keep the tempo slow.", time: "21 May" },
            { who: "You", msg: "Hi", time: "13 Apr" },
          ].map((m, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: i === 0 ? `1px solid ${t.line}` : "none" }}>
              <div style={{
                width: 32, height: 32, borderRadius: 11, flexShrink: 0,
                background: m.who === "Ani" ? brandGrad : t.surfaceAlt,
                color: m.who === "Ani" ? "#fff" : t.sub,
                display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13,
              }}>{m.who[0]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{m.who}</span>
                  <span style={{ fontSize: 11, color: t.sub }}>{m.time}</span>
                </div>
                <div style={{ fontSize: 13, color: t.sub, marginTop: 2 }}>{m.msg}</div>
              </div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Write a note…"
              style={{
                flex: 1, border: `1px solid ${t.line}`, borderRadius: 12, padding: "10px 14px",
                background: t.surfaceAlt, color: t.ink, fontSize: 13.5, outline: "none",
                fontFamily: "'Inter', sans-serif",
              }}
            />
            <button onClick={() => { if (note.trim()) { ping("Note sent"); setNote(""); } }} style={{
              width: 42, height: 42, borderRadius: 12, border: "none",
              background: brandGrad, color: "#fff", display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0,
            }}><Send size={16} /></button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 104, left: "50%", transform: "translateX(-50%)",
          background: t.ink, color: t.bg, fontSize: 13, fontWeight: 600,
          padding: "9px 18px", borderRadius: 99, zIndex: 50, whiteSpace: "nowrap",
        }}>{toast}</div>
      )}

      {/* Bottom nav */}
      <nav style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 430, background: t.navBg, borderTop: `1px solid ${t.line}`,
        display: "grid", gridTemplateColumns: "repeat(5,1fr)",
        padding: "8px 8px calc(10px + env(safe-area-inset-bottom))",
      }}>
        {[
          { id: "home", label: "Home", icon: LayoutGrid },
          { id: "log", label: "Log", icon: Dumbbell },
          { id: "schedule", label: "Schedule", icon: Calendar },
          { id: "plans", label: "My Plans", icon: ClipboardList },
          { id: "more", label: "More", icon: MoreHorizontal },
        ].map(({ id, label, icon: I }) => {
          const active = tab === id;
          return (
            <button key={id} onClick={() => setTab(id)} style={{
              border: "none", background: "none", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "5px 0",
            }}>
              <I size={20} color={active ? "#5B5BD6" : t.sub} strokeWidth={active ? 2.4 : 2} />
              <span style={{ fontSize: 10.5, fontWeight: active ? 700 : 500, color: active ? "#5B5BD6" : t.sub }}>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
