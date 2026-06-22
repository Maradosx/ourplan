-- DropIndex
DROP INDEX IF EXISTS "QuickShift_userId_date_key";

-- CreateIndex
CREATE UNIQUE INDEX "QuickShift_userId_date_shiftKey_key" ON "QuickShift"("userId", "date", "shiftKey");
