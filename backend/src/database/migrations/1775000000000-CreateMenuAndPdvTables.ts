import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMenuAndPdvTables1775000000000 implements MigrationInterface {
  name = 'CreateMenuAndPdvTables1775000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "menu_channel_enum" AS ENUM('mesa', 'delivery');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS menu_settings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        channel "menu_channel_enum" NOT NULL,
        title character varying(200) NOT NULL DEFAULT 'Cardápio',
        welcome_message text,
        active boolean NOT NULL DEFAULT true,
        service_fee_enabled boolean NOT NULL DEFAULT false,
        service_fee_percent numeric(5, 2) NOT NULL DEFAULT 10,
        min_order_amount numeric(14, 2) NOT NULL DEFAULT 0,
        estimated_minutes integer NOT NULL DEFAULT 40,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_menu_settings_tenant_channel" UNIQUE (tenant_id, channel)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS menu_products (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        channel "menu_channel_enum" NOT NULL,
        visible boolean NOT NULL DEFAULT true,
        featured boolean NOT NULL DEFAULT false,
        sort_order integer NOT NULL DEFAULT 0,
        promo_label character varying(80),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_menu_products_tenant_product_channel" UNIQUE (tenant_id, product_id, channel)
      );
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "order_type_enum" AS ENUM('balcao', 'comanda', 'delivery', 'tablet', 'online');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "order_status_enum" AS ENUM(
          'aberto', 'confirmado', 'preparando', 'pronto', 'em_entrega', 'fechado', 'cancelado'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "payment_method_enum" AS ENUM(
          'dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'vale'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "comanda_status_enum" AS ENUM('livre', 'ocupada', 'reservada');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pdv_settings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        default_service_fee_percent numeric(5, 2) NOT NULL DEFAULT 10,
        allow_split_bill boolean NOT NULL DEFAULT true,
        maps_enabled boolean NOT NULL DEFAULT false,
        maps_embed_url text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_pdv_settings_tenant" UNIQUE (tenant_id)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS comandas (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        number integer NOT NULL,
        label character varying(80),
        status "comanda_status_enum" NOT NULL DEFAULT 'livre',
        current_order_id uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_comandas_tenant_number" UNIQUE (tenant_id, number)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        order_number integer NOT NULL,
        type "order_type_enum" NOT NULL,
        status "order_status_enum" NOT NULL DEFAULT 'aberto',
        comanda_id uuid REFERENCES comandas(id) ON DELETE SET NULL,
        customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
        table_label character varying(40),
        subtotal numeric(14, 2) NOT NULL DEFAULT 0,
        discount numeric(14, 2) NOT NULL DEFAULT 0,
        service_fee numeric(14, 2) NOT NULL DEFAULT 0,
        delivery_fee numeric(14, 2) NOT NULL DEFAULT 0,
        total numeric(14, 2) NOT NULL DEFAULT 0,
        notes text,
        delivery_address text,
        delivery_lat numeric(10, 7),
        delivery_lng numeric(10, 7),
        opened_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        closed_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        opened_at TIMESTAMP NOT NULL DEFAULT now(),
        closed_at TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_orders_tenant_number" UNIQUE (tenant_id, order_number)
      );
    `);

    await queryRunner.query(`
      ALTER TABLE comandas
      ADD CONSTRAINT "FK_comandas_current_order"
      FOREIGN KEY (current_order_id) REFERENCES orders(id) ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_orders_tenant_status"
      ON orders (tenant_id, status, "createdAt" DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_orders_tenant_type"
      ON orders (tenant_id, type);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        product_name character varying(200) NOT NULL,
        quantity numeric(14, 4) NOT NULL DEFAULT 1,
        unit_price numeric(14, 2) NOT NULL,
        total numeric(14, 2) NOT NULL,
        notes text,
        sort_order integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS order_payments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        method "payment_method_enum" NOT NULL,
        amount numeric(14, 2) NOT NULL,
        paid_at TIMESTAMP NOT NULL DEFAULT now(),
        created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS order_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        action character varying(80) NOT NULL,
        message text NOT NULL,
        created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_order_logs_tenant_created"
      ON order_logs (tenant_id, "createdAt" DESC);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS bill_splits (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        label character varying(80) NOT NULL,
        amount numeric(14, 2) NOT NULL,
        paid boolean NOT NULL DEFAULT false,
        payment_method "payment_method_enum",
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE comandas DROP CONSTRAINT IF EXISTS "FK_comandas_current_order"`);
    await queryRunner.query(`DROP TABLE IF EXISTS bill_splits CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS order_logs CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS order_payments CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS order_items CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS orders CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS comandas CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS pdv_settings CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS menu_products CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS menu_settings CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "comanda_status_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_method_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "order_status_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "order_type_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "menu_channel_enum" CASCADE`);
  }
}
