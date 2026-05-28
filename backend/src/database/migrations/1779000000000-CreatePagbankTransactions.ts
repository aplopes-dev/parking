import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePagbankTransactions1779000000000 implements MigrationInterface {
  name = 'CreatePagbankTransactions1779000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "pagbank_transaction_status_enum" AS ENUM(
          'created', 'waiting_payment', 'paid', 'declined', 'canceled', 'error'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pagbank_transactions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
        flow_id character varying(64) NOT NULL,
        pagbank_order_id character varying(80),
        charge_id character varying(80),
        status "pagbank_transaction_status_enum" NOT NULL DEFAULT 'created',
        payment_method character varying(40),
        amount_cents integer NOT NULL DEFAULT 0,
        currency character varying(3) NOT NULL DEFAULT 'BRL',
        checkout_data jsonb,
        raw_create jsonb,
        raw_pay jsonb,
        raw_last_event jsonb,
        error_message text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_pagbank_transactions_tenant"
      ON pagbank_transactions (tenant_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_pagbank_transactions_order"
      ON pagbank_transactions (order_id);
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_pagbank_transactions_pagbank_order"
      ON pagbank_transactions (tenant_id, pagbank_order_id)
      WHERE pagbank_order_id IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS pagbank_transactions`);
    await queryRunner.query(`DROP TYPE IF EXISTS "pagbank_transaction_status_enum"`);
  }
}
