import { MigrationInterface, QueryRunner } from 'typeorm';

export class PagbankHostedCheckoutAndConnectSplitSync1783000000000
  implements MigrationInterface
{
  name = 'PagbankHostedCheckoutAndConnectSplitSync1783000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE payment_settings
      ADD COLUMN IF NOT EXISTS pagbank_connect_auto_sync_split boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS pagbank_connect_split_percent_each numeric(8,4),
      ADD COLUMN IF NOT EXISTS pagbank_checkout_return_url text,
      ADD COLUMN IF NOT EXISTS pagbank_checkout_success_url text;
    `);

    await queryRunner.query(`
      ALTER TABLE pagbank_transactions
      ADD COLUMN IF NOT EXISTS pagbank_checkout_id character varying(80);
    `);

    await queryRunner.query(`
      ALTER TABLE payment_split_receivers
      ADD COLUMN IF NOT EXISTS connect_account_id uuid;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_split_receiver_connect_account'
        ) THEN
          ALTER TABLE payment_split_receivers
          ADD CONSTRAINT "FK_split_receiver_connect_account"
          FOREIGN KEY (connect_account_id)
          REFERENCES pagbank_connect_accounts(id)
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_split_receiver_connect_account"
      ON payment_split_receivers (connect_account_id)
      WHERE connect_account_id IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE payment_split_receivers
      DROP CONSTRAINT IF EXISTS "FK_split_receiver_connect_account";
    `);
    await queryRunner.query(`
      ALTER TABLE payment_split_receivers
      DROP COLUMN IF EXISTS connect_account_id;
    `);
    await queryRunner.query(`
      ALTER TABLE pagbank_transactions
      DROP COLUMN IF EXISTS pagbank_checkout_id;
    `);
    await queryRunner.query(`
      ALTER TABLE payment_settings
      DROP COLUMN IF EXISTS pagbank_connect_auto_sync_split,
      DROP COLUMN IF EXISTS pagbank_connect_split_percent_each,
      DROP COLUMN IF EXISTS pagbank_checkout_return_url,
      DROP COLUMN IF EXISTS pagbank_checkout_success_url;
    `);
  }
}
