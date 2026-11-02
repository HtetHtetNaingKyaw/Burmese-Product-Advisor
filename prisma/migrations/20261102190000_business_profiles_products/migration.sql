-- CreateTable
CREATE TABLE "business_profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "businessType" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "contact" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" TEXT NOT NULL,
    "businessProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "ingredients" TEXT,
    "price" INTEGER,
    "benefits" TEXT,
    "uniqueSellingPoints" TEXT,
    "targetCustomers" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_profile_userId_key" ON "business_profile"("userId");

-- CreateIndex
CREATE INDEX "business_profile_businessName_idx" ON "business_profile"("businessName");

-- CreateIndex
CREATE INDEX "product_businessProfileId_idx" ON "product"("businessProfileId");

-- CreateIndex
CREATE INDEX "product_businessProfileId_category_idx" ON "product"("businessProfileId", "category");

-- CreateIndex
CREATE INDEX "product_name_idx" ON "product"("name");

-- AddForeignKey
ALTER TABLE "business_profile" ADD CONSTRAINT "business_profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "business_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
