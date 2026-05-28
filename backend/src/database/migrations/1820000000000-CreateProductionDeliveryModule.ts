import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductionDeliveryModule1820000000000 implements MigrationInterface {
  name = 'CreateProductionDeliveryModule1820000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE production_settings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
        notify_on_kitchen_send boolean NOT NULL DEFAULT true,
        notify_on_kitchen_ready boolean NOT NULL DEFAULT true,
        sound_enabled boolean NOT NULL DEFAULT true,
        sla_warning_minutes int NOT NULL DEFAULT 15,
        auto_refresh_seconds int NOT NULL DEFAULT 30,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TYPE delivery_courier_status_enum AS ENUM ('available', 'busy', 'offline');
    `);
    await queryRunner.query(`
      CREATE TABLE delivery_couriers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name varchar(120) NOT NULL,
        phone varchar(32),
        vehicle varchar(40) DEFAULT 'moto',
        status delivery_courier_status_enum NOT NULL DEFAULT 'available',
        active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX idx_delivery_couriers_tenant ON delivery_couriers(tenant_id);`);

    await queryRunner.query(`
      CREATE TABLE delivery_routes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name varchar(120) NOT NULL,
        zone_label varchar(80),
        color varchar(16) DEFAULT '#ea1d2c',
        active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TYPE delivery_assignment_status_enum AS ENUM (
        'pending', 'assigned', 'picked_up', 'delivered', 'failed'
      );
    `);
    await queryRunner.query(`
      CREATE TABLE delivery_assignments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        order_id uuid NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
        courier_id uuid REFERENCES delivery_couriers(id) ON DELETE SET NULL,
        route_id uuid REFERENCES delivery_routes(id) ON DELETE SET NULL,
        status delivery_assignment_status_enum NOT NULL DEFAULT 'pending',
        assigned_at timestamptz,
        picked_up_at timestamptz,
        delivered_at timestamptz,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX idx_delivery_assignments_tenant ON delivery_assignments(tenant_id);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS delivery_assignments`);
    await queryRunner.query(`DROP TYPE IF EXISTS delivery_assignment_status_enum`);
    await queryRunner.query(`DROP TABLE IF EXISTS delivery_routes`);
    await queryRunner.query(`DROP TABLE IF EXISTS delivery_couriers`);
    await queryRunner.query(`DROP TYPE IF EXISTS delivery_courier_status_enum`);
    await queryRunner.query(`DROP TABLE IF EXISTS production_settings`);
  }
}
