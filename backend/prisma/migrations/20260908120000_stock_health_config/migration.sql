-- CreateTable
CREATE TABLE "StockHealthConfig" (
    "id" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "totalWork" DOUBLE PRECISION NOT NULL,
    "seasonLabel" TEXT,
    "setBy" TEXT,
    "setAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockHealthConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StockHealthConfig_plantId_key" ON "StockHealthConfig"("plantId");
CREATE INDEX "StockHealthConfig_plantId_idx" ON "StockHealthConfig"("plantId");

-- AddForeignKey
ALTER TABLE "StockHealthConfig" ADD CONSTRAINT "StockHealthConfig_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
