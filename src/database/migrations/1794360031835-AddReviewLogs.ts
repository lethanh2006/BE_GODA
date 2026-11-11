import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReviewLogs1794360031835 implements MigrationInterface {
    name = 'AddReviewLogs1794360031835'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "review_logs" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "item_type" text NOT NULL, "item_id" text NOT NULL, "kind" text NOT NULL, "rating" smallint NOT NULL, "state" smallint NOT NULL, "stability" double precision NOT NULL, "difficulty" double precision NOT NULL, "scheduled_days" integer NOT NULL, "last_review" TIMESTAMP WITH TIME ZONE, "reviewed_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_50f4c1ba68709ee9db5e55caace" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_6b17782c2c0e54e3b7c3a36cb0" ON "review_logs"  ("item_type", "item_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_139badefb7f5c9c0391b772b2d" ON "review_logs"  ("user_id", "reviewed_at") `);
        await queryRunner.query(`ALTER TABLE "review_logs" ADD CONSTRAINT "FK_b8b0075cc11fddb64e84a987026" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "review_logs" DROP CONSTRAINT "FK_b8b0075cc11fddb64e84a987026"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_139badefb7f5c9c0391b772b2d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6b17782c2c0e54e3b7c3a36cb0"`);
        await queryRunner.query(`DROP TABLE "review_logs"`);
    }

}
