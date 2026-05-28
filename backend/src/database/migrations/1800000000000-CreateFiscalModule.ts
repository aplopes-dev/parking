import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFiscalModule1800000000000 implements MigrationInterface {
  name = 'CreateFiscalModule1800000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE fiscal_environment_enum AS ENUM ('homologation', 'production');
    `);
    await queryRunner.query(`
      CREATE TYPE fiscal_order_type_enum AS ENUM ('sale', 'purchase');
    `);
    await queryRunner.query(`
      CREATE TYPE fiscal_order_status_enum AS ENUM ('draft', 'confirmed', 'cancelled');
    `);
    await queryRunner.query(`
      CREATE TYPE fiscal_return_type_enum AS ENUM ('sale_return', 'purchase_return');
    `);
    await queryRunner.query(`
      CREATE TYPE fiscal_invoice_type_enum AS ENUM ('nfe', 'nfce');
    `);
    await queryRunner.query(`
      CREATE TYPE fiscal_invoice_direction_enum AS ENUM ('emitted', 'received');
    `);
    await queryRunner.query(`
      CREATE TYPE fiscal_invoice_status_enum AS ENUM (
        'draft', 'processing', 'authorized', 'rejected', 'cancelled', 'voided'
      );
    `);

    await queryRunner.query(`
      CREATE TABLE fiscal_settings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
        legal_name varchar(255) NOT NULL DEFAULT '',
        trade_name varchar(255),
        cnpj varchar(18),
        state_registration varchar(32),
        municipal_registration varchar(32),
        tax_regime varchar(40) DEFAULT 'simples_nacional',
        environment fiscal_environment_enum NOT NULL DEFAULT 'homologation',
        nfe_series int NOT NULL DEFAULT 1,
        nfce_series int NOT NULL DEFAULT 1,
        last_nfe_number int NOT NULL DEFAULT 0,
        last_nfce_number int NOT NULL DEFAULT 0,
        certificate_hint varchar(255),
        sefaz_notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE fiscal_orders (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        order_type fiscal_order_type_enum NOT NULL,
        status fiscal_order_status_enum NOT NULL DEFAULT 'draft',
        reference_code varchar(40),
        pdv_order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
        customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
        counterparty_name varchar(255) NOT NULL,
        counterparty_document varchar(20),
        issue_date date NOT NULL,
        total_amount decimal(14,2) NOT NULL DEFAULT 0,
        notes text,
        created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX idx_fiscal_orders_tenant ON fiscal_orders(tenant_id);`);

    await queryRunner.query(`
      CREATE TABLE fiscal_order_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        fiscal_order_id uuid NOT NULL REFERENCES fiscal_orders(id) ON DELETE CASCADE,
        product_name varchar(255) NOT NULL,
        ncm varchar(12),
        cfop varchar(8),
        unit varchar(10) NOT NULL DEFAULT 'UN',
        quantity decimal(14,4) NOT NULL DEFAULT 1,
        unit_price decimal(14,4) NOT NULL DEFAULT 0,
        total_price decimal(14,2) NOT NULL DEFAULT 0
      );
    `);

    await queryRunner.query(`
      CREATE TABLE fiscal_returns (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        return_type fiscal_return_type_enum NOT NULL,
        fiscal_order_id uuid REFERENCES fiscal_orders(id) ON DELETE SET NULL,
        fiscal_invoice_id uuid,
        reason text NOT NULL,
        return_date date NOT NULL,
        total_amount decimal(14,2) NOT NULL DEFAULT 0,
        created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE fiscal_invoices (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        invoice_type fiscal_invoice_type_enum NOT NULL,
        direction fiscal_invoice_direction_enum NOT NULL,
        status fiscal_invoice_status_enum NOT NULL DEFAULT 'draft',
        number int,
        series int NOT NULL DEFAULT 1,
        access_key varchar(44),
        issue_date timestamptz,
        counterparty_name varchar(255),
        counterparty_document varchar(20),
        total_amount decimal(14,2) NOT NULL DEFAULT 0,
        fiscal_order_id uuid REFERENCES fiscal_orders(id) ON DELETE SET NULL,
        pdv_order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
        xml_storage_key varchar(512),
        cancellation_reason text,
        cancelled_at timestamptz,
        rejection_message text,
        created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX idx_fiscal_invoices_tenant ON fiscal_invoices(tenant_id);`);

    await queryRunner.query(`
      ALTER TABLE fiscal_returns
      ADD CONSTRAINT fk_fiscal_returns_invoice
      FOREIGN KEY (fiscal_invoice_id) REFERENCES fiscal_invoices(id) ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE fiscal_number_voids (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        invoice_type fiscal_invoice_type_enum NOT NULL,
        series int NOT NULL,
        number_from int NOT NULL,
        number_to int NOT NULL,
        reason text NOT NULL,
        void_date date NOT NULL,
        created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE fiscal_accountants (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        name varchar(255) NOT NULL,
        email varchar(255) NOT NULL,
        crc varchar(32),
        can_export boolean NOT NULL DEFAULT true,
        can_emit boolean NOT NULL DEFAULT false,
        active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX idx_fiscal_accountants_tenant ON fiscal_accountants(tenant_id);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS fiscal_accountants`);
    await queryRunner.query(`DROP TABLE IF EXISTS fiscal_number_voids`);
    await queryRunner.query(`ALTER TABLE fiscal_returns DROP CONSTRAINT IF EXISTS fk_fiscal_returns_invoice`);
    await queryRunner.query(`DROP TABLE IF EXISTS fiscal_returns`);
    await queryRunner.query(`DROP TABLE IF EXISTS fiscal_invoices`);
    await queryRunner.query(`DROP TABLE IF EXISTS fiscal_order_items`);
    await queryRunner.query(`DROP TABLE IF EXISTS fiscal_orders`);
    await queryRunner.query(`DROP TABLE IF EXISTS fiscal_settings`);
    await queryRunner.query(`DROP TYPE IF EXISTS fiscal_invoice_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS fiscal_invoice_direction_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS fiscal_invoice_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS fiscal_return_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS fiscal_order_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS fiscal_order_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS fiscal_environment_enum`);
  }
}
