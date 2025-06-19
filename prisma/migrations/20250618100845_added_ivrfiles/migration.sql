-- CreateTable
CREATE TABLE "IvrFiles" (
    "id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,

    CONSTRAINT "IvrFiles_pkey" PRIMARY KEY ("id")
);
