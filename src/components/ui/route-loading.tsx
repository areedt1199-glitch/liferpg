/** Instant feedback while a route segment loads (shown by loading.tsx files). */
export function RouteLoading({ label }: { label: string }) {
  return <div className="route-loading" role="status" aria-live="polite"><span className="route-spinner" aria-hidden="true" /><p>{label}</p><p className="muted">โดยปกติใช้เวลาไม่กี่วินาที</p></div>;
}
