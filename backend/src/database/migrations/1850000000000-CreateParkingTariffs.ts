import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateParkingTariffs1850000000000 implements MigrationInterface {
  name = 'CreateParkingTariffs1850000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE parking_tariffs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        facility_id uuid REFERENCES parking_facilities(id) ON DELETE CASCADE,
        name varchar(120) NOT NULL,
        billing_type varchar(24) NOT NULL,
        vehicle_type varchar(24),
        price numeric(10, 2) NOT NULL,
        grace_minutes int NOT NULL DEFAULT 0,
        block_minutes int NOT NULL DEFAULT 60,
        max_daily_price numeric(10, 2),
        description text,
        active boolean NOT NULL DEFAULT true,
        is_default boolean NOT NULL DEFAULT false,
        sort_order int NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_parking_tariffs_tenant ON parking_tariffs(tenant_id);
      CREATE INDEX idx_parking_tariffs_facility ON parking_tariffs(facility_id);
      CREATE INDEX idx_parking_tariffs_billing ON parking_tariffs(billing_type);
    `);

    await queryRunner.query(`
      ALTER TABLE parking_sessions
        ADD COLUMN IF NOT EXISTS tariff_id uuid REFERENCES parking_tariffs(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS amount_charged numeric(10, 2),
        ADD COLUMN IF NOT EXISTS duration_minutes int;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE parking_sessions
        DROP COLUMN IF EXISTS duration_minutes,
        DROP COLUMN IF EXISTS amount_charged,
        DROP COLUMN IF EXISTS tariff_id;
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS parking_tariffs`);
  }
}
