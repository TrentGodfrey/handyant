CREATE TYPE "payment_checkout_status" AS ENUM ('pending', 'paid', 'failed', 'cancelled');
CREATE TYPE "payment_checkout_kind" AS ENUM ('membership', 'invoice');

CREATE TABLE "home_invitations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "home_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "accepted_at" TIMESTAMPTZ(6),
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "home_invitations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_checkouts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "home_id" UUID,
    "invoice_id" UUID,
    "kind" "payment_checkout_kind" NOT NULL DEFAULT 'membership',
    "plan" "subscription_plan",
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "payment_checkout_status" NOT NULL DEFAULT 'pending',
    "idempotency_key" TEXT NOT NULL,
    "square_payment_link_id" TEXT,
    "square_order_id" TEXT,
    "square_payment_id" TEXT,
    "paid_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_checkouts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "square_webhook_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload_hash" TEXT NOT NULL,
    "processed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "square_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "home_invitations_token_hash_key" ON "home_invitations"("token_hash");
CREATE INDEX "idx_home_invitations_home_status" ON "home_invitations"("home_id", "accepted_at", "expires_at");
CREATE INDEX "idx_home_invitations_email_status" ON "home_invitations"("email", "accepted_at");

CREATE UNIQUE INDEX "payment_checkouts_idempotency_key_key" ON "payment_checkouts"("idempotency_key");
CREATE UNIQUE INDEX "payment_checkouts_square_payment_link_id_key" ON "payment_checkouts"("square_payment_link_id");
CREATE UNIQUE INDEX "payment_checkouts_square_order_id_key" ON "payment_checkouts"("square_order_id");
CREATE UNIQUE INDEX "payment_checkouts_square_payment_id_key" ON "payment_checkouts"("square_payment_id");
CREATE INDEX "idx_payment_checkouts_customer_created" ON "payment_checkouts"("customer_id", "created_at");
CREATE INDEX "idx_payment_checkouts_home_status" ON "payment_checkouts"("home_id", "status");
CREATE INDEX "idx_payment_checkouts_invoice_status" ON "payment_checkouts"("invoice_id", "status");

CREATE UNIQUE INDEX "square_webhook_events_event_id_key" ON "square_webhook_events"("event_id");

ALTER TABLE "home_invitations"
  ADD CONSTRAINT "home_invitations_home_id_fkey"
  FOREIGN KEY ("home_id") REFERENCES "homes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "home_invitations"
  ADD CONSTRAINT "home_invitations_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "payment_checkouts"
  ADD CONSTRAINT "payment_checkouts_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "payment_checkouts"
  ADD CONSTRAINT "payment_checkouts_home_id_fkey"
  FOREIGN KEY ("home_id") REFERENCES "homes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "payment_checkouts"
  ADD CONSTRAINT "payment_checkouts_invoice_id_fkey"
  FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
