import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGoogleLogin1794000000000 implements MigrationInterface {
  name = 'AddGoogleLogin1794000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL');
    await queryRunner.query('ALTER TABLE "users" ADD "google_sub" text');
    await queryRunner.query('ALTER TABLE "users" ADD CONSTRAINT "UQ_users_google_sub" UNIQUE ("google_sub")');
    await queryRunner.query('ALTER TABLE "users" ADD CONSTRAINT "CHK_users_login_method" CHECK ("password_hash" IS NOT NULL OR "google_sub" IS NOT NULL)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Google-only users cannot use password login after rollback.
    await queryRunner.query('UPDATE "users" SET "password_hash" = \'google-login-disabled\' WHERE "password_hash" IS NULL');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "CHK_users_login_method"');
    await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "UQ_users_google_sub"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "google_sub"');
    await queryRunner.query('ALTER TABLE "users" ALTER COLUMN "password_hash" SET NOT NULL');
  }
}
