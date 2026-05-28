import { MigrationInterface, QueryRunner } from 'typeorm';

export class PaymentSettingsPagbankSplit1777000000000 implements MigrationInterface {
  name = 'PaymentSettingsPagbankSplit1777000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "pagbank_environment_enum" AS ENUM('sandbox', 'production');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "pagbank_split_method_enum" AS ENUM('FIXED', 'PERCENTAGE');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "payment_split_receiver_role_enum" AS ENUM('master', 'secondary');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payment_settings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        pagbank_split_enabled boolean NOT NULL DEFAULT false,
        pagbank_environment "pagbank_environment_enum" NOT NULL DEFAULT 'sandbox',
        pagbank_token text,
        pagbank_master_account_id character varying(80),
        pagbank_split_method "pagbank_split_method_enum" NOT NULL DEFAULT 'PERCENTAGE',
        pagbank_transfer_interest boolean NOT NULL DEFAULT false,
        pagbank_transfer_shipping boolean NOT NULL DEFAULT false,
        pagbank_custody_enabled boolean NOT NULL DEFAULT false,
        notes text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_payment_settings_tenant" UNIQUE (tenant_id)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payment_split_receivers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        label character varying(120) NOT NULL,
        pagbank_account_id character varying(80) NOT NULL,
        role "payment_split_receiver_role_enum" NOT NULL DEFAULT 'secondary',
        amount_value numeric(14, 4) NOT NULL DEFAULT 0,
        is_liable boolean NOT NULL DEFAULT false,
        active boolean NOT NULL DEFAULT true,
        sort_order integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_payment_split_receivers_tenant"
      ON payment_split_receivers (tenant_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS payment_split_receivers`);
    await queryRunner.query(`DROP TABLE IF EXISTS payment_settings`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_split_receiver_role_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "pagbank_split_method_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "pagbank_environment_enum"`);
  }
}
