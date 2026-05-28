import { MigrationInterface, QueryRunner } from 'typeorm';

export class PagbankConnectAndCustodySettings1781000000000 implements MigrationInterface {
  name = 'PagbankConnectAndCustodySettings1781000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE payment_settings
      ADD COLUMN IF NOT EXISTS pagbank_connect_redirect_uri text,
      ADD COLUMN IF NOT EXISTS pagbank_custody_scheduled_default character varying(40);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pagbank_connect_accounts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        label character varying(120),
        pagbank_account_id character varying(80),
        access_token text NOT NULL,
        refresh_token text,
        token_expires_at TIMESTAMP,
        scopes text,
        bank_branch character varying(20),
        account_number character varying(30),
        auth_method character varying(20) NOT NULL DEFAULT 'authorization',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_pagbank_connect_accounts_tenant"
      ON pagbank_connect_accounts (tenant_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS pagbank_connect_accounts`);
    await queryRunner.query(`
      ALTER TABLE payment_settings
      DROP COLUMN IF EXISTS pagbank_connect_redirect_uri,
      DROP COLUMN IF EXISTS pagbank_custody_scheduled_default;
    `);
  }
}
