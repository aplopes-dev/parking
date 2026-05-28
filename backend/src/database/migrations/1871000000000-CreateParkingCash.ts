import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateParkingCash1871000000000 implements MigrationInterface {
  name = 'CreateParkingCash1871000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE parking_sessions
        ADD COLUMN IF NOT EXISTS payment_status varchar(24),
        ADD COLUMN IF NOT EXISTS payment_method varchar(24),
        ADD COLUMN IF NOT EXISTS finance_transaction_id uuid REFERENCES finance_transactions(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS paid_at timestamptz,
        ADD COLUMN IF NOT EXISTS paid_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_parking_sessions_payment_status
        ON parking_sessions(tenant_id, payment_status);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE parking_sessions
        DROP COLUMN IF EXISTS paid_by_user_id,
        DROP COLUMN IF EXISTS paid_at,
        DROP COLUMN IF EXISTS finance_transaction_id,
        DROP COLUMN IF EXISTS payment_method,
        DROP COLUMN IF EXISTS payment_status;
    `);
  }
}
