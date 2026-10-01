"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Clock,
  Flame,
  LogOut,
  MapPin,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Confirm, ErrorBox } from "@/components/forms";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, readCart, saveCart, useViewer } from "@/lib/client";
import { cartLineId, configuredUnitPrice, money, selectedOptions, selectionError, type CartItem, type CartSelection, type Category, type Product } from "@/lib/catalog";

type PublicSettings = {
  storeName: string;
  contact: string;
  address: string;
  eta: string;
  demo: boolean;
};

export default function Store() {
  const { user } = useViewer();
  const [category, setCategory] = useState("Todos");
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [catalogCategories, setCatalogCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [customizing, setCustomizing] = useState<Product | null>(null);
  const [customSelections, setCustomSelections] = useState<Record<string, string[]>>({});
  const [customError, setCustomError] = useState("");

  useEffect(() => {
    const stored = readCart();
    if (Array.isArray(stored)) {
      setCart(
        stored.filter(
          (item) =>
            typeof item.id === "string" &&
            Number.isInteger(item.quantity) &&
            item.quantity > 0 &&
            item.quantity <= 20,
        ).map((item) => ({ ...item, selections: Array.isArray(item.selections) ? item.selections : [], lineId: item.lineId || cartLineId(item.id, item.selections) })),
      );
    }
    setReady(true);
    api("/api/catalog")
      .then((data) => {
        setProducts(data.products);
        setCatalogCategories(data.categories);
        setOpen(data.accepting);
        setInitialized(Boolean(data.initialized));
        setSettings(data.settings);
      })
      .catch((cause) => setError(cause.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (ready) saveCart(cart);
  }, [cart, ready]);

  function addConfigured(product: Product, selections: CartSelection[]) {
    if (!product.available) return;
    const price = configuredUnitPrice(product, selections);
    if (price === null) return;
    const lineId = cartLineId(product.id, selections);
    setCart((current) =>
      current.some((item) => (item.lineId || cartLineId(item.id, item.selections)) === lineId)
        ? current.map((item) =>
            (item.lineId || cartLineId(item.id, item.selections)) === lineId
              ? {
                  ...item,
                  quantity: Math.min(20, item.quantity + 1),
                  price,
                }
              : item,
          )
        : [...current, { id: product.id, lineId, quantity: 1, note: "", price, selections }],
    );
    toast.success(product.name + " adicionado ao pedido");
  }

  function startAdd(product: Product) {
    const groups = (product.optionGroups || []).filter((group) => group.active);
    if (!groups.length) {
      addConfigured(product, []);
      return;
    }
    setCustomizing(product);
    setCustomSelections(Object.fromEntries(groups.map((group) => [group.id, []])));
    setCustomError("");
  }

  function increase(lineId: string) {
    setCart((current) => current.map((item) => (item.lineId || cartLineId(item.id, item.selections)) === lineId ? { ...item, quantity: Math.min(20, item.quantity + 1) } : item));
  }

  function decrease(lineId: string) {
    setCart((current) =>
      current
        .map((item) =>
          (item.lineId || cartLineId(item.id, item.selections)) === lineId ? { ...item, quantity: item.quantity - 1 } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (tool: unknown, options: unknown) => void;
        };
      }
    ).modelContext;
    if (!context?.registerTool || !products.length) return;
    const lifecycle = new AbortController();
    try {
      context.registerTool(
        {
          name: "consultar_cardapio",
          description:
            "Consulta os produtos e preços visíveis no cardápio da Galeteria RC.",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true, untrustedContentHint: true },
          execute(input: unknown) {
            if (!input || typeof input !== "object" || Object.keys(input).length) {
              throw new Error("Não são aceitos parâmetros.");
            }
            return { products };
          },
        },
        { signal: lifecycle.signal },
      );
    } catch {}
    return () => lifecycle.abort();
  }, [products]);

  const categories = useMemo(
    () => ["Todos", ...catalogCategories.map((entry) => entry.name)],
    [catalogCategories],
  );
  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    return products.filter(
      (product) =>
        (category === "Todos" || product.category === category) &&
        (!term ||
          (product.name + " " + product.description)
            .toLocaleLowerCase("pt-BR")
            .includes(term)),
    );
  }, [category, products, query]);
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0,
  );
  const stale = cart.some((item) => {
    const product = products.find((entry) => entry.id === item.id);
    const price = product ? configuredUnitPrice(product, item.selections || []) : null;
    return !product?.available || price === null || price !== item.price;
  });
  const customizationSelections: CartSelection[] = customizing
    ? (customizing.optionGroups || []).filter((group) => group.active).map((group) => ({ groupId: group.id, optionIds: customSelections[group.id] || [] }))
    : [];
  const customizationPrice = customizing ? configuredUnitPrice(customizing, customizationSelections) : null;

  function refreshCart() {
    setCart((current) =>
      current
        .map((item) => {
          const product = products.find((candidate) => candidate.id === item.id);
          const price = product ? configuredUnitPrice(product, item.selections || []) : null;
          return product?.available && price !== null ? { ...item, price } : null;
        })
        .filter((item): item is CartItem => Boolean(item)),
    );
  }

  function toggleCustomOption(groupId: string, optionId: string, maxSelect: number) {
    setCustomSelections((current) => {
      const values = current[groupId] || [];
      if (values.includes(optionId)) return { ...current, [groupId]: values.filter((id) => id !== optionId) };
      if (maxSelect === 1) return { ...current, [groupId]: [optionId] };
      if (values.length >= maxSelect) {
        setCustomError(`Escolha no máximo ${maxSelect} opção(ões).`);
        return current;
      }
      setCustomError("");
      return { ...current, [groupId]: [...values, optionId] };
    });
  }

  function confirmCustomization() {
    if (!customizing) return;
    const errorMessage = selectionError(customizing, customizationSelections);
    if (errorMessage) {
      setCustomError(errorMessage);
      return;
    }
    addConfigured(customizing, customizationSelections);
    setCustomizing(null);
  }

  return (
    <main className="store-home">
      <header className="rc-header">
        <div className="rc-header-inner">
          <a href="#inicio" className="rc-logo" aria-label="Galeteria RC — início">
            <img className="brand-logo brand-logo-dark rc-logo-image" src="/logo-galeteria-rc.png" alt="Galeteria RC" />
          </a>
          <nav aria-label="Navegação principal">
            <a href="#cardapio">Cardápio</a>
            <a href="#como-pedir">Como pedir</a>
            <a href="/pedidos">Meus pedidos</a>
          </nav>
          <div className="rc-header-actions">
            {user ? (
              <button
                className="rc-account"
                onClick={async () => {
                  await api("/api/auth/sign-out", {});
                  location.href = "/";
                }}
                aria-label="Sair da conta"
              >
                <LogOut />
                <span>Sair</span>
              </button>
            ) : (
              <a className="rc-account" href="/entrar">
                <UserRound />
                <span>Entrar</span>
              </a>
            )}
            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <SheetTrigger asChild>
                <Button className="rc-cart-trigger">
                  <ShoppingBag />
                  Carrinho
                  {count > 0 && <span>{count}</span>}
                </Button>
              </SheetTrigger>
              <SheetContent className="rc-cart-sheet">
                <div className="rc-cart-layout">
                  <SheetHeader className="rc-cart-heading">
                    <SheetTitle>Seu pedido</SheetTitle>
                    <SheetDescription>
                      Revise os itens antes de continuar.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="rc-cart-items">
                    {!count && (
                      <div className="rc-empty-cart">
                        <ShoppingBag />
                        <p>Seu carrinho está vazio</p>
                        <small>Adicione um galeto ou acompanhamento.</small>
                      </div>
                    )}
                    {cart.map((item) => {
                      const product = products.find(
                        (entry) => entry.id === item.id,
                      );
                      const lineId = item.lineId || cartLineId(item.id, item.selections);
                      const options = product ? selectedOptions(product, item.selections || []) : [];
                      return (
                        <article className="rc-cart-item" key={lineId}>
                          <div className="rc-cart-item-top">
                            <div>
                              <strong>{product?.name || "Produto removido"}</strong>
                              {options.length > 0 && <small className="block muted">{options.map((option) => option.name).join(" · ")}</small>}
                              <p>{money(item.price * item.quantity)}</p>
                            </div>
                            <button
                              onClick={() =>
                                setCart((current) =>
                                  current.filter((entry) => (entry.lineId || cartLineId(entry.id, entry.selections)) !== lineId),
                                )
                              }
                              aria-label={`Remover ${product?.name || "produto"}`}
                            >
                              <Trash2 />
                            </button>
                          </div>
                          <div className="rc-cart-quantity">
                            <button onClick={() => decrease(lineId)} aria-label="Diminuir">
                              <Minus />
                            </button>
                            <b>{item.quantity}</b>
                            <button onClick={() => increase(lineId)} aria-label="Aumentar">
                              <Plus />
                            </button>
                          </div>
                          <label className="rc-cart-note">
                            Observação
                            <input
                              value={item.note}
                              maxLength={160}
                              placeholder="Ex.: sem cebola"
                              onChange={(event) =>
                                setCart((current) =>
                                  current.map((entry) =>
                                    (entry.lineId || cartLineId(entry.id, entry.selections)) === lineId
                                      ? { ...entry, note: event.target.value }
                                      : entry,
                                  ),
                                )
                              }
                            />
                          </label>
                        </article>
                      );
                    })}
                  </div>
                  <div className="rc-cart-footer">
                    {stale && (
                      <div className="rc-cart-warning">
                        O cardápio mudou. Atualize os itens antes de continuar.
                        <button onClick={refreshCart}>Atualizar agora</button>
                      </div>
                    )}
                    <div>
                      <span>Subtotal</span>
                      <strong>{money(total)}</strong>
                    </div>
                    <Button
                      disabled={!count || !open || stale}
                      onClick={() => (location.href = "/finalizar")}
                    >
                      Continuar pedido
                    </Button>
                    <p>Pagamento somente na entrega ou retirada</p>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <section id="inicio" className="rc-hero">
        <Image
          src="/galeteria-hero.png"
          alt="Frango dourado e linguiça assados na brasa"
          fill
          priority
          className="rc-hero-image"
        />
        <div className="rc-hero-shade" />
        <div className="rc-hero-inner">
          <div className="rc-hero-copy">
            <div className="rc-hero-pill">
              <Flame /> {settings?.eta || "Assado na brasa"}
            </div>
            <h1>
              O almoço que reúne a <span>família.</span>
            </h1>
            <p>
              Frango dourado, acompanhamentos caprichados e aquele sabor de
              comida feita em casa. Escolha, monte seu pedido e aproveite.
            </p>
            <div className="rc-hero-actions">
              <a href="#cardapio">Ver cardápio</a>
              <span>
                <Clock /> {open ? "Recebendo pedidos agora" : "Pedidos pausados"}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section id="cardapio" className="rc-menu-section">
        <ErrorBox message={error} />
        {!initialized && !loading && (
          <div className="rc-setup-notice">
            A loja está em preparação. O administrador pode concluir o{" "}
            <a href="/configurar">primeiro acesso</a> e registrar as regras reais.
          </div>
        )}
        <div className="rc-menu-heading">
          <div>
            <span>Peça do seu jeito</span>
            <h2>Nosso cardápio</h2>
          </div>
          <label className="rc-search">
            <span className="sr-only">Buscar produto</span>
            <Search />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar produto..."
            />
          </label>
        </div>
        <div className="rc-categories" role="group" aria-label="Categorias">
          {categories.map((entry) => (
            <button
              key={entry}
              className={category === entry ? "active" : ""}
              onClick={() => setCategory(entry)}
            >
              {entry}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="rc-product-grid">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton className="h-96 rounded-3xl bg-white/10" key={index} />
            ))}
          </div>
        ) : (
          <div className="rc-product-grid">
            {visible.map((product) => {
              const productCount = cart.filter((entry) => entry.id === product.id).reduce((sum, entry) => sum + entry.quantity, 0);
              return (
                <article className="rc-product-card" key={product.id}>
                  <div className="rc-product-image">
                    <img
                      src={product.image || "/galeteria-hero.png"}
                      alt={product.name}
                      className="object-cover"
                    />
                  </div>
                  <div className="rc-product-info">
                    <p>{product.category}</p>
                    <h3>{product.name}</h3>
                    <small>{product.description}</small>
                    <div>
                      <strong>{product.optionGroups?.some((group) => group.active && group.options.some((option) => option.active && option.price > 0)) ? "A partir de " : ""}{money(product.price)}</strong>
                      {!product.available ? (
                        <span className="rc-unavailable">Indisponível</span>
                      ) : (
                        <Button onClick={() => startAdd(product)}>
                          <Plus /> {productCount ? `Adicionar mais (${productCount})` : "Adicionar"}
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {!loading && !visible.length && (
          <p className="rc-no-results">Nenhum item encontrado.</p>
        )}
      </section>

      <section id="como-pedir" className="rc-steps">
        <div>
          {[
            ["01", "Escolha seus favoritos", "Adicione os itens ao carrinho."],
            ["02", "Revise seus dados", "Entre na conta e escolha retirada ou entrega."],
            ["03", "Receba quentinho", "Acompanhe o preparo pelo seu pedido."],
          ].map(([number, title, description]) => (
            <article key={number}>
              <span>{number}</span>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer id="contato" className="rc-footer">
        <div>
          <img className="brand-logo brand-logo-dark rc-footer-logo" src="/logo-galeteria-rc.png" alt="Galeteria RC" />
          <p>{settings?.storeName || "Galeteria RC"} · {settings?.contact || "Contato em configuração"}</p>
        </div>
        <span><MapPin /> {settings?.address || "Consulte retirada e área de entrega no pedido"}</span>
        <a href="/operacao">Área da equipe →</a>
      </footer>

      <Dialog open={Boolean(customizing)} onOpenChange={(open) => { if (!open) setCustomizing(null); }}>
        <DialogContent className="scroll-dialog">
          <DialogHeader>
            <DialogTitle>Monte {customizing?.name}</DialogTitle>
            <DialogDescription>Escolha os adicionais antes de colocar o item no carrinho.</DialogDescription>
          </DialogHeader>
          {customizing && <div className="form-stack">
            {(customizing.optionGroups || []).filter((group) => group.active).map((group) => <section className="notice" key={group.id}>
              <div className="split"><strong>{group.name}</strong><small>{group.minSelect === 0 ? "Opcional" : `Escolha pelo menos ${group.minSelect}`} · máximo {group.maxSelect}</small></div>
              <div className="form-stack">{group.options.filter((option) => option.active).map((option) => <Confirm key={option.id} checked={(customSelections[group.id] || []).includes(option.id)} onChange={() => toggleCustomOption(group.id, option.id, group.maxSelect)}>
                <span className="split"><span>{option.name}</span><strong>{option.price ? `+${money(option.price)}` : "Incluído"}</strong></span>
              </Confirm>)}</div>
            </section>)}
            <ErrorBox message={customError} />
            <div className="summary-row total"><strong>Valor do item</strong><strong>{money(customizationPrice ?? customizing.price)}</strong></div>
            <button className="primary" onClick={confirmCustomization}>Adicionar ao carrinho</button>
          </div>}
        </DialogContent>
      </Dialog>

      {count > 0 && (
        <button className="rc-mobile-cart" onClick={() => setCartOpen(true)}>
          <span>{count} {count === 1 ? "item" : "itens"}</span>
          <span>Ver carrinho · {money(total)}</span>
        </button>
      )}
    </main>
  );
}
