import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateParkingHardware1880000000000 implements MigrationInterface {
  name = 'CreateParkingHardware1880000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE parking_access_devices (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        facility_id uuid NOT NULL REFERENCES parking_facilities(id) ON DELETE CASCADE,
        name varchar(120) NOT NULL,
        code varchar(32),
        type varchar(24) NOT NULL,
        direction varchar(24) NOT NULL,
        vendor varchar(64),
        ip_address varchar(64),
        api_key varchar(128) NOT NULL UNIQUE,
        auto_entry boolean NOT NULL DEFAULT true,
        auto_exit_waived boolean NOT NULL DEFAULT true,
        config jsonb,
        active boolean NOT NULL DEFAULT true,
        last_seen_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE parking_access_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        device_id uuid NOT NULL REFERENCES parking_access_devices(id) ON DELETE CASCADE,
        facility_id uuid NOT NULL REFERENCES parking_facilities(id) ON DELETE CASCADE,
        event_type varchar(32) NOT NULL,
        plate varchar(16),
        confidence numeric(5, 2),
        allowed boolean NOT NULL DEFAULT false,
        message text,
        session_id uuid REFERENCES parking_sessions(id) ON DELETE SET NULL,
        gate_action varchar(32),
        raw_payload jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE parking_gate_commands (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        device_id uuid NOT NULL REFERENCES parking_access_devices(id) ON DELETE CASCADE,
        command varchar(32) NOT NULL DEFAULT 'open',
        status varchar(24) NOT NULL DEFAULT 'pending',
        duration_ms int NOT NULL DEFAULT 5000,
        reason text,
        acked_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_parking_access_devices_tenant ON parking_access_devices(tenant_id);
      CREATE INDEX idx_parking_access_devices_facility ON parking_access_devices(facility_id);
      CREATE INDEX idx_parking_access_events_tenant ON parking_access_events(tenant_id);
      CREATE INDEX idx_parking_access_events_device ON parking_access_events(device_id);
      CREATE INDEX idx_parking_access_events_plate ON parking_access_events(tenant_id, plate);
      CREATE INDEX idx_parking_gate_commands_device_status ON parking_gate_commands(device_id, status);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS parking_gate_commands`);
    await queryRunner.query(`DROP TABLE IF EXISTS parking_access_events`);
    await queryRunner.query(`DROP TABLE IF EXISTS parking_access_devices`);
  }
}
