ALTER TABLE checkout_orders ADD COLUMN whatsapp_sent INTEGER NOT NULL DEFAULT 1
  CHECK (whatsapp_sent IN (0,1));
