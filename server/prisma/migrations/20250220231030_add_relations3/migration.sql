/*
  Warnings:

  - You are about to drop the `_VideoTags` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `tagId` to the `Video` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "_VideoTags_B_index";

-- DropIndex
DROP INDEX "_VideoTags_AB_unique";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_VideoTags";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Video" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT,
    "tagId" INTEGER NOT NULL,
    CONSTRAINT "Video_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Video" ("id", "title") SELECT "id", "title" FROM "Video";
DROP TABLE "Video";
ALTER TABLE "new_Video" RENAME TO "Video";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
