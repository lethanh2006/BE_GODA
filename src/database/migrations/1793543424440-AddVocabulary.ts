import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVocabulary1793543424440 implements MigrationInterface {
    name = 'AddVocabulary1793543424440'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "kanji" ("char" text NOT NULL, "level" "public"."jlpt_level" NOT NULL, "strokes" integer NOT NULL, "freq" integer, "radical" text, "onyomi" text array NOT NULL, "kunyomi" text array NOT NULL, "meanings_en" text array NOT NULL, "hanviet" text array NOT NULL, CONSTRAINT "PK_650a22a85c90cb3a53298b905fa" PRIMARY KEY ("char"))`);
        await queryRunner.query(`CREATE TABLE "words" ("id" text NOT NULL, "word" text NOT NULL, "reading" text NOT NULL, "romaji" text NOT NULL, "level" "public"."jlpt_level", "pos" text array NOT NULL, "meanings_vi" text array NOT NULL, "vi_source" text, "meanings_en" text array NOT NULL, "hanviet" text, "freq" integer NOT NULL, "examples" jsonb NOT NULL, "lesson_no" integer, "lesson_order" integer, CONSTRAINT "PK_feaf97accb69a7f355fa6f58a3d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_38a98e41b6be0f379166dc2b58" ON "words"  ("word") `);
        await queryRunner.query(`CREATE INDEX "IDX_0daceca77dac72a83f9b28fb09" ON "words"  ("level", "lesson_no", "lesson_order") `);
        await queryRunner.query(`CREATE TABLE "user_words" ("user_id" uuid NOT NULL, "word_id" text NOT NULL, "state" smallint NOT NULL, "due" TIMESTAMP WITH TIME ZONE NOT NULL, "stability" double precision NOT NULL, "difficulty" double precision NOT NULL, "scheduled_days" integer NOT NULL, "learning_steps" integer NOT NULL, "reps" integer NOT NULL, "lapses" integer NOT NULL, "last_review" TIMESTAMP WITH TIME ZONE, "suspended" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6362bbbc733974133148fbfc6a8" PRIMARY KEY ("user_id", "word_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8dd259922e7b36e236c7a43110" ON "user_words"  ("user_id", "suspended", "due") `);
        await queryRunner.query(`ALTER TABLE "user_words" ADD CONSTRAINT "FK_3868a0d9556a59ec61300298dd0" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_words" ADD CONSTRAINT "FK_da426fd78b22a5f24c1ea27aeda" FOREIGN KEY ("word_id") REFERENCES "words"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_words" DROP CONSTRAINT "FK_da426fd78b22a5f24c1ea27aeda"`);
        await queryRunner.query(`ALTER TABLE "user_words" DROP CONSTRAINT "FK_3868a0d9556a59ec61300298dd0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8dd259922e7b36e236c7a43110"`);
        await queryRunner.query(`DROP TABLE "user_words"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0daceca77dac72a83f9b28fb09"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_38a98e41b6be0f379166dc2b58"`);
        await queryRunner.query(`DROP TABLE "words"`);
        await queryRunner.query(`DROP TABLE "kanji"`);
    }

}
