import { getHealth } from "@/lib/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const report = await getHealth();
  return Response.json(report, {
    status: report.checks.database.state === "ok" ? 200 : 503,
  });
}
