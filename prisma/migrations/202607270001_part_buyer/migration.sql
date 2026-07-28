-- Track who buys each booking part (tech vs customer), mirroring
-- home_todos.parts_buyer.
ALTER TABLE "parts" ADD COLUMN "buyer" TEXT;
