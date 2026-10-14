import { env } from "cloudflare:workers";
import { betterAuth } from "better-auth/minimal";
import { username } from "better-auth/plugins/username";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { isPhoneAccountEmail, isValidPhone, normalizePhone } from "@/lib/identity";

export const db = () => {
  if (!env.DB) throw new Error("Banco indisponível");
  return env.DB;
};

export function runtime(key: string) {
  return (env as unknown as Record<string, string>)[key] || process.env[key] || "";
}

export function transactionalEmailConfigured() {
  return Boolean(
    runtime("EMAIL_WEBHOOK_URL") ||
      (runtime("RESEND_API_KEY") && runtime("AUTH_EMAIL_FROM")),
  );
}

type TransactionalEmail = {
  kind: "password-reset" | "team-invite";
  to: string;
  subject: string;
  text: string;
  url: string;
};

export async function sendTransactionalEmail(message: TransactionalEmail) {
  const webhook = runtime("EMAIL_WEBHOOK_URL");
  if (webhook) {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
    if (!response.ok) throw new Error("Falha no serviço de e-mail");
    return;
  }

  const apiKey = runtime("RESEND_API_KEY");
  const from = runtime("AUTH_EMAIL_FROM");
  if (apiKey && from) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [message.to], subject: message.subject, text: message.text }),
    });
    if (!response.ok) throw new Error("Falha no serviço de e-mail");
    return;
  }

  if (runtime("ALLOW_CONSOLE_EMAIL") !== "true") throw new Error("Provedor de e-mail não configurado");
  console.info(`[${message.kind}] ${message.to}: ${message.url}`);
}

function createAuth(secret: string, baseURL: string) {
  return betterAuth({
    appName: "Galeteria RC",
    baseURL,
    secret,
    database: drizzleAdapter(getDb(), { provider: "sqlite", schema, transaction: false }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await sendTransactionalEmail({
          kind: "password-reset",
          to: user.email,
          subject: "Redefinição de senha — Galeteria RC",
          text: `Use este link para definir uma nova senha: ${url}`,
          url,
        });
      },
    },
    plugins: [
      username({
        minUsernameLength: 10,
        maxUsernameLength: 11,
        usernameValidator: isValidPhone,
        usernameNormalization: normalizePhone,
        displayUsername: false,
      }),
    ],
    session: { expiresIn: 60 * 60 * 24 * 7, cookieCache: { enabled: false } },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 30 },
    advanced: { ipAddress: { ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"] } },
  });
}

let authInstance: ReturnType<typeof createAuth> | undefined;

export function auth() {
  if (authInstance) return authInstance;
  const secret = runtime("BETTER_AUTH_SECRET");
  const baseURL = runtime("BETTER_AUTH_URL");
  if (!secret || !baseURL) throw new Error("Autenticação ainda não configurada.");
  authInstance = createAuth(secret, baseURL);
  return authInstance;
}

export class AppError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function current(request: Request) {
  const session = await auth().api.getSession({ headers: request.headers });
  if (!session) return null;
  const member = await db()
    .prepare("SELECT u.username,m.role,m.active FROM user u LEFT JOIN members m ON m.user_id=u.id WHERE u.id = ?")
    .bind(session.user.id)
    .first<{ username: string | null; role: string | null; active: number | null }>();
  return {
    id: session.user.id,
    name: session.user.name,
    email: isPhoneAccountEmail(session.user.email) ? "" : session.user.email,
    phone: member?.username || "",
    role: member?.active && member.role ? member.role : "customer",
  };
}

export async function requireUser(request: Request, roles?: string[]) {
  const user = await current(request);
  if (!user) throw new AppError("Entre na sua conta para continuar.", 401);
  if (roles && !roles.includes(user.role)) throw new AppError("Você não tem permissão para esta ação.", 403);
  return user;
}

export async function body(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 32768) throw new AppError("Dados muito grandes.", 413);
  const text = await request.text();
  if (text.length > 32768) throw new AppError("Dados muito grandes.", 413);
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError("Dados inválidos.");
  }
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = runtime("BETTER_AUTH_URL");
  if (!origin || origin !== new URL(expected).origin) throw new AppError("Origem da solicitação inválida.", 403);
}

export async function endpoint(request: Request, fn: () => Promise<Response>) {
  try {
    if (request.method !== "GET") sameOrigin(request);
    return await fn();
  } catch (error) {
    if (error instanceof AppError) return json({ error: error.message }, error.status);
    if (error instanceof Error && error.name === "ZodError") return json({ error: "Revise os campos e tente novamente." }, 400);
    const url = new URL(request.url);
    console.error("Falha na operação", {
      method: request.method,
      path: url.pathname,
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "erro",
    });
    return json({ error: "Não foi possível concluir. Tente novamente." }, 500);
  }
}

export const now = () => new Date().toISOString();
export const uuid = () => crypto.randomUUID();

export async function ensureOrderNumbers() {
  await db().batch([
    db().prepare(`
      UPDATE orders AS current
      SET number=(
        SELECT COUNT(*) FROM orders AS ranked
        WHERE ranked.created_at<current.created_at
          OR (ranked.created_at=current.created_at AND ranked.id<=current.id)
      )
      WHERE current.number IS NULL
    `),
    db().prepare(`
      INSERT INTO order_number_sequence (id,next_number)
      SELECT 1,COALESCE(MAX(number),0)+1 FROM orders WHERE true
      ON CONFLICT(id) DO UPDATE SET next_number=MAX(order_number_sequence.next_number,excluded.next_number)
    `),
  ]);
}

export async function allocateOrderNumber() {
  await ensureOrderNumbers();
  const allocated = await db().prepare(`
    UPDATE order_number_sequence SET next_number=next_number+1
    WHERE id=1 AND next_number<=9999
    RETURNING next_number-1 AS number
  `).first<{ number: number }>();
  if (!allocated) throw new AppError("A numeração de pedidos atingiu o limite. Fale com o administrador.", 409);
  return allocated.number;
}

export type Settings = {
  demo: boolean;
  open: boolean;
  pickup: boolean;
  delivery: boolean;
  fee: number;
  areas: string[];
  payments: string[];
  storeName: string;
  address: string;
  contact: string;
  timezone: string;
  start: string;
  end: string;
  days: number[];
  eta: string;
  cancellationPolicy: string;
};

export const defaults: Settings = {
  demo: true,
  open: false,
  pickup: true,
  delivery: false,
  fee: 0,
  areas: [],
  payments: [],
  storeName: "Galeteria RC",
  address: "",
  contact: "",
  timezone: "America/Fortaleza",
  start: "11:00",
  end: "14:00",
  days: [],
  eta: "",
  cancellationPolicy: "",
};

export function normalizeSettings(value: unknown): Settings {
  if (!value || typeof value !== "object") return defaults;
  return { ...defaults, ...(value as Partial<Settings>) };
}

export async function getSettings() {
  const row = await db().prepare("SELECT value,revision FROM settings WHERE id=1").first<{ value: string; revision: number }>();
  let value: unknown = null;
  try {
    value = row ? JSON.parse(row.value) : null;
  } catch {
    value = null;
  }
  return { settings: normalizeSettings(value), revision: row?.revision ?? 0, initialized: !!row };
}

export function accepting(settings: Settings) {
  if (settings.demo || !settings.open || !settings.days.length) return false;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: settings.timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value || "";
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(part("weekday"));
  const time = `${part("hour")}:${part("minute")}`;
  if (settings.start < settings.end) return settings.days.includes(day) && time >= settings.start && time <= settings.end;
  const previousDay = (day + 6) % 7;
  return (settings.days.includes(day) && time >= settings.start) || (settings.days.includes(previousDay) && time <= settings.end);
}

export function testOrdering(settings: Settings, role?: string) {
  return settings.demo && settings.open && (role === "admin" || role === "operator");
}

export function canPlaceOrder(settings: Settings, role?: string) {
  return accepting(settings) || testOrdering(settings, role);
}
