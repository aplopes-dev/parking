import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateParkingContracts1860000000000 implements MigrationInterface {
  name = 'CreateParkingContracts1860000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE parking_subscriptions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        facility_id uuid NOT NULL REFERENCES parking_facilities(id) ON DELETE CASCADE,
        tariff_id uuid REFERENCES parking_tariffs(id) ON DELETE SET NULL,
        code varchar(32),
        status varchar(24) NOT NULL DEFAULT 'active',
        start_date date NOT NULL,
        end_date date,
        monthly_price numeric(10, 2) NOT NULL,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE parking_subscription_vehicles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        subscription_id uuid NOT NULL REFERENCES parking_subscriptions(id) ON DELETE CASCADE,
        plate varchar(16) NOT NULL,
        vehicle_type varchar(24) NOT NULL DEFAULT 'car',
        holder_name varchar(120),
        rfid_tag varchar(64),
        active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE parking_agreements (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        facility_id uuid REFERENCES parking_facilities(id) ON DELETE SET NULL,
        name varchar(160) NOT NULL,
        code varchar(32),
        status varchar(24) NOT NULL DEFAULT 'active',
        discount_percent numeric(5, 2),
        fixed_monthly_fee numeric(10, 2),
        vehicle_limit int,
        start_date date NOT NULL,
        end_date date,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE parking_agreement_vehicles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        agreement_id uuid NOT NULL REFERENCES parking_agreements(id) ON DELETE CASCADE,
        plate varchar(16) NOT NULL,
        vehicle_type varchar(24) NOT NULL DEFAULT 'car',
        driver_name varchar(120),
        department varchar(120),
        active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_parking_subscriptions_tenant ON parking_subscriptions(tenant_id);
      CREATE INDEX idx_parking_subscriptions_customer ON parking_subscriptions(customer_id);
      CREATE INDEX idx_parking_subscriptions_status ON parking_subscriptions(status);
      CREATE INDEX idx_parking_subscription_vehicles_plate ON parking_subscription_vehicles(tenant_id, plate);
      CREATE INDEX idx_parking_agreements_tenant ON parking_agreements(tenant_id);
      CREATE INDEX idx_parking_agreements_customer ON parking_agreements(customer_id);
      CREATE INDEX idx_parking_agreement_vehicles_plate ON parking_agreement_vehicles(tenant_id, plate);
    `);

    await queryRunner.query(`
      ALTER TABLE parking_sessions
        ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS subscription_id uuid REFERENCES parking_subscriptions(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS agreement_id uuid REFERENCES parking_agreements(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS access_type varchar(24) NOT NULL DEFAULT 'rotativo';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE parking_sessions
        DROP COLUMN IF EXISTS access_type,
        DROP COLUMN IF EXISTS agreement_id,
        DROP COLUMN IF EXISTS subscription_id,
        DROP COLUMN IF EXISTS customer_id;
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS parking_agreement_vehicles`);
    await queryRunner.query(`DROP TABLE IF EXISTS parking_agreements`);
    await queryRunner.query(`DROP TABLE IF EXISTS parking_subscription_vehicles`);
    await queryRunner.query(`DROP TABLE IF EXISTS parking_subscriptions`);
  }
}
