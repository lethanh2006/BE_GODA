-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "QuestionType" ADD VALUE 'LISTEN_TASK';
ALTER TYPE "QuestionType" ADD VALUE 'LISTEN_POINT';
ALTER TYPE "QuestionType" ADD VALUE 'LISTEN_SUMMARY';
ALTER TYPE "QuestionType" ADD VALUE 'LISTEN_UTTERANCE';
ALTER TYPE "QuestionType" ADD VALUE 'LISTEN_RESPONSE';
ALTER TYPE "QuestionType" ADD VALUE 'LISTEN_INTEGRATED';
