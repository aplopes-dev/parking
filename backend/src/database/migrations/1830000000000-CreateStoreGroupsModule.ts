import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStoreGroupsModule1830000000000 implements MigrationInterface {
  name = 'CreateStoreGroupsModule1830000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE store_groups (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code varchar(64) NOT NULL,
        name varchar(160) NOT NULL,
        description text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_store_groups_code UNIQUE (code)
      );
    `);

    await queryRunner.query(`
      ALTER TABLE tenants
        ADD COLUMN IF NOT EXISTS store_group_id uuid REFERENCES store_groups(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS unit_label varchar(120);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tenants_store_group ON tenants(store_group_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE tenants DROP COLUMN IF EXISTS unit_label`);
    await queryRunner.query(`ALTER TABLE tenants DROP COLUMN IF EXISTS store_group_id`);
    await queryRunner.query(`DROP TABLE IF EXISTS store_groups`);
  }
}
