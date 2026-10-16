const netlify = process.env.NETLIFY === "true" || Boolean(process.env.NETLIFY_DB_URL);
let values: Cloudflare.Env;

if (netlify) {
  const { getNetlifyD1 } = await import("@/db/netlify-d1");
  values = new Proxy(process.env as Record<string, string | undefined>, {
    get(target, property) {
      if (property === "DB") return getNetlifyD1();
      return typeof property === "string" ? target[property] : undefined;
    },
  }) as unknown as Cloudflare.Env;
} else {
  const cloudflareWorkers = "cloudflare:workers";
  const workersModule = await import(/* @vite-ignore */ cloudflareWorkers);
  values = workersModule.env;
}

export const platformEnv = values;
