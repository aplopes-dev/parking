import { MigrationInterface, QueryRunner } from 'typeorm';

const TABLES = ['products', 'stock_locations', 'technical_sheets'] as const;

export class AddCatalogSortOrder1790500000000 implements MigrationInterface {
  name = 'AddCatalogSortOrder1790500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of TABLES) {
      await queryRunner.query(`
        ALTER TABLE ${table}
        ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
      `);

      const nameCol = table === 'technical_sheets' ? 'name' : 'name';
      await queryRunner.query(`
        WITH ranked AS (
          SELECT
            id,
            ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY ${nameCol} ASC) - 1 AS rn
          FROM ${table}
        )
        UPDATE ${table} t
        SET sort_order = ranked.rn
        FROM ranked
        WHERE t.id = ranked.id;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of TABLES) {
      await queryRunner.query(`
        ALTER TABLE ${table} DROP COLUMN IF EXISTS sort_order;
      `);
    }
  }
}
