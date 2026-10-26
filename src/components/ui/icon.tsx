export type IconName = "sun" | "compass" | "person" | "profile" | "leaf" | "lock" | "check" | "map" | "route" | "bag" | "chat" | "chart" | "more" | "flame" | "coin" | "book" | "calendar" | "quill";
const paths: Record<IconName, string> = {
  calendar: "M4 6h16v14H4V6m0 4h16M8 3v5m8-5v5M8 14h2m4 0h2m-8 3h2",
  book: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5m0 16a2 2 0 0 1 2-2h13v2H6M8 7h7M8 10h5",
  lock: "M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5V10M12 14v3",
  check: "M5 12l4 4L19 6",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5",
  compass: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m4 6-3 5-5 3 3-5 5-3",
  person: "M12 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6M5 21v-3a7 7 0 0 1 14 0v3M8 21h8",
  profile: "M12 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6M5 20a7 7 0 0 1 14 0M4 3h16v18H4V3",
  map: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2m0 0v14m6-12v14",
  route: "M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4m12-10a2 2 0 1 0 0-4 2 2 0 0 0 0 4M6 15V9a3 3 0 0 1 3-3h4m5 3v6a3 3 0 0 1-3 3h-4",
  bag: "M5 8h14l-1 13H6L5 8m4 0V6a3 3 0 0 1 6 0v2",
  chat: "M4 5h16v11H9l-5 4V5m4 5h8m-8 3h5",
  chart: "M4 20h16M7 16v-5m5 5V6m5 10v-8",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  flame: "M12 21a6 6 0 0 0 6-6c0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-3 5-3 8a6 6 0 0 0 6 6",
  coin: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18m0 4v10m3-8h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9",
  leaf: "M20 3C8 2 2 9 6 17s16 1 14-14M5 21 16 9M9 17v-5m4 1h4",
  quill: "M20 4c-7 0-12 5-13 12l-1 4 4-1c7-1 12-6 12-13V4zM6 20l8-8M10 12h5",
};
export function Icon({ name }: { name: IconName }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
