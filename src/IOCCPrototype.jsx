
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

function Metric({ label, value, unit, status, delta }) {
  const statusColor = status === "good" ? C.green : status === "warn" ? C.amber : status === "bad" ? C.red : C.cyan;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "16px 20px", flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontSize: 28, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", color: statusColor }}>{value}</span>
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

// ── SCREEN: DASHBOARD ───────────────────────────────────────────
function Dashboard() {
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 3000); return () => clearInterval(t); }, []);
  const liveOTP = (85 + Math.sin(tick * 0.7) * 3).toFixed(1);
  const liveCancel = Math.floor(4 + Math.sin(tick * 0.5) * 2);

  return (
    <div>
      <SectionHeader
        title="Operations Command Centre — Live View"
        sub="Airline Network  ·  2,247 flights today  ·  Real-time data integration across Sabre, Amadeus, Thales"
        badge={<AlertBadge level="warn" text="⚡ IGI FOG ADVISORY — 06:00–10:00 IST" />}
      />

      {/* KPI Row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <Metric label="On-Time Performance" value={liveOTP} unit="%" status="warn" delta="+1.2%" />
        <Metric label="Flights Today" value="2,247" status="good" />
        <Metric label="Cancellations" value={liveCancel} status={liveCancel > 5 ? "warn" : "good"} delta="+2" />
        <Metric label="Crew Availability" value="91.4" unit="%" status="warn" delta="-2.3%" />
        <Metric label="Disruption Risk Index" value="38" unit="/100" status="warn" />
        <Metric label="Pax Impacted" value="1,840" status="warn" delta="+320" />
      </div>

      {/* OTP Trend */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>OTP & Cancellations — Today</div>
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={flightData}>
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
        <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 14 }}>Active Alerts — OCC Queue</div>
        {[
          { time: "07:42", code: "FL-204", issue: "Crew duty window expires in 48 min — IGI delay cascade", level: "critical", action: "Recovery options generated" },
          { time: "07:38", code: "FL-891", issue: "Aircraft rotation break at BLR — 22 min delay propagation", level: "warn", action: "Crew swap initiated" },
          { time: "07:31", code: "NETWORK", issue: "IGI fog: 67 min average ground delay — crew duty impact model running", level: "warn", action: "Contingency playbook activated" },
          { time: "07:18", code: "FL-112", issue: "FDTL limit reached — Captain Singh. Reserve crew positioning.", level: "ok", action: "Resolved ✓" },
        ].map((alert, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < 3 ? `1px solid ${C.border}` : "none" }}>
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

// ── SCRIPTED ASSISTANT (offline demo — no API key, safe for public hosting) ──
function scriptedReply(q) {
  const t = q.toLowerCase();
  if (/(fdtl|crew|duty|limit|roster)/.test(t)) {
    return "5 crew are within 3 hours of FDTL Phase II limits.\n\n• FO Patel (IGI-FO-891 · DEL) — 1h 48m remaining — CRITICAL\n• Capt Sharma (IGI-CR-204 · DEL) — 2h 14m — watch\n• Capt Singh (BLR-CR-112 · BLR) — 3h 02m — watch\n• Capt Joshi (BOM-CR-445 · BOM) — 4h 31m — OK\n• FO Reddy (HYD-FO-223 · HYD) — 5h 18m — OK\n\nReserve crew BLR-23 is positioned for the FL-204 swap. Recommend confirming the swap within the next 30 minutes to stay inside FO Patel's window.";
  }
  if (/(igi|fog|disruption risk|risk at|delhi|weather)/.test(t)) {
    return "Current Disruption Risk Index is 38/100 (Moderate).\n\nPrimary driver: IGI Delhi fog advisory, 06:00–10:00 IST tomorrow, ~67 min average ground delay modelled. Network crew availability is 91.4%, though BLR is on alert at 88%.\n\nMonte Carlo (10,000 runs), next 36 hours:\n• 0–5 cancellations: 34%\n• 6–20: 41%\n• 21–50: 18%\n• 50+: 7%\n\nRecommended pre-action: position 3 reserve crew at IGI and pre-build the fog contingency playbook for tomorrow's window.";
  }
  if (/(fl-?204|recovery|irop|substitut|swap|option)/.test(t)) {
    return "FL-204 (DEL→BOM · 186 pax) — crew duty limit expires in 48 minutes. Three FDTL-compliant recovery options, ranked:\n\n1. Crew Swap + Aircraft Hold — 94% confidence · 18 min delay · ₹2.1L · low pax impact  ← recommended\n2. Aircraft Substitution (VT-INA) — 87% · 34 min · ₹4.8L · medium\n3. Schedule Compression — 78% · 52 min · ₹6.2L · medium\n\nOption 1 recovers the network within ~3 hours. Approve it in the IROP Recovery tab — target decision time is under 3 minutes vs 45–90 min manual.";
  }
  if (/(december|crisis|cascade|historical|replay)/.test(t)) {
    return "A December-style cascade today would require the same five root causes to align:\n\n1. Regulatory–roster mismatch\n2. No probabilistic crew forecasting\n3. Weather amplification at IGI\n4. No stochastic stress-testing\n5. Fragmented Sabre / Amadeus / Thales data\n\nThe IOCC now addresses all five. Counterfactual replay of the actual event shows an ~84% reduction in cancellations (see the Dec Crisis Replay tab). The closest live analogue is tomorrow's IGI fog window — already modelled and mitigated.";
  }
  if (/(otp|on.?time|performance|cancellation|delay)/.test(t)) {
    return "On-Time Performance is tracking at 87.2% today (target 85%+), with cancellations low so far. The watch item is the IGI fog window tomorrow morning, which the model expects to pull OTP toward the mid-80s between 06:00–10:00 IST. Pre-positioning reserve crew at IGI is the main lever to protect it.";
  }
  return "Demo mode — I answer from the IOCC's current snapshot: 2,247 flights today, OTP 87.2%, Disruption Risk 38/100, an active IROP on FL-204 (DEL→BOM), and an IGI fog advisory for tomorrow morning.\n\nTry one of the suggested questions for a detailed breakdown: IGI disruption risk, crew FDTL status, FL-204 recovery options, or December-crisis analysis.";
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
  const tabs = [
    { label: "🖥️  OCC Dashboard", component: <Dashboard /> },
    { label: "🔮  Disruption Prediction", component: <DisruptionPrediction /> },
    { label: "⚡  IROP Recovery", component: <IROPRecovery /> },
    { label: "📅  Dec Crisis Replay", component: <CrisisReplay /> },
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
            <div style={{ fontFamily: "monospace", fontSize: 11, color: C.textMuted }}>
              {new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })} IST
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
