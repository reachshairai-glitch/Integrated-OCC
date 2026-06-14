
import { useState, useEffect, useRef } from "react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, PieChart, Pie, Cell } from "recharts";

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

// ── SIMULATED LIVE DATA ─────────────────────────────────────────
const flightData = [
  { time: "06:00", flights: 180, cancelled: 2, otpPct: 94 },
  { time: "07:00", flights: 220, cancelled: 3, otpPct: 91 },
  { time: "08:00", flights: 260, cancelled: 5, otpPct: 88 },
  { time: "09:00", flights: 290, cancelled: 4, otpPct: 90 },
  { time: "10:00", flights: 310, cancelled: 6, otpPct: 87 },
  { time: "11:00", flights: 280, cancelled: 3, otpPct: 92 },
  { time: "12:00", flights: 250, cancelled: 2, otpPct: 94 },
  { time: "13:00", flights: 240, cancelled: 4, otpPct: 89 },
  { time: "14:00", flights: 270, cancelled: 5, otpPct: 87 },
  { time: "15:00", flights: 300, cancelled: 7, otpPct: 85 },
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

function Metric({ label, value, unit, status, delta, pulse, live }) {
  const statusColor = status === "good" ? C.green : status === "warn" ? C.amber : status === "bad" ? C.red : C.cyan;
  return (
    <div className={pulse ? "iocc-pulse" : undefined}
      style={{ background: C.surface, border: `1px solid ${pulse ? C.amber : C.border}`, borderRadius: 8, padding: "16px 20px", flex: 1, minWidth: 140, transition: "border-color 0.4s" }}>
      <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
        {label}
        {live && <span className="iocc-live-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: C.cyan, display: "inline-block", boxShadow: `0 0 5px ${C.cyan}` }} />}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontSize: 28, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", color: statusColor, transition: "color 0.3s" }}>{value}</span>
        {unit && <span style={{ fontSize: 13, color: C.textMuted }}>{unit}</span>}
      </div>
      {delta && <div style={{ fontSize: 11, color: delta.startsWith("+") ? C.red : C.green, marginTop: 4 }}>{delta} vs yesterday</div>}
    </div>
  );
}

function AlertBadge({ level, text }) {
  const colors = { critical: [C.red, C.redDim], warn: [C.amber, C.amberDim], ok: [C.green, C.greenDim] };
  const [fg, bg] = colors[level] || colors.ok;
  return (
    <span style={{ background: bg, color: fg, border: `1px solid ${fg}`, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}>
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
// Low overnight, climbs to a 10:00–14:00 peak (~220), mid-afternoon dip,
// a second 18:00–20:00 peak, then drops sharply after 22:00 to near zero.
const AIRBORNE_CURVE = [
  [0, 8], [3, 4], [5, 18], [6, 55], [7, 110], [8, 155], [9, 185],
  [10, 210], [11, 218], [12, 220], [13, 218], [14, 212],
  [15, 196], [16, 184], [17, 194], [18, 208], [19, 216], [20, 209],
  [21, 172], [22, 108], [23, 46], [24, 8],
];

function airborneBaseline(d = new Date()) {
  const [hh, mm] = d.toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour12: false, hour: "2-digit", minute: "2-digit" }).split(":").map(Number);
  const t = hh + mm / 60;
  for (let i = 0; i < AIRBORNE_CURVE.length - 1; i++) {
    const [h0, v0] = AIRBORNE_CURVE[i];
    const [h1, v1] = AIRBORNE_CURVE[i + 1];
    if (t >= h0 && t <= h1) return v0 + (v1 - v0) * ((t - h0) / (h1 - h0));
  }
  return AIRBORNE_CURVE[AIRBORNE_CURVE.length - 1][1];
}

// Curve value for the current moment plus a small ±5 jitter so it looks live.
function airborneNow(d = new Date()) {
  return Math.max(0, Math.round(airborneBaseline(d) + (Math.random() * 10 - 5)));
}

// ── SCREEN: DASHBOARD ───────────────────────────────────────────
function Dashboard() {
  // Inject animation keyframes once (pulse glow, blinking live dot, alert slide-in).
  useEffect(() => {
    if (document.getElementById("iocc-anim")) return;
    const s = document.createElement("style");
    s.id = "iocc-anim";
    s.textContent = `
      @keyframes ioccPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(245,158,11,0); } 50% { box-shadow: 0 0 16px 2px rgba(245,158,11,0.55); } }
      .iocc-pulse { animation: ioccPulse 1.8s ease-in-out infinite; }
      @keyframes ioccBlink { 0%,100% { opacity: 1; } 50% { opacity: 0.15; } }
      .iocc-live-dot { animation: ioccBlink 1.4s ease-in-out infinite; }
      @keyframes ioccAlertIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
      .iocc-alert-in { animation: ioccAlertIn 0.5s ease-out; }
    `;
    document.head.appendChild(s);
  }, []);

  // Live KPI state — each tile random-walks within a realistic band, every 4s.
  const [kpi, setKpi] = useState(() => ({ otp: 87.2, airborne: airborneNow(), flightsToday: 2247, cancellations: 4, crew: 91.4, risk: 38, pax: 1840 }));
  useEffect(() => {
    const wander = (v, step, min, max) => Math.max(min, Math.min(max, v + (Math.random() - 0.5) * step));
    const t = setInterval(() => {
      setKpi(k => ({
        ...k,
        otp: +wander(k.otp, 0.7, 83.5, 90).toFixed(1),
        crew: +wander(k.crew, 0.5, 88, 94).toFixed(1),
        risk: Math.round(wander(k.risk, 4, 28, 62)),
        pax: Math.round(wander(k.pax, 45, 1480, 2200)),
        cancellations: Math.max(0, Math.min(9, k.cancellations + (Math.random() < 0.35 ? (Math.random() < 0.5 ? -1 : 1) : 0))),
        flightsToday: k.flightsToday + (Math.random() < 0.6 ? 1 : 0),
      }));
    }, 4000);
    return () => clearInterval(t);
  }, []);

  // Flights airborne follows the day's IST traffic curve (+/- small jitter), refreshed every 2s.
  useEffect(() => {
    const t = setInterval(() => {
      setKpi(k => ({ ...k, airborne: airborneNow() }));
    }, 2000);
    return () => clearInterval(t);
  }, []);

  // Rolling OTP series — append a fresh point every 30s, drop the oldest.
  const [otpSeries, setOtpSeries] = useState(flightData);
  useEffect(() => {
    const t = setInterval(() => {
      const time = new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false });
      setOtpSeries(prev => [...prev.slice(1), {
        time,
        flights: 240 + Math.round(Math.random() * 70),
        cancelled: Math.round(Math.random() * 6),
        otpPct: Math.round(84 + Math.random() * 6),
      }]);
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
      const time = new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false });
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
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <Metric label="On-Time Performance" value={kpi.otp.toFixed(1)} unit="%" status={kpi.otp >= 85 ? "good" : "warn"} delta="+1.2%" />
        <Metric label="Flights Airborne Now" value={kpi.airborne} status="good" live />
        <Metric label="Flights Today" value={kpi.flightsToday.toLocaleString("en-IN")} status="good" />
        <Metric label="Cancellations" value={kpi.cancellations} status={kpi.cancellations > 5 ? "warn" : "good"} delta="+2" />
        <Metric label="Crew Availability" value={kpi.crew.toFixed(1)} unit="%" status="warn" delta="-2.3%" />
        <Metric label="Disruption Risk Index" value={kpi.risk} unit="/100" status={kpi.risk > 50 ? "bad" : "warn"} pulse={kpi.risk > 35} />
        <Metric label="Pax Impacted" value={kpi.pax.toLocaleString("en-IN")} status="warn" delta="+320" />
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
            <YAxis tick={{ fill: C.textMuted, fontSize: 10 }} />
            <Tooltip contentStyle={{ background: C.surfaceHigh, border: `1px solid ${C.borderBright}`, color: C.text }} labelFormatter={toAmPm} />
            <Area type="monotone" dataKey="otpPct" stroke={C.green} fill="url(#otpGrad)" strokeWidth={2} name="OTP %" />
            <Bar dataKey="cancelled" fill={C.red} name="Cancelled" />
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
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={riskForecast}>
              <defs>
                <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.amber} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={C.amber} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="weatherGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.blue} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.blue} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="hour" tick={{ fill: C.textMuted, fontSize: 10 }} />
              <YAxis tick={{ fill: C.textMuted, fontSize: 10 }} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: C.surfaceHigh, border: `1px solid ${C.borderBright}`, color: C.text }} />
              <Area type="monotone" dataKey="risk" stroke={C.amber} fill="url(#riskGrad)" strokeWidth={2} name="Disruption Risk" />
              <Area type="monotone" dataKey="weather" stroke={C.blue} fill="url(#weatherGrad)" strokeWidth={1.5} name="Weather Impact" />
              <Line type="monotone" dataKey="crew" stroke={C.green} strokeWidth={2} dot={false} name="Crew Availability %" strokeDasharray="5 3" />
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
        badge={<AlertBadge level="critical" text="🚨 ACTIVE IROP — FL-204 DEL→BOM" />}
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

// ── CREW POSITIONING MAP (Leaflet) ──────────────────────────────
function CrewMap({ height = 300, movements = [] }) {
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
        .iocc-crew-label { background: transparent; border: none; box-shadow: none; color: ${C.amber}; font-size: 9px; font-weight: 600; text-shadow: 0 0 4px ${C.bg}, 0 0 4px ${C.bg}; }
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
    if (!ready || !mapRef.current) return;
    const L = window.L;
    if (instanceRef.current) { instanceRef.current.remove(); instanceRef.current = null; }

    const map = L.map(mapRef.current, { center: [20.5, 79], zoom: 4, zoomControl: false, attributionControl: false, scrollWheelZoom: false });
    instanceRef.current = map;
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png", { subdomains: "abcd", maxZoom: 19 }).addTo(map);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png", { subdomains: "abcd", maxZoom: 19, opacity: 0.5 }).addTo(map);

    // Crew movement arrows (deadhead positioning).
    movements.forEach((m) => {
      const from = MAP_AIRPORTS[m.from];
      const to = MAP_AIRPORTS[m.to];
      if (!from || !to) return;
      const color = m.color || C.amber;
      const steps = 36;
      const dist = Math.hypot(to.lat - from.lat, to.lng - from.lng) || 1;
      const pts = [];
      for (let i = 0; i <= steps; i++) {
        const f = i / steps;
        const lat = from.lat + (to.lat - from.lat) * f;
        const lng = from.lng + (to.lng - from.lng) * f;
        const b = Math.sin(Math.PI * f) * dist * 0.2;
        pts.push([lat - ((to.lng - from.lng) / dist) * b, lng + ((to.lat - from.lat) / dist) * b]);
      }
      L.polyline(pts, { color, weight: 2.5, opacity: 0.9, dashArray: "6,5" }).addTo(map);
      const mi = Math.floor(steps * 0.55);
      const mid = pts[mi];
      const nxt = pts[mi + 1];
      const angle = Math.atan2(nxt[1] - mid[1], nxt[0] - mid[0]) * (180 / Math.PI);
      const icon = L.divIcon({ className: "", html: `<div style="transform:rotate(${angle}deg);color:${color};font-size:16px;line-height:1;filter:drop-shadow(0 0 3px ${color})">➤</div>`, iconSize: [16, 16], iconAnchor: [8, 8] });
      const mk = L.marker(mid, { icon, zIndexOffset: 600 }).addTo(map);
      mk.bindTooltip(m.crew, { permanent: true, direction: "top", offset: [0, -6], className: "iocc-crew-label" });
    });

    // Base markers (DEL/BOM/BLR/HYD/MAA), highlighted if part of a move.
    Object.entries(MAP_AIRPORTS).forEach(([code, ap]) => {
      const involved = movements.some((m) => m.from === code || m.to === code);
      const color = involved ? C.cyan : C.borderBright;
      const icon = L.divIcon({ className: "", html: `<div style="position:relative;width:18px;height:18px"><div style="position:absolute;top:5px;left:5px;width:8px;height:8px;border-radius:50%;background:${C.bg};border:2px solid ${color};box-shadow:0 0 6px ${color}"></div></div>`, iconSize: [18, 18], iconAnchor: [9, 9] });
      const mk = L.marker([ap.lat, ap.lng], { icon }).addTo(map);
      const dir = code === "BLR" ? "left" : "right";
      mk.bindTooltip(code, { permanent: true, direction: dir, offset: dir === "left" ? [-8, 0] : [8, 0], className: "iocc-airport-label" });
    });

    const bounds = L.latLngBounds(Object.values(MAP_AIRPORTS).map((a) => [a.lat, a.lng]));
    map.fitBounds(bounds, { paddingTopLeft: [30, 24], paddingBottomRight: [44, 30] });

    return () => { if (instanceRef.current) { instanceRef.current.remove(); instanceRef.current = null; } };
  }, [ready, movements]);

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
      rank: 1, label: "Local Reserve Activation", confidence: 94, cost: "₹1.8L", color: C.green,
      detail: "All four gaps covered by reserves already at base — no positioning flights required. Lowest cost, fastest to execute, fully FDTL Phase II compliant.",
      assignments: [
        { crew: "Capt A. Verma", base: "DEL", flight: "FL-207 DEL→HYD", move: "Local — at DEL" },
        { crew: "FO M. Iyer", base: "DEL", flight: "FL-219 DEL→CCU", move: "Local — at DEL" },
        { crew: "Capt D. Banerjee", base: "BLR", flight: "FL-233 BLR→DEL", move: "Standby callout — BLR" },
        { crew: "FO N. Menon", base: "BLR", flight: "FL-241 BLR→BOM", move: "Local — at BLR" },
      ],
      movements: [],
      timeline: [
        { flight: "FL-233 BLR→DEL", dep: 35, ready: 12 },
        { flight: "FL-207 DEL→HYD", dep: 95, ready: 30 },
        { flight: "FL-219 DEL→CCU", dep: 140, ready: 45 },
        { flight: "FL-241 BLR→BOM", dep: 205, ready: 70 },
      ],
    },
    {
      rank: 2, label: "Hybrid Position + Local", confidence: 87, cost: "₹4.2L", color: C.amber,
      detail: "Two local reserves plus two deadhead positionings (BOM→DEL, HYD→BLR). Adds positioning cost and two tight crew-in-position windows, but spreads the fatigue load across bases.",
      assignments: [
        { crew: "Capt A. Verma", base: "DEL", flight: "FL-207 DEL→HYD", move: "Local — at DEL" },
        { crew: "FO K. Pillai", base: "BOM", flight: "FL-219 DEL→CCU", move: "Deadhead BOM→DEL" },
        { crew: "FO R. Nair", base: "HYD", flight: "FL-233 BLR→DEL", move: "Deadhead HYD→BLR" },
        { crew: "FO N. Menon", base: "BLR", flight: "FL-241 BLR→BOM", move: "Local — at BLR" },
      ],
      movements: [
        { crew: "FO K. Pillai", from: "BOM", to: "DEL", color: C.amber },
        { crew: "FO R. Nair", from: "HYD", to: "BLR", color: C.amber },
      ],
      timeline: [
        { flight: "FL-233 BLR→DEL", dep: 35, ready: 18 },
        { flight: "FL-207 DEL→HYD", dep: 95, ready: 30 },
        { flight: "FL-219 DEL→CCU", dep: 140, ready: 118 },
        { flight: "FL-241 BLR→BOM", dep: 205, ready: 70 },
      ],
    },
    {
      rank: 3, label: "Network Repositioning", confidence: 79, cost: "₹6.5L", color: C.amber,
      detail: "Maximum flexibility using standby + positioning across three bases. Highest cost and the tightest crew-in-position windows — hold in reserve unless local crews are withdrawn.",
      assignments: [
        { crew: "Capt V. Rao", base: "BOM", flight: "FL-207 DEL→HYD", move: "Deadhead BOM→DEL (enroute)" },
        { crew: "Capt S. Gill", base: "DEL", flight: "FL-219 DEL→CCU", move: "Standby callout — DEL" },
        { crew: "FO R. Nair", base: "HYD", flight: "FL-233 BLR→DEL", move: "Deadhead HYD→BLR" },
        { crew: "Capt D. Banerjee", base: "BLR", flight: "FL-241 BLR→BOM", move: "Standby callout — BLR" },
      ],
      movements: [
        { crew: "Capt V. Rao", from: "BOM", to: "DEL", color: C.amber },
        { crew: "FO R. Nair", from: "HYD", to: "BLR", color: C.amber },
      ],
      timeline: [
        { flight: "FL-233 BLR→DEL", dep: 35, ready: 22 },
        { flight: "FL-207 DEL→HYD", dep: 95, ready: 78 },
        { flight: "FL-219 DEL→CCU", dep: 140, ready: 115 },
        { flight: "FL-241 BLR→BOM", dep: 205, ready: 182 },
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
        badge={<AlertBadge level="critical" text="🚨 ACTIVE CREW SHORTFALL — DEL + BLR" />}
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
        <CrewMap movements={opt.movements} />
        {opt.movements.length > 0 && (
          <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
            {opt.movements.map((m, i) => <span key={i} style={{ fontSize: 10, color: C.amber }}>➤ {m.crew}: {m.from} → {m.to} (deadhead)</span>)}
          </div>
        )}
      </div>

      {/* Crew Recovery Timeline */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: C.textMuted }}>Crew Recovery Timeline — Next 6 Hours</div>
          <div style={{ display: "flex", gap: 14, fontSize: 10 }}>
            <span style={{ color: C.cyan }}>◆ Crew in position</span>
            <span style={{ color: C.text }}>✈ Flight departs</span>
            <span style={{ color: C.amber }}>▬ &lt;30 min buffer</span>
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
          const tight = buffer < 30;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", margin: "10px 0" }}>
              <div style={{ width: 150, fontSize: 12, fontFamily: "monospace", color: C.text }}>{row.flight}</div>
              <div style={{ position: "relative", flex: 1, height: 26, background: C.bg, borderRadius: 4, border: `1px solid ${C.border}` }}>
                <div style={{ position: "absolute", left: pct(row.ready), width: `${(buffer / 360) * 100}%`, top: 8, height: 10, background: tight ? C.amber : C.green, opacity: 0.6, borderRadius: 5 }} />
                <div style={{ position: "absolute", left: pct(row.ready), top: 5, transform: "translateX(-50%)", color: C.cyan, fontSize: 13 }}>◆</div>
                <div style={{ position: "absolute", left: pct(row.dep), top: 4, transform: "translateX(-50%)", fontSize: 13 }}>✈</div>
                <span style={{ position: "absolute", left: pct((row.ready + row.dep) / 2), top: -13, transform: "translateX(-50%)", fontSize: 9, color: tight ? C.amber : C.textMuted, whiteSpace: "nowrap", fontWeight: tight ? 700 : 400 }}>{tight ? `⚠ ${buffer}m buffer` : `${buffer}m buffer`}</span>
              </div>
            </div>
          );
        })}
        {opt.timeline.some((r) => r.dep - r.ready < 30) && (
          <div style={{ marginTop: 10, fontSize: 11, color: C.amber }}>⚠ Amber windows have under 30 minutes of crew-in-position buffer — monitor closely; any further slip risks an FDTL breach.</div>
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
const SYSTEM_PROMPT = `You are the IOCC AI Operations Assistant — an operations analyst embedded in the Integrated Operations Command Centre with every screen open in front of you. You have continuous, real-time awareness of the live airline network. Answer like a sharp duty ops analyst, never like a generic chatbot.

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
══════════════════════════════════════════════════════════════

HOW TO ANSWER:
- Always answer with specific data from the context above.
- Cite flight numbers (FL-xxx) and crew names when relevant.
- Quantify risk in numbers (minutes, probabilities, pax counts, ₹).
- End EVERY response with a line beginning "Recommended action:" giving one clear, concrete next step.
- Be concise and analytical. You have every screen open — sound like it.`;

// ── SCRIPTED ASSISTANT (offline demo — mirrors SYSTEM_PROMPT; no API key) ──
function scriptedReply(q) {
  const t = q.toLowerCase();
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
    { role: "assistant", content: "I'm the IOCC AI Operations Assistant. I have situational awareness of the current network state, crew availability, weather, and FDTL compliance. This prototype runs on scripted demo responses — try one of the suggested questions below." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const suggestions = [
    "What is the current disruption risk at IGI?",
    "Which crew are closest to FDTL limits in the next 6 hours?",
    "What would cause a December-style crisis cascade today?",
    "Summarise recovery options for FL-204",
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
        title="AI Operations Assistant"
        sub="Situational awareness across network state · FDTL compliance · Disruption intelligence · Demo responses"
        badge={<AlertBadge level="ok" text="● DEMO MODE" />}
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
                <div style={{ fontSize: 10, color: C.cyan, marginBottom: 6, fontFamily: "monospace" }}>IOCC AI ASSISTANT</div>
              )}
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 16px", fontSize: 13, color: C.textMuted }}>
              <span>⟳ Analysing network state...</span>
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
          placeholder="Ask about crew availability, disruption risk, recovery options..."
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

// ── MAIN APP ────────────────────────────────────────────────────
export default function IOCCPrototype() {
  const [tab, setTab] = useState(0);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const tabs = [
    { label: "🖥️  OCC Dashboard", component: <Dashboard /> },
    { label: "🔮  Disruption Prediction", component: <DisruptionPrediction /> },
    { label: "⚡  IROP Recovery", component: <IROPRecovery /> },
    { label: "📅  Dec Crisis Replay", component: <CrisisReplay /> },
    { label: "🧑‍✈️  Crew Recovery", component: <CrewRecovery /> },
    { label: "🤖  AI Assistant", component: <AIAssistant /> },
  ];

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
            <AlertBadge level="warn" text="⚡ ACTIVE IROP — DELHI (DEL)" />
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.green, boxShadow: `0 0 6px ${C.green}` }} />
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2 }}>
          {tabs.map((t, i) => (
            <button key={i} onClick={() => setTab(i)}
              style={{
                background: tab === i ? C.surfaceHigh : "transparent",
                color: tab === i ? C.text : C.textMuted,
                border: "none", borderBottom: tab === i ? `2px solid ${C.blue}` : "2px solid transparent",
                padding: "10px 16px", fontSize: 12, fontWeight: tab === i ? 600 : 400,
                cursor: "pointer", transition: "all 0.15s",
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "24px", maxWidth: 1200, margin: "0 auto" }}>
        {tabs[tab].component}
      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${C.border}`, padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, color: C.textMuted }}>IOCC — AI Operations Command Centre Prototype · Designed by Shailaja Rai · 2026 · Proof of Concept — Not Production Data</span>
        <span style={{ fontSize: 10, color: C.textMuted, fontFamily: "monospace" }}>AI: Claude (Anthropic) · Data: Simulated</span>
      </div>
    </div>
  );
}
