
import { useState, useEffect, useRef } from "react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, PieChart, Pie, Cell, ReferenceLine, ReferenceArea, ReferenceDot } from "recharts";

// ── DESIGN TOKENS ──────────────────────────────────────────────
const C = {
  bg: "#080D1A",
  surface: "#0F1629",
  surfaceHigh: "#162040",
  border: "#1E2D4A",
  borderBright: "#2A4070",
  amber: "#F59E0B",
  amberDim: "#92600A",
  green: "#10B981",
  greenDim: "#065F46",
  red: "#EF4444",
  redDim: "#7F1D1D",
  blue: "#3B82F6",
  blueDim: "#1E3A5F",
  cyan: "#06B6D4",
  text: "#F1F5F9",
  textMuted: "#64748B",
  textDim: "#94A3B8",
};

// ── HELPERS ─────────────────────────────────────────────────────
function toAmPm(time) {
  const [h, m] = String(time).split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

// Current time as "HH:MM" in IST (UTC + 5:30), independent of the browser zone.
function istHHMM(d = new Date()) {
  const ist = new Date(d.getTime() + 5.5 * 3600000);
  return `${String(ist.getUTCHours()).padStart(2, "0")}:${String(ist.getUTCMinutes()).padStart(2, "0")}`;
}

// ── SIMULATED LIVE DATA ─────────────────────────────────────────
// Full operating day, 06:00 → 23:00 IST in 1-hour steps. OTP dips during the
// morning (08–11) and evening (17–20) peaks; cancellations move inversely.
const flightData = [
  { time: "06:00", flights: 180, cancelled: 1, otpPct: 94 },
  { time: "07:00", flights: 230, cancelled: 2, otpPct: 92 },
  { time: "08:00", flights: 290, cancelled: 5, otpPct: 87 },
  { time: "09:00", flights: 310, cancelled: 7, otpPct: 85 },
  { time: "10:00", flights: 320, cancelled: 8, otpPct: 86 },
  { time: "11:00", flights: 300, cancelled: 6, otpPct: 87 },
  { time: "12:00", flights: 270, cancelled: 4, otpPct: 90 },
  { time: "13:00", flights: 260, cancelled: 3, otpPct: 92 },
  { time: "14:00", flights: 280, cancelled: 3, otpPct: 91 },
  { time: "15:00", flights: 300, cancelled: 4, otpPct: 90 },
  { time: "16:00", flights: 300, cancelled: 5, otpPct: 88 },
  { time: "17:00", flights: 310, cancelled: 7, otpPct: 86 },
  { time: "18:00", flights: 320, cancelled: 8, otpPct: 85 },
  { time: "19:00", flights: 300, cancelled: 6, otpPct: 86 },
  { time: "20:00", flights: 270, cancelled: 5, otpPct: 87 },
  { time: "21:00", flights: 210, cancelled: 2, otpPct: 91 },
  { time: "22:00", flights: 150, cancelled: 2, otpPct: 92 },
  { time: "23:00", flights: 90, cancelled: 1, otpPct: 93 },
];

const riskForecast = [
  { hour: "Now", risk: 28, crew: 94, weather: 15 },
  { hour: "+6h", risk: 35, crew: 91, weather: 22 },
  { hour: "+12h", risk: 42, crew: 88, weather: 38 },
  { hour: "+24h", risk: 61, crew: 82, weather: 65 },
  { hour: "+36h", risk: 74, crew: 79, weather: 71 },
  { hour: "+48h", risk: 68, crew: 83, weather: 58 },
  { hour: "+72h", risk: 52, crew: 87, weather: 42 },
];

const crisisComparison = [
  { metric: "Day 1", without: 45, with: 8 },
  { metric: "Day 2", without: 180, with: 12 },
  { metric: "Day 3", without: 320, with: 18 },
  { metric: "Day 4", without: 450, with: 22 },
  { metric: "Day 5", without: 450, with: 19 },
  { metric: "Day 6", without: 390, with: 15 },
  { metric: "Day 7", without: 310, with: 11 },
  { metric: "Day 8", without: 220, with: 8 },
  { metric: "Day 9", without: 140, with: 5 },
  { metric: "Day 10", without: 90, with: 3 },
];

const recoveryOptions = [
  {
    rank: 1,
    label: "Crew Swap + Aircraft Hold",
    confidence: 94,
    time: "18 min",
    paxImpact: "Low",
    costImpact: "₹2.1L",
    fdtlCompliant: true,
    detail: "Swap Airline FL-204 crew with reserve crew BLR-23. Hold FL-207 at gate for 22 minutes. 94% confidence of full network recovery within 3 hours.",
    color: C.green,
  },
  {
    rank: 2,
    label: "Aircraft Substitution",
    confidence: 87,
    time: "34 min",
    paxImpact: "Medium",
    costImpact: "₹4.8L",
    fdtlCompliant: true,
    detail: "Substitute A320 (VT-INA) from maintenance pool. 34-minute delay on FL-204. Downstream impact on 3 flights mitigated by proactive rebooking.",
    color: C.amber,
  },
  {
    rank: 3,
    label: "Schedule Compression",
    confidence: 78,
    time: "52 min",
    paxImpact: "Medium",
    costImpact: "₹6.2L",
    fdtlCompliant: true,
    detail: "Compress turnaround by 8 minutes across 4 downstream flights. Crew duties remain within FDTL Phase II limits. 78% confidence, elevated risk if weather worsens at IGI.",
    color: C.amber,
  },
];

const routes = [
  { from: "DEL", to: "BOM", lat1: 28.7, lon1: 77.1, lat2: 19.0, lon2: 72.8, status: "normal", flights: 28 },
  { from: "DEL", to: "BLR", lat1: 28.7, lon1: 77.1, lat2: 12.9, lon2: 77.6, status: "watch", flights: 22 },
  { from: "DEL", to: "HYD", lat1: 28.7, lon1: 77.1, lat2: 17.4, lon2: 78.4, status: "normal", flights: 18 },
  { from: "BOM", to: "BLR", lat1: 19.0, lon1: 72.8, lat2: 12.9, lon2: 77.6, status: "normal", flights: 16 },
  { from: "BOM", to: "HYD", lat1: 19.0, lon1: 72.8, lat2: 17.4, lon2: 78.4, status: "normal", flights: 14 },
  { from: "BLR", to: "HYD", lat1: 12.9, lon1: 77.6, lat2: 17.4, lon2: 78.4, status: "alert", flights: 12 },
  { from: "DEL", to: "MAA", lat1: 28.7, lon1: 77.1, lat2: 12.9, lon2: 80.2, status: "normal", flights: 10 },
];

// ── COMPONENTS ──────────────────────────────────────────────────

function Metric({ label, value, unit, status, delta, glow, live }) {
  const statusColor = status === "good" ? C.green : status === "warn" ? C.amber : status === "bad" ? C.red : C.cyan;
  const glowColor = glow === "red" ? C.red : glow === "amber" ? C.amber : null;
  const glowClass = glow === "red" ? "iocc-glow-red" : glow === "amber" ? "iocc-glow-amber" : undefined;
  return (
    <div className={glowClass}
      style={{ background: C.surface, border: `1px solid ${glowColor || C.border}`, borderRadius: 8, padding: "12px 14px", flex: 1, minWidth: 0, transition: "border-color 0.4s" }}>
      <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
        {live && <span className="iocc-live-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, display: "inline-block", boxShadow: `0 0 5px ${C.green}`, flexShrink: 0 }} />}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontSize: 24, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", color: statusColor, transition: "color 0.3s" }}>{value}</span>
        {unit && <span style={{ fontSize: 13, color: C.textMuted }}>{unit}</span>}
      </div>
      {delta && <div style={{ fontSize: 11, color: delta.startsWith("+") ? C.red : C.green, marginTop: 4 }}>{delta} vs yesterday</div>}
    </div>
  );
}

function AlertBadge({ level, text, className }) {
  const colors = { critical: [C.red, C.redDim], warn: [C.amber, C.amberDim], ok: [C.green, C.greenDim] };
  const [fg, bg] = colors[level] || colors.ok;
  return (
    <span className={className} style={{ background: bg, color: fg, border: `1px solid ${fg}`, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}>
      {text}
    </span>
  );
}

function SectionHeader({ title, sub, badge }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.text }}>{title}</h2>
        {badge}
      </div>
      {sub && <p style={{ margin: "6px 0 0", fontSize: 13, color: C.textMuted }}>{sub}</p>}
    </div>
  );
}

// ── LIVE NETWORK MAP (Leaflet) ──────────────────────────────────
const MAP_AIRPORTS = {
  DEL: { lat: 28.61, lng: 77.12, name: "Delhi" },
  BOM: { lat: 19.09, lng: 72.87, name: "Mumbai" },
  BLR: { lat: 13.20, lng: 77.71, name: "Bengaluru" },
  HYD: { lat: 17.23, lng: 78.43, name: "Hyderabad" },
  MAA: { lat: 12.99, lng: 80.17, name: "Chennai" },
};

const routeColor = (status) => (status === "alert" ? C.red : status === "watch" ? C.amber : C.cyan);

function NetworkMap({ height = 240 }) {
  const mapRef = useRef(null);
  const instanceRef = useRef(null);
  const [ready, setReady] = useState(false);

  // Inject Leaflet CSS/JS + theme overrides once.
  useEffect(() => {
    if (!document.getElementById("iocc-leaflet-css")) {
      const link = document.createElement("link");
      link.id = "iocc-leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    if (!document.getElementById("iocc-map-style")) {
      const style = document.createElement("style");
      style.id = "iocc-map-style";
      style.textContent = `
        .leaflet-container { background: ${C.bg} !important; font-family: Inter, system-ui, sans-serif; }
        .leaflet-control-zoom, .leaflet-control-attribution { display: none !important; }
        .iocc-airport-label { background: transparent; border: none; box-shadow: none; color: ${C.textDim}; font-family: monospace; font-size: 8px; font-weight: 700; text-shadow: 0 0 4px ${C.bg}, 0 0 4px ${C.bg}; }
        @keyframes iocc-ripple { 0% { transform: scale(0.5); opacity: 0.6; } 100% { transform: scale(1.9); opacity: 0; } }
        .iocc-popup .leaflet-popup-content-wrapper { background: ${C.surfaceHigh} !important; border: 1px solid ${C.borderBright} !important; border-radius: 8px !important; color: ${C.text} !important; }
        .iocc-popup .leaflet-popup-tip { background: ${C.surfaceHigh} !important; }
        .iocc-popup .leaflet-popup-content { margin: 10px 12px !important; }
      `;
      document.head.appendChild(style);
    }
    if (!window.L && !document.getElementById("iocc-leaflet-js")) {
      const script = document.createElement("script");
      script.id = "iocc-leaflet-js";
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    const t = setInterval(() => { if (window.L) { setReady(true); clearInterval(t); } }, 100);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || instanceRef.current) return;
    const L = window.L;

    const map = L.map(mapRef.current, {
      center: [21.5, 80], zoom: 4, zoomControl: false, attributionControl: false, scrollWheelZoom: false,
    });
    instanceRef.current = map;

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png", { subdomains: "abcd", maxZoom: 19 }).addTo(map);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png", { subdomains: "abcd", maxZoom: 19, opacity: 0.5 }).addTo(map);

    // Curved route lines + animated plane at each midpoint.
    routes.forEach((r) => {
      const from = { lat: r.lat1, lng: r.lon1 };
      const to = { lat: r.lat2, lng: r.lon2 };
      const color = routeColor(r.status);
      const steps = 40;
      const dist = Math.hypot(to.lat - from.lat, to.lng - from.lng) || 1;
      const points = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const lat = from.lat + (to.lat - from.lat) * t;
        const lng = from.lng + (to.lng - from.lng) * t;
        const bulge = Math.sin(Math.PI * t) * dist * 0.18;
        points.push([lat - ((to.lng - from.lng) / dist) * bulge, lng + ((to.lat - from.lat) / dist) * bulge]);
      }
      L.polyline(points, { color, weight: 6, opacity: 0.08 }).addTo(map);
      L.polyline(points, { color, weight: 1.5, opacity: 0.75, dashArray: r.status === "normal" ? null : "6, 5" }).addTo(map);

      const mid = points[steps / 2];
      const nxt = points[steps / 2 + 1];
      const angle = Math.atan2(nxt[1] - mid[1], nxt[0] - mid[0]) * (180 / Math.PI);
      const planeIcon = L.divIcon({
        className: "",
        html: `<div style="transform:rotate(${angle}deg);filter:drop-shadow(0 0 4px ${color})"><svg width="16" height="16" viewBox="-10 -10 20 20"><polygon points="0,-7 2.5,4 0,2 -2.5,4" fill="${color}" opacity="0.95"/><polygon points="0,-1 8,3.5 0,1 -8,3.5" fill="${color}" opacity="0.7"/><polygon points="0,3 3,7 0,5.5 -3,7" fill="${color}" opacity="0.7"/></svg></div>`,
        iconSize: [16, 16], iconAnchor: [8, 8],
      });
      L.marker(mid, { icon: planeIcon, zIndexOffset: 500 }).addTo(map);
    });

    // Pulsing hub markers, coloured by worst route status touching them.
    Object.entries(MAP_AIRPORTS).forEach(([code, ap]) => {
      const touching = routes.filter((r) => r.from === code || r.to === code);
      const hasAlert = touching.some((r) => r.status === "alert");
      const hasWatch = touching.some((r) => r.status === "watch");
      const color = hasAlert ? C.red : hasWatch ? C.amber : C.green;
      const airportIcon = L.divIcon({
        className: "",
        html: `<div style="position:relative;width:22px;height:22px"><div style="position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;border:1px solid ${color};animation:iocc-ripple 2.5s ease-out infinite"></div><div style="position:absolute;top:7px;left:7px;width:8px;height:8px;border-radius:50%;background:${C.bg};border:2px solid ${color};box-shadow:0 0 8px ${color}"></div></div>`,
        iconSize: [22, 22], iconAnchor: [11, 11],
      });
      const marker = L.marker([ap.lat, ap.lng], { icon: airportIcon }).addTo(map);
      const dir = code === "BLR" ? "left" : "right"; // BLR sits just left of MAA — flip its label to avoid overlap
      marker.bindTooltip(code, { permanent: true, direction: dir, offset: dir === "left" ? [-8, 0] : [8, 0], className: "iocc-airport-label" });
      const totalFlights = touching.reduce((s, r) => s + r.flights, 0);
      marker.bindPopup(
        `<div style="min-width:150px"><div style="color:${C.cyan};font-size:13px;font-weight:700;margin-bottom:6px">✈ ${ap.name} (${code})</div><div style="font-size:11px;color:${C.textDim}">${touching.length} routes · ${totalFlights} flights/day</div><div style="font-size:11px;color:${color};margin-top:4px;font-weight:600">${hasAlert ? "ALERT" : hasWatch ? "WATCH" : "NORMAL"}</div></div>`,
        { className: "iocc-popup" }
      );
    });

    // Frame all hubs with generous padding so edge cities (BLR/MAA) aren't clipped.
    const bounds = L.latLngBounds(Object.values(MAP_AIRPORTS).map((a) => [a.lat, a.lng]));
    map.fitBounds(bounds, { paddingTopLeft: [30, 24], paddingBottomRight: [44, 30] });

    return () => { if (instanceRef.current) { instanceRef.current.remove(); instanceRef.current = null; } };
  }, [ready]);

  return <div ref={mapRef} style={{ height, borderRadius: 6, overflow: "hidden", background: C.bg }} />;
}

// ── LIVE ALERT DATA ─────────────────────────────────────────────
const INITIAL_ALERTS = [
  { id: 1, time: "07:42", code: "FL-204", issue: "Crew duty window expires in 48 min — IGI delay cascade", level: "critical", action: "Recovery options generated" },
  { id: 2, time: "07:38", code: "FL-891", issue: "Aircraft rotation break at BLR — 22 min delay propagation", level: "warn", action: "Crew swap initiated" },
  { id: 3, time: "07:31", code: "NETWORK", issue: "IGI fog: 67 min average ground delay — crew duty impact model running", level: "warn", action: "Contingency playbook activated" },
  { id: 4, time: "07:18", code: "FL-112", issue: "FDTL limit reached — Captain Singh. Reserve crew positioning.", level: "ok", action: "Resolved ✓" },
];

const ALERT_POOL = [
  { code: "FL-318", issue: "Tech log entry — A320 VT-IZB sensor fault flagged for engineering", level: "warn", action: "Engineering notified" },
  { code: "FL-552", issue: "ATC flow control at BOM — 18 min ground hold imposed", level: "warn", action: "Pax app updated" },
  { code: "NETWORK", issue: "Crosswind gusts at HYD exceeding 25kt — approach monitoring", level: "warn", action: "Met watch active" },
  { code: "FL-771", issue: "Tight inbound connection — 42 pax transfer risk at DEL", level: "warn", action: "Re-accommodation queued" },
  { code: "FL-446", issue: "Medical assistance requested on arrival — BLR stand 22", level: "critical", action: "Ground ops + medics alerted" },
  { code: "FL-129", issue: "Catering uplift delay at MAA — 12 min turnaround impact", level: "ok", action: "Resolved ✓" },
  { code: "FL-288", issue: "Bird activity reported near IGI 28L — ops on alert", level: "warn", action: "Wildlife control dispatched" },
  { code: "FL-903", issue: "Fuel uplift recalculated for headwind — DEL→CCU", level: "ok", action: "Dispatch confirmed ✓" },
  { code: "CREW", issue: "Standby crew activated at BOM — proactive cover for evening bank", level: "ok", action: "Roster updated ✓" },
  { code: "FL-410", issue: "Baggage belt fault at HYD — manual offload in progress", level: "warn", action: "Maintenance en route" },
  { code: "FL-615", issue: "Gate change at BOM T2 — pax reflow to gate 41", level: "ok", action: "Signage updated ✓" },
  { code: "NETWORK", issue: "ADS-B coverage gap over central sector — secondary radar in use", level: "warn", action: "ATC coordinating" },
  { code: "FL-067", issue: "Slot improvement at DEL — 9 min earlier departure available", level: "ok", action: "Schedule optimised ✓" },
  { code: "FL-734", issue: "Thunderstorm cell tracking toward CCU approach corridor", level: "critical", action: "Reroute under review" },
];

// Flights-airborne baseline by IST hour — realistic daily ops curve.
// 0–5: 0→40 slow climb · 5–9: 40→190 morning wave · 9–14: 190–220 midday peak
// · 14–17: ~160–180 afternoon lull · 17–21: 195–210 evening peak
// · 21–23: 180→80 · 23–24: 80→near zero.
const AIRBORNE_CURVE = [
  [0, 5], [5, 40], [7, 120], [9, 190], [11, 215], [12, 220], [14, 205],
  [15, 178], [16, 166], [17, 172], [18, 195], [19, 205], [20, 210],
  [21, 180], [23, 80], [24, 4],
];

function airborneBaseline(d = new Date()) {
  // Always derive the hour from IST (UTC + 5:30), not the browser's local zone.
  const ist = new Date(d.getTime() + 5.5 * 3600000);
  const t = ist.getUTCHours() + ist.getUTCMinutes() / 60;
  for (let i = 0; i < AIRBORNE_CURVE.length - 1; i++) {
    const [h0, v0] = AIRBORNE_CURVE[i];
    const [h1, v1] = AIRBORNE_CURVE[i + 1];
    if (t >= h0 && t <= h1) return v0 + (v1 - v0) * ((t - h0) / (h1 - h0));
  }
  return AIRBORNE_CURVE[AIRBORNE_CURVE.length - 1][1];
}

// Curve value for the current moment plus a small ±8 jitter so it looks live.
function airborneNow(d = new Date()) {
  return Math.max(0, Math.round(airborneBaseline(d) + (Math.random() * 16 - 8)));
}

// Shared keyframes: IROP badge pulse, blinking live dots, alert slide-in, risk glow.
const IOCC_ANIM_CSS = `
  @keyframes ioccPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(245,158,11,0); } 50% { box-shadow: 0 0 14px 2px rgba(245,158,11,0.5); } }
  .iocc-pulse { animation: ioccPulse 2s ease-in-out infinite; }
  @keyframes ioccBlink { 0%,100% { opacity: 1; } 50% { opacity: 0.12; } }
  .iocc-live-dot { animation: ioccBlink 3s ease-in-out infinite; }
  @keyframes ioccAlertIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
  .iocc-alert-in { animation: ioccAlertIn 0.5s ease-out; }
  @keyframes ioccGlowAmber { 0%,100% { box-shadow: 0 0 0 0 rgba(245,158,11,0); } 50% { box-shadow: 0 0 16px 1px rgba(245,158,11,0.55); } }
  .iocc-glow-amber { animation: ioccGlowAmber 2s ease-in-out infinite; }
  @keyframes ioccGlowRed { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); } 50% { box-shadow: 0 0 16px 1px rgba(239,68,68,0.6); } }
  .iocc-glow-red { animation: ioccGlowRed 2s ease-in-out infinite; }
  @keyframes ioccFade { from { opacity: 0; } to { opacity: 1; } }
  .iocc-fade { animation: ioccFade 0.32s ease; }
`;
function injectAnim() {
  if (document.getElementById("iocc-anim")) return;
  const s = document.createElement("style");
  s.id = "iocc-anim";
  s.textContent = IOCC_ANIM_CSS;
  document.head.appendChild(s);
}

// ── SCREEN: DASHBOARD ───────────────────────────────────────────
function Dashboard() {
  // Inject animation keyframes once (pulse glow, blinking live dot, alert slide-in).
  useEffect(() => {
    if (document.getElementById("iocc-anim")) return;
    const s = document.createElement("style");
    s.id = "iocc-anim";
    s.textContent = IOCC_ANIM_CSS;
    document.head.appendChild(s);
  }, []);

  // Live KPI values — each tile rides its own sine wave (different frequencies)
  // so they fluctuate independently; tick advances every 4s.
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 4000); return () => clearInterval(t); }, []);
  const kpi = {
    otp: +(87 + Math.sin(tick * 0.30) * 2).toFixed(1),         // 85–89%
    cancellations: Math.round(6 + Math.sin(tick * 0.23) * 2),  // 4–8
    crew: +(91.5 + Math.sin(tick * 0.17) * 1.5).toFixed(1),    // 90–93%
    risk: Math.round(38 + Math.sin(tick * 0.40) * 4),          // 34–42
    pax: Math.round(1850 + Math.sin(tick * 0.28) * 150),       // 1,700–2,000
    flightsToday: 2247,                                         // daily total — fixed
    airborne: airborneNow(),                                    // IST time-of-day curve ±5
  };

  // Rolling OTP series — append a fresh point every 30s, drop the oldest.
  const [otpSeries, setOtpSeries] = useState(flightData);
  useEffect(() => {
    const t = setInterval(() => {
      const time = istHHMM();
      setOtpSeries(prev => {
        const last = prev[prev.length - 1];
        const otpPct = Math.max(82, Math.min(95, +(((last && last.otpPct) || 87) + (Math.random() * 3 - 1.5)).toFixed(1)));
        return [...prev.slice(1), { time, flights: 240 + Math.round(Math.random() * 70), cancelled: Math.round(Math.random() * 6), otpPct }];
      });
    }, 30000);
    return () => clearInterval(t);
  }, []);

  // Live alert queue — prepend from the pool every 8s, keep the newest 5.
  const alertId = useRef(100);
  const poolIdx = useRef(0);
  const [alerts, setAlerts] = useState(INITIAL_ALERTS);
  useEffect(() => {
    const t = setInterval(() => {
      const a = ALERT_POOL[poolIdx.current % ALERT_POOL.length];
      poolIdx.current += 1;
      const time = istHHMM();
      setAlerts(prev => [{ ...a, time, id: alertId.current++ }, ...prev].slice(0, 5));
    }, 8000);
    return () => clearInterval(t);
  }, []);

  return (
    <div>
      <SectionHeader
        title="Operations Command Centre — Live View"
        sub="Airline Network  ·  2,247 flights today  ·  Real-time data integration across Sabre, Amadeus, Thales"
        badge={<AlertBadge level="warn" text="⚡ IGI FOG ADVISORY — 06:00–10:00 IST" />}
      />

      {/* KPI Row */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "nowrap" }}>
        <Metric label="OTP" value={kpi.otp.toFixed(1)} unit="%" status={kpi.otp >= 85 ? "good" : "warn"} delta="+1.2%" live />
        <Metric label="Airborne Now" value={kpi.airborne} status="good" live />
        <Metric label="Flights Today" value={kpi.flightsToday.toLocaleString("en-IN")} status="good" live />
        <Metric label="Cancellations" value={kpi.cancellations} status={kpi.cancellations > 5 ? "warn" : "good"} delta="+2" live />
        <Metric label="Crew Avail" value={kpi.crew.toFixed(1)} unit="%" status="warn" delta="-2.3%" live />
        <Metric label="Risk Index" value={kpi.risk} unit="/100" status={kpi.risk > 50 ? "bad" : "warn"} glow={kpi.risk > 50 ? "red" : kpi.risk > 40 ? "amber" : null} live />
        <Metric label="Pax Impacted" value={kpi.pax.toLocaleString("en-IN")} status="warn" delta="+320" live />
      </div>

      {/* OTP Trend */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>OTP & Cancellations — Today</div>
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={otpSeries}>
            <defs>
              <linearGradient id="otpGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.green} stopOpacity={0.3} />
                <stop offset="95%" stopColor={C.green} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="time" tickFormatter={toAmPm} tick={{ fill: C.textMuted, fontSize: 10 }} />
            <YAxis
              yAxisId="otp"
              domain={[78, 98]}
              ticks={[80, 85, 90, 95]}
              tick={{ fill: C.textMuted, fontSize: 10 }}
              label={{ value: "OTP %", angle: -90, position: "insideLeft", fill: C.textMuted, fontSize: 10, style: { textAnchor: "middle" } }}
            />
            <YAxis
              yAxisId="cancel"
              orientation="right"
              domain={[0, 15]}
              ticks={[0, 5, 10, 15]}
              tick={{ fill: C.textMuted, fontSize: 10 }}
              label={{ value: "Cancellations", angle: 90, position: "insideRight", fill: C.textMuted, fontSize: 10, style: { textAnchor: "middle" } }}
            />
            <Tooltip contentStyle={{ background: C.surfaceHigh, border: `1px solid ${C.borderBright}`, color: C.text }} labelFormatter={toAmPm} />
            <Bar yAxisId="cancel" dataKey="cancelled" fill={C.red} fillOpacity={0.35} barSize={6} name="Cancelled" />
            <ReferenceLine
              yAxisId="otp"
              y={85}
              stroke={C.amber}
              strokeDasharray="5 4"
              strokeOpacity={0.7}
              label={{ value: "OTP Target", position: "insideTopRight", fill: C.amber, fontSize: 9 }}
            />
            <Area yAxisId="otp" type="monotone" dataKey="otpPct" stroke={C.green} fill="url(#otpGrad)" strokeWidth={2.5} name="OTP %" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Network Map — full width */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: C.textMuted }}>Live Network Map — India Hubs</div>
          <div style={{ display: "flex", gap: 14 }}>
            <span style={{ fontSize: 10, color: C.green }}>● Normal</span>
            <span style={{ fontSize: 10, color: C.amber }}>● Watch</span>
            <span style={{ fontSize: 10, color: C.red }}>● Alert — BLR</span>
          </div>
        </div>
        <NetworkMap height={460} />
      </div>

      {/* Active Alerts */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: C.textMuted }}>Active Alerts — OCC Queue</div>
          <span style={{ fontSize: 10, color: C.green, display: "flex", alignItems: "center", gap: 6, fontFamily: "monospace", letterSpacing: 1 }}>
            <span className="iocc-live-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, display: "inline-block", boxShadow: `0 0 5px ${C.green}` }} /> LIVE
          </span>
        </div>
        {alerts.map((alert, i) => (
          <div key={alert.id} className={i === 0 ? "iocc-alert-in" : undefined} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < alerts.length - 1 ? `1px solid ${C.border}` : "none" }}>
            <span style={{ fontFamily: "monospace", fontSize: 11, color: C.textMuted, width: 40 }}>{alert.time}</span>
            <span style={{ fontFamily: "monospace", fontSize: 11, color: C.cyan, width: 70 }}>{alert.code}</span>
            <span style={{ fontSize: 12, color: C.text, flex: 1 }}>{alert.issue}</span>
            <AlertBadge level={alert.level} text={alert.action} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SCREEN: DISRUPTION PREDICTION ──────────────────────────────
function DisruptionPrediction() {
  // Peak Disruption Risk point (Fix 6)
  const peakRisk = riskForecast.reduce((a, b) => (b.risk > a.risk ? b : a), riskForecast[0]);

  // IST clock captured at component load → real times under each relative label (Fix 5)
  const forecastBase = useRef(new Date());
  const HOUR_OFFSETS = { Now: 0, "+6h": 6, "+12h": 12, "+24h": 24, "+36h": 36, "+48h": 48, "+72h": 72 };
  const istFor = (label) => istHHMM(new Date(forecastBase.current.getTime() + (HOUR_OFFSETS[label] || 0) * 3600000));
  const ForecastTick = ({ x, y, payload }) => (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={12} textAnchor="middle" fill={C.textMuted} fontSize={10}>{payload.value}</text>
      <text x={0} y={0} dy={25} textAnchor="middle" fill={C.textDim} fontSize={9}>{istFor(payload.value)} IST</text>
    </g>
  );

  return (
    <div>
      <SectionHeader
        title="AI Disruption Prediction Engine"
        sub="72-96 hour advance warning  ·  Monte Carlo simulation  ·  FDTL compliance monitor  ·  Probabilistic crew forecasting"
        badge={<AlertBadge level="warn" text="ELEVATED RISK — NEXT 36HRS" />}
      />

      {/* Risk Gauge Row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Disruption Risk Index", value: 38, max: 100, color: C.amber, desc: "Moderate — monitored" },
          { label: "Crew Availability Risk", value: 22, max: 100, color: C.green, desc: "Low — sufficient reserves" },
          { label: "Weather Impact Score", value: 54, max: 100, color: C.amber, desc: "IGI fog season active" },
          { label: "FDTL Compliance Buffer", value: 78, max: 100, color: C.green, desc: "14% headroom" },
        ].map((g, i) => (
          <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, flex: 1 }}>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 8 }}>{g.label}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, height: 6, background: C.bg, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${g.value}%`, height: "100%", background: g.color, borderRadius: 3, transition: "width 0.5s" }} />
              </div>
              <span style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 700, color: g.color, width: 36, textAlign: "right" }}>{g.value}</span>
            </div>
            <div style={{ fontSize: 10, color: C.textMuted, marginTop: 6 }}>{g.desc}</div>
          </div>
        ))}
      </div>

      {/* 72-Hour Forecast */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
          <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>72-Hour Risk Forecast — Composite Model</div>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={riskForecast} margin={{ top: 24, right: 8, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.amber} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={C.amber} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="weatherGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.blue} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={C.blue} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="hour" tick={<ForecastTick />} height={40} interval={0} />
              <YAxis
                yAxisId="left"
                domain={[0, 85]}
                tick={{ fill: C.textMuted, fontSize: 10 }}
                label={{ value: "Risk Score", angle: -90, position: "insideLeft", fill: C.textMuted, fontSize: 10, style: { textAnchor: "middle" } }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[70, 100]}
                tick={{ fill: C.textMuted, fontSize: 10 }}
                label={{ value: "Crew Avail %", angle: 90, position: "insideRight", fill: C.textMuted, fontSize: 10, style: { textAnchor: "middle" } }}
              />
              <Tooltip contentStyle={{ background: C.surfaceHigh, border: `1px solid ${C.borderBright}`, color: C.text }} />
              {/* High Risk Window band (Fix 4) — behind data */}
              <ReferenceArea
                yAxisId="left"
                x1="+24h"
                x2="+48h"
                fill={C.red}
                fillOpacity={0.05}
                label={{ value: "HIGH RISK WINDOW", position: "insideTopLeft", fill: C.red, fontSize: 9, style: { letterSpacing: 1 } }}
              />
              {/* Critical Threshold line (Fix 3) — behind data */}
              <ReferenceLine
                yAxisId="left"
                y={60}
                stroke={C.red}
                strokeDasharray="5 4"
                strokeOpacity={0.7}
                label={{ value: "Critical Threshold", position: "insideBottomRight", fill: C.red, fontSize: 10 }}
              />
              <Area yAxisId="left" type="monotone" dataKey="risk" stroke={C.amber} fill="url(#riskGrad)" strokeWidth={2.5} name="Disruption Risk" isAnimationActive={false} />
              <Area yAxisId="left" type="monotone" dataKey="weather" stroke={C.blue} fill="url(#weatherGrad)" strokeWidth={2.5} name="Weather Impact" isAnimationActive={false} />
              <Line yAxisId="right" type="monotone" dataKey="crew" stroke={C.green} strokeWidth={2.5} dot={false} name="Crew Availability %" strokeDasharray="5 3" isAnimationActive={false} />
              {/* Peak Risk highlight (Fix 6) */}
              <ReferenceDot yAxisId="left" x={peakRisk.hour} y={peakRisk.risk} r={9} fill={C.amber} fillOpacity={0.2} stroke="none" />
              <ReferenceDot
                yAxisId="left"
                x={peakRisk.hour}
                y={peakRisk.risk}
                r={5}
                fill={C.amber}
                stroke={C.bg}
                strokeWidth={1.5}
                label={{ value: `Peak Risk ${peakRisk.risk} at ${peakRisk.hour}`, position: "right", fill: C.amber, fontSize: 10, offset: 8 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            <span style={{ fontSize: 10, color: C.amber }}>■ Disruption Risk</span>
            <span style={{ fontSize: 10, color: C.blue }}>■ Weather Impact</span>
            <span style={{ fontSize: 10, color: C.green }}>– Crew Availability</span>
          </div>
        </div>

        {/* Monte Carlo Results */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
          <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 12 }}>Monte Carlo Simulation — 10,000 Runs</div>
          <div style={{ fontSize: 11, color: C.textDim, marginBottom: 16 }}>Probability distribution of cancellation outcomes in next 36 hours</div>
          {[
            { range: "0–5 cancellations", prob: 34, color: C.green },
            { range: "6–20 cancellations", prob: 41, color: C.amber },
            { range: "21–50 cancellations", prob: 18, color: C.amber },
            { range: "50+ cancellations", prob: 7, color: C.red },
          ].map((s, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: C.textDim }}>{s.range}</span>
                <span style={{ fontSize: 11, fontFamily: "monospace", color: s.color, fontWeight: 700 }}>{s.prob}%</span>
              </div>
              <div style={{ height: 6, background: C.bg, borderRadius: 3 }}>
                <div style={{ width: `${s.prob}%`, height: "100%", background: s.color, borderRadius: 3, opacity: 0.85 }} />
              </div>
            </div>
          ))}
          <div style={{ marginTop: 16, padding: 12, background: C.bg, borderRadius: 6, border: `1px solid ${C.amberDim}` }}>
            <div style={{ fontSize: 11, color: C.amber, fontWeight: 600 }}>⚡ Recommended Pre-Action</div>
            <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>Position 3 additional reserve crew at IGI. Pre-build fog contingency playbooks for 06:00–10:00 IST window tomorrow.</div>
          </div>
        </div>
      </div>

      {/* FDTL Compliance Monitor */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
        <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 14 }}>FDTL Phase II Compliance Monitor — Crew at Risk in Next 24 Hours</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
          {[
            { id: "IGI-CR-204", name: "Capt Sharma", base: "DEL", dutyLeft: "2h 14m", status: "warn" },
            { id: "IGI-FO-891", name: "FO Patel", base: "DEL", dutyLeft: "1h 48m", status: "critical" },
            { id: "BLR-CR-112", name: "Capt Singh", base: "BLR", dutyLeft: "3h 02m", status: "warn" },
            { id: "BOM-CR-445", name: "Capt Joshi", base: "BOM", dutyLeft: "4h 31m", status: "ok" },
            { id: "HYD-FO-223", name: "FO Reddy", base: "HYD", dutyLeft: "5h 18m", status: "ok" },
          ].map((crew, i) => {
            const color = crew.status === "critical" ? C.red : crew.status === "warn" ? C.amber : C.green;
            return (
              <div key={i} style={{ background: C.bg, border: `1px solid ${color}22`, borderRadius: 6, padding: 10 }}>
                <div style={{ fontSize: 9, color: C.textMuted, fontFamily: "monospace" }}>{crew.id}</div>
                <div style={{ fontSize: 11, color: C.text, marginTop: 2 }}>{crew.name}</div>
                <div style={{ fontSize: 10, color: C.textDim }}>{crew.base}</div>
                <div style={{ fontSize: 12, color: color, fontFamily: "monospace", fontWeight: 700, marginTop: 4 }}>{crew.dutyLeft}</div>
                <div style={{ fontSize: 9, color: color }}>duty remaining</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── SCREEN: IROP RECOVERY ───────────────────────────────────────
function IROPRecovery() {
  const [selected, setSelected] = useState(null);
  const [approved, setApproved] = useState(false);
  const [executing, setExecuting] = useState(false);

  const approve = (i) => {
    setSelected(i);
    setExecuting(true);
    setTimeout(() => { setExecuting(false); setApproved(true); }, 1800);
  };

  return (
    <div>
      <SectionHeader
        title="IROP Recovery Engine"
        sub="AI-generated ranked recovery options  ·  Human-in-the-loop approval  ·  Target: recovery plan in under 3 minutes"
        badge={<AlertBadge level="critical" text="🚨 ACTIVE IROP — FL-204 · DEL→BOM" />}
      />

      {/* Incident Summary */}
      <div style={{ background: C.surface, border: `1px solid ${C.redDim}`, borderRadius: 8, padding: 20, marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          <div>
            <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4 }}>FLIGHT</div>
            <div style={{ fontSize: 18, fontFamily: "monospace", fontWeight: 700, color: C.red }}>FL-204</div>
            <div style={{ fontSize: 11, color: C.textDim }}>DEL → BOM</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4 }}>TRIGGER</div>
            <div style={{ fontSize: 13, color: C.amber }}>Crew duty limit</div>
            <div style={{ fontSize: 11, color: C.textDim }}>Expires in 48 min</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4 }}>PAX ON BOARD</div>
            <div style={{ fontSize: 18, fontFamily: "monospace", fontWeight: 700, color: C.text }}>186</div>
            <div style={{ fontSize: 11, color: C.textDim }}>Full aircraft</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4 }}>TIME TO DECISION</div>
            <div style={{ fontSize: 18, fontFamily: "monospace", fontWeight: 700, color: C.amber }}>02:47</div>
            <div style={{ fontSize: 11, color: C.textDim }}>vs 45–90 min manual</div>
          </div>
        </div>
      </div>

      {/* Recovery Options */}
      {!approved ? (
        <div>
          <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 14 }}>
            AI has generated {recoveryOptions.length} ranked recovery options. Review and approve. All options are FDTL Phase II compliant.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {recoveryOptions.map((opt, i) => (
              <div key={i} style={{ background: C.surface, border: `1px solid ${selected === i ? opt.color : C.border}`, borderRadius: 8, padding: 20, cursor: "pointer", transition: "border-color 0.2s" }}
                onClick={() => setSelected(i)}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: opt.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: C.bg }}>
                      {opt.rank}
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{opt.label}</span>
                    <AlertBadge level={opt.fdtlCompliant ? "ok" : "critical"} text="FDTL ✓" />
                  </div>
                  <div style={{ display: "flex", gap: 16 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: C.textMuted }}>CONFIDENCE</div>
                      <div style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 700, color: opt.color }}>{opt.confidence}%</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: C.textMuted }}>DELAY</div>
                      <div style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 700, color: C.text }}>{opt.time}</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: C.textMuted }}>COST</div>
                      <div style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 700, color: C.textDim }}>{opt.costImpact}</div>
                    </div>
                  </div>
                </div>
                {selected === i && (
                  <div style={{ fontSize: 12, color: C.textDim, padding: "10px 12px", background: C.bg, borderRadius: 6, marginTop: 4 }}>
                    {opt.detail}
                  </div>
                )}
              </div>
            ))}
          </div>

          {selected !== null && (
            <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
              <button onClick={() => approve(selected)} disabled={executing}
                style={{ background: C.green, color: C.bg, border: "none", borderRadius: 6, padding: "12px 28px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                {executing ? "⟳ EXECUTING..." : `✓ APPROVE OPTION ${selected + 1} — ${recoveryOptions[selected].label}`}
              </button>
              <button onClick={() => setSelected(null)}
                style={{ background: "transparent", color: C.textMuted, border: `1px solid ${C.border}`, borderRadius: 6, padding: "12px 20px", fontSize: 13, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ background: C.surface, border: `1px solid ${C.green}`, borderRadius: 8, padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.green, marginBottom: 8 }}>Recovery Approved & Executing</div>
          <div style={{ fontSize: 14, color: C.textDim, marginBottom: 24 }}>Option {selected + 1}: {recoveryOptions[selected].label}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, maxWidth: 480, margin: "0 auto" }}>
            {["Crew swap instruction sent", "PAX notified via app & SMS", "Downstream flights updated"].map((s, i) => (
              <div key={i} style={{ background: C.bg, borderRadius: 6, padding: 12, fontSize: 11, color: C.green }}>✓ {s}</div>
            ))}
          </div>
          <div style={{ marginTop: 20, fontSize: 13, color: C.textMuted }}>
            Recovery plan generated and approved in <strong style={{ color: C.green }}>2 min 47 sec</strong> · vs 45–90 min manual coordination
          </div>
          <button onClick={() => { setSelected(null); setApproved(false); }}
            style={{ marginTop: 20, background: "transparent", color: C.textMuted, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 20px", fontSize: 12, cursor: "pointer" }}>
            Reset Demo
          </button>
        </div>
      )}
    </div>
  );
}

// ── SCREEN: DECEMBER CRISIS REPLAY ─────────────────────────────
function CrisisReplay() {
  const [day, setDay] = useState(4);

  return (
    <div>
      <SectionHeader
        title="Historical Crisis Simulation — IOCC Replay"
        sub="Counterfactual analysis: what would have happened if the IOCC had been operational during the historical operational crisis"
        badge={<AlertBadge level="ok" text="SIMULATION MODE" />}
      />

      {/* Timeline Slider */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: C.textMuted }}>Crisis Day: <strong style={{ color: C.text }}>Dec {day + 1}, 2025</strong></span>
          <div style={{ display: "flex", gap: 24 }}>
            <span style={{ fontSize: 12 }}><span style={{ color: C.red }}>■</span> Without IOCC: <strong style={{ color: C.red, fontFamily: "monospace" }}>{crisisComparison[day - 1].without}</strong> cancellations</span>
            <span style={{ fontSize: 12 }}><span style={{ color: C.green }}>■</span> With IOCC: <strong style={{ color: C.green, fontFamily: "monospace" }}>{crisisComparison[day - 1].with}</strong> cancellations</span>
            <span style={{ fontSize: 12, color: C.amber }}>Reduction: <strong style={{ fontFamily: "monospace" }}>{Math.round((1 - crisisComparison[day - 1].with / crisisComparison[day - 1].without) * 100)}%</strong></span>
          </div>
        </div>
        <input type="range" min={1} max={10} value={day} onChange={e => setDay(Number(e.target.value))}
          style={{ width: "100%", accentColor: C.amber }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: C.textMuted, marginTop: 4 }}>
          {["Dec 1", "Dec 2", "Dec 3", "Dec 4", "Dec 5", "Dec 6", "Dec 7", "Dec 8", "Dec 9", "Dec 10"].map(d => <span key={d}>{d}</span>)}
        </div>
      </div>

      {/* Comparison Chart */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>Daily Flight Cancellations — Actual vs IOCC Scenario</div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={crisisComparison} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="metric" tick={{ fill: C.textMuted, fontSize: 10 }} />
            <YAxis tick={{ fill: C.textMuted, fontSize: 10 }} />
            <Tooltip contentStyle={{ background: C.surfaceHigh, border: `1px solid ${C.borderBright}`, color: C.text }} />
            <Bar dataKey="without" name="Without IOCC" fill={C.red} opacity={0.7} radius={[3, 3, 0, 0]} />
            <Bar dataKey="with" name="With IOCC" fill={C.green} opacity={0.9} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Impact Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Flights Saved", value: "3,840", desc: "Over 10-day period", color: C.green },
          { label: "Revenue Protected", value: "₹3.2B", desc: "Refunds avoided", color: C.green },
          { label: "Bags Recovered", value: "2,700+", desc: "Automated rerouting", color: C.cyan },
          { label: "PAX Re-booked Auto", value: "94%", desc: "Without human intervention", color: C.green },
        ].map((s, i) => (
          <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 6, textTransform: "uppercase" }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "monospace", color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{s.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Red / amber / green by how much buffer (minutes) exists before the covered flight departs.
const bufferColor = (min) => (min < 20 ? C.red : min < 40 ? C.amber : C.green);

// Flights departing each hub in the next 3 hours (shown in the hover card).
const HUB_DEPARTURES = {
  DEL: [
    { flight: "FL-204", to: "BOM", time: "19:55" },
    { flight: "FL-207", to: "HYD", time: "20:40" },
    { flight: "FL-219", to: "CCU", time: "21:25" },
  ],
  BOM: [
    { flight: "FL-318", to: "DEL", time: "20:10" },
    { flight: "FL-552", to: "MAA", time: "21:05" },
  ],
  BLR: [
    { flight: "FL-233", to: "DEL", time: "20:15" },
    { flight: "FL-241", to: "BOM", time: "22:10" },
  ],
  HYD: [
    { flight: "FL-446", to: "BLR", time: "20:30" },
    { flight: "FL-615", to: "BOM", time: "21:40" },
  ],
  MAA: [
    { flight: "FL-129", to: "DEL", time: "20:50" },
  ],
};

// ── CREW POSITIONING MAP (Leaflet) ──────────────────────────────
function CrewMap({ height = 340, movements = [], reserves = [] }) {
  const mapRef = useRef(null);
  const instanceRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!document.getElementById("iocc-leaflet-css")) {
      const link = document.createElement("link");
      link.id = "iocc-leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    if (!document.getElementById("iocc-map-style")) {
      const style = document.createElement("style");
      style.id = "iocc-map-style";
      style.textContent = `
        .leaflet-container { background: ${C.bg} !important; font-family: Inter, system-ui, sans-serif; }
        .leaflet-control-zoom, .leaflet-control-attribution { display: none !important; }
        .iocc-airport-label { background: transparent; border: none; box-shadow: none; color: ${C.textDim}; font-family: monospace; font-size: 8px; font-weight: 700; text-shadow: 0 0 4px ${C.bg}, 0 0 4px ${C.bg}; }
      `;
      document.head.appendChild(style);
    }
    // Crew-map-specific styling: flowing arrows, crew label cards, flight tags, hub popups.
    if (!document.getElementById("iocc-crewmap-style")) {
      const s = document.createElement("style");
      s.id = "iocc-crewmap-style";
      s.textContent = `
        @keyframes ioccFlow { to { stroke-dashoffset: -24; } }
        .iocc-flow { animation: ioccFlow 0.9s linear infinite; }
        .leaflet-tooltip.iocc-crew-card { background: ${C.surfaceHigh}; border: 1px solid ${C.borderBright}; border-radius: 6px; box-shadow: 0 2px 10px rgba(0,0,0,0.45); padding: 0; z-index: 650; }
        .leaflet-tooltip.iocc-crew-card::before { display: none; }
        .leaflet-tooltip.iocc-crew-chip { background: transparent; border: none; box-shadow: none; padding: 0; }
        .leaflet-tooltip.iocc-crew-chip::before { display: none; }
        .iocc-flighttag { font-family: monospace; font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 4px; white-space: nowrap; background: ${C.bg}; }
        .iocc-hub-popup .leaflet-popup-content-wrapper { background: ${C.surfaceHigh} !important; border: 1px solid ${C.borderBright} !important; border-radius: 8px !important; color: ${C.text} !important; }
        .iocc-hub-popup .leaflet-popup-tip { background: ${C.surfaceHigh} !important; }
      `;
      document.head.appendChild(s);
    }
    if (!window.L && !document.getElementById("iocc-leaflet-js")) {
      const script = document.createElement("script");
      script.id = "iocc-leaflet-js";
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    const t = setInterval(() => { if (window.L) { setReady(true); clearInterval(t); } }, 100);
    return () => clearInterval(t);
  }, []);

  // Stable signature so the map only rebuilds when the moves change
  // (not on every parent re-render from the 1s header clock tick).
  const movesSig = movements.map((m) => `${m.crew}:${m.from}>${m.to}:${m.buffer}`).join("|");

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const L = window.L;
    if (instanceRef.current) { instanceRef.current.remove(); instanceRef.current = null; }

    const map = L.map(mapRef.current, { center: [20.5, 79], zoom: 4, zoomControl: false, attributionControl: false, scrollWheelZoom: false });
    instanceRef.current = map;
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png", { subdomains: "abcd", maxZoom: 19 }).addTo(map);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png", { subdomains: "abcd", maxZoom: 19, opacity: 0.5 }).addTo(map);

    // How many crew movements converge on each hub (drives the capacity-pressure ring).
    const converge = {};
    movements.forEach((m) => { converge[m.to] = (converge[m.to] || 0) + 1; });

    // Animated flowing crew movement arrows, colour-coded by buffer.
    movements.forEach((m, idx) => {
      const from = MAP_AIRPORTS[m.from];
      const to = MAP_AIRPORTS[m.to];
      if (!from || !to) return;
      const color = bufferColor(m.buffer);
      const steps = 36;
      const dist = Math.hypot(to.lat - from.lat, to.lng - from.lng) || 1;
      const pts = [];
      for (let i = 0; i <= steps; i++) {
        const f = i / steps;
        const lat = from.lat + (to.lat - from.lat) * f;
        const lng = from.lng + (to.lng - from.lng) * f;
        const b = Math.sin(Math.PI * f) * dist * (0.18 + idx * 0.06);
        pts.push([lat - ((to.lng - from.lng) / dist) * b, lng + ((to.lat - from.lat) / dist) * b]);
      }
      const glow = L.polyline(pts, { color, weight: 8, opacity: 0.14 }).addTo(map); // glow + hover target
      L.polyline(pts, { color, weight: 2.5, opacity: 0.95, dashArray: "6,6", className: "iocc-flow", interactive: false }).addTo(map); // flowing dashes

      const mi = Math.floor(steps * 0.55);
      const mid = pts[mi];
      const nxt = pts[mi + 1];
      const angle = Math.atan2(nxt[1] - mid[1], nxt[0] - mid[0]) * (180 / Math.PI);
      const arrow = L.divIcon({ className: "", html: `<div style="transform:rotate(${angle}deg);color:${color};font-size:16px;line-height:1;filter:drop-shadow(0 0 3px ${color})">➤</div>`, iconSize: [16, 16], iconAnchor: [8, 8] });
      L.marker(mid, { icon: arrow, zIndexOffset: 600, interactive: false }).addTo(map);

      // Detail card — appears only on hover, anywhere along the arrow.
      const card = `<div style="padding:7px 9px;border-left:3px solid ${color};min-width:140px">
        <div style="font-size:11px;font-weight:700;color:${C.text}">${m.crew}</div>
        <div style="font-size:9px;color:${C.textMuted}">${m.role}</div>
        <div style="font-size:9px;color:${C.textDim};font-family:monospace;margin-top:4px">${m.from} → ${m.to}</div>
        <div style="font-size:9px;color:${C.textDim};font-family:monospace">dep ${m.dep} · arr ${m.arr}</div>
        <div style="font-size:9px;color:${color};font-weight:700;margin-top:3px">cover ${m.flight} · ${m.buffer}m buffer</div>
      </div>`;
      glow.bindTooltip(card, { sticky: true, direction: "top", className: "iocc-crew-card" });
    });

    // Hub markers with a capacity-pressure ring + clickable crew-availability popup.
    Object.entries(MAP_AIRPORTS).forEach(([code, ap]) => {
      const arrivals = converge[code] || 0;
      const involved = movements.some((m) => m.from === code || m.to === code);
      const frac = Math.min(arrivals, 3) / 3;
      const deg = Math.round(frac * 360);
      const pColor = arrivals >= 3 ? C.red : arrivals === 2 ? C.amber : arrivals === 1 ? C.green : C.borderBright;
      const ringBg = arrivals > 0 ? `conic-gradient(${pColor} ${deg}deg, ${C.border} ${deg}deg)` : C.border;
      const dotColor = involved ? C.cyan : C.borderBright;
      const html = `<div style="width:26px;height:26px;border-radius:50%;background:${ringBg};display:flex;align-items:center;justify-content:center;box-shadow:0 0 8px ${arrivals > 0 ? pColor : "transparent"}">
        <div style="width:18px;height:18px;border-radius:50%;background:${C.bg};display:flex;align-items:center;justify-content:center">
          <div style="width:8px;height:8px;border-radius:50%;background:${dotColor};box-shadow:0 0 6px ${dotColor}"></div>
        </div></div>`;
      const icon = L.divIcon({ className: "", html, iconSize: [26, 26], iconAnchor: [13, 13] });
      const mk = L.marker([ap.lat, ap.lng], { icon }).addTo(map);

      // Hover card: airport, hub name, crew based, incoming movements, next-3h departures.
      const hubReserves = reserves.filter((r) => r.base === code);
      const deps = HUB_DEPARTURES[code] || [];
      const depRows = deps.length
        ? deps.map((d) => `<div style="display:flex;justify-content:space-between;gap:10px;font-size:10px;margin:2px 0"><span style="color:${C.cyan};font-family:monospace">${d.flight} → ${d.to}</span><span style="color:${C.textDim};font-family:monospace">${d.time}</span></div>`).join("")
        : `<div style="font-size:10px;color:${C.textMuted}">None in window</div>`;
      const hubCard = `<div style="padding:8px 10px;min-width:188px">
        <div style="font-size:12px;font-weight:700;color:${C.text}">${code} <span style="color:${C.textMuted};font-weight:400">— ${ap.name}</span></div>
        <div style="display:flex;gap:20px;margin-top:6px">
          <div><div style="font-size:9px;color:${C.textMuted};text-transform:uppercase;letter-spacing:0.5px">Crew based</div><div style="font-size:14px;font-weight:700;color:${C.text};font-family:monospace">${hubReserves.length}</div></div>
          <div><div style="font-size:9px;color:${C.textMuted};text-transform:uppercase;letter-spacing:0.5px">Incoming</div><div style="font-size:14px;font-weight:700;color:${arrivals > 0 ? pColor : C.textDim};font-family:monospace">${arrivals}</div></div>
        </div>
        <div style="font-size:9px;color:${C.textMuted};margin-top:8px;text-transform:uppercase;letter-spacing:0.5px">Departures · next 3h</div>
        <div style="margin-top:3px">${depRows}</div>
      </div>`;
      mk.bindTooltip(hubCard, { sticky: false, direction: "auto", className: "iocc-crew-card" });
    });

    const bounds = L.latLngBounds(Object.values(MAP_AIRPORTS).map((a) => [a.lat, a.lng]));
    map.fitBounds(bounds, { paddingTopLeft: [44, 44], paddingBottomRight: [52, 32] });

    return () => { if (instanceRef.current) { instanceRef.current.remove(); instanceRef.current = null; } };
  }, [ready, movesSig]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={mapRef} style={{ height, borderRadius: 6, overflow: "hidden", background: C.bg }} />;
}

// ── SCREEN: CREW RECOVERY ───────────────────────────────────────
function CrewRecovery() {
  const [selected, setSelected] = useState(0);
  const [executing, setExecuting] = useState(false);
  const [approved, setApproved] = useState(false);
  const approve = () => { setExecuting(true); setTimeout(() => { setExecuting(false); setApproved(true); }, 1800); };

  const affected = [
    { name: "Capt R. Sharma", base: "DEL", flight: "FL-204", left: "2h 14m", level: "warn" },
    { name: "FO A. Patel", base: "DEL", flight: "FL-891", left: "1h 48m", level: "critical" },
    { name: "Capt H. Singh", base: "BLR", flight: "FL-112", left: "3h 02m", level: "warn" },
  ];
  const gapFlights = ["FL-207 DEL→HYD · 20:40", "FL-219 DEL→CCU · 21:25", "FL-233 BLR→DEL · 20:15", "FL-241 BLR→BOM · 22:10"];

  const reserves = [
    { name: "Capt A. Verma", base: "DEL", rest: "14h 20m", fdtl: "13h 00m", qual: "A320 / A321neo", status: "Available" },
    { name: "FO M. Iyer", base: "DEL", rest: "11h 50m", fdtl: "12h 30m", qual: "A320", status: "Available" },
    { name: "Capt S. Gill", base: "DEL", rest: "13h 10m", fdtl: "13h 00m", qual: "A320 / A321neo", status: "Standby" },
    { name: "FO K. Pillai", base: "BOM", rest: "12h 40m", fdtl: "12h 45m", qual: "A320", status: "Available" },
    { name: "Capt V. Rao", base: "BOM", rest: "10h 30m", fdtl: "11h 15m", qual: "A321neo", status: "Positioning" },
    { name: "FO R. Nair", base: "HYD", rest: "15h 05m", fdtl: "13h 00m", qual: "A320", status: "Available" },
    { name: "Capt D. Banerjee", base: "BLR", rest: "9h 45m", fdtl: "10h 30m", qual: "A320", status: "Standby" },
    { name: "FO N. Menon", base: "BLR", rest: "13h 30m", fdtl: "13h 00m", qual: "A320 / ATR72", status: "Available" },
  ];

  const options = [
    {
      rank: 1, label: "Minimal Positioning", confidence: 94, cost: "₹2.4L", color: C.green,
      detail: "DEL gaps covered by local reserves; a single deadhead positions FO R. Nair HYD→BLR to cover the Bengaluru departure. Lowest cost, highest confidence, fully FDTL Phase II compliant.",
      assignments: [
        { crew: "Capt A. Verma", base: "DEL", flight: "FL-207 DEL→HYD", move: "Local — at DEL" },
        { crew: "FO M. Iyer", base: "DEL", flight: "FL-219 DEL→CCU", move: "Local — at DEL" },
        { crew: "FO R. Nair", base: "HYD", flight: "FL-233 BLR→DEL", move: "Deadhead HYD→BLR" },
        { crew: "FO N. Menon", base: "BLR", flight: "FL-241 BLR→BOM", move: "Local — at BLR" },
      ],
      movements: [
        { crew: "FO R. Nair", role: "First Officer", from: "HYD", to: "BLR", flight: "FL-233", dep: "18:05", arr: "19:20", buffer: 55 },
      ],
      timeline: [
        { flight: "FL-233 BLR→DEL", dep: 150, ready: 95 },
        { flight: "FL-207 DEL→HYD", dep: 180, ready: 30 },
        { flight: "FL-219 DEL→CCU", dep: 210, ready: 35 },
        { flight: "FL-241 BLR→BOM", dep: 260, ready: 40 },
      ],
    },
    {
      rank: 2, label: "Balanced Positioning", confidence: 87, cost: "₹4.2L", color: C.amber,
      detail: "Two deadhead positionings (BOM→DEL and HYD→BLR) spread the fatigue load across bases. Adds positioning cost and two tight crew-in-position windows.",
      assignments: [
        { crew: "Capt A. Verma", base: "DEL", flight: "FL-207 DEL→HYD", move: "Local — at DEL" },
        { crew: "FO K. Pillai", base: "BOM", flight: "FL-219 DEL→CCU", move: "Deadhead BOM→DEL" },
        { crew: "FO R. Nair", base: "HYD", flight: "FL-233 BLR→DEL", move: "Deadhead HYD→BLR" },
        { crew: "FO N. Menon", base: "BLR", flight: "FL-241 BLR→BOM", move: "Local — at BLR" },
      ],
      movements: [
        { crew: "FO K. Pillai", role: "First Officer", from: "BOM", to: "DEL", flight: "FL-219", dep: "19:10", arr: "21:00", buffer: 25 },
        { crew: "FO R. Nair", role: "First Officer", from: "HYD", to: "BLR", flight: "FL-233", dep: "18:32", arr: "19:47", buffer: 28 },
      ],
      timeline: [
        { flight: "FL-233 BLR→DEL", dep: 150, ready: 122 },
        { flight: "FL-207 DEL→HYD", dep: 180, ready: 30 },
        { flight: "FL-219 DEL→CCU", dep: 210, ready: 185 },
        { flight: "FL-241 BLR→BOM", dep: 260, ready: 40 },
      ],
    },
    {
      rank: 3, label: "Network Repositioning", confidence: 79, cost: "₹6.8L", color: C.amber,
      detail: "Maximum flexibility using three deadhead positionings (two BOM→DEL, one HYD→BLR) plus a BLR standby callout. Highest cost and the tightest crew-in-position windows — hold unless local reserves are withdrawn.",
      assignments: [
        { crew: "Capt V. Rao", base: "BOM", flight: "FL-207 DEL→HYD", move: "Deadhead BOM→DEL (enroute)" },
        { crew: "FO K. Pillai", base: "BOM", flight: "FL-219 DEL→CCU", move: "Deadhead BOM→DEL" },
        { crew: "FO R. Nair", base: "HYD", flight: "FL-233 BLR→DEL", move: "Deadhead HYD→BLR" },
        { crew: "Capt D. Banerjee", base: "BLR", flight: "FL-241 BLR→BOM", move: "Standby callout — BLR" },
      ],
      movements: [
        { crew: "Capt V. Rao", role: "Captain", from: "BOM", to: "DEL", flight: "FL-207", dep: "18:38", arr: "20:28", buffer: 12 },
        { crew: "FO K. Pillai", role: "First Officer", from: "BOM", to: "DEL", flight: "FL-219", dep: "19:20", arr: "21:10", buffer: 15 },
        { crew: "FO R. Nair", role: "First Officer", from: "HYD", to: "BLR", flight: "FL-233", dep: "18:45", arr: "20:00", buffer: 15 },
      ],
      timeline: [
        { flight: "FL-233 BLR→DEL", dep: 150, ready: 135 },
        { flight: "FL-207 DEL→HYD", dep: 180, ready: 168 },
        { flight: "FL-219 DEL→CCU", dep: 210, ready: 195 },
        { flight: "FL-241 BLR→BOM", dep: 260, ready: 60 },
      ],
    },
  ];
  const opt = options[selected];
  const pct = (v) => `${(v / 360) * 100}%`;

  return (
    <div>
      <SectionHeader
        title="Crew Recovery Engine"
        sub="FDTL-aware reserve matching  ·  deadhead positioning  ·  human-in-the-loop approval"
        badge={<AlertBadge level="critical" text="🚨 ACTIVE IROP — FL-204 · CREW SHORTFALL" />}
      />

      {/* Active crew disruption summary */}
      <div style={{ background: C.surface, border: `1px solid ${C.redDim}`, borderRadius: 8, padding: 20, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 18 }}>
          {[
            { label: "Crew at FDTL Limit", value: "3", color: C.red },
            { label: "Hubs Affected", value: "DEL · BLR", color: C.amber },
            { label: "Downstream Flights at Risk", value: "4", color: C.amber },
            { label: "Recovery Window", value: "6h 00m", color: C.text },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 8 }}>Crew timing out</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {affected.map((c, i) => {
                const cc = c.level === "critical" ? C.red : C.amber;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: cc, boxShadow: `0 0 5px ${cc}` }} />
                    <span style={{ color: C.text }}>{c.name}</span>
                    <span style={{ fontFamily: "monospace", color: C.textDim, fontSize: 11 }}>{c.base} · {c.flight}</span>
                    <span style={{ marginLeft: "auto", fontFamily: "monospace", color: cc, fontWeight: 700 }}>{c.left} left</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 8 }}>Downstream flights needing crew (next 6h)</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {gapFlights.map((f, i) => (
                <span key={i} style={{ fontFamily: "monospace", fontSize: 11, color: C.cyan, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, padding: "5px 10px" }}>{f}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Reserve Crew Availability Panel */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 14 }}>Reserve Crew Availability</div>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 0.6fr 1fr 1fr 1.5fr 1fr", gap: 8, fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
          <span>Crew</span><span>Base</span><span>Rest Done</span><span>FDTL Avail</span><span>Qualifications</span><span>Status</span>
        </div>
        {reserves.map((r, i) => {
          const sc = r.status === "Available" ? C.green : r.status === "Positioning" ? C.cyan : C.amber;
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1.5fr 0.6fr 1fr 1fr 1.5fr 1fr", gap: 8, fontSize: 12, color: C.text, padding: "9px 0", borderBottom: i < reserves.length - 1 ? `1px solid ${C.border}` : "none", alignItems: "center" }}>
              <span>{r.name}</span>
              <span style={{ fontFamily: "monospace", color: C.textDim }}>{r.base}</span>
              <span style={{ fontFamily: "monospace", color: C.textDim }}>{r.rest}</span>
              <span style={{ fontFamily: "monospace", color: C.green }}>{r.fdtl}</span>
              <span style={{ fontSize: 11, color: C.textDim }}>{r.qual}</span>
              <span><span style={{ background: `${sc}22`, color: sc, border: `1px solid ${sc}`, borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 600 }}>{r.status}</span></span>
            </div>
          );
        })}
      </div>

      {/* AI-Generated Crew Recovery Plan */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: C.textMuted }}>AI-Generated Crew Recovery Plan</div>
          <span style={{ fontSize: 10, color: C.cyan, fontFamily: "monospace", letterSpacing: 1 }}>AI PROPOSES · CONTROLLER APPROVES</span>
        </div>

        {!approved ? (
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {options.map((o, i) => (
                <div key={i} onClick={() => setSelected(i)} style={{ background: C.surface, border: `1px solid ${selected === i ? o.color : C.border}`, borderRadius: 8, padding: 18, cursor: "pointer", transition: "border-color 0.2s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 26, height: 26, borderRadius: "50%", background: o.color, color: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12 }}>{o.rank}</div>
                      <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{o.label}</span>
                      <AlertBadge level="ok" text="FDTL ✓" />
                      {i === 0 && <span style={{ fontSize: 10, color: C.green, fontWeight: 700, letterSpacing: 0.5 }}>RECOMMENDED</span>}
                    </div>
                    <div style={{ display: "flex", gap: 18 }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: C.textMuted }}>CONFIDENCE</div>
                        <div style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 700, color: o.color }}>{o.confidence}%</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: C.textMuted }}>POSITIONING</div>
                        <div style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 700, color: C.textDim }}>{o.cost}</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: C.textMuted }}>DEADHEADS</div>
                        <div style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 700, color: C.text }}>{o.movements.length}</div>
                      </div>
                    </div>
                  </div>
                  {selected === i && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 12, color: C.textDim, padding: "10px 12px", background: C.bg, borderRadius: 6, marginBottom: 10 }}>{o.detail}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                        {o.assignments.map((a, j) => (
                          <div key={j} style={{ background: C.bg, borderRadius: 6, padding: "8px 10px", fontSize: 11 }}>
                            <div style={{ color: C.text }}><strong>{a.crew}</strong> <span style={{ color: C.textMuted }}>({a.base})</span></div>
                            <div style={{ color: C.cyan, fontFamily: "monospace", fontSize: 11 }}>{a.flight}</div>
                            <div style={{ color: a.move.startsWith("Deadhead") ? C.amber : C.textDim, fontSize: 10 }}>{a.move}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              <button onClick={approve} disabled={executing}
                style={{ background: C.green, color: C.bg, border: "none", borderRadius: 6, padding: "12px 28px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {executing ? "⟳ EXECUTING..." : `✓ APPROVE OPTION ${opt.rank} — ${opt.label}`}
              </button>
              <span style={{ fontSize: 11, color: C.textMuted }}>Controller authorisation required · the AI proposes but cannot self-execute</span>
            </div>
          </div>
        ) : (
          <div style={{ background: C.surface, border: `1px solid ${C.green}`, borderRadius: 8, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 34, marginBottom: 10 }}>✅</div>
            <div style={{ fontSize: 19, fontWeight: 700, color: C.green, marginBottom: 6 }}>Crew Recovery Approved & Executing</div>
            <div style={{ fontSize: 13, color: C.textDim, marginBottom: 20 }}>Option {opt.rank}: {opt.label} · {opt.cost} positioning · {opt.confidence}% confidence</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, maxWidth: 640, margin: "0 auto" }}>
              {["Crew assignments transmitted to roster", "Reserve crew notified via crew app", "Deadhead tickets issued", "FDTL & duty records updated", "4 downstream flights re-crewed", "Ops + dispatch briefed"].map((s, i) => (
                <div key={i} style={{ background: C.bg, borderRadius: 6, padding: 10, fontSize: 11, color: C.green }}>✓ {s}</div>
              ))}
            </div>
            <div style={{ marginTop: 18, fontSize: 13, color: C.textMuted }}>Recovery plan approved by controller in <strong style={{ color: C.green }}>1 min 52 sec</strong> · all assignments FDTL Phase II compliant</div>
            <button onClick={() => { setApproved(false); setExecuting(false); setSelected(0); }}
              style={{ marginTop: 18, background: "transparent", color: C.textMuted, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 20px", fontSize: 12, cursor: "pointer" }}>
              Reset Demo
            </button>
          </div>
        )}
      </div>

      {/* Crew Positioning Map */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: C.textMuted }}>Crew Positioning Map — {opt.label}</div>
          <div style={{ fontSize: 11, color: opt.movements.length ? C.amber : C.green }}>
            {opt.movements.length ? `${opt.movements.length} deadhead positioning move${opt.movements.length > 1 ? "s" : ""}` : "No positioning required — reserves already at base"}
          </div>
        </div>
        <CrewMap movements={opt.movements} reserves={reserves} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: C.textMuted }}>Hover any hub or crew arrow for detail · ring shows incoming-crew pressure</span>
          <div style={{ display: "flex", gap: 12, fontSize: 10 }}>
            <span style={{ color: C.green }}>● &gt;40m buffer</span>
            <span style={{ color: C.amber }}>● 20–40m</span>
            <span style={{ color: C.red }}>● &lt;20m</span>
          </div>
        </div>
      </div>

      {/* Crew Recovery Timeline */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: C.textMuted }}>Crew Recovery Timeline — Next 6 Hours</div>
          <div style={{ display: "flex", gap: 14, fontSize: 10 }}>
            <span style={{ color: C.cyan }}>◆ Crew in position</span>
            <span style={{ color: C.text }}>✈ Flight departs</span>
            <span style={{ color: C.green }}>▬ buffer</span>
            <span style={{ color: C.amber }}>&lt;40m</span>
            <span style={{ color: C.red }}>&lt;20m</span>
          </div>
        </div>
        {/* axis */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
          <div style={{ width: 150 }} />
          <div style={{ position: "relative", flex: 1, height: 14 }}>
            {[0, 1, 2, 3, 4, 5, 6].map((h) => (
              <span key={h} style={{ position: "absolute", left: pct(h * 60), transform: h === 0 ? "none" : h === 6 ? "translateX(-100%)" : "translateX(-50%)", fontSize: 10, color: C.textMuted }}>{h === 0 ? "Now" : `+${h}h`}</span>
            ))}
          </div>
        </div>
        {opt.timeline.map((row, i) => {
          const buffer = row.dep - row.ready;
          const tight = buffer < 40;
          const col = bufferColor(buffer);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", margin: "10px 0" }}>
              <div style={{ width: 150, fontSize: 12, fontFamily: "monospace", color: C.text }}>{row.flight}</div>
              <div style={{ position: "relative", flex: 1, height: 26, background: C.bg, borderRadius: 4, border: `1px solid ${C.border}` }}>
                <div style={{ position: "absolute", left: pct(row.ready), width: `${(buffer / 360) * 100}%`, top: 8, height: 10, background: col, opacity: 0.65, borderRadius: 5 }} />
                <div style={{ position: "absolute", left: pct(row.ready), top: 5, transform: "translateX(-50%)", color: C.cyan, fontSize: 13 }}>◆</div>
                <div style={{ position: "absolute", left: pct(row.dep), top: 4, transform: "translateX(-50%)", fontSize: 13 }}>✈</div>
                <span style={{ position: "absolute", left: pct((row.ready + row.dep) / 2), top: -13, transform: "translateX(-50%)", fontSize: 9, color: tight ? col : C.textMuted, whiteSpace: "nowrap", fontWeight: tight ? 700 : 400 }}>{tight ? `⚠ ${buffer}m buffer` : `${buffer}m buffer`}</span>
              </div>
            </div>
          );
        })}
        {opt.timeline.some((r) => r.dep - r.ready < 40) && (
          <div style={{ marginTop: 10, fontSize: 11, color: C.amber }}>⚠ Amber/red windows have under 40 minutes of crew-in-position buffer — monitor closely; any further slip risks an FDTL breach.</div>
        )}
      </div>
    </div>
  );
}

// ── LIVE-NETWORK SYSTEM PROMPT ──────────────────────────────────
// This is the full operating context for the assistant. It is used verbatim as
// the `system` prompt when the assistant runs against live Claude (proxy/key).
// The scripted demo answers below mirror this same dataset so the offline
// prototype responds with identical specifics.
const SYSTEM_PROMPT = `You are ARIA (Airline Real-time Intelligence Assistant) — an operations analyst embedded in the Integrated Operations Command Centre with every screen open in front of you. You have continuous, real-time awareness of the live airline network. Answer like a sharp duty ops analyst, never like a generic chatbot.

══════════════════════════════════════════════════════════════
1) FLIGHT OPERATIONS SNAPSHOT  (current, IST)
FLIGHT   ROUTE      STATUS         DELAY    ACTIVE ISSUE
FL-204   DEL→BOM    Boarding hold  +0       Crew duty limit expires in 48 min — recovery options generated (186 pax)
FL-891   BLR→DEL    Delayed        +22 min  Aircraft rotation break at BLR
FL-318   BOM→DEL    Delayed        +18 min  A320 VT-IZB sensor fault — engineering review
FL-552   BOM→MAA    Ground hold    +18 min  ATC flow control at BOM
FL-734   CCU→DEL    Delayed        +35 min  Thunderstorm cell near CCU corridor — reroute under review
FL-446   HYD→BLR    Airborne       0        Medical case on board — medics alerted, BLR stand 22
FL-771   DEL→CCU    Boarding       +5 min   Tight inbound connection — 42 pax transfer risk at DEL
FL-112   DEL→HYD    Departed       0        FDTL limit hit earlier (Capt Singh) — reserve crew positioned
FL-615   BOM→HYD    Boarding       +0       Gate change to 41, BOM T2
FL-903   DEL→CCU    Scheduled      0        Fuel recalculated for forecast headwind

2) CREW STATUS — FDTL Phase II (max duty 12h)
CREW              BASE  ASSIGNMENT          ELAPSED   REMAINING   STATUS
Capt R. Sharma    DEL   FL-204 DEL→BOM      9h 46m    2h 14m      AT RISK
FO A. Patel       DEL   FL-891 BLR→DEL      10h 12m   1h 48m      CRITICAL
Capt H. Singh     BLR   FL-112 reserve      8h 58m    3h 02m      AT RISK
FO P. Khan        DEL   FL-771 DEL→CCU      9h 05m    2h 55m      AT RISK
Capt M. Joshi     BOM   FL-318 BOM→DEL      7h 29m    4h 31m      CLEAR
FO S. Reddy       HYD   FL-446 HYD→BLR      6h 42m    5h 18m      CLEAR
Capt N. Iyer      MAA   FL-552 standby      3h 10m    8h 50m      CLEAR
Capt D. Mehta     BOM   Reserve BOM-23      1h 20m    10h 40m     CLEAR

3) WEATHER INTELLIGENCE  (now + 6h outlook)
DEL/IGI : Vis 1200m mist, wind 320/06kt. ADVISORY: dense fog 06:00–10:00 IST tomorrow. 6h: deteriorating, vis →400m by 05:00, CAT III ops likely.
BOM     : Vis 4000m haze, wind 270/14kt gust 22kt. Gusty crosswind advisory. 6h: improving, winds ease after 21:00.
BLR     : Vis 3000m, wind 090/08kt, light drizzle. 6h: scattered showers, stable.
HYD     : Vis 2500m, wind 250/25kt gust 31kt. CROSSWIND WATCH rwy 09L. 6h: winds persist — monitor.
MAA     : Vis 6000m, wind 110/10kt, clear. 6h: stable, no advisories.

4) NETWORK RISK SUMMARY  (top 3, ranked; cascade if unaddressed within 2h)
#1 HIGH — IGI fog window (06:00–10:00 tmrw) colliding with 3 crew at/near FDTL limits. Cascade: 6–20 cancellations (41% Monte Carlo prob), ~1,800 pax disrupted, FDTL violations replicating the December pattern.
#2 HIGH — FL-204 crew duty expiry in 48 min. Cascade: 186-pax misconnect at BOM + downstream hit to rotations FL-207 / FL-219 / FL-233, BOM evening bank degraded.
#3 MEDIUM — HYD crosswind 25–31kt on 09L. Cascade: go-arounds/diversions, ~4 inbounds affected, added crew-duty pressure at HYD.

5) HISTORICAL PATTERN CONTEXT
December and January are historically the highest-risk months at IGI due to fog. In prior years this triggered cascading FDTL crew-duty violations — the December 2025 event cancelled ~4,500 flights, drove ₹5B in refunds, and stranded 3,000+ bags. The IOCC was purpose-built to break this cycle via probabilistic crew forecasting, Monte Carlo stress-testing, 3-minute IROP recovery, and unified Sabre/Amadeus/Thales data. Counterfactual replay shows an 84% reduction in cancellations.
6) FATIGUE RISK MANAGEMENT SYSTEM (FRMS)  — Component E of the IOCC

6a) BIO-MATHEMATICAL FATIGUE SCORING
The IOCC runs a bio-mathematical fatigue model based on the Three Process Model of alertness, combining sleep history, circadian rhythm phase, and time on task to generate a Fatigue Risk Score (0–100) for every active crew member.
  • 0–30  = LOW risk    (green)  — cleared for duty
  • 30–60 = MODERATE    (amber)  — monitor
  • 60+   = HIGH risk   (red)    — intervention required BEFORE any flight assignment
Current scores:
  • Capt R. Sharma (DEL) — 34 — MODERATE (amber) — early-morning start after a short rest window
  • FO A. Patel  (DEL) — 67 — HIGH (red) — flagged for mandatory rest before next assignment
  • Capt H. Singh (BLR) — 28 — LOW (green) — cleared for duty
  • Capt M. Joshi (BOM) — 41 — MODERATE (amber) — monitoring
  • FO S. Reddy  (HYD) — 22 — LOW (green) — cleared
FO Patel's 67 is already factored into the live IROP recovery: Option 1 (crew swap) specifically AVOIDS assigning FO Patel to FL-204 because of this score — Capt Mehta covers instead.

6b) CREW REST COMPLIANCE TRACKING
The IOCC tracks minimum rest under DGCA FDTL Phase II (effective December 2024) in real time. Minimum rest between duties: 12h domestic, 18h international.
Current: 94% of active crew fully compliant · 4 crew in monitored AMBER zone (rest 10–12h) · 1 crew in RED zone — FO A. Patel, only 8.5h rest completed before next scheduled duty (3.5h deficit vs 12h domestic minimum).
The IOCC automatically blocks assignment of non-compliant crew and flags the crew controller with the exact rest deficit and the earliest legal return-to-duty time.

6c) ICAO Doc 9966 COMPLIANCE STATUS
The airline is in Phase 2 of its FRMS roadmap, targeting full ICAO Doc 9966 compliance by March 2027.
  • Phase 1 (completed Oct 2025): fatigue reporting culture + initial bio-mathematical modelling.
  • Phase 2 (current): integration of fatigue scores into operational rostering + real-time crew monitoring — exactly what ARIA demonstrates today.
  • Phase 3 (Jan–Mar 2027): predictive fatigue modelling at schedule-publication stage — identifying roster fatigue risk 30–60 days before operations.
The fatigue module is designed to meet all SEVEN ICAO Doc 9966 FRMS components: (1) fatigue risk management policy, (2) fatigue reporting system, (3) fatigue risk identification & mitigation, (4) fatigue incident investigation, (5) FRMS promotion & training, (6) FRMS quality assurance, (7) FRMS documentation.

6d) FATIGUE RISK PATTERNS (historical intelligence)
Three recurring high-fatigue patterns from operational data:
  • Early-morning turn: crew on 04:00–06:00 IST departures after a late previous evening duty average a fatigue score of ~58 (moderate–high).
  • Dec/Jan fog disruption: extended IGI ground delays push crew past planned hours — fatigue scores above 65 for up to 23% of active crew during fog events.
  • Back-of-clock international: red-eye 01:00–04:00 IST rotations show the network's highest scores, averaging ~71.
Undisclosed dimension of the December 2025 crisis: ~18% of the crew shortfall was crew legally UNFIT due to fatigue accumulation during the extended disruption, compounding the FDTL regulatory mismatch.

6e) HOW THE FATIGUE SCORE IS CALCULATED (methodology)
The Three Process Model fuses three independent inputs into the 0–100 score (same family as the industry-standard SAFTE-FAST and FAID engines):
  • Process S — homeostatic sleep pressure: builds with hours awake, discharges with sleep; driven by sleep history + accumulated sleep debt.
  • Process C — circadian rhythm: body-clock alertness wave, lowest in the Window of Circadian Low (~02:00–06:00 IST); early-morning and red-eye duties land in this trough.
  • Process W — sleep inertia + time on task: post-wake grogginess plus degradation across hours on duty.
The three are summed and normalized to 0–100. Worked example — FO Patel 67: short rest (high S) + early duty in the circadian dip (high C) + time on task (W) → 67, red band. When explaining a score, identify which process dominates; a circadian-driven red can often be cleared by shifting the duty out of the 02:00–06:00 trough rather than by rest alone.
══════════════════════════════════════════════════════════════

HOW TO ANSWER:
- Always answer with specific data from the context above.
- Cite flight numbers (FL-xxx) and crew names when relevant.
- Quantify risk in numbers (minutes, probabilities, pax counts, ₹).
- End EVERY response with a line beginning "Recommended action:" giving one clear, concrete next step.
- Be concise and analytical. You have every screen open — sound like it.

FATIGUE / REST / FRMS QUESTIONS — always structure the answer in THREE parts:
  1. Current fatigue status — specific scores AND crew names.
  2. What the bio-mathematical model predicts for the next 6–12h — are scores rising or falling as crew complete rest periods.
  3. A specific operational recommendation (e.g. pre-position a rested reserve crew at IGI before the 04:00–06:00 window).
Always reference DGCA FDTL Phase II and ICAO Doc 9966 when discussing compliance, to signal regulatory awareness. NEVER give a generic fatigue answer — every response must include specific scores, specific crew names, specific flight numbers, and a specific recommended action.`;

// ── SCRIPTED ASSISTANT (offline demo — mirrors SYSTEM_PROMPT; no API key) ──
function scriptedReply(q) {
  const t = q.toLowerCase();

  // How the bio-mathematical fatigue score is calculated (methodology)
  if (/(calculat|deriv|comput|methodolog|three[- ]?process|how .*(work|model))/.test(t) && /(fatigue|score|bio|alert|model|three[- ]?process|rest)/.test(t)) {
    return "How the Fatigue Risk Score is calculated:\n\nThe IOCC uses a bio-mathematical model based on the Three Process Model of alertness (the same family as the industry-standard SAFTE-FAST and FAID engines). It fuses three independent inputs into one 0–100 score:\n\n• Process S — Homeostatic sleep pressure: builds with every hour awake and discharges only with sleep. Driven by sleep history and accumulated sleep debt over the prior days.\n• Process C — Circadian rhythm: the body-clock alertness wave, lowest in the Window of Circadian Low (~02:00–06:00 IST). Early-morning and red-eye duties land directly in this trough.\n• Process W — Sleep inertia + time on task: grogginess just after waking, plus the steady degradation across hours already on duty.\n\nThe three are summed and normalized onto the 0–100 scale: 0–30 LOW (green) · 30–60 MODERATE (amber) · 60+ HIGH (red).\n\nWorked example — FO A. Patel, 67/100 (red): short prior rest (8.5h → high Process S / sleep debt) + an early duty hitting the circadian dip (high Process C) + accumulated time on task (Process W) → normalizes to 67, in the high-risk band. This is the Phase 2 capability under our ICAO Doc 9966 roadmap, aligned to DGCA FDTL Phase II.\n\nRecommended action: when reviewing any red score, check which process is dominant — if it's Process C (circadian), a few hours' schedule shift out of the 02:00–06:00 trough often clears it faster than added rest alone.";
  }

  // ICAO Doc 9966 / FRMS compliance status
  if (/(icao|doc ?9966|9966|frms)/.test(t)) {
    return "FRMS compliance status — ICAO Doc 9966:\n\nWe are in PHASE 2 of the FRMS roadmap, targeting full ICAO Doc 9966 compliance by March 2027.\n• Phase 1 (completed Oct 2025) — fatigue reporting culture + initial bio-mathematical modelling.\n• Phase 2 (current) — fatigue scores integrated into operational rostering + real-time crew monitoring. This is exactly what you're seeing ARIA do now.\n• Phase 3 (Jan–Mar 2027) — predictive fatigue modelling at schedule-publication stage, flagging roster fatigue risk 30–60 days before operations.\n\nThe fatigue module is built to satisfy all SEVEN ICAO Doc 9966 FRMS components: (1) FRM policy, (2) fatigue reporting system, (3) risk identification & mitigation, (4) incident investigation, (5) promotion & training, (6) quality assurance, (7) documentation.\n\nLive compliance picture under DGCA FDTL Phase II: 94% of active crew fully compliant, 4 in the amber rest zone (10–12h), 1 in red (FO A. Patel, 8.5h rest — assignment auto-blocked). Bio-mathematical scoring is live for every active crew member.\n\nRecommended action: keep Phase 2 evidence current — export tonight's fatigue-score and rest-compliance logs for the ICAO Doc 9966 quality-assurance file ahead of the March 2027 audit.";
  }

  // FO Patel fit-for-duty (fatigue-flagged crew)
  if (/patel/.test(t)) {
    return "FO A. Patel (DEL) — fit-for-duty assessment:\n\n1) CURRENT STATUS — Fatigue Risk Score 67/100, HIGH (red). Rest completed: 8.5h vs the 12h domestic minimum under DGCA FDTL Phase II — a 3.5h deficit. Verdict: NOT fit for duty on the next assignment. Assignment is auto-blocked by the IOCC.\n2) NEXT 6–12h — the bio-mathematical model (Three Process Model) projects his score dropping back below 60 only after he completes the full 12h rest period; earliest legal return-to-duty is once that rest is met. Until then he stays red.\n3) ALREADY MITIGATED — this is baked into the live FL-204 (DEL→BOM, 186 pax) recovery: Option 1 (crew swap) deliberately AVOIDS rostering FO Patel and uses Capt D. Mehta (10h 40m clear) instead.\n\nRecommended action: hold FO Patel out of all assignments until his 12h rest is complete; confirm Capt Mehta on the FL-204 swap — ARIA has already excluded Patel from that roster.";
  }

  // Network fatigue scores / rest / FRMS (3-part structure)
  if (/(fatigue|rested|rest period|rest compliance|bio-?math|alertness|circadian|fit for duty|fitness)/.test(t)) {
    return "Crew fatigue status across the network (bio-mathematical model · Three Process Model · 0–100):\n\n1) CURRENT SCORES —\n• FO A. Patel (DEL) — 67 — HIGH (red) — 8.5h rest, mandatory rest before next duty\n• Capt M. Joshi (BOM) — 41 — MODERATE (amber) — monitoring\n• Capt R. Sharma (DEL) — 34 — MODERATE (amber) — early-morning start, short rest window\n• Capt H. Singh (BLR) — 28 — LOW (green) — cleared\n• FO S. Reddy (HYD) — 22 — LOW (green) — cleared\nRest compliance (DGCA FDTL Phase II): 94% fully compliant · 4 amber (10–12h) · 1 red (Patel, 8.5h — auto-blocked).\n\n2) NEXT 6–12h — scores trend DOWN overall as crew complete rest: Patel clears red only after a full 12h rest. The watch item is the 04:00–06:00 IST early-morning bank — Sharma (34) and Joshi (41) are rostered into it and historically that pattern pushes scores toward ~58.\n\n3) RECOMMENDATION — pre-position one rested reserve crew at IGI before the 04:00–06:00 window tomorrow, since two crew already sit above the 50 mark heading into early duties during the forecast fog. Reference: DGCA FDTL Phase II + ICAO Doc 9966 (we are Phase 2 compliant).\n\nRecommended action: lock a rested IGI reserve for the 04:00–06:00 bank now and keep FO Patel out until his rest deficit clears.";
  }

  if (/(fdtl|crew|duty|limit|roster|fatigue)/.test(t)) {
    return "Crew FDTL Phase II status — 4 of 8 monitored crew are inside their final 3 hours of duty:\n\n• FO A. Patel (DEL) — FL-891 — 1h 48m remaining — CRITICAL\n• Capt R. Sharma (DEL) — FL-204 — 2h 14m — AT RISK\n• FO P. Khan (DEL) — FL-771 — 2h 55m — AT RISK\n• Capt H. Singh (BLR) — reserve — 3h 02m — AT RISK\n• Capt M. Joshi (BOM) 4h 31m · FO S. Reddy (HYD) 5h 18m · Capt N. Iyer (MAA) 8h 50m — CLEAR\n\nThe binding constraint is FO Patel: at 1h 48m he cannot absorb any further BLR rotation slip, and FL-204 needs Capt Sharma swapped before his 2h 14m expires. Reserve crew BLR-23 and Capt D. Mehta (BOM, 10h 40m clear) are available.\n\nRecommended action: assign Capt Mehta to cover the FL-204 swap and hold FO Patel out of any extension — confirm within 30 minutes.";
  }
  if (/(weather|fog|igi|visibility|wind|crosswind|met)/.test(t)) {
    return "Weather intelligence — network hubs:\n\n• DEL/IGI: vis 1200m mist, wind 320/06kt. DENSE FOG advisory 06:00–10:00 IST tomorrow; 6h outlook vis →400m by 05:00, CAT III likely.\n• HYD: vis 2500m, wind 250/25kt gust 31kt — CROSSWIND WATCH rwy 09L, persists 6h.\n• BOM: vis 4000m haze, 270/14kt gust 22kt — eases after 21:00.\n• BLR: vis 3000m, light drizzle, stable.\n• MAA: vis 6000m, clear, no advisories.\n\nThe IGI fog window is the dominant threat — it overlaps with 3 crew near FDTL limits, the same combination behind past December cascades.\n\nRecommended action: pre-position 3 reserve crew at DEL tonight and pre-build the fog playbook for the 06:00–10:00 window before visibility drops.";
  }
  if (/(fl-?204|recovery|irop|substitut|swap|option)/.test(t)) {
    return "FL-204 (DEL→BOM · 186 pax) — Capt R. Sharma's duty limit expires in 48 min. Three FDTL-compliant recovery options, ranked:\n\n1. Crew Swap (Capt Mehta) + Aircraft Hold — 94% confidence · 18 min delay · ₹2.1L · low pax impact  ← recommended\n2. Aircraft Substitution (A320 VT-INA) — 87% · 34 min · ₹4.8L · medium\n3. Schedule Compression — 78% · 52 min · ₹6.2L · medium\n\nOption 1 keeps Sharma legal and recovers the network within ~3 hours; doing nothing risks a 186-pax misconnect at BOM plus downstream hits to FL-207/219/233.\n\nRecommended action: approve Option 1 in the IROP Recovery tab now — decision target under 3 minutes vs 45–90 min manual.";
  }
  if (/(risk|disruption|top|cascade|priorit|threat)/.test(t)) {
    return "Top 3 network risks right now, ranked (cascade if not addressed in 2h):\n\n#1 HIGH — IGI fog (06:00–10:00 tmrw) + 3 crew near FDTL limits. → 6–20 cancellations (41% Monte Carlo), ~1,800 pax, December-style FDTL violations.\n#2 HIGH — FL-204 crew duty expiry in 48 min. → 186-pax misconnect at BOM, downstream FL-207/219/233, BOM evening bank degraded.\n#3 MEDIUM — HYD crosswind 25–31kt on 09L. → go-arounds/diversions, ~4 inbounds, added HYD crew-duty pressure.\n\nDisruption Risk Index is 38/100 and trending up with the fog window.\n\nRecommended action: clear #2 immediately with the FL-204 crew swap, then lock the IGI reserve-crew plan for #1 before 22:00.";
  }
  if (/(december|crisis|historical|cycle|pattern|january|history)/.test(t)) {
    return "Historical context: December and January are the highest-risk months at IGI because of fog. In prior years that fog repeatedly triggered cascading FDTL crew-duty violations — the December 2025 event cancelled ~4,500 flights, drove ₹5B in refunds, and stranded 3,000+ bags.\n\nThe IOCC was built specifically to break that cycle: probabilistic crew forecasting, Monte Carlo stress-testing, 3-minute IROP recovery, and unified Sabre/Amadeus/Thales data. Counterfactual replay shows an 84% reduction in cancellations (see the Dec Crisis Replay tab). Tonight's IGI fog window is the same setup — already modelled and being mitigated.\n\nRecommended action: run tomorrow's fog scenario through Monte Carlo now and pre-stage reserve crew so the historical cascade can't form.";
  }
  if (/(flight|status|airborne|delay|board|ops|snapshot|operation)/.test(t)) {
    return "Flight operations snapshot — active issues:\n\n• FL-204 DEL→BOM — boarding hold — crew duty limit 48 min (recovery generated)\n• FL-734 CCU→DEL — +35 min — thunderstorm reroute under review\n• FL-891 BLR→DEL — +22 min — aircraft rotation break at BLR\n• FL-318 BOM→DEL — +18 min — A320 VT-IZB sensor fault\n• FL-552 BOM→MAA — +18 min — ATC flow control at BOM\n• FL-771 DEL→CCU — +5 min — 42-pax tight connection at DEL\n• FL-446 HYD→BLR — airborne — medical case, medics on stand 22\n\nOTP is 87.2% (target 85%+). The most time-critical item is FL-204 — it's the only one tied to a hard FDTL deadline.\n\nRecommended action: prioritise FL-204's crew swap, then re-time FL-734 around the CCU cell.";
  }
  return "I have the full network picture open — flight ops, crew FDTL status, hub weather, and the live risk board. Right now the headline is FL-204 (crew duty in 48 min), the IGI fog window 06:00–10:00 tomorrow, and HYD crosswinds; Disruption Risk Index is 38/100.\n\nAsk me about any of: IGI/weather risk, crew FDTL status, FL-204 recovery options, the top network risks, or the December crisis pattern.\n\nRecommended action: start with the FL-204 crew swap — it's the nearest hard deadline.";
}

// ── SCREEN: AI ASSISTANT ────────────────────────────────────────
function AIAssistant() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi, I'm ARIA — your Airline Real-time Intelligence Assistant. I have full situational awareness of the current network state including 2,247 flights today, active crew duty limits, weather advisories, and FDTL compliance status. What would you like to know?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const suggestions = [
    "What is the current disruption risk at IGI?",
    "Which crew are closest to FDTL limits in the next 6 hours?",
    "What would cause a December-style crisis cascade today?",
    "Summarise recovery options for FL-204",
    "What are the current crew fatigue scores across the network?",
    "Is FO Patel fit for duty on the next assignment?",
    "How is the crew fatigue score calculated?",
    "What is the FRMS compliance status for ICAO Doc 9966?",
  ];

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = (text) => {
    const userMsg = text || input;
    if (!userMsg.trim()) return;
    setInput("");
    const newMessages = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);
    setLoading(true);

    // Fully client-side scripted responses — no API key, no network calls.
    // Safe to host publicly; nothing to leak, nothing to bill.
    const reply = scriptedReply(userMsg);
    setTimeout(() => {
      setMessages([...newMessages, { role: "assistant", content: reply }]);
      setLoading(false);
    }, 750);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "70vh" }}>
      <SectionHeader
        title="ARIA — Airline Real-time Intelligence Assistant"
        sub="Real-time network awareness · FDTL compliance · Disruption intelligence"
        badge={<AlertBadge level="ok" text="● ARIA ONLINE" />}
      />

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => sendMessage(s)}
              style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 12px", fontSize: 11, color: C.textDim, cursor: "pointer", textAlign: "left" }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "80%", padding: "12px 16px", borderRadius: 8, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap",
              background: msg.role === "user" ? C.blue : C.surface,
              color: msg.role === "user" ? C.text : C.textDim,
              border: msg.role === "assistant" ? `1px solid ${C.border}` : "none",
            }}>
              {msg.role === "assistant" && (
                <div style={{ fontSize: 10, color: C.cyan, marginBottom: 6, fontFamily: "monospace" }}>ARIA</div>
              )}
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 16px", fontSize: 13, color: C.textMuted }}>
              <span>⟳ ARIA is analysing the network...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
          placeholder="Ask ARIA about crew availability, disruption risk, recovery options…"
          style={{
            flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6,
            padding: "10px 14px", fontSize: 13, color: C.text, outline: "none",
          }}
        />
        <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
          style={{ background: C.blue, color: C.text, border: "none", borderRadius: 6, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: loading ? 0.5 : 1 }}>
          Send
        </button>
      </div>
    </div>
  );
}

// ── PASSENGER RECOVERY DATA ─────────────────────────────────────
const PR_AUTO = [
  { name: "Mehta, Rajesh", pnr: "QK7P2R", flight: "FL-312", dep: "14:20", seat: "12A", notif: "Notified" },
  { name: "Reddy, Sai", pnr: "QM4T9L", flight: "FL-312", dep: "14:20", seat: "12B", notif: "Notified" },
  { name: "Singh, Harpreet", pnr: "QB1X8C", flight: "FL-312", dep: "14:20", seat: "9C", notif: "Notified" },
  { name: "Banerjee, Arjun", pnr: "QL5R3D", flight: "FL-508", dep: "16:45", seat: "21D", notif: "Notified" },
  { name: "Desai, Karan", pnr: "QN2Y6V", flight: "FL-508", dep: "16:45", seat: "18A", notif: "Notified" },
  { name: "Iyer, Ananya", pnr: "QF8W1G", flight: "FL-336", dep: "17:30", seat: "4F", notif: "Pending" },
];
const PR_PRIORITY = [
  { name: "Verma, Sunita", tag: "Platinum Frequent Flyer", level: "warn" },
  { name: "Chen, Wei", tag: "Unaccompanied Minor", level: "critical" },
  { name: "Fernandes, Rio", tag: "Wheelchair Assistance", level: "warn" },
  { name: "Ahmed, Zara", tag: "Medical — Oxygen", level: "critical" },
  { name: "Kapoor, Dev", tag: "Diamond Frequent Flyer", level: "warn" },
];
const PR_COMP = [
  { name: "Nair, Lakshmi", amount: "₹10,000", status: "Pending" },
  { name: "Gupta, Priya", amount: "₹10,000", status: "Pending" },
  { name: "Khan, Imran", amount: "₹7,500", status: "Issued" },
  { name: "Rao, Meera", amount: "₹7,500", status: "Pending" },
  { name: "Bose, Anirban", amount: "₹5,000", status: "Issued" },
];
const PR_DECISIONS = [
  { name: "Mehta, Rajesh", flight: "FL-312", dep: "14:20", conf: 97, reason: "Direct swap · window seat retained", notif: true },
  { name: "Gupta, Priya", flight: "FL-508", dep: "16:45", conf: 89, reason: "Connection risk flagged · 45m buffer", notif: true, risk: true },
  { name: "Reddy, Sai", flight: "FL-312", dep: "14:20", conf: 96, reason: "Group of 4 kept together", notif: true },
  { name: "Khan, Imran", flight: "FL-336", dep: "17:30", conf: 92, reason: "Loyalty tier prioritised", notif: false },
  { name: "Singh, Harpreet", flight: "FL-312", dep: "14:20", conf: 98, reason: "Direct swap · no change", notif: true },
  { name: "Banerjee, Arjun", flight: "FL-508", dep: "16:45", conf: 90, reason: "Seat downgrade · refund queued", notif: true },
  { name: "Nair, Lakshmi", flight: "FL-622", dep: "19:05", conf: 84, reason: "Last-resort · overnight avoided", notif: false, risk: true },
  { name: "Desai, Karan", flight: "FL-508", dep: "16:45", conf: 91, reason: "Aisle preference met", notif: true },
  { name: "Iyer, Ananya", flight: "FL-336", dep: "17:30", conf: 95, reason: "Next available · aisle pref", notif: true },
  { name: "Rao, Meera", flight: "FL-312", dep: "14:20", conf: 88, reason: "Fare-class match found", notif: true },
];
const PR_CHANNELS = [
  { ch: "App Push", pct: 58, color: C.blue },
  { ch: "SMS", pct: 24, color: C.green },
  { ch: "Email", pct: 12, color: C.amber },
  { ch: "Airport Display", pct: 6, color: C.cyan },
];
const PR_STAGES = [
  { label: "Disruption Detected", channel: "system event", target: 100, rate: 40 },
  { label: "Passengers Notified", channel: "app · SMS · email", target: 100, rate: 9 },
  { label: "Rebooking Confirmed", channel: "app push", target: 94, rate: 6 },
  { label: "Boarding Pass Reissued", channel: "app · airport kiosk", target: 78, rate: 4 },
];
const PR_DGCA = [
  { item: "Passengers notified within 24h of departure", status: "done" },
  { item: "Rebooking on next available flight offered", status: "done" },
  { item: "Refund option offered to all 186 passengers", status: "done" },
  { item: "Meal voucher eligibility (>2h delay)", status: "na", note: "not triggered — 34 min delay" },
  { item: "Compensation calculated & queued (DGCA CAR)", status: "progress" },
  { item: "Special assistance arranged (reduced mobility)", status: "done" },
  { item: "Boarding passes reissued to all rebooked pax", status: "progress" },
];
const PR_SEARCH = [
  { name: "Mehta, Rajesh", pnr: "QK7P2R", status: "Auto-rebooked → FL-312 · 14:20", level: "good" },
  { name: "Gupta, Priya", pnr: "QC3Z7W", status: "Pending rebooking · connection risk", level: "bad" },
  { name: "Nair, Lakshmi", pnr: "QP9Q4H", status: "Pending rebooking · no seats", level: "bad" },
  { name: "Verma, Sunita", pnr: "QV1A1T", status: "High priority · Platinum FF", level: "warn" },
  { name: "Khan, Imran", pnr: "QD6V2N", status: "Auto-rebooked → FL-336 · 17:30", level: "good" },
  { name: "Chen, Wei", pnr: "QW3UMX", status: "High priority · Unaccompanied Minor", level: "warn" },
];
const PR_ALT = ["FL-312 · 14:20", "FL-508 · 16:45", "FL-336 · 17:30", "FL-622 · 19:05"];

// ── SCREEN: PASSENGER RECOVERY ──────────────────────────────────
function PassengerRecovery() {
  const [autoPct, setAutoPct] = useState(91);
  const [pending, setPending] = useState([
    { name: "Nair, Lakshmi", pnr: "QP9Q4H", reason: "No seats on same-day alternates" },
    { name: "Gupta, Priya", pnr: "QC3Z7W", reason: "Tight onward connection at BOM" },
    { name: "Khan, Imran", pnr: "QD6V2N", reason: "Group of 5 — no contiguous availability" },
    { name: "Rao, Meera", pnr: "QH1J5K", reason: "Special fare class re-accommodation" },
    { name: "Bose, Anirban", pnr: "QT7K9P", reason: "Codeshare partner confirmation pending" },
    { name: "Pillai, Devan", pnr: "QR4M8B", reason: "Medical equipment stowage on alternate" },
  ]);
  const [decisions, setDecisions] = useState(() => PR_DECISIONS.slice(0, 4).map((d, i) => ({ ...d, id: i })));
  const [stageVals, setStageVals] = useState([0, 0, 0, 0]);
  const [open, setOpen] = useState({ auto: false, pending: true, priority: false, comp: false });
  const [q, setQ] = useState("");
  const [assigned, setAssigned] = useState(null);
  const decIdx = useRef(4);

  useEffect(() => {
    if (document.getElementById("iocc-pr-style")) return;
    const s = document.createElement("style");
    s.id = "iocc-pr-style";
    s.textContent = `@keyframes ioccPrIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } } .iocc-pr-in { animation: ioccPrIn 0.5s ease-out; }`;
    document.head.appendChild(s);
  }, []);

  // headline auto-rebooked % climbs 91 → 94
  useEffect(() => {
    const t = setInterval(() => setAutoPct(p => (p >= 94 ? 94 : +(p + 0.1).toFixed(1))), 1000);
    return () => clearInterval(t);
  }, []);
  // rebooking decision feed scrolls (new decision every 3.5s)
  useEffect(() => {
    const t = setInterval(() => {
      const d = PR_DECISIONS[decIdx.current % PR_DECISIONS.length];
      const id = decIdx.current++;
      setDecisions(prev => [{ ...d, id }, ...prev].slice(0, 9));
    }, 3500);
    return () => clearInterval(t);
  }, []);
  // notification tracker stages advance
  useEffect(() => {
    const t = setInterval(() => setStageVals(v => v.map((x, i) => Math.min(PR_STAGES[i].target, x + PR_STAGES[i].rate))), 900);
    return () => clearInterval(t);
  }, []);

  const rebooked = Math.round(186 * autoPct / 100);
  const resolveManually = (pnr) => { setPending(prev => prev.filter(p => p.pnr !== pnr)); setAutoPct(p => Math.min(96, +(p + 0.4).toFixed(1))); };
  const results = q.trim() ? PR_SEARCH.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || p.pnr.toLowerCase().includes(q.toLowerCase())).slice(0, 1) : [];

  const lvlColor = (l) => (l === "critical" || l === "bad" ? C.red : l === "warn" ? C.amber : C.green);
  const Section = ({ id, title, count, color, children }) => (
    <div style={{ borderBottom: `1px solid ${C.border}` }}>
      <div onClick={() => setOpen(o => ({ ...o, [id]: !o[id] }))} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 4px", cursor: "pointer" }}>
        <span style={{ color: C.textMuted, fontSize: 11, width: 12 }}>{open[id] ? "▾" : "▸"}</span>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
        <span style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>{title}</span>
        <span style={{ marginLeft: "auto", fontFamily: "monospace", fontSize: 12, fontWeight: 700, color }}>{count}</span>
      </div>
      {open[id] && <div style={{ paddingBottom: 8 }}>{children}</div>}
    </div>
  );

  return (
    <div>
      <SectionHeader
        title="Passenger Recovery"
        sub="Automated rebooking · notification · compensation · baggage recovery — unified passenger view for the active IROP"
        badge={<AlertBadge level="critical" text="🚨 ACTIVE IROP — FL-204 · DEL→BOM" />}
      />

      {/* Disruption banner + manual override */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 330px", gap: 16, marginBottom: 16 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.redDim}`, borderRadius: 8, padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 18, alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                <span style={{ fontSize: 22, fontWeight: 700, fontFamily: "monospace", color: C.red }}>FL-204</span>
                <span style={{ fontSize: 13, color: C.textDim }}>DEL → BOM</span>
              </div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>186 passengers affected · crew duty limit · expected delay <strong style={{ color: C.amber }}>34 min</strong></div>
            </div>
            <div style={{ display: "flex", gap: 22 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "monospace", color: C.green }}>{autoPct.toFixed(1)}%</div>
                <div style={{ fontSize: 10, color: C.textMuted }}>auto-rebooked · {rebooked}/186</div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "monospace", color: pending.length ? C.red : C.green }}>{pending.length}</div>
                <div style={{ fontSize: 10, color: C.textMuted }}>manual intervention</div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "monospace", color: C.amber }}>₹2.4L</div>
                <div style={{ fontSize: 10, color: C.textMuted }}>est. compensation</div>
              </div>
            </div>
          </div>
        </div>

        {/* Manual Override */}
        <div style={{ background: C.surface, border: `1px solid ${C.borderBright}`, borderRadius: 8, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>Manual Override</span>
            <span style={{ fontSize: 9, color: C.cyan, fontFamily: "monospace" }}>CONTROLLER</span>
          </div>
          <input value={q} onChange={e => { setQ(e.target.value); setAssigned(null); }} placeholder="Search passenger name or PNR…"
            style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", fontSize: 12, color: C.text, outline: "none", boxSizing: "border-box" }} />
          {results.map((p, i) => (
            <div key={i} style={{ marginTop: 10, background: C.bg, borderRadius: 6, padding: 10 }}>
              <div style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>{p.name}</div>
              <div style={{ fontSize: 10, color: C.textMuted, fontFamily: "monospace" }}>PNR {p.pnr}</div>
              <div style={{ fontSize: 11, color: lvlColor(p.level), marginTop: 4 }}>{p.status}</div>
              {assigned && assigned.name === p.name ? (
                <div style={{ fontSize: 11, color: C.green, marginTop: 8 }}>✓ Reassigned to {assigned.flight} · passenger notified</div>
              ) : (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 9, color: C.textMuted, marginBottom: 5 }}>REASSIGN TO</div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {PR_ALT.map((f, j) => (
                      <button key={j} onClick={() => setAssigned({ name: p.name, flight: f })} style={{ background: C.surfaceHigh, color: C.textDim, border: `1px solid ${C.border}`, borderRadius: 5, padding: "4px 8px", fontSize: 10, cursor: "pointer", fontFamily: "monospace" }}>{f}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          {q.trim() && results.length === 0 && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 10 }}>No passenger found.</div>}
          {!q.trim() && <div style={{ fontSize: 10, color: C.textMuted, marginTop: 10, lineHeight: 1.5 }}>AI handles 94% automatically — the controller retains full override on any passenger.</div>}
        </div>
      </div>

      {/* Status board + decision engine */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16, marginBottom: 16 }}>
        {/* Status board */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 20px 16px" }}>
          <div style={{ fontSize: 13, color: C.textMuted, padding: "12px 0 6px" }}>Passenger Recovery Status Board</div>

          <Section id="auto" title="Auto-Rebooked" count={rebooked} color={C.green}>
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.9fr 0.7fr 0.6fr 0.7fr", gap: 8, fontSize: 9, color: C.textMuted, textTransform: "uppercase", padding: "4px 0", borderBottom: `1px solid ${C.border}` }}>
              <span>Passenger</span><span>New Flight</span><span>Dep</span><span>Seat</span><span>Notify</span>
            </div>
            {PR_AUTO.map((p, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1.4fr 0.9fr 0.7fr 0.6fr 0.7fr", gap: 8, fontSize: 11.5, color: C.text, padding: "7px 0", borderBottom: `1px solid ${C.border}22`, alignItems: "center" }}>
                <span>{p.name}</span>
                <span style={{ fontFamily: "monospace", color: C.cyan }}>{p.flight}</span>
                <span style={{ fontFamily: "monospace", color: C.textDim }}>{p.dep}</span>
                <span style={{ fontFamily: "monospace", color: C.textDim }}>{p.seat}</span>
                <span style={{ color: p.notif === "Notified" ? C.green : C.amber, fontSize: 10 }}>{p.notif === "Notified" ? "✓ Sent" : "◴ Queued"}</span>
              </div>
            ))}
            <div style={{ fontSize: 11, color: C.textMuted, paddingTop: 8 }}>+ {Math.max(0, rebooked - PR_AUTO.length)} more passengers auto-rebooked</div>
          </Section>

          <Section id="pending" title="Pending Rebooking" count={pending.length} color={C.red}>
            {pending.length === 0 && <div style={{ fontSize: 11, color: C.green, padding: "8px 0" }}>✓ All passengers rebooked.</div>}
            {pending.map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11.5, color: C.text, padding: "8px 0", borderBottom: `1px solid ${C.border}22` }}>
                <span style={{ minWidth: 120 }}>{p.name}</span>
                <span style={{ fontFamily: "monospace", color: C.textMuted, fontSize: 10 }}>{p.pnr}</span>
                <span style={{ flex: 1, color: C.textDim, fontSize: 11 }}>{p.reason}</span>
                <button onClick={() => resolveManually(p.pnr)} style={{ background: C.amberDim, color: C.amber, border: `1px solid ${C.amber}`, borderRadius: 5, padding: "4px 10px", fontSize: 10, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>Resolve Manually</button>
              </div>
            ))}
          </Section>

          <Section id="priority" title="High Priority" count={PR_PRIORITY.length} color={C.amber}>
            {PR_PRIORITY.map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11.5, color: C.text, padding: "7px 0", borderBottom: `1px solid ${C.border}22` }}>
                <span style={{ minWidth: 140 }}>{p.name}</span>
                <span style={{ marginLeft: "auto", background: `${lvlColor(p.level)}22`, color: lvlColor(p.level), border: `1px solid ${lvlColor(p.level)}`, borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 600 }}>{p.tag}</span>
              </div>
            ))}
          </Section>

          <Section id="comp" title="Compensation Eligible" count={PR_COMP.length} color={C.cyan}>
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 0.8fr 0.8fr", gap: 8, fontSize: 9, color: C.textMuted, textTransform: "uppercase", padding: "4px 0", borderBottom: `1px solid ${C.border}` }}>
              <span>Passenger</span><span>DGCA Amount</span><span>Status</span>
            </div>
            {PR_COMP.map((p, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1.5fr 0.8fr 0.8fr", gap: 8, fontSize: 11.5, color: C.text, padding: "7px 0", borderBottom: `1px solid ${C.border}22`, alignItems: "center" }}>
                <span>{p.name}</span>
                <span style={{ fontFamily: "monospace", color: C.amber }}>{p.amount}</span>
                <span style={{ color: p.status === "Issued" ? C.green : C.amber, fontSize: 10 }}>{p.status === "Issued" ? "✓ Issued" : "◴ Pending"}</span>
              </div>
            ))}
          </Section>
        </div>

        {/* Rebooking Decision Engine */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>Rebooking Decision Engine</span>
            <span style={{ fontSize: 9, color: C.green, fontFamily: "monospace", display: "flex", alignItems: "center", gap: 5 }}><span className="iocc-live-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, display: "inline-block" }} />LIVE</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, overflow: "hidden" }}>
            {decisions.map((d, i) => (
              <div key={d.id} className={i === 0 ? "iocc-pr-in" : undefined} style={{ background: C.bg, borderRadius: 6, padding: "8px 10px", borderLeft: `3px solid ${d.conf >= 90 ? C.green : C.amber}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11.5, color: C.text, fontWeight: 600 }}>{d.name}</span>
                  <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: d.conf >= 90 ? C.green : C.amber }}>{d.conf}%</span>
                </div>
                <div style={{ fontSize: 10, color: C.textDim, fontFamily: "monospace", marginTop: 2 }}>FL-204 → {d.flight} · {d.dep}</div>
                <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>{d.reason}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 9, color: d.notif ? C.green : C.amber }}>{d.notif ? "✓ Notified" : "◴ Notifying"}</span>
                  {d.risk && <span style={{ fontSize: 9, color: C.amber }}>⚠ connection risk</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Notification Tracker */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>Passenger Notification Tracker</div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 360, display: "flex", flexDirection: "column", gap: 12 }}>
            {PR_STAGES.map((s, i) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: C.text }}>{i + 1}. {s.label} <span style={{ color: C.textMuted, fontSize: 9 }}>· {s.channel}</span></span>
                  <span style={{ fontFamily: "monospace", color: stageVals[i] >= s.target ? C.green : C.amber }}>{stageVals[i]}%</span>
                </div>
                <div style={{ height: 8, background: C.bg, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${stageVals[i]}%`, height: "100%", background: stageVals[i] >= s.target ? C.green : C.amber, borderRadius: 4, transition: "width 0.6s" }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 96, height: 96, borderRadius: "50%", background: `conic-gradient(${(() => { let a = 0; return PR_CHANNELS.map(c => { const seg = `${c.color} ${a}% ${a + c.pct}%`; a += c.pct; return seg; }).join(", "); })()})` }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {PR_CHANNELS.map((c, i) => (
                <span key={i} style={{ fontSize: 10, color: C.textDim, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: c.color }} />{c.ch} <span style={{ fontFamily: "monospace", color: C.textMuted }}>{c.pct}%</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Baggage Recovery */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 14 }}>Baggage Recovery — FL-204</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
          {[
            { label: "Bags on Flight", value: "214", color: C.text },
            { label: "Auto-Rerouted", value: "198", color: C.green },
            { label: "Held at DEL", value: "12", color: C.amber },
            { label: "Manual Intervention", value: "4", color: C.red },
          ].map((b, i) => (
            <div key={i} style={{ background: C.bg, borderRadius: 6, padding: 12 }}>
              <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 }}>{b.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "monospace", color: b.color }}>{b.value}</div>
            </div>
          ))}
        </div>
        <svg width="100%" height={140} viewBox="0 0 900 140" style={{ background: C.bg, borderRadius: 6 }}>
          <rect x={30} y={52} width={120} height={40} rx={6} fill={C.red} fillOpacity={0.15} stroke={C.red} />
          <text x={90} y={70} textAnchor="middle" fontSize={12} fontWeight={700} fill={C.red} fontFamily="monospace">FL-204</text>
          <text x={90} y={84} textAnchor="middle" fontSize={8} fill={C.textMuted} fontFamily="monospace">DEL → BOM</text>
          {[["FL-312", 22], ["FL-508", 62], ["FL-336", 102]].map(([f, y], i) => (
            <g key={i}>
              <rect x={740} y={y} width={120} height={30} rx={6} fill={C.green} fillOpacity={0.13} stroke={C.green} />
              <text x={800} y={y + 19} textAnchor="middle" fontSize={11} fontWeight={700} fill={C.green} fontFamily="monospace">{f}</text>
              <path id={`belt${i}`} d={`M 150 72 C 420 72, 480 ${y + 15}, 740 ${y + 15}`} fill="none" stroke={C.borderBright} strokeWidth={1.5} strokeDasharray="3 4" />
              {[0, 1, 2].map(k => (
                <circle key={k} r={4} fill={C.amber}>
                  <animateMotion dur="2.6s" repeatCount="indefinite" begin={`${i * 0.4 + k * 0.85}s`}>
                    <mpath href={`#belt${i}`} />
                  </animateMotion>
                </circle>
              ))}
            </g>
          ))}
          <text x={445} y={20} textAnchor="middle" fontSize={9} fill={C.textMuted} fontFamily="monospace">bags following passengers to new flights →</text>
        </svg>
      </div>

      {/* DGCA Compliance */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: C.textMuted }}>DGCA Passenger Rights — Compliance</div>
          <AlertBadge level="warn" text="2 IN PROGRESS" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          {PR_DGCA.map((d, i) => {
            const col = d.status === "done" || d.status === "na" ? C.green : d.status === "progress" ? C.amber : C.red;
            const mark = d.status === "done" ? "✓" : d.status === "na" ? "✓" : d.status === "progress" ? "◴" : "✗";
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: C.bg, borderRadius: 6, padding: "10px 12px" }}>
                <span style={{ color: col, fontSize: 14, fontWeight: 700, width: 14 }}>{mark}</span>
                <div>
                  <div style={{ fontSize: 12, color: C.text }}>{d.item}</div>
                  {d.note && <div style={{ fontSize: 10, color: C.textMuted, marginTop: 1 }}>{d.note}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── SYSTEM ARCHITECTURE DATA ────────────────────────────────────
const catColor = { "Flight Ops": "#3B82F6", "Weather": "#06B6D4", "Regulatory": "#F59E0B", "Ground": "#10B981" };

const SA_SOURCES = [
  { name: "Sabre GDS", icon: "✈", cat: "Flight Ops", carries: "Flight schedules + booking data", freq: "streaming · ~2s" },
  { name: "Amadeus Altéa", icon: "✈", cat: "Flight Ops", carries: "PNR + seat inventory", freq: "streaming · ~2s" },
  { name: "Thales FMS", icon: "🛰", cat: "Flight Ops", carries: "Aircraft FMS telemetry", freq: "streaming · 1s" },
  { name: "IMD Weather", icon: "☁", cat: "Weather", carries: "METAR / TAF weather updates", freq: "every 60s" },
  { name: "DGCA Reg. DB", icon: "⚖", cat: "Regulatory", carries: "FDTL regulatory updates", freq: "daily · 00:00 IST" },
  { name: "AAI Ground Ops", icon: "🧳", cat: "Ground", carries: "Stand / turnaround status", freq: "every 30s" },
];

const SA_ENGINES = [
  { lines: ["Disruption", "Prediction"], name: "AI Disruption Prediction Engine", does: "Forecasts network disruption risk 72–96 hours ahead.", consumes: "Weather (METAR/TAF), crew duty state, schedules, historical patterns", outputs: "Risk scores + cancellation probability distribution", tech: "Python ML · Monte Carlo (10,000 runs)" },
  { lines: ["Operations", "Digital Twin"], name: "Operations Digital Twin", does: "Maintains a live, simulatable model of the entire network state.", consumes: "Real-time flight, aircraft & crew positions from the Event Hub", outputs: "What-if scenario states + delay-propagation modelling", tech: "Python simulation · graph state model" },
  { lines: ["IROP", "Recovery"], name: "IROP Recovery Engine", does: "Generates ranked, FDTL-compliant recovery plans for disruptions.", consumes: "Risk scores, crew legality, aircraft availability", outputs: "Ranked recovery options with cost & confidence", tech: "Optimisation solver · Claude API for narrative" },
  { lines: ["Pax & Bag", "Recovery"], name: "Passenger & Baggage Recovery", does: "Automatically re-books passengers and reroutes baggage.", consumes: "Disruption events, PNR/inventory, baggage tag scans", outputs: "Rebooking instructions + bag reroute plans", tech: "Rules engine · Python · Claude for comms" },
  { lines: ["Fatigue Risk", "Management"], name: "Fatigue Risk Management System", does: "Tracks FDTL Phase II duty/rest and forecasts crew availability.", consumes: "Rosters, duty logs, DGCA FDTL rules", outputs: "Crew-at-risk alerts + legality checks", tech: "Python ML forecasting · rules engine" },
];

const SA_OUTPUTS = [
  { lines: ["OCC Controller", "Dashboard"] },
  { lines: ["Crew Control", "Console"] },
  { lines: ["Passenger", "Notification"] },
  { lines: ["Baggage", "Recovery"] },
  { lines: ["Executive", "Reporting"] },
];

const SA_TECH = [
  { t: "Azure Event Hubs", d: "Stream ingestion", c: "#F59E0B" },
  { t: "Python + TensorFlow", d: "ML models", c: "#10B981" },
  { t: "Claude API", d: "Generative AI", c: "#06B6D4" },
  { t: "React", d: "Frontend", c: "#3B82F6" },
  { t: "PostgreSQL", d: "Operational data", c: "#3B82F6" },
  { t: "Redis", d: "Real-time cache", c: "#EF4444" },
];

// engine → output edges with flow tooltips
const SA_ENG_OUT = [
  { e: 0, o: 0, title: "Risk index + forecast", sub: "Disruption Prediction → OCC Dashboard · continuous" },
  { e: 0, o: 4, title: "Risk trends", sub: "Disruption Prediction → Executive Reporting · hourly" },
  { e: 1, o: 0, title: "Network state + what-if", sub: "Digital Twin → OCC Dashboard · continuous" },
  { e: 2, o: 0, title: "Recovery options", sub: "IROP Recovery → OCC Dashboard · on event" },
  { e: 2, o: 1, title: "Crew swap instructions", sub: "IROP Recovery → Crew Control Console · on approval" },
  { e: 3, o: 2, title: "Rebooking + comms", sub: "Pax & Bag Recovery → Passenger Notification · on event" },
  { e: 3, o: 3, title: "Bag reroute plan", sub: "Pax & Bag Recovery → Baggage Recovery System · on event" },
  { e: 4, o: 1, title: "Crew duty alerts", sub: "Fatigue Risk Mgmt → Crew Control Console · continuous" },
];

// inter-engine edges (shared data)
const SA_INTER = [
  { a: 1, b: 0, title: "Live network state", sub: "Digital Twin → Disruption Prediction · continuous" },
  { a: 0, b: 2, title: "Risk scores", sub: "Disruption Prediction → IROP Recovery · on threshold breach" },
  { a: 4, b: 2, title: "Crew legality", sub: "Fatigue Risk Mgmt → IROP Recovery · continuous" },
  { a: 0, b: 3, title: "Predicted impact", sub: "Disruption Prediction → Pax & Bag Recovery · continuous" },
];

// ── SCREEN: SYSTEM ARCHITECTURE ─────────────────────────────────
function SystemArchitecture() {
  const [zoom, setZoom] = useState(1);
  const [fit, setFit] = useState(true);
  const [engine, setEngine] = useState(null);
  const [tip, setTip] = useState(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const wrapRef = useRef(null);

  useEffect(() => {
    if (document.getElementById("iocc-arch-style")) return;
    const s = document.createElement("style");
    s.id = "iocc-arch-style";
    s.textContent = `
      @keyframes ioccDashFlow { to { stroke-dashoffset: -16; } }
      .iocc-flowline { stroke-dasharray: 5 7; animation: ioccDashFlow 0.7s linear infinite; pointer-events: none; }
      .iocc-arch-node { transition: filter 0.15s; }
      .iocc-arch-node:hover { filter: brightness(1.4); }
      .iocc-arch-engine { cursor: pointer; }
      .iocc-arch-edge { cursor: help; }
      .iocc-arch-edge:hover .iocc-flowline { stroke-width: 3.2 !important; opacity: 1 !important; }
    `;
    document.head.appendChild(s);
  }, []);

  const W = 1180, H = 660;
  const gx0 = 120, gW = 812;
  const xs = (n, bw) => { const gap = (gW - n * bw) / (n - 1); return Array.from({ length: n }, (_, i) => gx0 + i * (bw + gap)); };
  const srcBW = 118, srcH = 56, srcY = 52, srcX = xs(6, srcBW);
  const hubX = gx0, hubW = gW, hubY = 200, hubH = 56;
  const engBW = 150, engH = 86, engY = 350, engX = xs(5, engBW);
  const outBW = 150, outH = 56, outY = 560, outX = xs(5, outBW);
  const cx = (x, bw) => x + bw / 2;

  // Fit the diagram to the container width (default + on resize while in fit mode).
  const fitToWidth = () => { const r = wrapRef.current; if (r) setZoom(Math.max(0.4, Math.min(2, +((r.clientWidth - 4) / W).toFixed(3)))); };
  useEffect(() => { fitToWidth(); /* fit on mount */ }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!fit) return;
    const onResize = () => fitToWidth();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [fit]); // eslint-disable-line react-hooks/exhaustive-deps

  const move = (e) => { const r = wrapRef.current?.getBoundingClientRect(); if (r) setPos({ x: e.clientX - r.left, y: e.clientY - r.top }); };
  const edgeProps = (title, sub) => ({ className: "iocc-arch-edge", onMouseEnter: () => setTip({ title, sub }), onMouseLeave: () => setTip(null) });

  const Line = ({ x1, y1, x2, y2, color }) => (
    <>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={12} />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1.4} opacity={0.8} className="iocc-flowline" />
    </>
  );
  const Arc = ({ d, color }) => (
    <>
      <path d={d} fill="none" stroke="transparent" strokeWidth={12} />
      <path d={d} fill="none" stroke={color} strokeWidth={1.4} opacity={0.8} className="iocc-flowline" />
    </>
  );

  const bands = [
    { label: "DATA SOURCES", color: C.blue, y: 44, h: 76 },
    { label: "INTEGRATION", color: C.amber, y: 192, h: 72 },
    { label: "INTELLIGENCE", color: C.green, y: 338, h: 112 },
    { label: "OUTPUT", color: C.cyan, y: 552, h: 74 },
  ];

  return (
    <div>
      <SectionHeader
        title="System Architecture"
        sub="End-to-end data flow  ·  four-layer enterprise blueprint  ·  click an engine for detail, hover any line for the data it carries"
        badge={<AlertBadge level="ok" text="ENTERPRISE BLUEPRINT" />}
      />

      {/* Summary metrics */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <Metric label="Data Latency" value="<2" unit="s end-to-end" status="good" />
        <Metric label="System Availability" value="99.97" unit="% uptime target" status="good" />
        <Metric label="Scenarios Modelled" value="10,000" unit="MC runs / cycle" />
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: C.textMuted }}>Interactive SVG · zoom and explore</span>
        <div style={{ display: "flex", gap: 6 }}>
          {[
            ["−", () => { setFit(false); setZoom(z => Math.max(0.4, +(z - 0.2).toFixed(2))); }, false],
            ["Fit", () => { setFit(true); fitToWidth(); }, fit],
            ["+", () => { setFit(false); setZoom(z => Math.min(2, +(z + 0.2).toFixed(2))); }, false],
          ].map(([t, fn, active], i) => (
            <button key={i} onClick={fn} style={{ background: active ? C.blueDim : C.surfaceHigh, color: active ? C.text : C.textDim, border: `1px solid ${active ? C.blue : C.border}`, borderRadius: 5, padding: "4px 12px", fontSize: 12, cursor: "pointer", fontFamily: "monospace" }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Diagram */}
      <div ref={wrapRef} onMouseMove={move} style={{ position: "relative", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "auto", maxHeight: "72vh" }}>
        <svg width={W * zoom} height={H * zoom} viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
          {/* layer bands + labels */}
          {bands.map((b, i) => (
            <g key={i}>
              <rect x={24} y={b.y} width={912} height={b.h} rx={8} fill={b.color} fillOpacity={0.05} stroke={b.color} strokeOpacity={0.2} />
              <text x={58} y={b.y + b.h / 2} fill={b.color} fontSize={10} fontWeight={700} fontFamily="monospace" textAnchor="middle" transform={`rotate(-90 58 ${b.y + b.h / 2})`} letterSpacing={2}>{b.label}</text>
            </g>
          ))}

          {/* ── edges (drawn under boxes) ── */}
          {/* sources → hub */}
          {srcX.map((x, i) => (
            <g key={`s${i}`} {...edgeProps(SA_SOURCES[i].carries, `${SA_SOURCES[i].name} · ${SA_SOURCES[i].freq}`)}>
              <Line x1={cx(x, srcBW)} y1={srcY + srcH} x2={cx(x, srcBW)} y2={hubY} color={catColor[SA_SOURCES[i].cat]} />
            </g>
          ))}
          {/* hub → engines */}
          {engX.map((x, i) => (
            <g key={`he${i}`} {...edgeProps("Normalised event stream", `Azure Event Hub → ${SA_ENGINES[i].lines.join(" ")} · continuous`)}>
              <Line x1={cx(x, engBW)} y1={hubY + hubH} x2={cx(x, engBW)} y2={engY} color={C.amber} />
            </g>
          ))}
          {/* inter-engine */}
          {SA_INTER.map((m, i) => {
            const xa = cx(engX[m.a], engBW), xb = cx(engX[m.b], engBW);
            const rise = engY - 14 - Math.abs(m.a - m.b) * 12;
            const d = `M ${xa} ${engY} C ${xa} ${rise}, ${xb} ${rise}, ${xb} ${engY}`;
            return <g key={`i${i}`} {...edgeProps(m.title, m.sub)}><Arc d={d} color={C.green} /></g>;
          })}
          {/* engines → outputs */}
          {SA_ENG_OUT.map((m, i) => (
            <g key={`eo${i}`} {...edgeProps(m.title, m.sub)}>
              <Line x1={cx(engX[m.e], engBW)} y1={engY + engH} x2={cx(outX[m.o], outBW)} y2={outY} color={C.cyan} />
            </g>
          ))}

          {/* ── nodes ── */}
          {/* sources */}
          {SA_SOURCES.map((s, i) => (
            <g key={`src${i}`} className="iocc-arch-node">
              <rect x={srcX[i]} y={srcY} width={srcBW} height={srcH} rx={6} fill={C.blue} fillOpacity={0.13} stroke={C.blue} strokeWidth={1.4} />
              <text x={srcX[i] + 12} y={srcY + 23} fontSize={15}>{s.icon}</text>
              <text x={cx(srcX[i], srcBW)} y={srcY + 28} textAnchor="middle" fontSize={9.5} fontFamily="monospace" fontWeight={700} fill={C.text}>{s.name}</text>
              <text x={cx(srcX[i], srcBW)} y={srcY + 44} textAnchor="middle" fontSize={7.5} fontFamily="monospace" fill={catColor[s.cat]} letterSpacing={0.5}>{s.cat.toUpperCase()}</text>
            </g>
          ))}
          {/* event hub */}
          <g className="iocc-arch-node">
            <rect x={hubX} y={hubY} width={hubW} height={hubH} rx={7} fill={C.amber} fillOpacity={0.14} stroke={C.amber} strokeWidth={1.8} />
            <text x={cx(hubX, hubW)} y={hubY + 26} textAnchor="middle" fontSize={15} fontWeight={700} fill={C.amber} fontFamily="monospace">⚡ Azure Event Hub</text>
            <text x={cx(hubX, hubW)} y={hubY + 43} textAnchor="middle" fontSize={9} fill={C.textDim} fontFamily="monospace">real-time event streaming backbone · unified ingestion across all sources</text>
          </g>
          {/* engines */}
          {SA_ENGINES.map((eng, i) => {
            const sel = engine === i;
            return (
              <g key={`eng${i}`} className="iocc-arch-node iocc-arch-engine" onClick={() => setEngine(sel ? null : i)}>
                <rect x={engX[i]} y={engY} width={engBW} height={engH} rx={7} fill={C.green} fillOpacity={sel ? 0.28 : 0.13} stroke={C.green} strokeWidth={sel ? 2.6 : 1.6} />
                <text x={cx(engX[i], engBW)} y={engY + 34} textAnchor="middle" fontSize={12} fontWeight={700} fill={C.text} fontFamily="monospace">{eng.lines[0]}</text>
                <text x={cx(engX[i], engBW)} y={engY + 50} textAnchor="middle" fontSize={12} fontWeight={700} fill={C.text} fontFamily="monospace">{eng.lines[1]}</text>
                <text x={cx(engX[i], engBW)} y={engY + 70} textAnchor="middle" fontSize={7.5} fill={C.green} fontFamily="monospace" letterSpacing={0.5}>{sel ? "▾ HIDE DETAIL" : "▸ CLICK FOR DETAIL"}</text>
              </g>
            );
          })}
          {/* outputs */}
          {SA_OUTPUTS.map((o, i) => (
            <g key={`out${i}`} className="iocc-arch-node">
              <rect x={outX[i]} y={outY} width={outBW} height={outH} rx={6} fill={C.cyan} fillOpacity={0.12} stroke={C.cyan} strokeWidth={1.4} />
              <text x={cx(outX[i], outBW)} y={outY + 25} textAnchor="middle" fontSize={10.5} fontWeight={700} fill={C.text} fontFamily="monospace">{o.lines[0]}</text>
              <text x={cx(outX[i], outBW)} y={outY + 40} textAnchor="middle" fontSize={10.5} fontWeight={700} fill={C.text} fontFamily="monospace">{o.lines[1]}</text>
            </g>
          ))}

          {/* tech stack panel */}
          <g>
            <rect x={955} y={44} width={200} height={582} rx={8} fill={C.surface} stroke={C.border} />
            <text x={1055} y={70} textAnchor="middle" fontSize={11} fontWeight={700} fill={C.textDim} fontFamily="monospace" letterSpacing={1}>TECHNOLOGY STACK</text>
            {SA_TECH.map((tk, i) => {
              const ry = 90 + i * 86;
              return (
                <g key={`t${i}`} className="iocc-arch-node">
                  <rect x={970} y={ry} width={170} height={70} rx={6} fill={C.surfaceHigh} stroke={tk.c} strokeOpacity={0.5} />
                  <rect x={970} y={ry} width={4} height={70} rx={2} fill={tk.c} />
                  <text x={984} y={ry + 30} fontSize={11.5} fontWeight={700} fill={C.text} fontFamily="monospace">{tk.t}</text>
                  <text x={984} y={ry + 48} fontSize={9} fill={C.textMuted} fontFamily="monospace">{tk.d}</text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* hover tooltip */}
        {tip && (
          <div style={{ position: "absolute", left: pos.x + 14, top: pos.y + 14, pointerEvents: "none", background: C.surfaceHigh, border: `1px solid ${C.borderBright}`, borderRadius: 6, padding: "7px 10px", maxWidth: 240, boxShadow: "0 2px 12px rgba(0,0,0,0.5)", zIndex: 5 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{tip.title}</div>
            <div style={{ fontSize: 10, color: C.textDim, fontFamily: "monospace", marginTop: 3 }}>{tip.sub}</div>
          </div>
        )}
      </div>

      {/* engine detail panel */}
      {engine !== null && (
        <div style={{ background: C.surface, border: `1px solid ${C.green}`, borderRadius: 8, padding: 20, marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.green }}>{SA_ENGINES[engine].name}</div>
            <button onClick={() => setEngine(null)} style={{ background: "transparent", color: C.textMuted, border: `1px solid ${C.border}`, borderRadius: 5, padding: "4px 12px", fontSize: 12, cursor: "pointer" }}>Close</button>
          </div>
          <div style={{ fontSize: 13, color: C.textDim, marginBottom: 14 }}>{SA_ENGINES[engine].does}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {[["CONSUMES", SA_ENGINES[engine].consumes], ["OUTPUTS", SA_ENGINES[engine].outputs], ["TECHNOLOGY", SA_ENGINES[engine].tech]].map(([k, v], i) => (
              <div key={i} style={{ background: C.bg, borderRadius: 6, padding: 12 }}>
                <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: 1, marginBottom: 6 }}>{k}</div>
                <div style={{ fontSize: 12, color: C.text }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN APP ────────────────────────────────────────────────────
export default function IOCCPrototype() {
  const [parent, setParent] = useState(0);
  const [sub, setSub] = useState(0);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { injectAnim(); }, []);
  const NAV = [
    { id: "OPERATIONS", subs: [
      { label: "OCC Dashboard", component: <Dashboard /> },
      { label: "IROP Recovery", component: <IROPRecovery /> },
      { label: "Crew Recovery", component: <CrewRecovery /> },
      { label: "Passenger Recovery", component: <PassengerRecovery /> },
    ] },
    { id: "INTELLIGENCE", subs: [
      { label: "Disruption Prediction", component: <DisruptionPrediction /> },
      { label: "Crisis Replay", component: <CrisisReplay /> },
    ] },
    { id: "ARCHITECTURE", subs: [
      { label: "System Architecture", component: <SystemArchitecture /> },
    ] },
    { id: "ARIA", subs: [
      { label: "ARIA", component: <AIAssistant /> },
    ] },
  ];
  const selectParent = (i) => { setParent(i); setSub(0); };
  const activeParent = NAV[parent];
  const showSubRow = activeParent.subs.length > 1;
  const content = activeParent.subs[Math.min(sub, activeParent.subs.length - 1)].component;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 32, height: 32, background: C.blue, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>✈</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>IOCC — AI Operations Command Centre</div>
              <div style={{ fontSize: 10, color: C.textMuted, fontFamily: "monospace" }}>Integrated Operations Command Centre · AI-Powered Prototype</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <div style={{ fontFamily: "monospace", fontSize: 13, color: C.text, letterSpacing: 1 }}>
              {now.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })} <span style={{ fontSize: 10, color: C.textMuted }}>IST</span>
            </div>
            <AlertBadge level="warn" text="⚡ ACTIVE IROP — FL-204 · DEL→BOM" className="iocc-pulse" />
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.green, boxShadow: `0 0 6px ${C.green}` }} />
          </div>
        </div>

        {/* Parent navigation */}
        <div style={{ display: "flex", gap: 4 }}>
          {NAV.map((p, i) => {
            const active = parent === i;
            const isAria = p.id === "ARIA";
            const accent = isAria ? C.green : C.blue;
            return (
              <button key={p.id} onClick={() => selectParent(i)}
                style={{
                  background: "transparent",
                  color: active ? (isAria ? C.green : C.text) : (isAria ? C.green : C.textMuted),
                  border: "none", borderBottom: active ? `2px solid ${accent}` : "2px solid transparent",
                  padding: "11px 18px", fontSize: 13, fontWeight: active ? 700 : 500,
                  letterSpacing: 1.5, cursor: "pointer", transition: "all 0.15s",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                {p.id}
                {isAria && <span className="iocc-live-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: C.green, boxShadow: `0 0 6px ${C.green}`, display: "inline-block" }} />}
              </button>
            );
          })}
        </div>

        {/* Sub navigation */}
        {showSubRow && (
          <div key={parent} className="iocc-fade" style={{ display: "flex", gap: 2, borderTop: `1px solid ${C.border}` }}>
            {activeParent.subs.map((s, i) => {
              const active = sub === i;
              return (
                <button key={i} onClick={() => setSub(i)}
                  style={{
                    background: active ? C.surfaceHigh : "transparent",
                    color: active ? C.text : C.textMuted,
                    border: "none", borderBottom: active ? `2px solid ${C.blue}` : "2px solid transparent",
                    padding: "7px 14px", fontSize: 11.5, fontWeight: active ? 600 : 400,
                    cursor: "pointer", transition: "all 0.15s",
                  }}>
                  {s.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: "24px", maxWidth: 1200, margin: "0 auto" }}>
        <div key={`${parent}-${sub}`} className="iocc-fade">{content}</div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${C.border}`, padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, color: C.textMuted }}>IOCC — AI Operations Command Centre Prototype · Designed by Shailaja Rai · 2026 · Proof of Concept — Not Production Data</span>
        <span style={{ fontSize: 10, color: C.textMuted, fontFamily: "monospace" }}>ARIA — Airline Real-time Intelligence Assistant · Integrated Operations Command Centre</span>
      </div>
    </div>
  );
}
