CREATE TABLE inventory_items (
 id TEXT PRIMARY KEY NOT NULL, request_key TEXT NOT NULL UNIQUE, request_hash TEXT NOT NULL,
 name TEXT NOT NULL, kind TEXT NOT NULL, unit TEXT NOT NULL,
 product_id TEXT UNIQUE REFERENCES products(id), quantity INTEGER NOT NULL DEFAULT 0,
 minimum INTEGER NOT NULL DEFAULT 0, revision INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL,
 CONSTRAINT inventory_quantity_nonnegative CHECK(quantity>=0),
 CONSTRAINT inventory_minimum_nonnegative CHECK(minimum>=0),
 CONSTRAINT inventory_product_unit CHECK(product_id IS NULL OR (kind='product' AND unit='un' AND quantity%1000=0))
);
--> statement-breakpoint
CREATE TABLE inventory_movements (
 id TEXT PRIMARY KEY NOT NULL, request_key TEXT NOT NULL UNIQUE, request_hash TEXT NOT NULL,
 item_id TEXT NOT NULL REFERENCES inventory_items(id), delta INTEGER NOT NULL,
 kind TEXT NOT NULL, reason TEXT NOT NULL, actor TEXT NOT NULL REFERENCES user(id),
 order_id TEXT REFERENCES orders(id), created_at TEXT NOT NULL,
 CONSTRAINT inventory_delta_nonzero CHECK(delta<>0)
);
--> statement-breakpoint
CREATE INDEX inventory_movements_item_date ON inventory_movements(item_id,created_at);
--> statement-breakpoint
CREATE UNIQUE INDEX inventory_order_movement ON inventory_movements(order_id,item_id,kind);
--> statement-breakpoint
CREATE TRIGGER inventory_apply_movement AFTER INSERT ON inventory_movements BEGIN
 UPDATE inventory_items SET quantity=quantity+NEW.delta,revision=revision+1 WHERE id=NEW.item_id;
END;
--> statement-breakpoint
CREATE TRIGGER inventory_order_reserve AFTER INSERT ON orders BEGIN
 INSERT INTO inventory_movements (id,request_key,request_hash,item_id,delta,kind,reason,actor,order_id,created_at)
 SELECT lower(hex(randomblob(16))),'sale:'||NEW.id||':'||inventory_items.id,'automatic',inventory_items.id,
  -SUM(CAST(json_extract(line.value,'$.quantity') AS INTEGER))*1000,'sale','Reserva do pedido',NEW.user_id,NEW.id,NEW.created_at
 FROM json_each(NEW.items) AS line JOIN inventory_items ON inventory_items.product_id=json_extract(line.value,'$.id')
 GROUP BY inventory_items.id;
END;
--> statement-breakpoint
CREATE TRIGGER inventory_order_release AFTER INSERT ON history
 WHEN NEW.status='cancelled' BEGIN
 INSERT INTO inventory_movements (id,request_key,request_hash,item_id,delta,kind,reason,actor,order_id,created_at)
 SELECT lower(hex(randomblob(16))),'cancel:'||NEW.order_id||':'||item_id,'automatic',item_id,-delta,'cancel','Cancelamento do pedido',NEW.actor,NEW.order_id,NEW.created_at
 FROM inventory_movements WHERE order_id=NEW.order_id AND kind='sale';
END;
