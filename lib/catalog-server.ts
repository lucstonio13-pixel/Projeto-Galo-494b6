import { db } from "@/lib/server";
import type { Category, OptionGroup, Product, ProductOption } from "@/lib/catalog";

type CategoryRow = { id: string; name: string; sort_order: number; active: number };
type ProductRow = {
  id: string;
  name: string;
  description: string;
  category: string;
  category_id: string | null;
  price: number;
  serves: string;
  available: number;
  image: string;
  stock_quantity: number | null;
};
type GroupRow = {
  id: string;
  product_id: string;
  name: string;
  min_select: number;
  max_select: number;
  sort_order: number;
  active: number;
};
type OptionRow = {
  id: string;
  group_id: string;
  name: string;
  price: number;
  sort_order: number;
  active: number;
};

export async function getCatalog(includeInactiveCategories = false) {
  const [categoryResult, productResult, groupResult, optionResult] = await Promise.all([
    db().prepare("SELECT * FROM categories ORDER BY sort_order,name").all<CategoryRow>(),
    db().prepare("SELECT products.*,inventory_items.quantity AS stock_quantity FROM products LEFT JOIN inventory_items ON inventory_items.product_id=products.id ORDER BY products.name,products.id").all<ProductRow>(),
    db().prepare("SELECT * FROM option_groups ORDER BY product_id,sort_order,id").all<GroupRow>(),
    db().prepare("SELECT * FROM product_options ORDER BY group_id,sort_order,id").all<OptionRow>(),
  ]);

  const categories: Category[] = categoryResult.results.map((row) => ({
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    active: row.active,
  }));
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const options: ProductOption[] = optionResult.results.map((row) => ({
    id: row.id,
    groupId: row.group_id,
    name: row.name,
    price: row.price,
    sortOrder: row.sort_order,
    active: row.active,
  }));
  const optionsByGroup = new Map<string, ProductOption[]>();
  for (const option of options) {
    const entries = optionsByGroup.get(option.groupId) || [];
    entries.push(option);
    optionsByGroup.set(option.groupId, entries);
  }
  const optionGroups: OptionGroup[] = groupResult.results.map((row) => ({
    id: row.id,
    productId: row.product_id,
    name: row.name,
    minSelect: row.min_select,
    maxSelect: row.max_select,
    sortOrder: row.sort_order,
    active: row.active,
    options: optionsByGroup.get(row.id) || [],
  }));
  const groupsByProduct = new Map<string, OptionGroup[]>();
  for (const group of optionGroups) {
    const entries = groupsByProduct.get(group.productId) || [];
    entries.push(group);
    groupsByProduct.set(group.productId, entries);
  }
  const products: Product[] = productResult.results
    .map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      category: categoryById.get(row.category_id || "")?.name || row.category,
      categoryId: row.category_id,
      price: row.price,
      serves: row.serves,
      available: row.available && (row.stock_quantity === null || row.stock_quantity > 0) ? 1 : 0,
      image: row.image,
      optionGroups: groupsByProduct.get(row.id) || [],
    }))
    .filter((product) => includeInactiveCategories || Boolean(product.categoryId && categoryById.get(product.categoryId)?.active));

  return {
    categories: includeInactiveCategories ? categories : categories.filter((category) => category.active),
    products,
  };
}
