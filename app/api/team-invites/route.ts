import { z } from "zod";
import { AppError, body, db, endpoint, json, now, requireUser, runtime, sendTransactionalEmail, uuid } from "@/lib/server";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

async function tokenHash(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function GET(request: Request) {
  return endpoint(request, async () => {
    await requireUser(request, ["admin"]);
    const invitations = (
      await db()
        .prepare(
          "SELECT id,email,expires_at,accepted_at,revoked_at,created_at FROM team_invites ORDER BY created_at DESC LIMIT 100",
        )
        .all()
    ).results;
    return json({ invitations });
  });
}

export async function POST(request: Request) {
  return endpoint(request, async () => {
    const user = await requireUser(request, ["admin"]);
    const { email } = z.object({ email: z.email() }).parse(await body(request));
    const normalized = normalizeEmail(email);
    if (normalized === normalizeEmail(user.email)) throw new AppError("Sua conta já é administradora.");

    const existing = await db()
      .prepare(
        "SELECT m.role,m.active FROM user u LEFT JOIN members m ON m.user_id=u.id WHERE lower(u.email)=?",
      )
      .bind(normalized)
      .first<{ role: string | null; active: number | null }>();
    if (existing?.role === "admin" || (existing?.role === "operator" && existing.active)) {
      throw new AppError("Essa pessoa já possui acesso à operação.", 409);
    }

    const token = `${uuid()}.${uuid()}`;
    const hash = await tokenHash(token);
    const id = uuid();
    const createdAt = now();
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
    await db().batch([
      db()
        .prepare("UPDATE team_invites SET revoked_at=? WHERE lower(email)=? AND accepted_at IS NULL AND revoked_at IS NULL")
        .bind(createdAt, normalized),
      db()
        .prepare(
          "INSERT INTO team_invites (id,email,token_hash,invited_by,expires_at,created_at) VALUES (?,?,?,?,?,?)",
        )
        .bind(id, normalized, hash, user.id, expiresAt, createdAt),
      db()
        .prepare("INSERT INTO audit (id,actor,action,detail,created_at) VALUES (?,?,?,?,?)")
        .bind(uuid(), user.id, "team-invite-created", JSON.stringify({ id, email: normalized, expiresAt }), createdAt),
    ]);

    const invitationUrl = `${runtime("BETTER_AUTH_URL")}/convite-equipe?token=${encodeURIComponent(token)}`;
    await sendTransactionalEmail({
      kind: "team-invite",
      to: normalized,
      subject: "Convite para a equipe — Galeteria RC",
      text: `Você recebeu acesso à operação da Galeteria RC. Aceite o convite em: ${invitationUrl}`,
      url: invitationUrl,
    });
    return json({ ok: true, id, expiresAt }, 201);
  });
}

export async function DELETE(request: Request) {
  return endpoint(request, async () => {
    const user = await requireUser(request, ["admin"]);
    const { id } = z.object({ id: z.string().min(1) }).parse(await body(request));
    const timestamp = now();
    const result = await db().batch([
      db()
        .prepare("UPDATE team_invites SET revoked_at=? WHERE id=? AND accepted_at IS NULL AND revoked_at IS NULL")
        .bind(timestamp, id),
      db()
        .prepare("INSERT INTO audit (id,actor,action,detail,created_at) VALUES (?,?,?,?,?)")
        .bind(uuid(), user.id, "team-invite-revoked", JSON.stringify({ id }), timestamp),
    ]);
    if (!result[0].meta.changes) throw new AppError("Convite não encontrado ou já encerrado.", 409);
    return json({ ok: true });
  });
}
