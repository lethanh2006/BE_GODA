import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGrammarProgress1795276800000 implements MigrationInterface {
  name = 'AddGrammarProgress1795276800000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "grammar_progress" (
      "user_id" uuid NOT NULL,
      "lesson_id" text NOT NULL,
      "question_id" text NOT NULL,
      "correct" boolean NOT NULL,
      "attempts" integer NOT NULL DEFAULT 1,
      "last_answer" jsonb NOT NULL,
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_grammar_progress" PRIMARY KEY ("user_id", "lesson_id", "question_id"),
      CONSTRAINT "CHK_grammar_progress_attempts" CHECK (attempts > 0),
      CONSTRAINT "FK_grammar_progress_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    )`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "grammar_progress"');
  }
}
