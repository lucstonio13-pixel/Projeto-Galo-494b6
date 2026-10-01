import { endpoint, getSettings, accepting, json } from "@/lib/server";
import { getCatalog } from "@/lib/catalog-server";

export async function GET(request: Request) {
  return endpoint(request, async () => {
    const { settings, initialized } = await getSettings();
    const catalog = initialized ? await getCatalog(false) : { products: [], categories: [] };
    return json({ ...catalog, settings, initialized, accepting: initialized && accepting(settings) });
  });
}
