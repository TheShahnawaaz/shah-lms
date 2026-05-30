-- AlterTable
ALTER TABLE "User" DROP COLUMN "passwordHash",
ADD COLUMN     "profilePictureUrl" TEXT;
