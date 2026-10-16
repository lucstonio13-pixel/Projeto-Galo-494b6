CREATE TABLE "user" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  email_verified INTEGER NOT NULL DEFAULT 0,
  username TEXT UNIQUE,
  display_username TEXT,
  image TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE session (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  ip_address TEXT,
  user_agent TEXT
);
CREATE INDEX session_user ON session(user_id);

CREATE TABLE account (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  id_token TEXT,
  access_token_expires_at BIGINT,
  refresh_token_expires_at BIGINT,
  scope TEXT,
  password TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  UNIQUE(provider_id, account_id)
);
CREATE INDEX account_user ON account(user_id);

CREATE TABLE verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX verification_identifier ON verification(identifier);

CREATE TABLE rate_limit (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  count INTEGER NOT NULL,
  last_request BIGINT NOT NULL
);

CREATE TABLE members (
  user_id TEXT PRIMARY KEY REFERENCES "user"(id),
  role TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE team_invites (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  invited_by TEXT NOT NULL REFERENCES "user"(id),
  expires_at TEXT NOT NULL,
  accepted_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX team_invites_email ON team_invites(email);
CREATE INDEX team_invites_active ON team_invites(expires_at, accepted_at, revoked_at);

CREATE TABLE settings (
  id INTEGER PRIMARY KEY,
  value TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX categories_sort ON categories(sort_order, name);

CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  category_id TEXT REFERENCES categories(id),
  price INTEGER NOT NULL,
  serves TEXT NOT NULL,
  available INTEGER NOT NULL DEFAULT 1,
  image TEXT NOT NULL DEFAULT ''
);
CREATE INDEX products_category ON products(category_id);

CREATE TABLE option_groups (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  min_select INTEGER NOT NULL DEFAULT 0,
  max_select INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX option_groups_product ON option_groups(product_id, sort_order);

CREATE TABLE product_options (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES option_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX product_options_group ON product_options(group_id, sort_order);

CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  number INTEGER UNIQUE,
  user_id TEXT NOT NULL REFERENCES "user"(id),
  request_key TEXT NOT NULL,
  request_hash TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL,
  mode TEXT NOT NULL,
  address TEXT NOT NULL,
  area TEXT NOT NULL DEFAULT '',
  payment TEXT NOT NULL,
  items TEXT NOT NULL,
  subtotal INTEGER NOT NULL,
  fee INTEGER NOT NULL,
  total INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'received',
  paid INTEGER NOT NULL DEFAULT 0,
  received_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  mutation TEXT,
  note TEXT NOT NULL DEFAULT '',
  legal_version TEXT NOT NULL DEFAULT '',
  legal_accepted_at TEXT,
  UNIQUE(user_id, request_key)
);
CREATE INDEX orders_customer_date ON orders(user_id, created_at);
CREATE INDEX orders_status_date ON orders(status, created_at);

CREATE TABLE order_number_sequence (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  next_number INTEGER NOT NULL CHECK(next_number >= 1 AND next_number <= 10000)
);

CREATE TABLE history (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  status TEXT NOT NULL,
  actor TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX history_order ON history(order_id);

CREATE TABLE receipts (
  id TEXT PRIMARY KEY,
  request_key TEXT NOT NULL UNIQUE,
  order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
  amount INTEGER NOT NULL,
  payment TEXT NOT NULL,
  received_at TEXT NOT NULL,
  reported_by TEXT NOT NULL REFERENCES "user"(id),
  created_at TEXT NOT NULL
);
CREATE INDEX receipts_received_at ON receipts(received_at);

CREATE TABLE financial_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX financial_categories_type ON financial_categories(type, active);
INSERT INTO financial_categories (id, name, type, active) VALUES
  ('sales', 'Vendas', 'income', 1),
  ('other-income', 'Outras entradas', 'income', 1),
  ('ingredients', 'Ingredientes', 'expense', 1),
  ('packaging', 'Embalagens', 'expense', 1),
  ('suppliers', 'Fornecedores', 'expense', 1),
  ('deliveries', 'Entregas', 'expense', 1),
  ('fixed-expenses', 'Despesas fixas', 'expense', 1),
  ('fees', 'Taxas', 'expense', 1),
  ('refunds', 'Reembolsos', 'expense', 1),
  ('other-expense', 'Outras saídas', 'expense', 1);

CREATE TABLE ledger (
  id TEXT PRIMARY KEY,
  request_key TEXT NOT NULL UNIQUE,
  request_hash TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  date TEXT NOT NULL,
  payment TEXT NOT NULL,
  order_id TEXT REFERENCES orders(id),
  receipt_id TEXT UNIQUE REFERENCES receipts(id),
  refund_of TEXT,
  correction_of TEXT UNIQUE,
  reversed INTEGER NOT NULL DEFAULT 0,
  actor TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  confirmed_at TEXT NOT NULL
);
CREATE INDEX ledger_date ON ledger(date);
CREATE INDEX ledger_refund ON ledger(refund_of);
CREATE UNIQUE INDEX ledger_sale ON ledger(order_id)
  WHERE type = 'income' AND reversed = 0 AND correction_of IS NULL;

CREATE TABLE audit (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE inventory_items (
  id TEXT PRIMARY KEY,
  request_key TEXT NOT NULL UNIQUE,
  request_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  unit TEXT NOT NULL,
  product_id TEXT UNIQUE REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 0 CHECK(quantity >= 0),
  minimum INTEGER NOT NULL DEFAULT 0 CHECK(minimum >= 0),
  revision INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  CHECK(product_id IS NULL OR (kind = 'product' AND unit = 'un' AND quantity % 1000 = 0))
);

CREATE TABLE inventory_movements (
  id TEXT PRIMARY KEY,
  request_key TEXT NOT NULL UNIQUE,
  request_hash TEXT NOT NULL,
  item_id TEXT NOT NULL REFERENCES inventory_items(id),
  delta INTEGER NOT NULL CHECK(delta <> 0),
  kind TEXT NOT NULL,
  reason TEXT NOT NULL,
  actor TEXT NOT NULL REFERENCES "user"(id),
  order_id TEXT REFERENCES orders(id),
  created_at TEXT NOT NULL
);
CREATE INDEX inventory_movements_item_date ON inventory_movements(item_id, created_at);
CREATE UNIQUE INDEX inventory_order_movement ON inventory_movements(order_id, item_id, kind);

CREATE FUNCTION inventory_apply_movement() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE inventory_items SET quantity = quantity + NEW.delta, revision = revision + 1 WHERE id = NEW.item_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER inventory_apply_movement AFTER INSERT ON inventory_movements
  FOR EACH ROW EXECUTE FUNCTION inventory_apply_movement();

CREATE FUNCTION inventory_order_reserve() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO inventory_movements (id, request_key, request_hash, item_id, delta, kind, reason, actor, order_id, created_at)
  SELECT gen_random_uuid()::text, 'sale:' || NEW.id || ':' || inventory_items.id, 'automatic', inventory_items.id,
    -SUM((line.value->>'quantity')::integer) * 1000, 'sale', 'Reserva do pedido', NEW.user_id, NEW.id, NEW.created_at
  FROM jsonb_array_elements(NEW.items::jsonb) AS line(value)
  JOIN inventory_items ON inventory_items.product_id = line.value->>'id'
  GROUP BY inventory_items.id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER inventory_order_reserve AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION inventory_order_reserve();

CREATE FUNCTION inventory_order_release() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'cancelled' THEN
    INSERT INTO inventory_movements (id, request_key, request_hash, item_id, delta, kind, reason, actor, order_id, created_at)
    SELECT gen_random_uuid()::text, 'cancel:' || NEW.order_id || ':' || item_id, 'automatic', item_id, -delta,
      'cancel', 'Cancelamento do pedido', NEW.actor, NEW.order_id, NEW.created_at
    FROM inventory_movements WHERE order_id = NEW.order_id AND kind = 'sale';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER inventory_order_release AFTER INSERT ON history
  FOR EACH ROW EXECUTE FUNCTION inventory_order_release();
