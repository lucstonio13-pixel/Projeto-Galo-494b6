import { z } from "zod";
import { db, endpoint, requireUser, body, json, getSettings, uuid, now, AppError, transactionalEmailConfigured, type Settings } from "@/lib/server";
import { settingsSchema } from "@/lib/settings";
import { getCatalog } from "@/lib/catalog-server";
import { evaluateCommercialReadiness } from "@/lib/commercial-readiness";

const imageSchema = z.string().trim().max(500).refine((value) => {
  if (!value) return true;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}, "Use uma URL HTTPS ou um caminho local iniciado por /.");

async function commercialReadiness(settings: Settings) {
  const row = await db()
    .prepare(`
      SELECT COUNT(*) AS count
      FROM products p
      JOIN categories c ON c.id=p.category_id
      WHERE p.available=1 AND c.active=1
    `)
    .first<{ count: number }>();
  return evaluateCommercialReadiness(settings, {
    activeProducts: Number(row?.count || 0),
    emailConfigured: transactionalEmailConfigured(),
  });
}

export async function GET(request: Request) {
  return endpoint(request, async () => {
    const user = await requireUser(request, ["operator", "admin"]);
    const data = await getSettings();
    const catalog = await getCatalog(true);
    const members =
      user.role === "admin"
        ? (await db().prepare("SELECT m.*,u.name,u.email FROM members m JOIN user u ON u.id=m.user_id").all()).results
        : [];
    const readiness = user.role === "admin" ? await commercialReadiness(data.settings) : null;
    return json({ ...data, ...catalog, members, readiness });
  });
}

export async function POST(request: Request) {
  return endpoint(request, async () => {
    const user = await requireUser(request, ["operator", "admin"]);
    const input = await body(request);
    let statement: D1PreparedStatement;

    if (input.action === "availability") {
      const product = z.object({ id: z.string(), available: z.boolean() }).parse(input);
      statement = db().prepare("UPDATE products SET available=? WHERE id=?").bind(product.available ? 1 : 0, product.id);
    } else {
      if (user.role !== "admin") throw new AppError("Somente o administrador pode realizar esta ação.", 403);
      if (input.action === "settings") {
        const settings = settingsSchema.parse(input.settings);
        const revision = z.number().int().parse(input.revision);
        if (!settings.demo && settings.open) {
          const readiness = await commercialReadiness(settings);
          const pending = readiness.checks.filter((check) => !check.ok).map((check) => check.label);
          if (pending.length) {
            throw new AppError(`Antes de receber pedidos reais, conclua: ${pending.join(", ")}.`, 409);
          }
        }
        statement = db()
          .prepare("UPDATE settings SET value=?,revision=revision+1 WHERE id=1 AND revision=?")
          .bind(JSON.stringify(settings), revision);
      } else if (input.action === "category") {
        const category = z.object({
          id: z.string().max(64).default(uuid()),
          name: z.string().trim().min(2).max(80),
          sortOrder: z.number().int().min(0).max(999).default(0),
          active: z.boolean().default(true),
        }).parse(input.category);
        const duplicate = await db().prepare("SELECT id FROM categories WHERE lower(name)=lower(?) AND id<>?").bind(category.name, category.id).first();
        if (duplicate) throw new AppError("Já existe uma categoria com esse nome.", 409);
        statement = db()
          .prepare("INSERT INTO categories (id,name,sort_order,active) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,sort_order=excluded.sort_order,active=excluded.active")
          .bind(category.id, category.name, category.sortOrder, category.active ? 1 : 0);
      } else if (input.action === "product") {
        const product = z.object({
          id: z.string().max(64).default(uuid()),
          name: z.string().trim().min(2).max(100),
          description: z.string().trim().min(2).max(350),
          categoryId: z.string().min(1).max(64),
          price: z.number().int().min(1).max(1000000),
          serves: z.string().trim().max(100),
          available: z.boolean(),
          image: imageSchema,
        }).parse(input.product);
        const category = await db().prepare("SELECT name FROM categories WHERE id=?").bind(product.categoryId).first<{ name: string }>();
        if (!category) throw new AppError("Categoria não encontrada.", 409);
        statement = db()
          .prepare(
            "INSERT INTO products (id,name,description,category,category_id,price,serves,available,image) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,category=excluded.category,category_id=excluded.category_id,price=excluded.price,serves=excluded.serves,available=excluded.available,image=excluded.image",
          )
          .bind(product.id, product.name, product.description, category.name, product.categoryId, product.price, product.serves, product.available ? 1 : 0, product.image);
      } else if (input.action === "option-group") {
        const group = z.object({
          id: z.string().max(64).default(uuid()),
          productId: z.string().min(1).max(64),
          name: z.string().trim().min(2).max(80),
          minSelect: z.number().int().min(0).max(20),
          maxSelect: z.number().int().min(1).max(20),
          sortOrder: z.number().int().min(0).max(999).default(0),
          active: z.boolean().default(true),
        }).refine((value) => value.minSelect <= value.maxSelect, { message: "O mínimo não pode superar o máximo." }).parse(input.group);
        if (!(await db().prepare("SELECT id FROM products WHERE id=?").bind(group.productId).first())) throw new AppError("Produto não encontrado.", 409);
        statement = db()
          .prepare("INSERT INTO option_groups (id,product_id,name,min_select,max_select,sort_order,active) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,min_select=excluded.min_select,max_select=excluded.max_select,sort_order=excluded.sort_order,active=excluded.active")
          .bind(group.id, group.productId, group.name, group.minSelect, group.maxSelect, group.sortOrder, group.active ? 1 : 0);
      } else if (input.action === "option") {
        const option = z.object({
          id: z.string().max(64).default(uuid()),
          groupId: z.string().min(1).max(64),
          name: z.string().trim().min(2).max(80),
          price: z.number().int().min(0).max(1000000),
          sortOrder: z.number().int().min(0).max(999).default(0),
          active: z.boolean().default(true),
        }).parse(input.option);
        if (!(await db().prepare("SELECT id FROM option_groups WHERE id=?").bind(option.groupId).first())) throw new AppError("Grupo de opções não encontrado.", 409);
        statement = db()
          .prepare("INSERT INTO product_options (id,group_id,name,price,sort_order,active) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,price=excluded.price,sort_order=excluded.sort_order,active=excluded.active")
          .bind(option.id, option.groupId, option.name, option.price, option.sortOrder, option.active ? 1 : 0);
      } else if (input.action === "member") {
        const member = z.object({ email: z.email(), active: z.boolean() }).parse(input);
        const person = await db().prepare("SELECT id FROM user WHERE email=?").bind(member.email.toLowerCase()).first<{ id: string }>();
        if (!person) throw new AppError("Envie um convite para essa pessoa antes de liberar o acesso.");
        if (person.id === user.id) throw new AppError("Você não pode alterar seu próprio acesso.");
        const target = await db().prepare("SELECT role FROM members WHERE user_id=?").bind(person.id).first<{ role: string }>();
        if (target?.role === "admin") throw new AppError("A conta administradora não pode ser alterada aqui.");
        statement = db()
          .prepare("INSERT INTO members (user_id,role,active) VALUES (?,'operator',?) ON CONFLICT(user_id) DO UPDATE SET active=excluded.active")
          .bind(person.id, member.active ? 1 : 0);
      } else {
        throw new AppError("Ação inválida.");
      }
    }

    const result = await db().batch([
      statement,
      db().prepare("INSERT INTO audit (id,actor,action,detail,created_at) VALUES (?,?,?,?,?)").bind(uuid(), user.id, input.action, JSON.stringify(input), now()),
    ]);
    if (!result[0].meta.changes) throw new AppError("Os dados mudaram ou não foram encontrados. Recarregue.", 409);
    return json({ ok: true });
  });
}
