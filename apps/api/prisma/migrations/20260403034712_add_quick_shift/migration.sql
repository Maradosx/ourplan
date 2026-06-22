-- CreateTable
CREATE TABLE "QuickShift" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "shiftKey" TEXT NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "blocksAvailability" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuickShift_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuickShift_userId_date_idx" ON "QuickShift"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "QuickShift_userId_date_key" ON "QuickShift"("userId", "date");

-- AddForeignKey
ALTER TABLE "QuickShift" ADD CONSTRAINT "QuickShift_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
