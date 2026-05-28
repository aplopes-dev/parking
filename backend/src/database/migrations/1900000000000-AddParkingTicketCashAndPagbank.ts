import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddParkingTicketCashAndPagbank1900000000000 implements MigrationInterface {
  name = 'AddParkingTicketCashAndPagbank1900000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE finance_cash_sessions
        ADD COLUMN IF NOT EXISTS facility_id uuid REFERENCES parking_facilities(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS closed_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE finance_transactions
        ADD COLUMN IF NOT EXISTS cash_session_id uuid REFERENCES finance_cash_sessions(id) ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_finance_transactions_cash_session
        ON finance_transactions(cash_session_id);
    `);

    await queryRunner.query(`
      ALTER TABLE parking_sessions
        ADD COLUMN IF NOT EXISTS cash_session_id uuid REFERENCES finance_cash_sessions(id) ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE parking_subscription_bills
        ADD COLUMN IF NOT EXISTS pagbank_transaction_id uuid REFERENCES pagbank_transactions(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS payment_method varchar(24),
        ADD COLUMN IF NOT EXISTS pix_copy_paste text,
        ADD COLUMN IF NOT EXISTS pix_qr_code text,
        ADD COLUMN IF NOT EXISTS boleto_pdf_url text,
        ADD COLUMN IF NOT EXISTS boleto_barcode varchar(80),
        ADD COLUMN IF NOT EXISTS auto_charge_error text,
        ADD COLUMN IF NOT EXISTS charged_at timestamptz;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE parking_subscription_bills
        DROP COLUMN IF EXISTS charged_at,
        DROP COLUMN IF EXISTS auto_charge_error,
        DROP COLUMN IF EXISTS boleto_barcode,
        DROP COLUMN IF EXISTS boleto_pdf_url,
        DROP COLUMN IF EXISTS pix_qr_code,
        DROP COLUMN IF EXISTS pix_copy_paste,
        DROP COLUMN IF EXISTS payment_method,
        DROP COLUMN IF EXISTS pagbank_transaction_id;
    `);
    await queryRunner.query(`ALTER TABLE parking_sessions DROP COLUMN IF EXISTS cash_session_id`);
    await queryRunner.query(`ALTER TABLE finance_transactions DROP COLUMN IF EXISTS cash_session_id`);
    await queryRunner.query(`
      ALTER TABLE finance_cash_sessions
        DROP COLUMN IF EXISTS closed_by_user_id,
        DROP COLUMN IF EXISTS facility_id;
    `);
  }
}
