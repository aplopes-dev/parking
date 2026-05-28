import { MigrationInterface, QueryRunner } from 'typeorm';

export class PagbankRecurringTransferRegistration1784000000000
  implements MigrationInterface
{
  name = 'PagbankRecurringTransferRegistration1784000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pagbank_recurring_plans (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        pagbank_plan_id character varying(80) NOT NULL,
        reference_id character varying(80),
        name character varying(120) NOT NULL,
        amount_cents integer NOT NULL,
        interval_unit character varying(10) NOT NULL DEFAULT 'MONTH',
        interval_length integer NOT NULL DEFAULT 1,
        status character varying(30),
        raw_data jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pagbank_subscriptions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        local_plan_id uuid REFERENCES pagbank_recurring_plans(id) ON DELETE SET NULL,
        pagbank_subscription_id character varying(80) NOT NULL,
        pagbank_plan_id character varying(80),
        reference_id character varying(80),
        customer_email character varying(120),
        status character varying(30),
        amount_cents integer NOT NULL DEFAULT 0,
        raw_data jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pagbank_transfers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        pagbank_transfer_id character varying(80),
        reference_id character varying(80),
        amount_cents integer NOT NULL,
        status character varying(30),
        instrument_type character varying(10) NOT NULL,
        raw_create jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pagbank_registered_accounts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        pagbank_account_id character varying(80),
        account_type character varying(20) NOT NULL,
        email character varying(120) NOT NULL,
        status character varying(40),
        raw_create jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_pagbank_recurring_plans_tenant"
      ON pagbank_recurring_plans (tenant_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_pagbank_subscriptions_tenant"
      ON pagbank_subscriptions (tenant_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_pagbank_transfers_tenant"
      ON pagbank_transfers (tenant_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_pagbank_registered_accounts_tenant"
      ON pagbank_registered_accounts (tenant_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS pagbank_registered_accounts`);
    await queryRunner.query(`DROP TABLE IF EXISTS pagbank_transfers`);
    await queryRunner.query(`DROP TABLE IF EXISTS pagbank_subscriptions`);
    await queryRunner.query(`DROP TABLE IF EXISTS pagbank_recurring_plans`);
  }
}
