/*
  Warnings:

  - You are about to drop the column `modelId` on the `Video` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "_VideoModels" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_VideoModels_A_fkey" FOREIGN KEY ("A") REFERENCES "Model" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_VideoModels_B_fkey" FOREIGN KEY ("B") REFERENCES "Video" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Video" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT,
    "seriesNr" INTEGER,
    "seriesTotal" INTEGER,
    "studio" TEXT
);
INSERT INTO "new_Video" ("id", "seriesNr", "seriesTotal", "studio", "title") SELECT "id", "seriesNr", "seriesTotal", "studio", "title" FROM "Video";
DROP TABLE "Video";
ALTER TABLE "new_Video" RENAME TO "Video";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "_VideoModels_AB_unique" ON "_VideoModels"("A", "B");

-- CreateIndex
CREATE INDEX "_VideoModels_B_index" ON "_VideoModels"("B");
