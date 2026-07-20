-- CreateTable
CREATE TABLE "NewVideo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT,
    "seriesNr" INTEGER,
    "seriesTotal" INTEGER,
    "studio" TEXT,
    "startTime" REAL NOT NULL,
    "endTime" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "_NewVideoTags" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_NewVideoTags_A_fkey" FOREIGN KEY ("A") REFERENCES "NewVideo" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_NewVideoTags_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_NewVideoModels" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_NewVideoModels_A_fkey" FOREIGN KEY ("A") REFERENCES "Model" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_NewVideoModels_B_fkey" FOREIGN KEY ("B") REFERENCES "NewVideo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_NewVideoTags_AB_unique" ON "_NewVideoTags"("A", "B");

-- CreateIndex
CREATE INDEX "_NewVideoTags_B_index" ON "_NewVideoTags"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_NewVideoModels_AB_unique" ON "_NewVideoModels"("A", "B");

-- CreateIndex
CREATE INDEX "_NewVideoModels_B_index" ON "_NewVideoModels"("B");
