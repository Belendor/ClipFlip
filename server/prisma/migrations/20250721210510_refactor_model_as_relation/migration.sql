/*
  Warnings:

  - You are about to drop the column `model` on the `Video` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "Model" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "alias" TEXT
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Video" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT,
    "seriesNr" INTEGER,
    "seriesTotal" INTEGER,
    "studio" TEXT,
    "modelId" INTEGER,
    CONSTRAINT "Video_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Video" ("id", "seriesNr", "seriesTotal", "studio", "title") SELECT "id", "seriesNr", "seriesTotal", "studio", "title" FROM "Video";
DROP TABLE "Video";
ALTER TABLE "new_Video" RENAME TO "Video";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Model_name_key" ON "Model"("name");
