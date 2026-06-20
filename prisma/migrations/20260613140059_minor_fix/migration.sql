/*
  Warnings:

  - You are about to drop the column `addtionalNotes` on the `FollowUp` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FollowUp" DROP COLUMN "addtionalNotes",
ADD COLUMN     "additionalNotes" TEXT;
