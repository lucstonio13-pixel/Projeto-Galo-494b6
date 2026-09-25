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
import { ErrorBox } from "@/components/forms";
import { api, readCart, saveCart, useViewer } from "@/lib/client";
import { money, type CartItem, type Product } from "@/lib/catalog";

export default function Store() {
  const { user } = useViewer();
  const [category, setCategory] = useState("Todos");
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);

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
        ),
      );
    }
    setReady(true);
    api("/api/catalog")
      .then((data) => {
        setProducts(data.products);
        setOpen(data.accepting);
      })
      .catch((cause) => setError(cause.message))
      .finally(() => setLoading(false));
    api("/api/me")
      .then((data) => setInitialized(data.initialized))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (ready) saveCart(cart);
  }, [cart, ready]);

  function add(id: string) {
    const product = products.find((item) => item.id === id);
    if (!product?.available) return;
    setCart((current) =>
      current.some((item) => item.id === id)
        ? current.map((item) =>
            item.id === id
              ? {
                  ...item,
                  quantity: Math.min(20, item.quantity + 1),
                  price: product.price,
                }
              : item,
          )
        : [...current, { id, quantity: 1, note: "", price: product.price }],
    );
    toast.success(product.name + " adicionado ao pedido");
  }

  function decrease(id: string) {
    setCart((current) =>
      current
        .map((item) =>
          item.id === id ? { ...item, quantity: item.quantity - 1 } : item,
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
    () => ["Todos", ...Array.from(new Set(products.map((p) => p.category)))],
    [products],
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
    return !product?.available || product.price !== item.price;
  });

  function refreshCart() {
    setCart((current) =>
      current
        .filter((item) => products.find((product) => product.id === item.id)?.available)
        .map((item) => ({
          ...item,
          price: products.find((product) => product.id === item.id)!.price,
        })),
    );
  }

  return (
    <main className="store-home">
      <header className="rc-header">
        <div className="rc-header-inner">
          <a href="#inicio" className="rc-logo" aria-label="Galeteria RC — início">
            <span className="rc-logo-frame">
              <img src="/logo-galeteria-rc.jpeg" alt="Galeteria RC" />
            </span>
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
                      return (
                        <article className="rc-cart-item" key={item.id}>
                          <div className="rc-cart-item-top">
                            <div>
                              <strong>{product?.name || "Produto removido"}</strong>
                              <p>{money(item.price * item.quantity)}</p>
                            </div>
                            <button
                              onClick={() =>
                                setCart((current) =>
                                  current.filter((entry) => entry.id !== item.id),
                                )
                              }
                              aria-label={`Remover ${product?.name || "produto"}`}
                            >
                              <Trash2 />
                            </button>
                          </div>
                          <div className="rc-cart-quantity">
                            <button onClick={() => decrease(item.id)} aria-label="Diminuir">
                              <Minus />
                            </button>
                            <b>{item.quantity}</b>
                            <button onClick={() => add(item.id)} aria-label="Aumentar">
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
                                    entry.id === item.id
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
              <Flame /> Assado na brasa, todos os dias
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
            <a href="/configurar">primeiro acesso</a> para testar os pedidos.
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
            {visible.map((product, index) => {
              const item = cart.find((entry) => entry.id === product.id);
              return (
                <article className="rc-product-card" key={product.id}>
                  <div className="rc-product-image">
                    <Image
                      src="/galeteria-hero.png"
                      alt=""
                      fill
                      className="object-cover"
                      style={{ objectPosition: index % 2 ? "91% 54%" : "74% 50%" }}
                    />
                    {index < 2 && (
                      <span>{index === 0 ? "Mais pedido" : "Destaque"}</span>
                    )}
                  </div>
                  <div className="rc-product-info">
                    <p>{product.category}</p>
                    <h3>{product.name}</h3>
                    <small>{product.description}</small>
                    <div>
                      <strong>{money(product.price)}</strong>
                      {!product.available ? (
                        <span className="rc-unavailable">Indisponível</span>
                      ) : item ? (
                        <div className="rc-card-quantity">
                          <button onClick={() => decrease(product.id)}>
                            <Minus /><span className="sr-only">Diminuir</span>
                          </button>
                          <b>{item.quantity}</b>
                          <button onClick={() => add(product.id)}>
                            <Plus /><span className="sr-only">Aumentar</span>
                          </button>
                        </div>
                      ) : (
                        <Button onClick={() => add(product.id)}>
                          <Plus /> Adicionar
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
          <span className="rc-footer-logo">
            <img src="/logo-galeteria-rc.jpeg" alt="Galeteria RC" />
          </span>
          <p>Versão de demonstração · Cardápio e valores ilustrativos</p>
        </div>
        <span><MapPin /> Consulte retirada e área de entrega no pedido</span>
        <a href="/operacao">Área da equipe →</a>
      </footer>

      {count > 0 && (
        <button className="rc-mobile-cart" onClick={() => setCartOpen(true)}>
          <span>{count} {count === 1 ? "item" : "itens"}</span>
          <span>Ver carrinho · {money(total)}</span>
        </button>
      )}
    </main>
  );
}
