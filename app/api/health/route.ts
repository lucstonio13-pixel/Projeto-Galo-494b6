import { db, endpoint, json } from "@/lib/server";

export async function GET(request: Request) {
  return endpoint(request, async () => {
    const database = await db().prepare("SELECT 1 AS ready").first<{ ready: number }>();
    return json({ status: database?.ready === 1 ? "ok" : "degraded", database: database?.ready === 1 });
  });
}
