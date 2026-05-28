import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductPhoto1778000000000 implements MigrationInterface {
  name = 'AddProductPhoto1778000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS "photoKey" character varying,
      ADD COLUMN IF NOT EXISTS "photoMimeType" character varying;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE products
      DROP COLUMN IF EXISTS "photoKey",
      DROP COLUMN IF EXISTS "photoMimeType";
    `);
  }
}
