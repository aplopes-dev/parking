import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpandPaymentSettingsPagbankFlows1777100000000 implements MigrationInterface {
  name = 'ExpandPaymentSettingsPagbankFlows1777100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE payment_settings
      ADD COLUMN IF NOT EXISTS pagbank_public_key text,
      ADD COLUMN IF NOT EXISTS pagbank_connect_client_id character varying(120),
      ADD COLUMN IF NOT EXISTS pagbank_connect_client_secret text,
      ADD COLUMN IF NOT EXISTS pagbank_notification_url text,
      ADD COLUMN IF NOT EXISTS pagbank_order_soft_descriptor character varying(22),
      ADD COLUMN IF NOT EXISTS pagbank_order_mcc character varying(10),
      ADD COLUMN IF NOT EXISTS pagbank_flows_config jsonb NOT NULL DEFAULT '{}'::jsonb;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE payment_settings
      DROP COLUMN IF EXISTS pagbank_flows_config,
      DROP COLUMN IF EXISTS pagbank_order_mcc,
      DROP COLUMN IF EXISTS pagbank_order_soft_descriptor,
      DROP COLUMN IF EXISTS pagbank_notification_url,
      DROP COLUMN IF EXISTS pagbank_connect_client_secret,
      DROP COLUMN IF EXISTS pagbank_connect_client_id,
      DROP COLUMN IF EXISTS pagbank_public_key;
    `);
  }
}
