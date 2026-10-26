// Satori (next/og) has no Thai glyphs, so share cards load Noto Sans Thai (OFL) from Google Fonts,
// subset to the card's own text. Without the font the card still renders, just with boxes for Thai.
export async function thaiFont(text: string, weight: 400 | 700) {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@${weight}&text=${encodeURIComponent(text)}`, { signal: AbortSignal.timeout(4000) })).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    const data = await (await fetch(url, { signal: AbortSignal.timeout(4000) })).arrayBuffer();
    return { name: 'Noto Sans Thai', data, weight, style: 'normal' as const };
  } catch { return null; }
}
