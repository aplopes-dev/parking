import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderAccountClosedAt1782000000000 implements MigrationInterface {
  name = 'AddOrderAccountClosedAt1782000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS account_closed_at TIMESTAMP NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE orders DROP COLUMN IF EXISTS account_closed_at;
    `);
  }
}
