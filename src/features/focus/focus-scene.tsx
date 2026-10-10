export function FocusScene({ progress = 0 }: { progress?: number }) {
  const percent = Math.round(Math.max(0, Math.min(1, progress)) * 100);
  return <div className="focus-scene" role="img" aria-label={`คริสตัลโฟกัส ความคืบหน้ารอบ ${percent}%`}><div className="focus-orbit orbit-one" /><div className="focus-orbit orbit-two" /><div className="crystal-glow" style={{ opacity: .2 + percent / 125 }} /><div className="crystal" style={{ filter: `brightness(${.7 + percent / 200})` }} /><div className="crystal-base" /><span className="spark spark-one">✦</span><span className="spark spark-two">✧</span><span className="spark spark-three">✦</span><span className="scene-caption">ความคืบหน้าของรอบ {percent}% · เติบโตทีละนิด</span></div>;
}
