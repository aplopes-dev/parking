import { MigrationInterface, QueryRunner } from 'typeorm';

export class MobilePosIntegration1776000000000 implements MigrationInterface {
  name = 'MobilePosIntegration1776000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS restaurant_tables (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        number integer NOT NULL,
        capacity integer NOT NULL DEFAULT 4,
        zone character varying(80) NOT NULL DEFAULT 'Salão',
        active boolean NOT NULL DEFAULT true,
        current_order_id uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_restaurant_tables_tenant_number" UNIQUE (tenant_id, number)
      );
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "order_item_kitchen_status_enum" AS ENUM(
          'pendente', 'enviado_cozinha', 'entregue'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE order_items
      ADD COLUMN IF NOT EXISTS kitchen_status "order_item_kitchen_status_enum" NOT NULL DEFAULT 'pendente';
    `);

    await queryRunner.query(`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS table_id uuid,
      ADD COLUMN IF NOT EXISTS guest_count integer,
      ADD COLUMN IF NOT EXISTS waiter_name character varying(80);
    `);

    await queryRunner.query(`
      ALTER TABLE orders
      ADD CONSTRAINT "FK_orders_table"
      FOREIGN KEY (table_id) REFERENCES restaurant_tables(id) ON DELETE SET NULL;
    `).catch(() => undefined);

    await queryRunner.query(`
      ALTER TABLE restaurant_tables
      ADD CONSTRAINT "FK_restaurant_tables_current_order"
      FOREIGN KEY (current_order_id) REFERENCES orders(id) ON DELETE SET NULL;
    `).catch(() => undefined);

    await queryRunner.query(`
      ALTER TABLE order_payments
      ADD COLUMN IF NOT EXISTS pagbank_transaction_id character varying(120),
      ADD COLUMN IF NOT EXISTS pagbank_transaction_code character varying(120),
      ADD COLUMN IF NOT EXISTS pagbank_nsu character varying(80),
      ADD COLUMN IF NOT EXISTS pagbank_host_nsu character varying(80),
      ADD COLUMN IF NOT EXISTS pagbank_auto_code character varying(80),
      ADD COLUMN IF NOT EXISTS pagbank_card_brand character varying(40),
      ADD COLUMN IF NOT EXISTS pagbank_pix_tx_id character varying(120),
      ADD COLUMN IF NOT EXISTS pagbank_payment_type integer,
      ADD COLUMN IF NOT EXISTS processed_on_terminal boolean NOT NULL DEFAULT false;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE order_payments DROP COLUMN IF EXISTS processed_on_terminal`);
    await queryRunner.query(`ALTER TABLE order_payments DROP COLUMN IF EXISTS pagbank_payment_type`);
    await queryRunner.query(`ALTER TABLE order_payments DROP COLUMN IF EXISTS pagbank_pix_tx_id`);
    await queryRunner.query(`ALTER TABLE order_payments DROP COLUMN IF EXISTS pagbank_card_brand`);
    await queryRunner.query(`ALTER TABLE order_payments DROP COLUMN IF EXISTS pagbank_auto_code`);
    await queryRunner.query(`ALTER TABLE order_payments DROP COLUMN IF EXISTS pagbank_host_nsu`);
    await queryRunner.query(`ALTER TABLE order_payments DROP COLUMN IF EXISTS pagbank_nsu`);
    await queryRunner.query(`ALTER TABLE order_payments DROP COLUMN IF EXISTS pagbank_transaction_code`);
    await queryRunner.query(`ALTER TABLE order_payments DROP COLUMN IF EXISTS pagbank_transaction_id`);
    await queryRunner.query(`ALTER TABLE orders DROP CONSTRAINT IF EXISTS "FK_orders_table"`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN IF EXISTS waiter_name`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN IF EXISTS guest_count`);
    await queryRunner.query(`ALTER TABLE orders DROP COLUMN IF EXISTS table_id`);
    await queryRunner.query(`ALTER TABLE order_items DROP COLUMN IF EXISTS kitchen_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS "order_item_kitchen_status_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS restaurant_tables`);
  }
}
