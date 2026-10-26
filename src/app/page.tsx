import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { Landing } from "@/features/landing/landing";
// Players go straight to their day; first-time visitors see what liferpg is before being asked to sign in.
export default async function Home() {
  if ((await cookies()).get("liferpg-mode")?.value === "demo") redirect("/today");
  const client = await serverClient();
  let signedIn = false;
  if (client) { try { const { data, error } = await client.auth.getUser(); signedIn = !!data.user && !error; } catch { /* show the landing page */ } }
  if (signedIn) redirect("/today");
  return <Landing />;
}
