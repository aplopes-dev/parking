import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFinanceModule1790000000000 implements MigrationInterface {
  name = 'CreateFinanceModule1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE finance_accounts_type_enum AS ENUM ('cash', 'bank', 'card', 'digital', 'other');
    `);
    await queryRunner.query(`
      CREATE TYPE finance_transactions_type_enum AS ENUM ('income', 'expense');
    `);
    await queryRunner.query(`
      CREATE TYPE finance_categories_level_enum AS ENUM ('macro', 'medium', 'micro');
    `);

    await queryRunner.query(`
      CREATE TABLE finance_accounts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name varchar(255) NOT NULL,
        type finance_accounts_type_enum NOT NULL DEFAULT 'bank',
        description text,
        active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX idx_finance_accounts_tenant ON finance_accounts(tenant_id);
    `);

    await queryRunner.query(`
      CREATE TABLE finance_sources (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name varchar(255) NOT NULL,
        type finance_transactions_type_enum NOT NULL,
        description text,
        active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX idx_finance_sources_tenant ON finance_sources(tenant_id);
    `);

    await queryRunner.query(`
      CREATE TABLE finance_categories (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name varchar(255) NOT NULL,
        type finance_transactions_type_enum NOT NULL,
        level finance_categories_level_enum NOT NULL,
        parent_id uuid REFERENCES finance_categories(id) ON DELETE SET NULL,
        active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX idx_finance_categories_tenant ON finance_categories(tenant_id);
    `);

    await queryRunner.query(`
      CREATE TABLE finance_tags (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name varchar(120) NOT NULL,
        color varchar(32) NOT NULL DEFAULT '#2563eb',
        active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, name)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE finance_transactions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        type finance_transactions_type_enum NOT NULL,
        description varchar(500) NOT NULL,
        amount numeric(14, 2) NOT NULL,
        transaction_date date NOT NULL,
        notes text,
        account_id uuid REFERENCES finance_accounts(id) ON DELETE SET NULL,
        source_id uuid REFERENCES finance_sources(id) ON DELETE SET NULL,
        category_id uuid REFERENCES finance_categories(id) ON DELETE SET NULL,
        attachment_key varchar(512),
        attachment_mime_type varchar(255),
        attachment_original_name varchar(500),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX idx_finance_transactions_tenant_date
        ON finance_transactions(tenant_id, transaction_date DESC);
    `);

    await queryRunner.query(`
      CREATE TABLE finance_transaction_tags (
        transaction_id uuid NOT NULL REFERENCES finance_transactions(id) ON DELETE CASCADE,
        tag_id uuid NOT NULL REFERENCES finance_tags(id) ON DELETE CASCADE,
        PRIMARY KEY (transaction_id, tag_id)
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS finance_transaction_tags CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS finance_transactions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS finance_tags CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS finance_categories CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS finance_sources CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS finance_accounts CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS finance_categories_level_enum CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS finance_transactions_type_enum CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS finance_accounts_type_enum CASCADE`);
  }
}
