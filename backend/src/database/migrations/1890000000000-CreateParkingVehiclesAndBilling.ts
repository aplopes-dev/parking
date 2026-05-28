import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateParkingVehiclesAndBilling1890000000000 implements MigrationInterface {
  name = 'CreateParkingVehiclesAndBilling1890000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE parking_vehicles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        plate varchar(16) NOT NULL,
        vehicle_type varchar(24) NOT NULL DEFAULT 'car',
        customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
        holder_name varchar(120),
        brand varchar(80),
        model varchar(80),
        color varchar(40),
        rfid_tag varchar(64),
        notes text,
        active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, plate)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_parking_vehicles_tenant ON parking_vehicles(tenant_id);
      CREATE INDEX idx_parking_vehicles_plate ON parking_vehicles(tenant_id, plate);
      CREATE INDEX idx_parking_vehicles_rfid ON parking_vehicles(tenant_id, rfid_tag);
    `);

    await queryRunner.query(`
      CREATE TABLE parking_subscription_bills (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        subscription_id uuid NOT NULL REFERENCES parking_subscriptions(id) ON DELETE CASCADE,
        reference_month varchar(7) NOT NULL,
        amount numeric(10, 2) NOT NULL,
        due_date date NOT NULL,
        finance_bill_id uuid REFERENCES finance_bills(id) ON DELETE SET NULL,
        status varchar(24) NOT NULL DEFAULT 'pending',
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (subscription_id, reference_month)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_parking_subscription_bills_tenant ON parking_subscription_bills(tenant_id);
      CREATE INDEX idx_parking_subscription_bills_month ON parking_subscription_bills(tenant_id, reference_month);
      CREATE INDEX idx_parking_subscription_bills_status ON parking_subscription_bills(status);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS parking_subscription_bills`);
    await queryRunner.query(`DROP TABLE IF EXISTS parking_vehicles`);
  }
}
