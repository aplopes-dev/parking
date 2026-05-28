import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerSortOrder1789000000000 implements MigrationInterface {
  name = 'AddCustomerSortOrder1789000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customers
      ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
    `);

    await queryRunner.query(`
      WITH ranked AS (
        SELECT
          id,
          ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY name ASC) - 1 AS rn
        FROM customers
      )
      UPDATE customers c
      SET sort_order = ranked.rn
      FROM ranked
      WHERE c.id = ranked.id;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customers DROP COLUMN IF EXISTS sort_order;
    `);
  }
}
