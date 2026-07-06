-- CreateTable
CREATE TABLE "Photo" (
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "takenAt" TIMESTAMP(3),
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exif" JSONB NOT NULL,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("filename")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activeMs" INTEGER NOT NULL DEFAULT 0,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "city" TEXT,
    "region" TEXT,
    "country" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageView" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMs" INTEGER NOT NULL,

    CONSTRAINT "ImageView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZoomRegion" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rx" DOUBLE PRECISION NOT NULL,
    "ry" DOUBLE PRECISION NOT NULL,
    "rw" DOUBLE PRECISION NOT NULL,
    "rh" DOUBLE PRECISION NOT NULL,
    "scale" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ZoomRegion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Photo_takenAt_idx" ON "Photo"("takenAt");

-- CreateIndex
CREATE INDEX "ImageView_filename_idx" ON "ImageView"("filename");

-- CreateIndex
CREATE INDEX "ImageView_sessionId_idx" ON "ImageView"("sessionId");

-- CreateIndex
CREATE INDEX "ZoomRegion_filename_idx" ON "ZoomRegion"("filename");

-- CreateIndex
CREATE INDEX "ZoomRegion_sessionId_idx" ON "ZoomRegion"("sessionId");

-- AddForeignKey
ALTER TABLE "ImageView" ADD CONSTRAINT "ImageView_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZoomRegion" ADD CONSTRAINT "ZoomRegion_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
