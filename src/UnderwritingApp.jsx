import { useState, useRef, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";

const STEPS = ["Upload", "Property", "Financials", "Market", "Analysis"];
const PTYPES = ["Multifamily","Single Family Portfolio","Mixed-Use","Land/Development","Office","Retail","Industrial","Self-Storage","Mobile Home Park","Hotel"];
const SOURCES = ["Broker","Off-Market / Direct","Auction","Wholesaler","MLS","LoopNet / Crexi","Personal Network","Other"];
const MKTS = ["Houston, TX","Dallas, TX","San Antonio, TX","Austin, TX","Atlanta, GA","Charlotte, NC","Nashville, TN","Jacksonville, FL","Tampa, FL","Phoenix, AZ","Denver, CO","Other"];
const B = {bg:"#0A0F1C",s:"#111827",bd:"#1e293b",bd2:"#334155",a:"#3b82f6",as:"rgba(59,130,246,0.08)",r:"#ef4444",rs:"rgba(239,68,68,0.08)",w:"#f59e0b",ws:"rgba(245,158,11,0.08)",g:"#10b981",gs:"rgba(16,185,129,0.08)",t:"#f1f5f9",tm:"#94a3b8",td:"#64748b"};

async function toB64(f){return new Promise((r,j)=>{const rd=new FileReader();rd.onload=()=>r(rd.result.split(",")[1]);rd.onerror=j;rd.readAsDataURL(f)})}
function gMT(f){const e=f.name.split(".").pop().toLowerCase();return{pdf:"application/pdf",png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",gif:"image/gif",webp:"image/webp",csv:"text/csv",xls:"application/vnd.ms-excel",xlsx:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}[e]||f.type}

function parseJSON(raw) {
  if (!raw) return null;
  if (typeof raw === "object" && raw.verdict) return raw;
  const str = typeof raw === "string" ? raw : String(raw);
  const clean = str.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  try { const p = JSON.parse(clean); if (p.verdict) return p; } catch {}
  const i = clean.indexOf("{"); const j = clean.lastIndexOf("}");
  if (i >= 0 && j > i) { try { const p = JSON.parse(clean.substring(i, j + 1)); if (p.verdict) return p; } catch {} }
  return { verdict: str.substring(0, 600), scores: {}, metrics: [], missingData: [], redFlags: [], questions: [], ddChecklist: [] };
}

/* ═══ FORM COMPONENTS ═══ */
function FormField({ label, required, hint, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 500, marginBottom: 6, color: B.tm }}>
        {label}{required && <span style={{ color: B.a }}> *</span>}
      </label>
      {children}
      {hint && <p style={{ fontSize: 11, marginTop: 4, color: B.td }}>{hint}</p>}
    </div>
  );
}

function TextInput({ value, onChange, type = "text", placeholder, prefix, highlight }) {
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      {prefix && <span style={{ position: "absolute", left: 12, fontSize: 13, color: B.td }}>{prefix}</span>}
      <input type={type} value={value || ""} placeholder={placeholder}
        onChange={e => onChange(type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
        style={{ width: "100%", borderRadius: 8, padding: "10px 12px", fontSize: 13, outline: "none", background: highlight ? B.as : B.bg, border: `1px solid ${highlight ? B.a + "66" : B.bd}`, color: B.t, paddingLeft: prefix ? 28 : 12 }} />
      {highlight && <span style={{ position: "absolute", right: 8, fontSize: 10, padding: "2px 6px", borderRadius: 4, background: B.as, color: B.a }}>AI</span>}
    </div>
  );
}

function SelectInput({ value, onChange, options, placeholder, highlight }) {
  return (
    <select value={value || ""} onChange={e => onChange(e.target.value)}
      style={{ width: "100%", borderRadius: 8, padding: "10px 12px", fontSize: 13, outline: "none", background: highlight ? B.as : B.bg, border: `1px solid ${highlight ? B.a + "66" : B.bd}`, color: value ? B.t : B.td }}>
      <option value="">{placeholder || "Select..."}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function TextArea({ value, onChange, placeholder, rows = 3, highlight }) {
  return (
    <textarea value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      style={{ width: "100%", borderRadius: 8, padding: "10px 12px", fontSize: 13, outline: "none", resize: "none", background: highlight ? B.as : B.bg, border: `1px solid ${highlight ? B.a + "66" : B.bd}`, color: B.t }} />
  );
}

/* ═══ UPLOAD STEP ═══ */
function UploadStep({ files, setFiles, extracting, extractProgress, exResult, onExtract, exFields }) {
  const ref = useRef(null);
  const [dg, setDg] = useState(false);
  const add = fl => setFiles(p => [...p, ...Array.from(fl).filter(f => { const m = gMT(f); return m === "application/pdf" || m?.startsWith("image/") || m === "text/csv" || m === "application/vnd.ms-excel" || m === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"; })]);

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: B.t, marginBottom: 4 }}>Upload Broker Package</h2>
      <p style={{ fontSize: 13, color: B.td, marginBottom: 24 }}>Drop the OM, rent roll, T-12, photos. AI reads everything and pre-fills your deal.</p>

      <div onClick={() => ref.current?.click()} onDragOver={e => { e.preventDefault(); setDg(true); }} onDragLeave={() => setDg(false)} onDrop={e => { e.preventDefault(); setDg(false); add(e.dataTransfer.files); }}
        style={{ borderRadius: 12, padding: 40, textAlign: "center", cursor: "pointer", marginBottom: 24, border: `2px dashed ${dg ? B.a : B.bd2}`, background: dg ? B.as : "transparent" }}>
        <input ref={ref} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.csv,.xls,.xlsx" style={{ display: "none" }} onChange={e => add(e.target.files)} />
        <div style={{ width: 56, height: 56, borderRadius: 16, background: B.as, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={B.a} strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
        </div>
        <p style={{ fontSize: 13, fontWeight: 500, color: B.t, marginBottom: 4 }}>{dg ? "Drop here" : "Drop files or click to browse"}</p>
        <p style={{ fontSize: 11, color: B.td }}>PDF, JPG, PNG, CSV, XLSX — up to 20MB</p>
      </div>

      {files.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: B.td }}>{files.length} file{files.length > 1 ? "s" : ""}</p>
            <button onClick={() => setFiles([])} style={{ fontSize: 11, color: B.r, background: "none", border: "none", cursor: "pointer" }}>Clear</button>
          </div>
          {files.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, borderRadius: 8, padding: 12, marginBottom: 8, background: B.bg, border: `1px solid ${B.bd}` }}>
              <span style={{ fontSize: 18 }}>{gMT(f) === "application/pdf" ? "📄" : (gMT(f).includes("excel") || gMT(f) === "text/csv") ? "📊" : "🖼️"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: B.t, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</p>
              </div>
              <button onClick={() => setFiles(p => p.filter((_, j) => j !== i))} style={{ fontSize: 11, color: B.r, background: "none", border: "none", cursor: "pointer" }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && !extracting && !exResult && (
        <button onClick={onExtract} style={{ width: "100%", padding: "14px 0", borderRadius: 12, fontSize: 13, fontWeight: 600, background: B.a, color: "#fff", border: "none", cursor: "pointer" }}>
          Extract Deal Data →
        </button>
      )}

      {extracting && (
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", border: `2px solid transparent`, borderTopColor: B.a, borderRightColor: B.a, animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ fontSize: 13, fontWeight: 500, color: B.t }}>Reading documents...</p>
          <div style={{ margin: "12px auto 0", maxWidth: 280, height: 8, borderRadius: 999, background: B.bd }}>
            <div style={{ width: `${extractProgress}%`, height: 8, borderRadius: 999, background: B.a, transition: "width .25s ease" }} />
          </div>
          <p style={{ fontSize: 11, marginTop: 6, color: B.td }}>{extractProgress}%</p>
        </div>
      )}

      {exResult && (
        <div style={{ borderRadius: 12, padding: 16, background: B.gs, border: `1px solid ${B.g}33` }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: B.g, marginBottom: 4 }}>✓ Extracted {Object.keys(exFields).length} data points</p>
          {exResult.summary && <p style={{ fontSize: 11, color: B.tm, marginTop: 8, padding: 12, borderRadius: 8, background: B.bg, border: `1px solid ${B.bd}` }}>{exResult.summary}</p>}
        </div>
      )}

      {files.length === 0 && <p style={{ textAlign: "center", fontSize: 11, marginTop: 16, color: B.td }}>No docs? Skip to manual entry.</p>}
    </div>
  );
}

/* ═══ PROPERTY STEP ═══ */
function PropertyStep({ d, set, ex }) {
  const s = (k, v) => set({ ...d, [k]: v }); const h = k => !!ex[k];
  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: B.t, marginBottom: 4 }}>Property Details</h2>
      <p style={{ fontSize: 13, color: B.td, marginBottom: 24 }}>{Object.keys(ex).length > 0 ? "Pre-filled from docs. Review and correct." : "Enter deal details."}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ gridColumn: "span 2" }}><FormField label="Deal Name" required><TextInput value={d.name} onChange={v => s("name", v)} placeholder="e.g. Oakwood Apartments" highlight={h("name")} /></FormField></div>
        <FormField label="Property Type" required><SelectInput value={d.propertyType} onChange={v => s("propertyType", v)} options={PTYPES} highlight={h("propertyType")} /></FormField>
        <FormField label="Market" required><SelectInput value={d.market} onChange={v => s("market", v)} options={MKTS} highlight={h("market")} /></FormField>
        <FormField label="Address"><TextInput value={d.address} onChange={v => s("address", v)} placeholder="Full address" highlight={h("address")} /></FormField>
        <FormField label="Source"><SelectInput value={d.source} onChange={v => s("source", v)} options={SOURCES} /></FormField>
        <FormField label="Units" required><TextInput type="number" value={d.units} onChange={v => s("units", v)} highlight={h("units")} /></FormField>
        <FormField label="Year Built"><TextInput type="number" value={d.yearBuilt} onChange={v => s("yearBuilt", v)} placeholder="2005" highlight={h("yearBuilt")} /></FormField>
        <FormField label="Lot (ac)"><TextInput type="number" value={d.lotSize} onChange={v => s("lotSize", v)} highlight={h("lotSize")} /></FormField>
        <FormField label="Sqft"><TextInput type="number" value={d.sqft} onChange={v => s("sqft", v)} highlight={h("sqft")} /></FormField>
        <div style={{ gridColumn: "span 2" }}><FormField label="Description"><TextArea value={d.description} onChange={v => s("description", v)} placeholder="Broker notes, OM summary..." rows={4} highlight={h("description")} /></FormField></div>
      </div>
    </div>
  );
}

/* ═══ FINANCIALS STEP ═══ */
function FinStep({ d, set, ex }) {
  const s = (k, v) => set({ ...d, [k]: v }); const h = k => !!ex[k];
  const Section = ({ title, fields }) => (
    <>
      <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: B.td, marginBottom: 12 }}>{title}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        {fields.map(([label, key, opts]) => (
          <FormField key={key} label={label} required={opts?.req} hint={opts?.hint}>
            <TextInput type={opts?.t || "text"} value={d[key]} onChange={v => s(key, v)} prefix={opts?.pfx} placeholder={opts?.ph} highlight={h(key)} />
          </FormField>
        ))}
      </div>
    </>
  );
  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: B.t, marginBottom: 4 }}>Financial Details</h2>
      <p style={{ fontSize: 13, color: B.td, marginBottom: 24 }}>Enter what you know. AI flags gaps.</p>
      <Section title="Acquisition" fields={[["Asking Price","askingPrice",{t:"number",pfx:"$",req:1}],["Your Offer","offerPrice",{t:"number",pfx:"$"}],["$/Unit","pricePerUnit",{t:"number",pfx:"$"}],["$/SF","pricePerSF",{t:"number",pfx:"$"}]]} />
      <Section title="Income" fields={[["Gross Rental (Annual)","grossIncome",{t:"number",pfx:"$"}],["Other Income (Annual)","otherIncome",{t:"number",pfx:"$"}],["Occupancy (%)","occupancy",{t:"number",ph:"92"}],["Market Rent (unit/mo)","marketRent",{t:"number",pfx:"$"}]]} />
      <Section title="Expenses & Debt" fields={[["OpEx (Annual)","opex",{t:"number",pfx:"$"}],["Taxes (Annual)","taxes",{t:"number",pfx:"$"}],["Insurance (Annual)","insurance",{t:"number",pfx:"$"}],["Capex","capex",{t:"number",pfx:"$"}],["LTV (%)","ltv",{t:"number",ph:"75",hint:"65-80%"}],["Rate (%)","interestRate",{t:"number",ph:"7.25"}]]} />
      <Section title="Targets" fields={[["CoC (%)","targetCoC",{t:"number",ph:"8"}],["IRR (%)","targetIRR",{t:"number",ph:"18"}],["Multiple","targetMultiple",{ph:"2.0x"}],["Hold (yrs)","holdPeriod",{t:"number",ph:"5"}]]} />
    </div>
  );
}

/* ═══ MARKET STEP ═══ */
function MktStep({ d, set, ex }) {
  const s = (k, v) => set({ ...d, [k]: v }); const h = k => !!ex[k];
  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: B.t, marginBottom: 4 }}>Market & Context</h2>
      <p style={{ fontSize: 13, color: B.td, marginBottom: 24 }}>More context = sharper analysis.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <FormField label="Submarket"><TextInput value={d.submarket} onChange={v => s("submarket", v)} placeholder="e.g. Near Northside" highlight={h("submarket")} /></FormField>
        <FormField label="Comps"><TextInput value={d.comps} onChange={v => s("comps", v)} highlight={h("comps")} /></FormField>
        <div style={{ gridColumn: "span 2" }}><FormField label="Business Plan"><TextArea value={d.businessPlan} onChange={v => s("businessPlan", v)} placeholder="Renovation, lease-up, develop..." rows={3} /></FormField></div>
        <div style={{ gridColumn: "span 2" }}><FormField label="Known Risks"><TextArea value={d.knownRisks} onChange={v => s("knownRisks", v)} placeholder="Flood zone, environmental..." rows={3} highlight={h("knownRisks")} /></FormField></div>
        <div style={{ gridColumn: "span 2" }}><FormField label="Notes"><TextArea value={d.additionalNotes} onChange={v => s("additionalNotes", v)} placeholder="Anything else..." rows={4} /></FormField></div>
      </div>
    </div>
  );
}

/* ═══ ANALYSIS DISPLAY COMPONENTS (proven working from demo) ═══ */
function ScoreCard({ label, score, sub }) {
  const c = score >= 7 ? B.g : score >= 4 ? B.w : B.r;
  return (
    <div style={{ borderRadius: 12, padding: 16, background: B.bg, border: `1px solid ${B.bd}` }}>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <p style={{ fontSize: 28, fontWeight: 700, fontFamily: "monospace", color: c }}>{score}</p>
        <p style={{ fontSize: 11, marginTop: 4, fontWeight: 500, color: B.tm }}>{label}</p>
      </div>
      <div style={{ width: "100%", height: 8, borderRadius: 4, background: B.s }}>
        <div style={{ height: 8, borderRadius: 4, width: `${score * 10}%`, background: c, transition: "width 0.8s" }} />
      </div>
      {sub && <p style={{ fontSize: 11, marginTop: 8, lineHeight: 1.5, color: B.td }}>{sub}</p>}
    </div>
  );
}

function MetricsTable({ metrics }) {
  if (!metrics?.length) return null;
  const sc = s => ({ background: s === "calculated" ? B.gs : s === "estimated" ? B.ws : B.as, color: s === "calculated" ? B.g : s === "estimated" ? B.w : B.a });
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${B.bd}` }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr style={{ background: B.bg }}>
          <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 600, color: B.td, textTransform: "uppercase", letterSpacing: "0.05em" }}>Metric</th>
          <th style={{ textAlign: "right", padding: "12px 16px", fontSize: 11, fontWeight: 600, color: B.td, textTransform: "uppercase", letterSpacing: "0.05em" }}>Value</th>
          <th style={{ textAlign: "center", padding: "12px 16px", fontSize: 11, fontWeight: 600, color: B.td, textTransform: "uppercase", letterSpacing: "0.05em" }}>Basis</th>
          <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 600, color: B.td, textTransform: "uppercase", letterSpacing: "0.05em" }}>Note</th>
        </tr></thead>
        <tbody>{metrics.map((m, i) => (
          <tr key={i} style={{ borderTop: `1px solid ${B.bd}`, background: i % 2 ? B.bg + "88" : "transparent" }}>
            <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 500, color: B.t }}>{m.label}</td>
            <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: B.a, textAlign: "right", fontFamily: "monospace" }}>{m.value}</td>
            <td style={{ padding: "12px 16px", textAlign: "center" }}><span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 999, fontWeight: 500, ...sc(m.source) }}>{m.source}</span></td>
            <td style={{ padding: "12px 16px", fontSize: 11, color: B.td }}>{m.note || ""}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function RiskCards({ flags }) {
  if (!flags?.length) return null;
  const sv = { critical: { bg: B.rs, bd: B.r + "44", ic: "🔴", c: B.r }, warning: { bg: B.ws, bd: B.w + "44", ic: "🟡", c: B.w }, info: { bg: B.as, bd: B.a + "44", ic: "🔵", c: B.a } };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {flags.map((f, i) => { const s = sv[f.severity] || sv.info; return (
        <div key={i} style={{ background: s.bg, border: `1px solid ${s.bd}`, borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ fontSize: 16, marginTop: 2 }}>{s.ic}</span>
            <div><p style={{ fontSize: 13, fontWeight: 600, color: s.c, marginBottom: 4 }}>{f.title}</p><p style={{ fontSize: 12, color: B.tm, lineHeight: 1.5 }}>{f.detail}</p></div>
          </div>
        </div>
      ); })}
    </div>
  );
}

function GapsTable({ items }) {
  if (!items?.length) return null;
  const ic = { high: B.r, medium: B.w, low: B.a };
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${B.bd}` }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr style={{ background: B.bg }}>
          <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 600, color: B.td, textTransform: "uppercase" }}>Missing Item</th>
          <th style={{ textAlign: "center", padding: "12px 16px", fontSize: 11, fontWeight: 600, color: B.td, textTransform: "uppercase" }}>Impact</th>
          <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 600, color: B.td, textTransform: "uppercase" }}>Why It Matters</th>
        </tr></thead>
        <tbody>{items.map((m, i) => (
          <tr key={i} style={{ borderTop: `1px solid ${B.bd}`, background: i % 2 ? B.bg + "88" : "transparent" }}>
            <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 500, color: B.t }}>{m.item}</td>
            <td style={{ padding: "12px 16px", textAlign: "center" }}><span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 999, fontWeight: 700, textTransform: "uppercase", background: (ic[m.impact] || B.a) + "18", color: ic[m.impact] || B.a }}>{m.impact}</span></td>
            <td style={{ padding: "12px 16px", fontSize: 12, color: B.tm, lineHeight: 1.5 }}>{m.why}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function DDChecklist({ items }) {
  const [ck, setCk] = useState({});
  if (!items?.length) return null;
  const pr = { critical: { ic: "🔴", c: B.r, l: "Critical" }, important: { ic: "🟡", c: B.w, l: "Important" }, nice: { ic: "🟢", c: B.g, l: "Nice-to-Have" } };
  const groups = { critical: items.filter(x => x.priority === "critical"), important: items.filter(x => x.priority === "important"), nice: items.filter(x => x.priority === "nice") };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {Object.entries(groups).map(([tier, list]) => list.length > 0 && (
        <div key={tier}>
          <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: pr[tier]?.c, marginBottom: 8 }}>{pr[tier]?.ic} {pr[tier]?.l} ({list.length})</p>
          <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${B.bd}` }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ background: B.bg }}>
                <th style={{ width: 40, padding: "10px 12px" }}></th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: B.td, textTransform: "uppercase" }}>Item</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 600, color: B.td, textTransform: "uppercase", width: 110 }}>Category</th>
              </tr></thead>
              <tbody>{list.map((it, i) => { const key = tier + "_" + i; const done = !!ck[key]; return (
                <tr key={key} style={{ borderTop: `1px solid ${B.bd}`, opacity: done ? 0.4 : 1, background: i % 2 ? B.bg + "88" : "transparent" }}>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}><input type="checkbox" checked={done} onChange={() => setCk(c => ({ ...c, [key]: !c[key] }))} style={{ accentColor: B.a }} /></td>
                  <td style={{ padding: "10px 12px", fontSize: 13, color: B.t, textDecoration: done ? "line-through" : "none" }}>{it.item}</td>
                  <td style={{ padding: "10px 12px", fontSize: 11, color: B.td }}>{it.category}</td>
                </tr>
              ); })}</tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function QCards({ questions }) {
  if (!questions?.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {questions.map((q, i) => (
        <div key={i} style={{ background: B.bg, border: `1px solid ${B.bd}`, borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: B.as, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: B.a }}>{i + 1}</span>
            </div>
            <div><p style={{ fontSize: 13, fontWeight: 500, color: B.t, lineHeight: 1.5 }}>{q.question}</p><p style={{ fontSize: 11, color: B.td, marginTop: 6, lineHeight: 1.5 }}>{q.why}</p></div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══ ANALYSIS STEP ═══ */
function AnalysisStep({ d, analysis, loading, onRun, followUps, onFollowUp }) {
  const [text, setText] = useState("");
  const [tab, setTab] = useState("overview");
  const a = analysis;

  if (loading) return (
    <div style={{ textAlign: "center", padding: "80px 0" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", border: "2px solid transparent", borderTopColor: B.a, borderRightColor: B.a, animation: "spin 1s linear infinite", margin: "0 auto 24px" }} />
      <p style={{ fontSize: 14, fontWeight: 500, color: B.t }}>Underwriting your deal...</p>
      <p style={{ fontSize: 12, color: B.td, marginTop: 8 }}>Building metrics, scoring risks, generating DD checklist</p>
    </div>
  );

  if (!a) return (
    <div style={{ textAlign: "center", padding: "48px 0" }}>
      <div style={{ width: 80, height: 80, borderRadius: 16, background: B.as, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={B.a} strokeWidth="1.5"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 600, color: B.t, marginBottom: 8 }}>Ready to Underwrite</h3>
      <p style={{ fontSize: 12, color: B.td, marginBottom: 32 }}>Generates pro forma metrics, risk scorecard, and DD checklist.</p>
      <button onClick={onRun} style={{ padding: "12px 32px", borderRadius: 12, fontSize: 13, fontWeight: 600, background: B.a, color: "#fff", border: "none", cursor: "pointer" }}>Run Analysis →</button>
    </div>
  );

  const tabs = [
    { id: "overview", n: "Overview" },
    { id: "metrics", n: `Pro Forma (${a.metrics?.length || 0})` },
    { id: "risks", n: `Red Flags (${a.redFlags?.length || 0})` },
    { id: "gaps", n: `Gaps (${a.missingData?.length || 0})` },
    { id: "dd", n: `DD Checklist (${a.ddChecklist?.length || 0})` },
    { id: "questions", n: `Questions (${a.questions?.length || 0})` },
    { id: "chat", n: "Follow-Up" },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div><h2 style={{ fontSize: 18, fontWeight: 600, color: B.t, margin: 0 }}>Deal Analysis</h2><p style={{ fontSize: 11, color: B.td, margin: 0 }}>{d.name} — {d.market}</p></div>
        <button onClick={onRun} style={{ fontSize: 11, padding: "6px 14px", borderRadius: 8, background: B.as, color: B.a, border: "none", cursor: "pointer" }}>Re-run</button>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 24, overflowX: "auto", paddingBottom: 4 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "8px 14px", fontSize: 12, fontWeight: 500, borderRadius: 8, whiteSpace: "nowrap", cursor: "pointer", background: tab === t.id ? B.a : B.bg, color: tab === t.id ? "#fff" : B.td, border: `1px solid ${tab === t.id ? B.a : B.bd}` }}>{t.n}</button>
        ))}
      </div>

      {tab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: B.bg, border: `1px solid ${B.bd}`, borderRadius: 12, padding: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: B.td, marginBottom: 8 }}>Verdict</p>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: B.t, margin: 0 }}>{a.verdict}</p>
          </div>
          {a.scores && Object.keys(a.scores).length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
              {a.scores.completeness && <ScoreCard label="Completeness" score={a.scores.completeness.score} sub={a.scores.completeness.label} />}
              {a.scores.risk && <ScoreCard label="Risk (10=Safe)" score={a.scores.risk.score} sub={a.scores.risk.label} />}
              {a.scores.returnPotential && <ScoreCard label="Returns" score={a.scores.returnPotential.score} sub={a.scores.returnPotential.label} />}
              {a.scores.overall && <ScoreCard label="Overall" score={a.scores.overall.score} sub={a.scores.overall.label} />}
            </div>
          )}
          {a.redFlags?.filter(f => f.severity === "critical").length > 0 && (
            <div><p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: B.r, marginBottom: 8 }}>🔴 Critical Issues</p><RiskCards flags={a.redFlags.filter(f => f.severity === "critical")} /></div>
          )}
          {a.metrics?.length > 0 && (
            <div><p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: B.td, marginBottom: 8 }}>Key Metrics</p><MetricsTable metrics={a.metrics.slice(0, 6)} /></div>
          )}
        </div>
      )}

      {tab === "metrics" && <MetricsTable metrics={a.metrics || []} />}
      {tab === "risks" && <RiskCards flags={a.redFlags || []} />}
      {tab === "gaps" && <GapsTable items={a.missingData || []} />}
      {tab === "dd" && <DDChecklist items={a.ddChecklist || []} />}
      {tab === "questions" && <QCards questions={a.questions || []} />}

      {tab === "chat" && (
        <div>
          {followUps.length === 0 && <p style={{ fontSize: 13, padding: 16, borderRadius: 12, background: B.bg, border: `1px solid ${B.bd}`, color: B.td, marginBottom: 16 }}>Answer the AI's questions or provide new info to refine analysis.</p>}
          {followUps.map((fu, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <div style={{ borderRadius: 8, padding: 12, marginBottom: 8, marginLeft: 32, background: B.as, border: `1px solid ${B.a}33` }}>
                <p style={{ fontSize: 11, fontWeight: 500, color: B.a, marginBottom: 4 }}>You</p>
                <p style={{ fontSize: 13, color: B.t }}>{fu.question}</p>
              </div>
              <div style={{ borderRadius: 8, padding: 12, background: B.bg, border: `1px solid ${B.bd}` }}>
                <p style={{ fontSize: 11, fontWeight: 500, color: B.td, marginBottom: 4 }}>Analyst</p>
                <div>{fu.answer.split("\n").map((l, j) => l.trim() === "" ? <div key={j} style={{ height: 4 }} /> : <p key={j} style={{ fontSize: 13, color: B.tm, marginBottom: 4 }}>{l}</p>)}</div>
              </div>
            </div>
          ))}
          <div style={{ borderRadius: 12, padding: 16, background: B.bg, border: `1px solid ${B.bd}` }}>
            <p style={{ fontSize: 11, fontWeight: 500, color: B.td, marginBottom: 8 }}>Provide new info or ask a follow-up</p>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={text} onChange={e => setText(e.target.value)} placeholder="e.g. Construction loan is 8.5% floating..."
                style={{ flex: 1, borderRadius: 8, padding: "10px 12px", fontSize: 13, outline: "none", background: B.s, border: `1px solid ${B.bd}`, color: B.t }}
                onKeyDown={e => { if (e.key === "Enter" && text.trim()) { onFollowUp(text.trim()); setText(""); } }} />
              <button onClick={() => { if (text.trim()) { onFollowUp(text.trim()); setText(""); } }}
                style={{ padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: B.a, color: "#fff", border: "none", cursor: "pointer" }}>Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══ PROMPT BUILDER ═══ */
function buildPrompt(d, ctx) {
  const dc = ctx ? `\nDOCUMENT CONTEXT:\n${ctx}\n` : "";
  return `You are a senior real estate underwriter. Analyze this deal. Return ONLY valid JSON — no markdown, no backticks, no text before or after the JSON object.${dc}
DEAL: ${d.name || "N/A"} | ${d.propertyType || "N/A"} | ${d.market || "N/A"} | ${d.address || "N/A"}
Units: ${d.units || "N/A"} | Year: ${d.yearBuilt || "N/A"} | Sqft: ${d.sqft || "N/A"} | Lot: ${d.lotSize || "N/A"} ac | Source: ${d.source || "N/A"} | Desc: ${d.description || "N/A"}
Ask: ${d.askingPrice ? "$" + Number(d.askingPrice).toLocaleString() : "N/A"} | Offer: ${d.offerPrice ? "$" + Number(d.offerPrice).toLocaleString() : "N/A"}
Income: ${d.grossIncome ? "$" + Number(d.grossIncome).toLocaleString() + "/yr" : "N/A"} | Other: ${d.otherIncome ? "$" + Number(d.otherIncome).toLocaleString() + "/yr" : "N/A"}
Occ: ${d.occupancy || "N/A"}% | Mkt Rent: ${d.marketRent ? "$" + Number(d.marketRent).toLocaleString() + "/mo" : "N/A"}
OpEx: ${d.opex ? "$" + Number(d.opex).toLocaleString() + "/yr" : "N/A"} | Tax: ${d.taxes ? "$" + Number(d.taxes).toLocaleString() : "N/A"} | Ins: ${d.insurance ? "$" + Number(d.insurance).toLocaleString() : "N/A"}
Capex: ${d.capex ? "$" + Number(d.capex).toLocaleString() : "N/A"} | LTV: ${d.ltv || "N/A"}% | Rate: ${d.interestRate || "N/A"}%
Targets: CoC ${d.targetCoC || "N/A"}% | IRR ${d.targetIRR || "N/A"}% | ${d.targetMultiple || "N/A"} | ${d.holdPeriod || "N/A"} yrs
Sub: ${d.submarket || "N/A"} | Comps: ${d.comps || "N/A"} | Plan: ${d.businessPlan || "N/A"} | Risks: ${d.knownRisks || "N/A"} | Notes: ${d.additionalNotes || "N/A"}
Return EXACTLY this JSON (6-12 metrics, 3-8 missing/flags/questions, 15-25 DD items, scores 1-10):
{"verdict":"string","scores":{"completeness":{"score":0,"label":"string"},"risk":{"score":0,"label":"string"},"returnPotential":{"score":0,"label":"string"},"overall":{"score":0,"label":"string"}},"metrics":[{"label":"string","value":"string","source":"calculated|estimated|provided","note":"string"}],"missingData":[{"item":"string","impact":"high|medium|low","why":"string"}],"redFlags":[{"title":"string","severity":"critical|warning|info","detail":"string"}],"questions":[{"question":"string","why":"string"}],"ddChecklist":[{"item":"string","priority":"critical|important|nice","category":"Legal|Financial|Physical|Environmental|Market|Regulatory"}]}`;
}

/* ═══ MAIN APP ═══ */
export default function App() {
  const { getToken } = useAuth();
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState([]);
  const [extracting, setExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState(0);
  const [exResult, setExResult] = useState(null);
  const [exFields, setExFields] = useState({});
  const [docCtx, setDocCtx] = useState("");
  const [d, setD] = useState({ name: "", propertyType: "", market: "", address: "", source: "", units: "", yearBuilt: "", lotSize: "", sqft: "", description: "", askingPrice: "", offerPrice: "", pricePerUnit: "", pricePerSF: "", grossIncome: "", otherIncome: "", occupancy: "", marketRent: "", opex: "", taxes: "", insurance: "", capex: "", ltv: "", interestRate: "", targetCoC: "", targetIRR: "", targetMultiple: "", holdPeriod: "", submarket: "", comps: "", businessPlan: "", knownRisks: "", additionalNotes: "" });
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [followUps, setFollowUps] = useState([]);
  const [credits, setCredits] = useState(null);
  const [creditError, setCreditError] = useState("");

  async function loadCredits() {
    try {
      setCreditError("");
      const token = await getToken();
      const res = await fetch("/api/credits", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load credits");
      setCredits(Number(json.credits || 0));
    } catch (e) {
      setCreditError(e.message || "Failed to load credits");
    }
  }

  useEffect(() => {
    loadCredits();
  }, []);

  async function handleExtract() {
    setExtracting(true);
    setExtractProgress(5);
    try {
      const token = await getToken();
      const uploadFiles = [];
      let progress = 10;

      for (const f of files) {
        const b = await toB64(f);
        uploadFiles.push({ name: f.name, mimeType: gMT(f), data: b });
        progress = Math.min(70, progress + Math.max(8, Math.floor(50 / Math.max(files.length, 1))));
        setExtractProgress(progress);
      }

      setExtractProgress(78);
      const resp = await fetch("/api/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ files: uploadFiles }),
      });

      setExtractProgress(92);
      const res = await resp.json();
      if (!resp.ok) {
        if (resp.status === 402) {
          setCredits(Number(res.credits || 0));
          setCreditError("No credits remaining. Buy a credit pack to continue.");
          return;
        }
        throw new Error(res.error || "Extraction failed");
      }

      const p = res.extracted || {};
      const ne = {};
      const nd = { ...d };
      Object.entries(p).forEach(([k, v]) => {
        if (v != null && v !== "" && k !== "summary" && k in nd) {
          if (k === "market") {
            const m = MKTS.find(x => x.toLowerCase().includes((v + "").toLowerCase().split(",")[0].trim()));
            if (m) { nd[k] = m; ne[k] = true; }
          } else {
            nd[k] = v;
            ne[k] = true;
          }
        }
      });
      setD(nd);
      setExFields(ne);
      setDocCtx(p.summary || "");
      setExResult({ summary: p.summary || "Data extracted." });
      if (typeof res.creditsRemaining === "number") setCredits(res.creditsRemaining);
      setExtractProgress(100);
    } catch (e) {
      setExResult({ summary: "Error: " + e.message });
    } finally {
      setTimeout(() => setExtractProgress(0), 400);
      setExtracting(false);
    }
  }

  async function runAnalysis() {
    setLoading(true); setAnalysis(null); setFollowUps([]);
    try {
      setCreditError("");
      const token = await getToken();
      const resp = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 4000, messages: [{ role: "user", content: buildPrompt(d, docCtx) }] })
      });
      const res = await resp.json();

      if (!resp.ok) {
        if (resp.status === 402) {
          setCredits(Number(res.credits || 0));
          setCreditError("No credits remaining. Buy a credit pack to continue.");
          return;
        }
        throw new Error(res.error || "Analysis failed");
      }

      const raw = res.content?.map(c => c.text || "").join("") || "";
      setAnalysis(parseJSON(raw));
      if (typeof res.creditsRemaining === "number") {
        setCredits(res.creditsRemaining);
      } else {
        await loadCredits();
      }
    } catch (e) {
      setAnalysis({ verdict: "Error: " + e.message, scores: {}, metrics: [], missingData: [], redFlags: [], questions: [], ddChecklist: [] });
    }
    setLoading(false);
  }

  async function handleFollowUp(q) {
    const h = [{ role: "user", content: buildPrompt(d, docCtx) }, { role: "assistant", content: JSON.stringify(analysis) }];
    followUps.forEach(fu => { h.push({ role: "user", content: fu.question }); h.push({ role: "assistant", content: fu.answer }); }); h.push({ role: "user", content: q });
    try {
      const resp = await fetch("/api/claude", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 2000, system: "Senior RE underwriter continuing analysis. Be direct.", messages: h }) });
      const res = await resp.json(); setFollowUps(p => [...p, { question: q, answer: res.content?.map(c => c.text || "").join("\n") || "Failed." }]);
    } catch (e) { setFollowUps(p => [...p, { question: q, answer: "Error: " + e.message }]); }
  }

  return (
    <div style={{ minHeight: "100vh", background: B.bg, fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');@keyframes spin{to{transform:rotate(360deg)}}::placeholder{color:${B.td}}`}</style>

      <header style={{ borderBottom: `1px solid ${B.bd}`, padding: "16px 24px", background: B.s, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: B.a, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>U</span></div>
          <div><h1 style={{ fontSize: 14, fontWeight: 700, color: B.t, margin: 0 }}>ProformAI</h1><p style={{ fontSize: 11, color: B.td, margin: 0 }}>AI-Powered Deal Underwriting</p></div>
        </div>
        <div style={{ textAlign: "right" }}>
          {d.name && <><p style={{ fontSize: 12, fontWeight: 500, color: B.t, margin: 0 }}>{d.name}</p><p style={{ fontSize: 11, color: B.td, margin: 0 }}>{[d.market, d.propertyType].filter(Boolean).join(" · ")}</p></>}
          <p style={{ fontSize: 11, color: credits === 0 ? B.w : B.tm, margin: 0, marginTop: d.name ? 4 : 0 }}>
            Credits: {credits ?? "—"}
          </p>
          {credits === 0 && (
            <a href="/app/billing" style={{ fontSize: 11, color: B.a, textDecoration: "none" }}>Buy credits</a>
          )}
        </div>
      </header>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>
        {/* Step nav */}
        <div style={{ display: "flex", gap: 4, marginBottom: 32 }}>
          {STEPS.map((st, i) => (
            <button key={st} onClick={() => setStep(i)} style={{ flex: 1, padding: "10px 0", fontSize: 12, fontWeight: 500, borderRadius: 8, cursor: "pointer", background: i === step ? B.a : i < step ? B.as : "transparent", color: i === step ? "#fff" : i < step ? B.a : B.td, border: `1px solid ${i === step ? B.a : B.bd}` }}>{st}</button>
          ))}
        </div>

        {creditError && (
          <div style={{ marginBottom: 16, borderRadius: 10, padding: 10, background: B.ws, border: `1px solid ${B.w}55`, color: B.w, fontSize: 12 }}>
            {creditError} <a href="/app/billing" style={{ color: B.a, textDecoration: "none" }}>Open billing</a>
          </div>
        )}

        {/* Content */}
        <div style={{ background: B.s, border: `1px solid ${B.bd}`, borderRadius: 16, padding: 24 }}>
          {step === 0 && <UploadStep files={files} setFiles={setFiles} extracting={extracting} extractProgress={extractProgress} exResult={exResult} onExtract={handleExtract} exFields={exFields} />}
          {step === 1 && <PropertyStep d={d} set={setD} ex={exFields} />}
          {step === 2 && <FinStep d={d} set={setD} ex={exFields} />}
          {step === 3 && <MktStep d={d} set={setD} ex={exFields} />}
          {step === 4 && <AnalysisStep d={d} analysis={analysis} loading={loading} onRun={runAnalysis} followUps={followUps} onFollowUp={handleFollowUp} />}
        </div>

        {/* Nav buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
          <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}
            style={{ fontSize: 13, padding: "10px 20px", borderRadius: 12, background: "transparent", color: step === 0 ? B.td : B.tm, border: `1px solid ${B.bd}`, cursor: step === 0 ? "not-allowed" : "pointer", opacity: step === 0 ? 0.4 : 1 }}>← Back</button>
          {step < 4 && <button onClick={() => setStep(step + 1)}
            style={{ fontSize: 13, padding: "10px 20px", borderRadius: 12, fontWeight: 500, background: B.a, color: "#fff", border: "none", cursor: "pointer" }}>{step === 0 && !files.length ? "Skip to Manual →" : "Continue →"}</button>}
        </div>
      </div>
    </div>
  );
}
