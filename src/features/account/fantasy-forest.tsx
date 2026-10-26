// Animated login scene: the player's own illustration (public/images/login/hero.webp) brought to life with
// CSS layers — drifting clouds, pulsing suns, a glowing staff, sun rays, floating shards and embers.
// Overlay positions are percentages of the 765×1024 image, so they stay aligned however the panel is cropped.
const shards = [[8, 14, 0, 18], [12, 26, 2.4, 12], [83, 12, 1.1, 20], [88, 30, 3.6, 14], [70, 21, 0.6, 10], [57, 40, 4.2, 9], [22, 6, 5.0, 11], [93, 44, 2.0, 13], [40, 9, 3.0, 8]];
const embers = [[18, 0], [30, 2.1], [44, 4.3], [55, 1.2], [63, 5.6], [72, 3.1], [81, 6.8], [36, 7.9], [50, 9.2]];

export function FantasyForest() {
  return <div className="hero-scene">
    <div className="hero-frame">
      <div className="hero-image" />
      <div className="hero-rays" />
      <i className="hero-glow sun" />
      <i className="hero-glow sun2" />
      <i className="hero-glow staff" />
      <i className="hero-glow castle" />
      <div className="hero-clouds" />
      {shards.map(([x, y, d, s], i) => <i key={`s${i}`} className="hero-shard" style={{ left: `${x}%`, top: `${y}%`, width: `${s}px`, height: `${s}px`, animationDelay: `${d}s` }} />)}
      {embers.map(([x, d], i) => <i key={`e${i}`} className="hero-ember" style={{ left: `${x}%`, animationDelay: `${d}s` }} />)}
    </div>
  </div>;
}
