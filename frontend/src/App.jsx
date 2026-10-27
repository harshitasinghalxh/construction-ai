import { useState } from "react";
import { postJSON, postForm, inr } from "./api.js";

const TABS = [
  ["safety", "Site safety"], ["cracks", "Crack analysis"], ["valuation", "Valuation"],
  ["plan", "Project plan"], ["weather", "Weather advisory"], ["chat", "Assistant"],
];

function useCall() {
  const [state, set] = useState({ loading: false, error: "", data: null });
  const run = async (fn) => {
    set({ loading: true, error: "", data: null });
    try { set({ loading: false, error: "", data: await fn() }); }
    catch (e) { set({ loading: false, error: e.message, data: null }); }
  };
  return [state, run];
}

const Badge = ({ level }) => <span className={`badge ${level}`}>{level.replace("_", " ")}</span>;
const Status = ({ s }) => s.loading ? <p className="muted">Analysing…</p> : s.error ? <p className="err">{s.error}</p> : null;
const Field = ({ label, children }) => <label className="field"><span>{label}</span>{children}</label>;
const List = ({ title, items }) => items?.length ? <><h4>{title}</h4><ul>{items.map((x, i) => <li key={i}>{x}</li>)}</ul></> : null;

function ImageInput({ file, setFile }) {
  return (
    <Field label="Site photo">
      <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
      {file && <img className="preview" src={URL.createObjectURL(file)} alt="Selected upload" />}
    </Field>
  );
}

function Safety() {
  const [file, setFile] = useState(null); const [ctx, setCtx] = useState("");
  const [s, run] = useCall();
  return <>
    <ImageInput file={file} setFile={setFile} />
    <Field label="Context (optional)"><input value={ctx} onChange={(e) => setCtx(e.target.value)} placeholder="e.g. 4th floor slab shuttering" /></Field>
    <button disabled={!file || s.loading} onClick={() => run(() => postForm("/api/safety", { image: file, context: ctx }))}>Check safety</button>
    <Status s={s} />
    {s.data && <div className="result">
      <div className="row"><Badge level={s.data.overall_risk} /><strong>Compliance {s.data.compliance_score}/100</strong></div>
      <p>{s.data.summary}</p>
      {s.data.issues.map((i, k) => <div className="issue" key={k}>
        <div className="row"><strong>{i.category}</strong><Badge level={i.severity} /></div>
        <p>{i.description}</p><p className="fix">Fix: {i.recommendation}</p></div>)}
    </div>}
  </>;
}

function Cracks() {
  const [file, setFile] = useState(null); const [loc, setLoc] = useState("");
  const [s, run] = useCall();
  return <>
    <ImageInput file={file} setFile={setFile} />
    <Field label="Where is it?"><input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="e.g. beam-column joint, ground floor" /></Field>
    <button disabled={!file || s.loading} onClick={() => run(() => postForm("/api/cracks", { image: file, location: loc }))}>Analyse crack</button>
    <Status s={s} />
    {s.data && <div className="result">
      <div className="row"><Badge level={s.data.severity} /><strong>{s.data.crack_detected ? `${s.data.crack_type} crack` : "No crack detected"}</strong>
        {s.data.estimated_width_mm != null && <span className="muted">≈ {s.data.estimated_width_mm} mm</span>}</div>
      <p>{s.data.summary}</p>
      {s.data.needs_engineer_inspection && <p className="alert">Get a structural engineer to inspect this.</p>}
      <List title="Probable causes" items={s.data.probable_causes} />
      <List title="Recommended actions" items={s.data.recommended_actions} />
    </div>}
  </>;
}

function Valuation() {
  const [f, setF] = useState({ location: "", property_type: "apartment", area_sqft: 1000, age_years: 0, bedrooms: 2, amenities: "", notes: "" });
  const [s, run] = useCall();
  const up = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return <>
    <div className="grid">
      <Field label="Location"><input value={f.location} onChange={up("location")} placeholder="Vijay Nagar, Indore" /></Field>
      <Field label="Type"><select value={f.property_type} onChange={up("property_type")}>{["apartment", "villa", "plot", "commercial"].map((x) => <option key={x}>{x}</option>)}</select></Field>
      <Field label="Area (sq ft)"><input type="number" value={f.area_sqft} onChange={up("area_sqft")} /></Field>
      <Field label="Age (years)"><input type="number" value={f.age_years} onChange={up("age_years")} /></Field>
      <Field label="Bedrooms"><input type="number" value={f.bedrooms} onChange={up("bedrooms")} /></Field>
      <Field label="Amenities (comma separated)"><input value={f.amenities} onChange={up("amenities")} placeholder="parking, lift, gym" /></Field>
    </div>
    <button disabled={!f.location || s.loading} onClick={() => run(() => postJSON("/api/valuation", {
      ...f, area_sqft: +f.area_sqft, age_years: +f.age_years, bedrooms: +f.bedrooms,
      amenities: f.amenities.split(",").map((x) => x.trim()).filter(Boolean) }))}>Estimate value</button>
    <Status s={s} />
    {s.data && <div className="result">
      <p className="big">{inr(s.data.estimated_value_inr)}</p>
      <p className="muted">Range {inr(s.data.low_estimate_inr)} – {inr(s.data.high_estimate_inr)} · {inr(s.data.price_per_sqft_inr)}/sq ft · {s.data.confidence} confidence</p>
      <p>{s.data.summary}</p>
      <List title="Key factors" items={s.data.key_factors} /><List title="Risks" items={s.data.risks} />
    </div>}
  </>;
}

function Plan() {
  const [f, setF] = useState({ project_name: "", project_type: "residential building", area_sqft: 2000, floors: 2, budget_inr: "", deadline_months: "", notes: "" });
  const [s, run] = useCall();
  const up = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return <>
    <div className="grid">
      <Field label="Project name"><input value={f.project_name} onChange={up("project_name")} /></Field>
      <Field label="Type"><input value={f.project_type} onChange={up("project_type")} /></Field>
      <Field label="Built-up area (sq ft)"><input type="number" value={f.area_sqft} onChange={up("area_sqft")} /></Field>
      <Field label="Floors"><input type="number" value={f.floors} onChange={up("floors")} /></Field>
      <Field label="Budget (₹, optional)"><input type="number" value={f.budget_inr} onChange={up("budget_inr")} /></Field>
      <Field label="Deadline (months, optional)"><input type="number" value={f.deadline_months} onChange={up("deadline_months")} /></Field>
    </div>
    <button disabled={!f.project_name || s.loading} onClick={() => run(() => postJSON("/api/plan", {
      ...f, area_sqft: +f.area_sqft, floors: +f.floors,
      budget_inr: f.budget_inr ? +f.budget_inr : null, deadline_months: f.deadline_months ? +f.deadline_months : null }))}>Generate plan</button>
    <Status s={s} />
    {s.data && <div className="result">
      <p className="big">{s.data.total_duration_weeks} weeks · {inr(s.data.total_estimated_cost_inr)}</p>
      <p>{s.data.summary}</p>
      {s.data.phases.map((p, i) => <div className="issue" key={i}>
        <div className="row"><strong>{p.name}</strong><span className="muted">{p.duration_weeks} wk · {inr(p.estimated_cost_inr)}</span></div>
        <ul>{p.tasks.map((t, k) => <li key={k}>{t}</li>)}</ul>
        {p.dependencies.length > 0 && <p className="muted">After: {p.dependencies.join(", ")}</p>}</div>)}
      <List title="Key risks" items={s.data.key_risks} />
    </div>}
  </>;
}

function Weather() {
  const [city, setCity] = useState("Indore"); const [act, setAct] = useState("concrete pour");
  const [s, run] = useCall();
  return <>
    <div className="grid">
      <Field label="Site city"><input value={city} onChange={(e) => setCity(e.target.value)} /></Field>
      <Field label="Planned activity"><input value={act} onChange={(e) => setAct(e.target.value)} /></Field>
    </div>
    <button disabled={!city || s.loading} onClick={() => run(() => postJSON("/api/weather", { city, activity: act }))}>Get advisory</button>
    <Status s={s} />
    {s.data && <div className="result">
      <div className="row"><Badge level={s.data.go_no_go} /><strong>{s.data.city}</strong>
        <span className="muted">{s.data.current_temp_c}°C · wind {s.data.wind_kmh} km/h · rain {s.data.rain_mm_next_24h} mm / 24h</span></div>
      <List title="Advisories" items={s.data.advisories} />
      <List title="Schedule changes" items={s.data.suggested_schedule_changes} />
    </div>}
  </>;
}

function Chat() {
  const [mode, setMode] = useState("site_assistant");
  const [msgs, setMsgs] = useState([]); const [text, setText] = useState(""); const [busy, setBusy] = useState(false);
  const send = async () => {
    const m = text.trim(); if (!m) return;
    const history = msgs.map((x) => ({ role: x.role, content: x.content }));
    setMsgs((p) => [...p, { role: "user", content: m }]); setText(""); setBusy(true);
    try {
      const r = await postJSON("/api/chat", { message: m, history, mode });
      setMsgs((p) => [...p, { role: "assistant", content: r.answer, items: r.action_items, refs: r.references }]);
    } catch (e) { setMsgs((p) => [...p, { role: "assistant", content: e.message, error: true }]); }
    setBusy(false);
  };
  return <>
    <div className="seg">
      <button className={mode === "site_assistant" ? "on" : ""} onClick={() => setMode("site_assistant")}>Daily site help</button>
      <button className={mode === "knowledge" ? "on" : ""} onClick={() => setMode("knowledge")}>Knowledge Q&A</button>
    </div>
    <div className="chat">
      {msgs.length === 0 && <p className="muted">Ask about today’s pour, a rebar spacing rule, or how to cure M25 concrete.</p>}
      {msgs.map((m, i) => <div key={i} className={`msg ${m.role} ${m.error ? "err" : ""}`}>
        <p>{m.content}</p>
        {m.items?.length > 0 && <ul>{m.items.map((x, k) => <li key={k}>{x}</li>)}</ul>}
        {m.refs?.length > 0 && <p className="muted">Refs: {m.refs.join(", ")}</p>}</div>)}
      {busy && <p className="muted">Thinking…</p>}
    </div>
    <div className="row"><input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Type a question" />
      <button disabled={busy} onClick={send}>Send</button></div>
  </>;
}

const VIEWS = { safety: Safety, cracks: Cracks, valuation: Valuation, plan: Plan, weather: Weather, chat: Chat };

export default function App() {
  const [tab, setTab] = useState("safety");
  const View = VIEWS[tab];
  return (
    <div className="shell">
      <nav>
        <h1>Site<br />Intelligence</h1>
        {TABS.map(([id, label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>)}
      </nav>
      <main><h2>{TABS.find((t) => t[0] === tab)[1]}</h2><View key={tab} /></main>
    </div>
  );
}
