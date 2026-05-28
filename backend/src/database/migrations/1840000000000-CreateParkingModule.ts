import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateParkingModule1840000000000 implements MigrationInterface {
  name = 'CreateParkingModule1840000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE parking_facilities (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name varchar(160) NOT NULL,
        system_type varchar(32) NOT NULL DEFAULT 'garage',
        segment varchar(32) NOT NULL DEFAULT 'commercial',
        address text,
        total_spots int NOT NULL DEFAULT 0,
        active boolean NOT NULL DEFAULT true,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_parking_facilities_tenant ON parking_facilities(tenant_id);
    `);

    await queryRunner.query(`
      CREATE TABLE parking_spots (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        facility_id uuid NOT NULL REFERENCES parking_facilities(id) ON DELETE CASCADE,
        code varchar(32) NOT NULL,
        floor varchar(32),
        zone varchar(64),
        status varchar(24) NOT NULL DEFAULT 'available',
        active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_parking_spots_facility_code UNIQUE (facility_id, code)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_parking_spots_tenant ON parking_spots(tenant_id);
      CREATE INDEX idx_parking_spots_facility ON parking_spots(facility_id);
      CREATE INDEX idx_parking_spots_status ON parking_spots(status);
    `);

    await queryRunner.query(`
      CREATE TABLE parking_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        facility_id uuid NOT NULL REFERENCES parking_facilities(id) ON DELETE CASCADE,
        spot_id uuid REFERENCES parking_spots(id) ON DELETE SET NULL,
        plate varchar(16) NOT NULL,
        vehicle_type varchar(24) NOT NULL DEFAULT 'car',
        ticket_code varchar(32) NOT NULL,
        driver_name varchar(120),
        status varchar(24) NOT NULL DEFAULT 'active',
        entry_at timestamptz NOT NULL,
        exit_at timestamptz,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_parking_sessions_ticket UNIQUE (ticket_code)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_parking_sessions_tenant ON parking_sessions(tenant_id);
      CREATE INDEX idx_parking_sessions_facility ON parking_sessions(facility_id);
      CREATE INDEX idx_parking_sessions_status ON parking_sessions(status);
      CREATE INDEX idx_parking_sessions_plate ON parking_sessions(plate);
      CREATE INDEX idx_parking_sessions_entry ON parking_sessions(entry_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS parking_sessions`);
    await queryRunner.query(`DROP TABLE IF EXISTS parking_spots`);
    await queryRunner.query(`DROP TABLE IF EXISTS parking_facilities`);
  }
}
