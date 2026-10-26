"use client";
import type { AttributeValue } from "./attributes";

// Pentagon radar of the five attributes, scaled to the strongest stat (min 20 so early growth still shows).
function Radar({ values }: { values: AttributeValue[] }) {
  const max = Math.max(20, ...values.map(v => v.value)), c = 100, r = 72;
  const point = (i: number, f: number) => { const a = -Math.PI / 2 + i * 2 * Math.PI / values.length; return [c + Math.cos(a) * r * f, c + Math.sin(a) * r * f]; };
  const ring = (f: number) => values.map((_, i) => point(i, f).join(",")).join(" ");
  return <svg className="attr-radar" viewBox="0 0 200 200" role="img" aria-label={`ค่าสถานะ: ${values.map(v => `${v.name} ${v.value}`).join(", ")}`}>
    {[.25, .5, .75, 1].map(f => <polygon key={f} points={ring(f)} className="radar-ring" />)}
    {values.map((_, i) => { const [x, y] = point(i, 1); return <line key={i} x1={c} y1={c} x2={x} y2={y} className="radar-spoke" />; })}
    <polygon points={values.map((v, i) => point(i, Math.max(.06, v.value / max)).join(",")).join(" ")} className="radar-shape" />
    {values.map((v, i) => { const [x, y] = point(i, Math.max(.06, v.value / max)); return <rect key={v.id} x={x - 3} y={y - 3} width="6" height="6" className="radar-dot" />; })}
    {values.map((v, i) => { const [x, y] = point(i, 1.2); return <text key={v.id} x={x} y={y + 4} textAnchor="middle" className="radar-label">{v.abbr}</text>; })}
  </svg>;
}

/** Character attributes: what the player has actually built, shown as RPG stats with their real sources. */
export function AttributePanel({ values, title }: { values: AttributeValue[]; title: string }) {
  const max = Math.max(20, ...values.map(v => v.value));
  return <section className="growth-card attr-panel" aria-labelledby="attr-title">
    <div className="section-heading"><h2 id="attr-title">ค่าสถานะ</h2><span>คลาส: <strong>{title}</strong></span></div>
    <div className="attr-layout">
      <Radar values={values} />
      <ul className="attr-list">{values.map(v => <li key={v.id} className={`attr-${v.id}`}>
        <span className="attr-abbr">{v.abbr}</span>
        <span className="attr-text"><strong>{v.name}</strong><small>{v.meaning}</small></span>
        <span className="attr-value">{v.value}</span>
        <span className="attr-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, v.value / max * 100)}%` }} /></span>
        <small className="attr-source">{v.sources.join(" · ")}</small>
      </li>)}</ul>
    </div>
    <p className="muted">ค่าสถานะเพิ่มจากสิ่งที่ทำจริง: ผ่านด่าน +3 · ฝึกประจำวัน +1 · โฟกัสทุก 25 นาที +1 สมาธิ · ฝึกแต่ละวันและชนะบอส +1 มุ่งมั่น</p>
  </section>;
}
