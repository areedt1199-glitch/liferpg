"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { bosses, codeLangs, heartsFor, questionView, type CodeLang } from './catalog';
import { answer, applyHint, startBattle, type Battle } from './battle';
import { trackFor } from './music';
import { usePref, writePref } from './prefs';
import { PixelBoss, PixelPlayer, PixelScene, useReducedMotion } from './pixel/pixel-canvas';
import type { Mode } from './pixel/engine';
import { outfits } from '../wardrobe/catalog';
import { submitBoss, useProgress } from '../journey/progress-store';
import type { Quest } from '../quests/types';

type Float = { id: number; text: string; kind: 'boss' | 'crit' | 'player' };
type Fx = { player: Mode; boss: Mode; playerFlash: boolean; bossFlash: boolean; playerMove: string; bossMove: string; shake: boolean };
const calm: Fx = { player: 'idle', boss: 'idle', playerFlash: false, bossFlash: false, playerMove: '', bossMove: '', shake: false };
const LANGS = ['python', 'javascript'] as const, ONOFF = ['on', 'off'] as const;

let audioCtx: AudioContext | null = null;
function tone(freqs: number[], dur = .09, type: OscillatorType = 'square') {
  try {
    audioCtx ??= new AudioContext();
    freqs.forEach((f, i) => { const o = audioCtx!.createOscillator(), g = audioCtx!.createGain(), t = audioCtx!.currentTime + i * dur; o.type = type; o.frequency.value = f; g.gain.setValueAtTime(.05, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g).connect(audioCtx!.destination); o.start(t); o.stop(t + dur); });
  } catch { /* audio unavailable */ }
}

export function BossBattle({ quest }: { quest: Quest }) {
  const { progress } = useProgress();
  const boss = bosses[quest.id], track = trackFor(boss.music);
  const result = progress.bosses[quest.id], passed = result?.passedAt != null;
  const ready = quest.steps.every(s => progress.focus[quest.id].checkedStepIds.includes(s.id));
  const outfit = outfits.find(o => o.id === progress.equippedOutfitId) ?? outfits[0];
  const lang = usePref<CodeLang>('liferpg.codeLang', 'python', LANGS), music = usePref('liferpg.music', 'on', ONOFF), sfx = usePref('liferpg.sfx', 'on', ONOFF);
  const reduce = useReducedMotion();

  const [battle, setBattle] = useState<Battle | null>(null);
  const [hp, setHp] = useState<{ boss: number; hearts: number } | null>(null);
  const [fx, setFx] = useState<Fx>(calm);
  const [floats, setFloats] = useState<Float[]>([]);
  const [picked, setPicked] = useState<{ chosen: number; answer: number } | null>(null);
  const [line, setLine] = useState({ speaker: boss.name, text: boss.intro });
  const [feedback, setFeedback] = useState<{ ok: boolean; crit: boolean; questionId: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [save, setSave] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const run = useRef(0), audio = useRef<HTMLAudioElement | null>(null), floatId = useRef(0);

  const wait = useCallback((ms: number) => new Promise<void>(r => setTimeout(r, reduce ? Math.min(ms, 120) : ms)), [reduce]);
  const beep = useCallback((f: number[], d?: number, t?: OscillatorType) => { if (sfx === 'on') tone(f, d, t); }, [sfx]);
  const float = useCallback((text: string, kind: Float['kind']) => { const id = ++floatId.current; setFloats(f => [...f, { id, text, kind }]); setTimeout(() => setFloats(f => f.filter(x => x.id !== id)), 1100); }, []);
  const playMusic = useCallback(() => {
    if (!track || music !== 'on') return;
    audio.current ??= Object.assign(new Audio(track.file), { loop: true, volume: .4, preload: 'auto' });
    void audio.current.play().catch(() => { /* blocked until a user gesture */ });
  }, [music, track]);
  useEffect(() => () => { run.current++; audio.current?.pause(); }, []);
  useEffect(() => { if (music === 'off') audio.current?.pause(); }, [music]);

  async function saveResult(answers: Record<string, number>) {
    setSave('saving');
    setSave(await submitBoss(quest.id, answers) ? 'saved' : 'failed');
  }
  function start() {
    if (!ready || busy) return;
    run.current++; setBattle(startBattle(boss)); setHp(null); setFx(calm); setPicked(null); setFeedback(null); setSave('idle');
    setLine({ speaker: 'เทิร์นของคุณ', text: '' }); playMusic(); beep([392, 523, 659], .12);
  }
  function flee() {
    run.current++; setBattle(null); setFx(calm); setPicked(null); setFeedback(null); setBusy(false); audio.current?.pause();
    setLine({ speaker: 'ระบบ', text: 'คุณถอยออกมาตั้งหลัก ไม่มีบทลงโทษ กลับมาสู้ใหม่ได้ทุกเมื่อ' });
  }
  async function choose(chosen: number) {
    if (!battle || battle.phase !== 'player' || busy) return;
    const token = run.current, turn = answer(battle, boss, chosen), q = boss.questions[battle.current!];
    setBusy(true); setPicked({ chosen, answer: turn.answer });
    if (turn.correct) {
      beep([523, 784], .07); setFx({ ...calm, player: 'attack', playerMove: 'lunge' }); await wait(260); if (token !== run.current) return;
      setFx({ ...calm, player: 'attack', boss: 'hit', bossFlash: true, bossMove: 'hit' }); setHp({ boss: turn.battle.bossHP, hearts: turn.battle.hearts });
      float(turn.crit ? 'CRITICAL! −1' : '−1', turn.crit ? 'crit' : 'boss'); unflash(token);
      setLine({ speaker: 'ระบบ', text: turn.battle.phase === 'victory' ? `${boss.name} ล้มลงแล้ว!` : boss.hurt[turn.battle.turns % boss.hurt.length] });
    } else {
      beep([196, 147], .12, 'sawtooth'); setFx({ ...calm, boss: 'attack', bossMove: 'boss-lunge' }); await wait(300); if (token !== run.current) return;
      setFx({ ...calm, boss: 'attack', player: 'hit', playerFlash: true, playerMove: 'hit', shake: true }); setHp({ boss: turn.battle.bossHP, hearts: turn.battle.hearts });
      float('−♥', 'player'); unflash(token); setLine({ speaker: boss.name, text: boss.attack });
    }
    setFeedback({ ok: turn.correct, crit: turn.crit, questionId: q.id });
    await wait(turn.correct ? 950 : 1250); if (token !== run.current) return;
    setPicked(null); setHp(null); setBattle(turn.battle);
    if (turn.battle.phase === 'victory') {
      setFx({ ...calm, boss: 'ko', bossMove: 'ko' }); beep([523, 659, 784, 1046], .12);
      setLine({ speaker: 'ระบบ', text: boss.defeat });
      if (!passed) await saveResult(turn.battle.answers);
    } else if (turn.battle.phase === 'defeat') {
      setFx({ ...calm, player: 'ko', playerMove: 'ko' }); beep([330, 262, 196], .16, 'triangle'); audio.current?.pause();
      setLine({ speaker: 'ระบบ', text: 'หัวใจหมดแล้ว… แต่ความรู้ที่ได้ยังอยู่กับคุณ สู้ใหม่ได้ทันทีโดยไม่เสียอะไร' });
    } else {
      setFx(calm); if (turn.correct) setLine({ speaker: boss.name, text: boss.taunts[turn.battle.turns % boss.taunts.length] });
    }
    setBusy(false);
  }
  // The white hit-flash is a single beat, not the whole animation.
  function unflash(token: number) { setTimeout(() => { if (token === run.current) setFx(f => ({ ...f, playerFlash: false, bossFlash: false })); }, 200); }
  function hint() { if (battle && !busy) { setBattle(applyHint(battle, boss)); beep([880, 988], .06, 'sine'); } }

  const playing = battle?.phase === 'player';
  useEffect(() => {
    if (!playing) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select')) return;
      const n = Number(e.key); if (n >= 1 && n <= 4) document.getElementById(`boss-opt-${n - 1}`)?.click();
      if (e.key.toLowerCase() === 'h') document.getElementById('boss-hint')?.click();
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [playing]);

  const maxHP = boss.questions.length, hearts = heartsFor(boss);
  const bossHP = hp?.boss ?? battle?.bossHP ?? (passed ? 0 : maxHP), playerHearts = hp?.hearts ?? battle?.hearts ?? hearts;
  const current = battle && battle.current !== null ? boss.questions[battle.current] : null, view = current && questionView(current, lang);
  const fbq = feedback && boss.questions.find(q => q.id === feedback.questionId), fbView = fbq && questionView(fbq, lang);
  const bossMode: Mode = fx.boss !== 'idle' ? fx.boss : !battle && passed ? 'ko' : 'idle';
  const ended = battle && battle.phase !== 'player';

  return <section className="boss-arena" aria-labelledby={`boss-${quest.id}`}>
    <header className="arena-head">
      <div><p className="eyebrow">BOSS · ด่าน {boss.level}</p><h3 id={`boss-${quest.id}`}>{boss.name}</h3><p className="muted">{maxHP} คำถาม · หัวใจ {hearts} ดวง · ตอบผิดแล้วข้อนั้นจะวนกลับมา</p></div>
      <div className="arena-prefs">
        <div className="seg" role="group" aria-label="ภาษาโค้ดในคำถาม">{LANGS.map(l => <button key={l} type="button" aria-pressed={lang === l} onClick={() => writePref('liferpg.codeLang', l)}>{codeLangs[l]}</button>)}</div>
        <button type="button" className="pref-toggle" aria-pressed={music === 'on'} onClick={() => { const next = music === 'on' ? 'off' : 'on'; writePref('liferpg.music', next); if (next === 'on' && playing) playMusic(); }}>{music === 'on' ? '♪ เพลง: เปิด' : '♪ เพลง: ปิด'}</button>
        <button type="button" className="pref-toggle" aria-pressed={sfx === 'on'} onClick={() => writePref('liferpg.sfx', sfx === 'on' ? 'off' : 'on')}>{sfx === 'on' ? 'เสียงเอฟเฟกต์: เปิด' : 'เสียงเอฟเฟกต์: ปิด'}</button>
      </div>
    </header>

    <div className={`arena-stage ${fx.shake ? 'shake' : ''} ${fx.bossFlash ? 'flash' : ''}`}>
      <PixelScene scene={boss.scene} className="arena-scene" />
      <div className="hud hud-player"><span className="hud-name">คุณ</span><span className="hearts" aria-label={`หัวใจ ${playerHearts}/${hearts}`}>{Array.from({ length: hearts }, (_, i) => <i key={i} className={i < playerHearts ? '' : 'lost'}>♥</i>)}</span></div>
      <div className="hud hud-boss"><span className="hud-name">{boss.name}</span><span className="hpbar" aria-label={`พลังบอส ${bossHP}/${maxHP}`}>{Array.from({ length: maxHP }, (_, i) => <i key={i} className={i < bossHP ? '' : 'lost'} />)}</span></div>
      {battle && battle.combo >= 2 && !ended && <span className="combo">COMBO ×{battle.combo}</span>}
      <div className={`arena-player ${fx.playerMove}`}><PixelPlayer color={outfit.color} trim={outfit.trim} mode={fx.player} flash={fx.playerFlash} /></div>
      <div className={`arena-boss ${fx.bossMove}`}><PixelBoss sprite={boss.sprite} mode={bossMode} flash={fx.bossFlash} label={`${boss.name}${passed ? ' · ชนะแล้ว' : ''}`} /></div>
      {floats.map(f => <span key={f.id} className={`float float-${f.kind}`} aria-hidden="true">{f.text}</span>)}
      {ended && <div className={`arena-result ${battle.phase}`} role="status">
        <strong>{battle.phase === 'victory' ? 'VICTORY!' : 'DEFEAT'}</strong>
        <p className="result-stats"><span><b>{battle.turns}</b>เทิร์น</span><span><b>{battle.crits}</b>Critical</span><span><b>{battle.maxCombo}</b>คอมโบสูงสุด</span><span><b>{battle.hearts}</b>หัวใจเหลือ</span></p>
        {battle.phase === 'victory' && <p>{passed && save === 'idle' ? 'รอบฝึกซ้อม · ผลชนะบันทึกไว้แล้วตั้งแต่ครั้งก่อน' : save === 'saving' ? 'กำลังบันทึกผลการต่อสู้…' : save === 'saved' ? '✓ บันทึกผลแล้ว ยืนยันเควสต์ด้านล่างได้เลย' : save === 'failed' ? 'บันทึกผลไม่สำเร็จ ลองอีกครั้งได้' : ''}</p>}
        <div className="result-actions">
          {save === 'failed' && <button type="button" className="primary-link" onClick={() => void saveResult(battle.answers)}>ลองบันทึกผลอีกครั้ง</button>}
          <button type="button" className={save === 'failed' ? 'text-link' : 'primary-link'} onClick={start}>{battle.phase === 'victory' ? 'สู้อีกครั้ง (ฝึกซ้อม)' : 'สู้ใหม่'}</button>
        </div>
      </div>}
    </div>

    <div className="arena-dialogue" aria-live="polite">
      {playing && view && !picked ? <><p className="speaker">เทิร์นของคุณ · ข้อที่เหลือ {battle.bossHP}</p><p className="say">{view.prompt}</p>{view.code && <pre className="code"><code>{view.code}</code></pre>}</>
        : <><p className="speaker">{line.speaker}</p><p className="say">{line.text || (view ? view.prompt : '')}</p></>}
      {fbView && feedback && <p className={`explain ${feedback.ok ? 'ok' : 'bad'}`}>{feedback.ok ? (feedback.crit ? '✓ ถูกต้อง · CRITICAL! ' : '✓ ถูกต้อง · ') : '✗ ยังไม่ถูก · ข้อนี้จะกลับมาอีกครั้ง · '}{fbView.explanation} <a href={fbView.source.url} target="_blank" rel="noopener noreferrer">อ่านเพิ่ม: {fbView.source.title}</a></p>}
    </div>

    <div className="arena-commands">
      {battle && current && (playing || picked) && <div className="options">{battle.order.map((oi, pos) => {
        const state = picked ? (oi === picked.answer ? 'right' : oi === picked.chosen ? 'wrong' : '') : oi === battle.removed ? 'removed' : '';
        return <button key={`${current.id}-${oi}`} id={`boss-opt-${pos}`} type="button" className={`opt ${state}`} disabled={busy || !!picked || oi === battle.removed} onClick={() => void choose(oi)}><span className="key">{pos + 1}</span><span>{view!.options[oi]}</span></button>;
      })}</div>}
      <div className="arena-tools">
        {!battle ? <button type="button" className="primary-link" disabled={!ready} onClick={start}>{passed ? '⚔ สู้อีกครั้ง (ฝึกซ้อม ไม่บันทึกผล)' : '⚔ เริ่มต่อสู้'}</button>
          : playing && <><button id="boss-hint" type="button" className="pref-toggle" disabled={busy || battle.hint < 1 || battle.removed !== null} onClick={hint}>🧪 คำใบ้ · เหลือ {battle.hint}</button><button type="button" className="pref-toggle" disabled={busy} onClick={flee}>ถอย</button></>}
        <span className="muted">{!ready ? 'เช็กขั้นตอนการเรียนให้ครบก่อนสู้บอส' : passed && !battle ? `✓ ชนะบอสแล้ว · ${result!.score}/${result!.total} ข้อ` : ended ? 'จบการต่อสู้' : battle ? `เทิร์น ${battle.turns} · กดเลข 1–4 เพื่อตอบ · H ใช้คำใบ้` : 'ชนะเมื่อตอบถูกครบทุกข้อก่อนหัวใจหมด'}</span>
        {track && <Link className="credit-link" href="/credits">เพลง: {track.title} · {track.author} ({track.license})</Link>}
      </div>
    </div>
  </section>;
}
