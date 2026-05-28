import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWaiterTableNotifications1787000000000 implements MigrationInterface {
  name = 'CreateWaiterTableNotifications1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "waiter_notification_status_enum" AS ENUM('pending', 'read', 'delivered');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS waiter_table_notifications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        target_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        order_item_id uuid NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
        order_number int NOT NULL,
        table_number int,
        table_label varchar(40),
        zone varchar(40),
        product_name varchar(200) NOT NULL,
        quantity numeric(14,4) NOT NULL,
        status "waiter_notification_status_enum" NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_waiter_notif_target_pending"
      ON waiter_table_notifications (tenant_id, target_user_id, status)
      WHERE status = 'pending';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS waiter_table_notifications`);
    await queryRunner.query(`DROP TYPE IF EXISTS "waiter_notification_status_enum"`);
  }
}
