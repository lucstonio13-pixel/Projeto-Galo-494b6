import { endpoint, getSettings, accepting, canPlaceOrder, current, json, testOrdering } from "@/lib/server";
import { getCatalog } from "@/lib/catalog-server";

export async function GET(request: Request) {
  return endpoint(request, async () => {
    const { settings, initialized } = await getSettings();
    const [catalog, viewer] = initialized
      ? await Promise.all([
          getCatalog(false),
          request.headers.has("cookie") ? current(request) : Promise.resolve(null),
        ])
      : [{ products: [], categories: [] }, null];
    const testMode = initialized && testOrdering(settings, viewer?.role);
    const realOrders = initialized && accepting(settings);
    return json({
      ...catalog,
      settings,
      initialized,
      accepting: initialized && canPlaceOrder(settings, viewer?.role),
      orderingMode: testMode ? "test" : realOrders ? "real" : "paused",
    });
  });
}
