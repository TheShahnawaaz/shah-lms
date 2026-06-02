-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "difficulty" TEXT,
ADD COLUMN     "image" TEXT,
ADD COLUMN     "instructorImage" TEXT,
ADD COLUMN     "instructorName" TEXT,
ADD COLUMN     "isFree" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "timeInMinutes" INTEGER NOT NULL DEFAULT 0;
