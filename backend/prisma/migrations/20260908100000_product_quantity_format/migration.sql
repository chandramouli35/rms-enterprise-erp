-- CreateTable
CREATE TABLE "QuantityUnit" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuantityUnit_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "quantityFormat" TEXT NOT NULL DEFAULT 'QTL';
ALTER TABLE "Product" ALTER COLUMN "type" SET DEFAULT 'GENERAL';

-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN "productId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "QuantityUnit_code_key" ON "QuantityUnit"("code");
CREATE INDEX "Inventory_productId_idx" ON "Inventory"("productId");

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default quantity units
INSERT INTO "QuantityUnit" ("id", "code", "label", "description", "isSystem", "createdAt", "updatedAt") VALUES
  ('qty-unit-nos', 'NOS', 'Nos', 'Number', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('qty-unit-bags', 'BAGS', 'Bags', 'Bags', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('qty-unit-kg', 'KG', 'Kg', 'Kilogram', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('qty-unit-qtl', 'QTL', 'Qtl', 'Quintal', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('qty-unit-ltr', 'LTR', 'Ltr', 'Liter', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
