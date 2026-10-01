import { z } from "zod";
import { body, db, endpoint, getSettings, json, requireUser, runtime, AppError } from "@/lib/server";
import { settingsSchema } from "@/lib/settings";

export async function POST(request: Request) {
  return endpoint(request, async () => {
    const user = await requireUser(request);
    const input = z.object({ key: z.string().min(32), settings: settingsSchema }).parse(await body(request));
    if (!runtime("SETUP_KEY") || input.key !== runtime("SETUP_KEY")) throw new AppError("Chave de configuração inválida.", 403);
    if ((await getSettings()).initialized) throw new AppError("A loja já foi configurada.", 409);
    await db().batch([
      db().prepare("INSERT INTO settings (id,value,revision) VALUES (1,?,0)").bind(JSON.stringify(input.settings)),
      db().prepare("INSERT INTO members (user_id,role,active) VALUES (?,'admin',1)").bind(user.id),
    ]);
    return json({ ok: true });
  });
}
