-- AlterTable
ALTER TABLE "invitations" ADD COLUMN     "first_name" TEXT,
ADD COLUMN     "language" TEXT DEFAULT 'en',
ADD COLUMN     "last_name" TEXT,
ADD COLUMN     "timezone" TEXT DEFAULT 'UTC';
