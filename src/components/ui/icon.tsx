export type IconName = "sun" | "compass" | "person" | "profile" | "leaf" | "lock" | "check";
const paths: Record<IconName, string> = {
  lock: "M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5V10M12 14v3",
  check: "M5 12l4 4L19 6",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5",
  compass: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m4 6-3 5-5 3 3-5 5-3",
  person: "M12 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6M5 21v-3a7 7 0 0 1 14 0v3M8 21h8",
  profile: "M12 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6M5 20a7 7 0 0 1 14 0M4 3h16v18H4V3",
  leaf: "M20 3C8 2 2 9 6 17s16 1 14-14M5 21 16 9M9 17v-5m4 1h4",
};
export function Icon({ name }: { name: IconName }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
