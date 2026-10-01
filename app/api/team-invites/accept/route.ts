import { z } from "zod";
import { AppError, body, db, endpoint, json, now, requireUser, uuid } from "@/lib/server";

async function tokenHash(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

type Invite = {
  id: string;
  email: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
};

async function getActiveInvite(token: string) {
  const invitation = await db()
    .prepare("SELECT id,email,expires_at,accepted_at,revoked_at FROM team_invites WHERE token_hash=?")
    .bind(await tokenHash(token))
    .first<Invite>();
  if (!invitation || invitation.revoked_at || invitation.accepted_at || invitation.expires_at <= now()) {
    throw new AppError("Este convite é inválido, expirou ou já foi utilizado.", 410);
  }
  return invitation;
}

export async function GET(request: Request) {
  return endpoint(request, async () => {
    const token = z.string().min(20).parse(new URL(request.url).searchParams.get("token"));
    const invitation = await getActiveInvite(token);
    return json({ email: invitation.email, expiresAt: invitation.expires_at });
  });
}

export async function POST(request: Request) {
  return endpoint(request, async () => {
    const user = await requireUser(request);
    const { token } = z.object({ token: z.string().min(20) }).parse(await body(request));
    const invitation = await getActiveInvite(token);
    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new AppError(`Este convite pertence a ${invitation.email}. Entre com essa conta.`, 403);
    }
    const timestamp = now();
    const result = await db().batch([
      db()
        .prepare(
          "INSERT INTO members (user_id,role,active) VALUES (?,'operator',1) ON CONFLICT(user_id) DO UPDATE SET role='operator',active=1",
        )
        .bind(user.id),
      db()
        .prepare("UPDATE team_invites SET accepted_at=? WHERE id=? AND accepted_at IS NULL AND revoked_at IS NULL")
        .bind(timestamp, invitation.id),
      db()
        .prepare("INSERT INTO audit (id,actor,action,detail,created_at) VALUES (?,?,?,?,?)")
        .bind(uuid(), user.id, "team-invite-accepted", JSON.stringify({ id: invitation.id }), timestamp),
    ]);
    if (!result[1].meta.changes) throw new AppError("O convite já foi encerrado.", 409);
    return json({ ok: true });
  });
}
