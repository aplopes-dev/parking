import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendFinanceOperations1791000000000 implements MigrationInterface {
  name = 'ExtendFinanceOperations1791000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE finance_bill_type_enum AS ENUM ('payable', 'receivable');
    `);
    await queryRunner.query(`
      CREATE TYPE finance_bill_status_enum AS ENUM ('open', 'partial', 'paid', 'cancelled');
    `);
    await queryRunner.query(`
      CREATE TYPE finance_recurring_frequency_enum AS ENUM ('weekly', 'monthly');
    `);
    await queryRunner.query(`
      CREATE TYPE finance_advance_status_enum AS ENUM ('open', 'settled', 'cancelled');
    `);
    await queryRunner.query(`
      CREATE TYPE finance_payroll_status_enum AS ENUM ('draft', 'closed');
    `);
    await queryRunner.query(`
      CREATE TYPE finance_cash_session_status_enum AS ENUM ('open', 'closed');
    `);
    await queryRunner.query(`
      CREATE TYPE finance_card_receivable_status_enum AS ENUM ('pending', 'deposited');
    `);
    await queryRunner.query(`
      CREATE TYPE finance_prepaid_movement_type_enum AS ENUM ('credit', 'debit');
    `);

    await queryRunner.query(`
      ALTER TABLE finance_transactions
      ADD COLUMN IF NOT EXISTS origin varchar(24) NOT NULL DEFAULT 'manual',
      ADD COLUMN IF NOT EXISTS reference_id uuid;
    `);

    await queryRunner.query(`
      CREATE TABLE finance_bills (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        bill_type finance_bill_type_enum NOT NULL,
        description varchar(500) NOT NULL,
        counterparty_name varchar(255) NOT NULL,
        counterparty_document varchar(32),
        amount numeric(14,2) NOT NULL,
        paid_amount numeric(14,2) NOT NULL DEFAULT 0,
        due_date date NOT NULL,
        status finance_bill_status_enum NOT NULL DEFAULT 'open',
        account_id uuid REFERENCES finance_accounts(id) ON DELETE SET NULL,
        category_id uuid REFERENCES finance_categories(id) ON DELETE SET NULL,
        customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE finance_transfers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        from_account_id uuid NOT NULL REFERENCES finance_accounts(id),
        to_account_id uuid NOT NULL REFERENCES finance_accounts(id),
        amount numeric(14,2) NOT NULL,
        transfer_date date NOT NULL,
        description varchar(500),
        out_transaction_id uuid REFERENCES finance_transactions(id) ON DELETE SET NULL,
        in_transaction_id uuid REFERENCES finance_transactions(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE finance_recurring_rules (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        description varchar(500) NOT NULL,
        type finance_transactions_type_enum NOT NULL,
        amount numeric(14,2) NOT NULL,
        frequency finance_recurring_frequency_enum NOT NULL,
        next_due_date date NOT NULL,
        account_id uuid REFERENCES finance_accounts(id) ON DELETE SET NULL,
        category_id uuid REFERENCES finance_categories(id) ON DELETE SET NULL,
        source_id uuid REFERENCES finance_sources(id) ON DELETE SET NULL,
        active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE finance_employee_advances (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount numeric(14,2) NOT NULL,
        advance_date date NOT NULL,
        status finance_advance_status_enum NOT NULL DEFAULT 'open',
        notes text,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE finance_payroll_runs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        reference varchar(80) NOT NULL,
        period_start date NOT NULL,
        period_end date NOT NULL,
        status finance_payroll_status_enum NOT NULL DEFAULT 'draft',
        total_net numeric(14,2) NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE finance_payroll_lines (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        payroll_run_id uuid NOT NULL REFERENCES finance_payroll_runs(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        gross_amount numeric(14,2) NOT NULL,
        deductions numeric(14,2) NOT NULL DEFAULT 0,
        net_amount numeric(14,2) NOT NULL,
        notes text
      );
    `);

    await queryRunner.query(`
      CREATE TABLE finance_cash_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        account_id uuid NOT NULL REFERENCES finance_accounts(id) ON DELETE CASCADE,
        status finance_cash_session_status_enum NOT NULL DEFAULT 'open',
        opened_at timestamptz NOT NULL,
        closed_at timestamptz,
        opening_balance numeric(14,2) NOT NULL DEFAULT 0,
        expected_balance numeric(14,2),
        counted_balance numeric(14,2),
        opened_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        notes text
      );
    `);

    await queryRunner.query(`
      CREATE TABLE finance_daily_reconciliations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        reconciliation_date date NOT NULL,
        pdv_sales_total numeric(14,2) NOT NULL DEFAULT 0,
        finance_income_total numeric(14,2) NOT NULL DEFAULT 0,
        cash_counted numeric(14,2),
        difference numeric(14,2) NOT NULL DEFAULT 0,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, reconciliation_date)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE finance_card_receivables (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        reference_date date NOT NULL,
        acquirer varchar(120) NOT NULL DEFAULT 'PagBank / adquirente',
        gross_amount numeric(14,2) NOT NULL,
        fee_amount numeric(14,2) NOT NULL DEFAULT 0,
        net_amount numeric(14,2) NOT NULL,
        expected_deposit_date date,
        status finance_card_receivable_status_enum NOT NULL DEFAULT 'pending',
        transaction_id uuid REFERENCES finance_transactions(id) ON DELETE SET NULL,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE finance_bank_statement_lines (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        account_id uuid NOT NULL REFERENCES finance_accounts(id) ON DELETE CASCADE,
        line_date date NOT NULL,
        description varchar(500) NOT NULL,
        amount numeric(14,2) NOT NULL,
        matched_transaction_id uuid REFERENCES finance_transactions(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE finance_prepaid_wallets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        holder_name varchar(255) NOT NULL,
        customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
        balance numeric(14,2) NOT NULL DEFAULT 0,
        active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE finance_prepaid_movements (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        wallet_id uuid NOT NULL REFERENCES finance_prepaid_wallets(id) ON DELETE CASCADE,
        movement_type finance_prepaid_movement_type_enum NOT NULL,
        amount numeric(14,2) NOT NULL,
        description varchar(500),
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE finance_receipts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        receipt_number varchar(32) NOT NULL,
        issued_to varchar(255) NOT NULL,
        amount numeric(14,2) NOT NULL,
        description varchar(500) NOT NULL,
        issued_at date NOT NULL,
        transaction_id uuid REFERENCES finance_transactions(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, receipt_number)
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS finance_receipts CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS finance_prepaid_movements CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS finance_prepaid_wallets CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS finance_bank_statement_lines CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS finance_card_receivables CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS finance_daily_reconciliations CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS finance_cash_sessions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS finance_payroll_lines CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS finance_payroll_runs CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS finance_employee_advances CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS finance_recurring_rules CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS finance_transfers CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS finance_bills CASCADE`);
    await queryRunner.query(`
      ALTER TABLE finance_transactions
      DROP COLUMN IF EXISTS reference_id,
      DROP COLUMN IF EXISTS origin;
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS finance_prepaid_movement_type_enum CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS finance_card_receivable_status_enum CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS finance_cash_session_status_enum CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS finance_payroll_status_enum CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS finance_advance_status_enum CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS finance_recurring_frequency_enum CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS finance_bill_status_enum CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS finance_bill_type_enum CASCADE`);
  }
}
