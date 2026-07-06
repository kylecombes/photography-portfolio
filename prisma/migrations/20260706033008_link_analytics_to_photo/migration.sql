-- AddForeignKey
ALTER TABLE "ImageView" ADD CONSTRAINT "ImageView_filename_fkey" FOREIGN KEY ("filename") REFERENCES "Photo"("filename") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZoomRegion" ADD CONSTRAINT "ZoomRegion_filename_fkey" FOREIGN KEY ("filename") REFERENCES "Photo"("filename") ON DELETE CASCADE ON UPDATE CASCADE;
