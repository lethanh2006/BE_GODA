import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDecks1793685088133 implements MigrationInterface {
    name = 'AddDecks1793685088133'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "decks" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "source_key" text NOT NULL, "course" text NOT NULL, "level" "public"."jlpt_level", "chapter" integer, "title" text NOT NULL, "kind" text NOT NULL, "position" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_981894e3f8dbe5049ac59cb1af1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c2f6339f20cf153806bfca8631" ON "decks"  ("user_id", "position") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_0f04e8513e52d80ff64606f0e4" ON "decks"  ("user_id", "source_key") `);
        await queryRunner.query(`CREATE TABLE "deck_cards" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "deck_id" uuid NOT NULL, "source_id" text NOT NULL, "position" integer NOT NULL, "term" text NOT NULL, "furigana" text, "reading" text NOT NULL, "hanviet" text, "word_type" text, "meaning" text NOT NULL, "examples" jsonb NOT NULL, "state" smallint NOT NULL DEFAULT '0', "due" TIMESTAMP WITH TIME ZONE, "stability" double precision NOT NULL DEFAULT '0', "difficulty" double precision NOT NULL DEFAULT '0', "scheduled_days" integer NOT NULL DEFAULT '0', "learning_steps" integer NOT NULL DEFAULT '0', "reps" integer NOT NULL DEFAULT '0', "lapses" integer NOT NULL DEFAULT '0', "last_review" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_7143f21b3e36f538a75d3019f52" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d16513c52e3d3d9dfecf32cf12" ON "deck_cards"  ("due") `);
        await queryRunner.query(`CREATE INDEX "IDX_fc431e34bbc1cd4f73e46511cd" ON "deck_cards"  ("deck_id", "position") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_b629445dd92bceb3b1060d067b" ON "deck_cards"  ("deck_id", "source_id") `);
        await queryRunner.query(`ALTER TABLE "decks" ADD CONSTRAINT "FK_329af7716096378c8e13125edd5" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "deck_cards" ADD CONSTRAINT "FK_edd1ac885107a30f7c7dc67c6b9" FOREIGN KEY ("deck_id") REFERENCES "decks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "deck_cards" DROP CONSTRAINT "FK_edd1ac885107a30f7c7dc67c6b9"`);
        await queryRunner.query(`ALTER TABLE "decks" DROP CONSTRAINT "FK_329af7716096378c8e13125edd5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b629445dd92bceb3b1060d067b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fc431e34bbc1cd4f73e46511cd"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d16513c52e3d3d9dfecf32cf12"`);
        await queryRunner.query(`DROP TABLE "deck_cards"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0f04e8513e52d80ff64606f0e4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c2f6339f20cf153806bfca8631"`);
        await queryRunner.query(`DROP TABLE "decks"`);
    }

}
