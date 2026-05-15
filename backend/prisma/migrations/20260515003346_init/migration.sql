-- CreateTable
CREATE TABLE "reports" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "generated_by" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catagories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catagories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ProductTocatagories" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ProductTocatagories_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "catagories_name_key" ON "catagories"("name");

-- CreateIndex
CREATE INDEX "_ProductTocatagories_B_index" ON "_ProductTocatagories"("B");

-- AddForeignKey
ALTER TABLE "_ProductTocatagories" ADD CONSTRAINT "_ProductTocatagories_A_fkey" FOREIGN KEY ("A") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductTocatagories" ADD CONSTRAINT "_ProductTocatagories_B_fkey" FOREIGN KEY ("B") REFERENCES "catagories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
