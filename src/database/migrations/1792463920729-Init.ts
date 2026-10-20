import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1792463920729 implements MigrationInterface {
  name = 'Init1792463920729';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."jlpt_level" AS ENUM('N5', 'N4', 'N3', 'N2', 'N1')`);
    await queryRunner.query(`CREATE TYPE "public"."question_type" AS ENUM('KANJI_READING', 'ORTHOGRAPHY', 'WORD_FORMATION', 'CONTEXT', 'PARAPHRASE', 'USAGE', 'GRAMMAR_FORM', 'SENTENCE_ORDER', 'TEXT_GRAMMAR', 'READING_SHORT', 'READING_MEDIUM', 'READING_LONG', 'READING_INTEGRATED', 'READING_THEMATIC', 'INFO_RETRIEVAL', 'LISTEN_TASK', 'LISTEN_POINT', 'LISTEN_SUMMARY', 'LISTEN_UTTERANCE', 'LISTEN_RESPONSE', 'LISTEN_INTEGRATED')`);
    await queryRunner.query(`CREATE TYPE "public"."user_role" AS ENUM('USER', 'ADMIN')`);
    await queryRunner.query(`CREATE TYPE "public"."attempt_mode" AS ENUM('EXAM', 'PRACTICE')`);
    await queryRunner.query(`CREATE TYPE "public"."attempt_status" AS ENUM('IN_PROGRESS', 'SUBMITTED')`);
    await queryRunner.query(`CREATE TYPE "public"."report_status" AS ENUM('OPEN', 'RESOLVED', 'REJECTED')`);
    await queryRunner.query(`CREATE TABLE "exams" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "slug" text NOT NULL, "level" "public"."jlpt_level" NOT NULL, "number" integer NOT NULL, "title" text NOT NULL, "description" text, "source" text NOT NULL, "published" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_330b2ade3f46695421ec8435324" UNIQUE ("slug"), CONSTRAINT "UQ_d747ff4d7fffb1e32d1a98a035a" UNIQUE ("level", "number"), CONSTRAINT "PK_b43159ee3efa440952794b4f53e" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "passages" ("id" text NOT NULL, "level" "public"."jlpt_level" NOT NULL, "title" text, "content" text NOT NULL, "source" text NOT NULL, CONSTRAINT "PK_5f625d72252d22b1826b4ac79cf" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "questions" ("id" text NOT NULL, "level" "public"."jlpt_level" NOT NULL, "type" "public"."question_type" NOT NULL, "prompt" text NOT NULL, "options" text array NOT NULL, "answer_index" integer NOT NULL, "explanation" text, "passage_id" text, "passage_order" integer NOT NULL DEFAULT '0', "source" text NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_08a6d4b0f49ff300bf3a0ca60ac" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_71de478c6bb3635a98680f6803" ON "questions"  ("passage_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_dbd994bdd4c2cf47e77587ab87" ON "questions"  ("level", "type", "is_active") `);
    await queryRunner.query(`CREATE TABLE "exam_questions" ("section_id" uuid NOT NULL, "question_id" text NOT NULL, "order" integer NOT NULL, "mondai" integer NOT NULL, CONSTRAINT "PK_b4e323c5b69342be689ac08ab9e" PRIMARY KEY ("section_id", "question_id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_91850a8cd0b4d40440a323aa20" ON "exam_questions"  ("section_id", "order") `);
    await queryRunner.query(`CREATE TABLE "exam_sections" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "exam_id" uuid NOT NULL, "order" integer NOT NULL, "title" text NOT NULL, "title_vi" text NOT NULL, "duration_minutes" integer NOT NULL, CONSTRAINT "UQ_896b8818de76f61f4e00cdf7018" UNIQUE ("exam_id", "order"), CONSTRAINT "PK_f0c07e5c86efbe4dee8bc3f6f2a" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "email" text NOT NULL, "password_hash" text NOT NULL, "display_name" text NOT NULL, "role" "public"."user_role" NOT NULL DEFAULT 'USER', "target_level" "public"."jlpt_level", "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "attempts" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid, "mode" "public"."attempt_mode" NOT NULL, "status" "public"."attempt_status" NOT NULL DEFAULT 'IN_PROGRESS', "level" "public"."jlpt_level" NOT NULL, "title" text NOT NULL, "exam_id" uuid, "section_id" uuid, "question_type" "public"."question_type", "question_ids" text array NOT NULL, "layout" jsonb NOT NULL, "instant_feedback" boolean NOT NULL DEFAULT false, "time_limit_seconds" integer, "started_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "submitted_at" TIMESTAMP WITH TIME ZONE, "time_spent_seconds" integer, "total_count" integer NOT NULL, "correct_count" integer, "score_percent" double precision, CONSTRAINT "PK_295ca261e361fd2fd217754dcac" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_d167176b022a0f255e652f07f4" ON "attempts"  ("exam_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_6363f6c241ab1f870bccb817c0" ON "attempts"  ("user_id", "status", "submitted_at") `);
    await queryRunner.query(`CREATE TABLE "attempt_answers" ("attempt_id" uuid NOT NULL, "question_id" text NOT NULL, "selected_index" integer, "is_correct" boolean, "flagged" boolean NOT NULL DEFAULT false, "revealed" boolean NOT NULL DEFAULT false, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_481462ba60b9c3d57495c0ff96e" PRIMARY KEY ("attempt_id", "question_id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_fff29b83c9965e08837b508f0c" ON "attempt_answers"  ("question_id") `);
    await queryRunner.query(`CREATE TABLE "bookmarks" ("user_id" uuid NOT NULL, "question_id" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_7a878965cf74acefbaf652c7e1d" PRIMARY KEY ("user_id", "question_id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_e95a7b766adf15adf40ab140b9" ON "bookmarks"  ("user_id", "created_at") `);
    await queryRunner.query(`CREATE TABLE "question_reports" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "question_id" text NOT NULL, "user_id" uuid, "reason" text NOT NULL, "message" text, "status" "public"."report_status" NOT NULL DEFAULT 'OPEN', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c7faf6d4edfc5ca11ea16c67f3f" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_986c804710ea4ee0b1e679f11e" ON "question_reports"  ("question_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_912b136e8dc5fc0e97c90861d3" ON "question_reports"  ("status", "created_at") `);
    await queryRunner.query(`CREATE TABLE "user_question_stats" ("user_id" uuid NOT NULL, "question_id" text NOT NULL, "seen_count" integer NOT NULL DEFAULT '0', "correct_count" integer NOT NULL DEFAULT '0', "last_correct" boolean NOT NULL, "last_answered_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_e1c7a68ea5a34efdcd2362dcaa7" PRIMARY KEY ("user_id", "question_id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_c4f33cab82043030c32359e91d" ON "user_question_stats"  ("user_id", "last_correct") `);
    await queryRunner.query(`ALTER TABLE "questions" ADD CONSTRAINT "FK_71de478c6bb3635a98680f68037" FOREIGN KEY ("passage_id") REFERENCES "passages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "exam_questions" ADD CONSTRAINT "FK_d1372885951280081e6359b5ee5" FOREIGN KEY ("section_id") REFERENCES "exam_sections"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "exam_questions" ADD CONSTRAINT "FK_7c1bce580fc4692acc719e76db8" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "exam_sections" ADD CONSTRAINT "FK_dc264c5c55dc1c015bfdac3b428" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "attempts" ADD CONSTRAINT "FK_1f23e642cf6e009c61cc2c214e2" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "attempts" ADD CONSTRAINT "FK_d167176b022a0f255e652f07f48" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "attempts" ADD CONSTRAINT "FK_f83f4a76e58b07503de7ed951d5" FOREIGN KEY ("section_id") REFERENCES "exam_sections"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "attempt_answers" ADD CONSTRAINT "FK_32015c863766540050618a1165c" FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "attempt_answers" ADD CONSTRAINT "FK_fff29b83c9965e08837b508f0cd" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "bookmarks" ADD CONSTRAINT "FK_58a0fbaee65cd8959a870ee678c" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "bookmarks" ADD CONSTRAINT "FK_a32547d59bd71137772d2c6d052" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "question_reports" ADD CONSTRAINT "FK_986c804710ea4ee0b1e679f11ec" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "question_reports" ADD CONSTRAINT "FK_e4c946d366c43281b78f0701610" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "user_question_stats" ADD CONSTRAINT "FK_dc74302139baebd0bdcf51bf9a5" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "user_question_stats" ADD CONSTRAINT "FK_a2caacbef69864533632dce3c5f" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_question_stats" DROP CONSTRAINT "FK_a2caacbef69864533632dce3c5f"`);
    await queryRunner.query(`ALTER TABLE "user_question_stats" DROP CONSTRAINT "FK_dc74302139baebd0bdcf51bf9a5"`);
    await queryRunner.query(`ALTER TABLE "question_reports" DROP CONSTRAINT "FK_e4c946d366c43281b78f0701610"`);
    await queryRunner.query(`ALTER TABLE "question_reports" DROP CONSTRAINT "FK_986c804710ea4ee0b1e679f11ec"`);
    await queryRunner.query(`ALTER TABLE "bookmarks" DROP CONSTRAINT "FK_a32547d59bd71137772d2c6d052"`);
    await queryRunner.query(`ALTER TABLE "bookmarks" DROP CONSTRAINT "FK_58a0fbaee65cd8959a870ee678c"`);
    await queryRunner.query(`ALTER TABLE "attempt_answers" DROP CONSTRAINT "FK_fff29b83c9965e08837b508f0cd"`);
    await queryRunner.query(`ALTER TABLE "attempt_answers" DROP CONSTRAINT "FK_32015c863766540050618a1165c"`);
    await queryRunner.query(`ALTER TABLE "attempts" DROP CONSTRAINT "FK_f83f4a76e58b07503de7ed951d5"`);
    await queryRunner.query(`ALTER TABLE "attempts" DROP CONSTRAINT "FK_d167176b022a0f255e652f07f48"`);
    await queryRunner.query(`ALTER TABLE "attempts" DROP CONSTRAINT "FK_1f23e642cf6e009c61cc2c214e2"`);
    await queryRunner.query(`ALTER TABLE "exam_sections" DROP CONSTRAINT "FK_dc264c5c55dc1c015bfdac3b428"`);
    await queryRunner.query(`ALTER TABLE "exam_questions" DROP CONSTRAINT "FK_7c1bce580fc4692acc719e76db8"`);
    await queryRunner.query(`ALTER TABLE "exam_questions" DROP CONSTRAINT "FK_d1372885951280081e6359b5ee5"`);
    await queryRunner.query(`ALTER TABLE "questions" DROP CONSTRAINT "FK_71de478c6bb3635a98680f68037"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c4f33cab82043030c32359e91d"`);
    await queryRunner.query(`DROP TABLE "user_question_stats"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_912b136e8dc5fc0e97c90861d3"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_986c804710ea4ee0b1e679f11e"`);
    await queryRunner.query(`DROP TABLE "question_reports"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e95a7b766adf15adf40ab140b9"`);
    await queryRunner.query(`DROP TABLE "bookmarks"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_fff29b83c9965e08837b508f0c"`);
    await queryRunner.query(`DROP TABLE "attempt_answers"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_6363f6c241ab1f870bccb817c0"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_d167176b022a0f255e652f07f4"`);
    await queryRunner.query(`DROP TABLE "attempts"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "exam_sections"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_91850a8cd0b4d40440a323aa20"`);
    await queryRunner.query(`DROP TABLE "exam_questions"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_dbd994bdd4c2cf47e77587ab87"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_71de478c6bb3635a98680f6803"`);
    await queryRunner.query(`DROP TABLE "questions"`);
    await queryRunner.query(`DROP TABLE "passages"`);
    await queryRunner.query(`DROP TABLE "exams"`);
    await queryRunner.query(`DROP TYPE "public"."report_status"`);
    await queryRunner.query(`DROP TYPE "public"."question_type"`);
    await queryRunner.query(`DROP TYPE "public"."jlpt_level"`);
    await queryRunner.query(`DROP TYPE "public"."attempt_status"`);
    await queryRunner.query(`DROP TYPE "public"."attempt_mode"`);
    await queryRunner.query(`DROP TYPE "public"."user_role"`);
  }
}
