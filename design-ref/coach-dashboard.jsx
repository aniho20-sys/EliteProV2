import React, { useState } from "react";
import {
  Moon, Sun, Search, Bell, ChevronRight, MessageCircle,
  LayoutGrid, Users, ClipboardList, Calendar, MoreHorizontal,
  Dumbbell, Clock, MapPin, AlertTriangle, TrendingUp
} from "lucide-react";

const FONT = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Inter:wght@400;500;600;700&display=swap');
`;

export default function EliteProDashboard() {
  const [dark, setDark] = useState(false);
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useState("home");

  const t = dark
    ? {
        bg: "#101014", surface: "#1A1A21", surfaceAlt: "#22222B",
        ink: "#F2F2F5", sub: "#9A9AA8", line: "#2C2C36",
        navBg: "#16161C",
      }
    : {
        bg: "#F6F7F9", surface: "#FFFFFF", surfaceAlt: "#F1F2F6",
        ink: "#17171E", sub: "#6E6E7C", line: "#E7E8EE",
        navBg: "#FFFFFF",
      };

  const brandGrad = "linear-gradient(100deg,#5B5BD6 0%,#9A4FC0 48%,#F0703C 100%)";

  const stats = [
    { n: 9, label: "Clients", icon: Users, color: "#5B5BD6" },
    { n: 1, label: "Today", icon: Calendar, color: "#F0703C" },
    { n: 0, label: "Unread", icon: TrendingUp, color: "#C7A23A" },
    { n: 12, label: "Plans", icon: Dumbbell, color: "#D6456B" },
  ];

  const attention = [
    { name: "Timmy", initial: "T", reason: "1 session left", level: "high", hint: "Renewal due" },
    { name: "Wan", initial: "W", reason: "Inactive 9 days", level: "mid", hint: "Last: Mobility B" },
    { name: "MASARU", initial: "M", reason: "Inactive 21 days", level: "mid", hint: "Last: AF Level 1" },
    { name: "Hui Zaki", initial: "H", reason: "Plan ends Friday", level: "high", hint: "12-wk programme" },
  ];

  const levelColor = { high: "#E0455E", mid: "#E89B3C" };

  const ping = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const navItems = [
    { id: "home", label: "Home", icon: LayoutGrid },
    { id: "clients", label: "Clients", icon: Users },
    { id: "plans", label: "Plans", icon: ClipboardList },
    { id: "schedule", label: "Schedule", icon: Calendar },
    { id: "more", label: "More", icon: MoreHorizontal },
  ];

  return (
    <div style={{
      minHeight: "100vh", background: t.bg, color: t.ink,
      fontFamily: "'Inter', sans-serif", maxWidth: 430, margin: "0 auto",
      position: "relative", paddingBottom: 96, transition: "background .25s,color .25s",
    }}>
      <style>{FONT}</style>

      {/* Top bar */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 20px 6px",
      }}>
        <div style={{
          fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800,
          fontSize: 22, letterSpacing: "-0.02em",
          background: brandGrad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          ElitePro
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[
            { icon: dark ? Sun : Moon, fn: () => setDark(!dark) },
            { icon: Search, fn: () => ping("Search") },
            { icon: Bell, fn: () => ping("Notifications") },
          ].map(({ icon: I, fn }, i) => (
            <button key={i} onClick={fn} style={{
              width: 38, height: 38, borderRadius: 12, border: `1px solid ${t.line}`,
              background: t.surface, color: t.sub, display: "grid", placeItems: "center",
              cursor: "pointer",
            }}>
              <I size={17} />
            </button>
          ))}
        </div>
      </header>

      {/* Greeting */}
      <div style={{ padding: "14px 20px 4px" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: t.sub, letterSpacing: ".08em", textTransform: "uppercase" }}>
          Wed 10 June
        </div>
        <h1 style={{
          fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700,
          fontSize: 26, margin: "4px 0 0", letterSpacing: "-0.01em",
        }}>
          Morning, Ani
        </h1>
      </div>

      {/* Compact stat strip */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8,
        padding: "16px 20px 0",
      }}>
        {stats.map((s) => (
          <button key={s.label} onClick={() => ping(s.label)} style={{
            background: t.surface, border: `1px solid ${t.line}`, borderRadius: 14,
            padding: "10px 6px 9px", display: "flex", flexDirection: "column",
            alignItems: "center", gap: 2, cursor: "pointer",
          }}>
            <s.icon size={15} color={s.color} strokeWidth={2.2} />
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 20, color: t.ink }}>{s.n}</span>
            <span style={{ fontSize: 10.5, fontWeight: 600, color: t.sub }}>{s.label}</span>
          </button>
        ))}
      </div>

      {/* Hero: next session */}
      <div style={{ padding: "18px 20px 0" }}>
        <div style={{
          borderRadius: 20, padding: 2, background: brandGrad,
        }}>
          <div style={{
            borderRadius: 18, background: t.surface, padding: "16px 18px",
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10,
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#9A4FC0" }}>
                Up next
              </span>
              <span style={{
                fontSize: 11.5, fontWeight: 600, color: t.sub,
                display: "flex", alignItems: "center", gap: 4,
              }}>
                <Clock size={12} /> in 2h 15m
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 16, background: brandGrad,
                display: "grid", placeItems: "center", color: "#fff",
                fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 19,
                flexShrink: 0,
              }}>
                C
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 17 }}>
                  Carmen · 13:15
                </div>
                <div style={{ fontSize: 12.5, color: t.sub, marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
                  <MapPin size={11} /> Online · Hip mobility, wk 6 of 12
                </div>
              </div>
              <button onClick={() => ping("Opening session plan")} style={{
                width: 36, height: 36, borderRadius: 12, border: "none",
                background: t.surfaceAlt, color: t.ink, display: "grid", placeItems: "center", cursor: "pointer",
              }}>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Needs attention */}
      <div style={{ padding: "24px 20px 0" }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <AlertTriangle size={15} color="#E0455E" />
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 16 }}>
              Needs attention
            </span>
            <span style={{
              fontSize: 11, fontWeight: 700, color: "#E0455E",
              background: dark ? "rgba(224,69,94,.14)" : "rgba(224,69,94,.1)",
              borderRadius: 99, padding: "2px 8px",
            }}>
              4
            </span>
          </div>
          <button onClick={() => ping("All clients")} style={{
            border: "none", background: "none", color: t.sub, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
          }}>
            View all
          </button>
        </div>

        <div style={{
          background: t.surface, border: `1px solid ${t.line}`, borderRadius: 18, overflow: "hidden",
        }}>
          {attention.map((c, i) => (
            <div key={c.name} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "13px 14px 13px 12px",
              borderTop: i ? `1px solid ${t.line}` : "none",
              borderLeft: `3px solid ${levelColor[c.level]}`,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 13, background: t.surfaceAlt,
                display: "grid", placeItems: "center", fontWeight: 700, fontSize: 15,
                color: t.sub, flexShrink: 0,
              }}>
                {c.initial}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14.5 }}>{c.name}</div>
                <div style={{ fontSize: 12, marginTop: 1.5 }}>
                  <span style={{ color: levelColor[c.level], fontWeight: 600 }}>{c.reason}</span>
                  <span style={{ color: t.sub }}> · {c.hint}</span>
                </div>
              </div>
              <button onClick={() => ping(`Message ${c.name}`)} style={{
                width: 38, height: 38, borderRadius: 12, border: `1px solid ${t.line}`,
                background: "none", color: "#5B5BD6", display: "grid", placeItems: "center", cursor: "pointer",
                flexShrink: 0,
              }}>
                <MessageCircle size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 104, left: "50%", transform: "translateX(-50%)",
          background: t.ink, color: t.bg, fontSize: 13, fontWeight: 600,
          padding: "9px 18px", borderRadius: 99, zIndex: 50, whiteSpace: "nowrap",
        }}>
          {toast}
        </div>
      )}

      {/* Bottom nav */}
      <nav style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 430, background: t.navBg,
        borderTop: `1px solid ${t.line}`,
        display: "grid", gridTemplateColumns: "repeat(5,1fr)",
        padding: "8px 8px calc(10px + env(safe-area-inset-bottom))",
      }}>
        {navItems.map(({ id, label, icon: I }) => {
          const active = tab === id;
          return (
            <button key={id} onClick={() => setTab(id)} style={{
              border: "none", background: "none", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "5px 0",
            }}>
              <I size={20} color={active ? "#5B5BD6" : t.sub} strokeWidth={active ? 2.4 : 2} />
              <span style={{
                fontSize: 10.5, fontWeight: active ? 700 : 500,
                color: active ? "#5B5BD6" : t.sub,
              }}>
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}