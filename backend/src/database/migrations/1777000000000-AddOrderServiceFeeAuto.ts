import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderServiceFeeAuto1777000000000 implements MigrationInterface {
  name = 'AddOrderServiceFeeAuto1777000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS service_fee_auto boolean NOT NULL DEFAULT false;
    `);
    await queryRunner.query(`
      UPDATE orders
      SET service_fee_auto = true
      WHERE type = 'tablet'
        AND table_id IS NOT NULL
        AND service_fee > 0;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE orders DROP COLUMN IF EXISTS service_fee_auto;
    `);
  }
}
