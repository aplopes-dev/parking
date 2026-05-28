import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGarcomCozinhaUserRoles1785000000000 implements MigrationInterface {
  name = 'AddGarcomCozinhaUserRoles1785000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TYPE "users_role_enum" ADD VALUE IF NOT EXISTS 'garcom';
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TYPE "users_role_enum" ADD VALUE IF NOT EXISTS 'cozinha';
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
  }

  public async down(): Promise<void> {
    /* enum values cannot be removed safely in PostgreSQL */
  }
}
