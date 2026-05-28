import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateParkingValet1870000000000 implements MigrationInterface {
  name = 'CreateParkingValet1870000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE parking_valet_tickets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        facility_id uuid NOT NULL REFERENCES parking_facilities(id) ON DELETE CASCADE,
        session_id uuid REFERENCES parking_sessions(id) ON DELETE SET NULL,
        ticket_code varchar(32) NOT NULL UNIQUE,
        plate varchar(16) NOT NULL,
        vehicle_type varchar(24) NOT NULL DEFAULT 'car',
        customer_name varchar(120),
        customer_phone varchar(32),
        key_tag varchar(32),
        status varchar(24) NOT NULL DEFAULT 'received',
        assigned_valet_id uuid REFERENCES users(id) ON DELETE SET NULL,
        parked_spot_id uuid REFERENCES parking_spots(id) ON DELETE SET NULL,
        parked_location varchar(160),
        notes text,
        received_at timestamptz NOT NULL,
        parked_at timestamptz,
        requested_at timestamptz,
        ready_at timestamptz,
        delivered_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_parking_valet_tickets_tenant ON parking_valet_tickets(tenant_id);
      CREATE INDEX idx_parking_valet_tickets_facility ON parking_valet_tickets(facility_id);
      CREATE INDEX idx_parking_valet_tickets_status ON parking_valet_tickets(status);
      CREATE INDEX idx_parking_valet_tickets_plate ON parking_valet_tickets(tenant_id, plate);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS parking_valet_tickets`);
  }
}
