import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStockTables1773000000000 implements MigrationInterface {
  name = 'CreateStockTables1773000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stock_locations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name character varying(120) NOT NULL,
        description text,
        is_default boolean NOT NULL DEFAULT false,
        active boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_stock_locations_tenant_name" UNIQUE (tenant_id, name)
      );
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "stock_movement_type_enum" AS ENUM(
          'entrada', 'saida', 'acerto', 'producao_entrada', 'producao_saida'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stock_balances (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        location_id uuid NOT NULL REFERENCES stock_locations(id) ON DELETE CASCADE,
        quantity numeric(14, 4) NOT NULL DEFAULT 0,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_stock_balances_tenant_product_location"
          UNIQUE (tenant_id, product_id, location_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_stock_balances_tenant_location"
      ON stock_balances (tenant_id, location_id);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        location_id uuid NOT NULL REFERENCES stock_locations(id) ON DELETE RESTRICT,
        type "stock_movement_type_enum" NOT NULL,
        quantity numeric(14, 4) NOT NULL,
        balance_before numeric(14, 4) NOT NULL,
        balance_after numeric(14, 4) NOT NULL,
        reason character varying(120),
        notes text,
        reference_type character varying(64),
        reference_id uuid,
        created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_stock_movements_tenant_created"
      ON stock_movements (tenant_id, "createdAt" DESC);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stock_minimums (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        location_id uuid REFERENCES stock_locations(id) ON DELETE CASCADE,
        minimum_quantity numeric(14, 4) NOT NULL DEFAULT 0,
        active boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_stock_minimums_tenant_product_location"
      ON stock_minimums (tenant_id, product_id, COALESCE(location_id, '00000000-0000-0000-0000-000000000000'::uuid));
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS technical_sheets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        name character varying(200) NOT NULL,
        yield_quantity numeric(14, 4) NOT NULL DEFAULT 1,
        notes text,
        active boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_technical_sheets_tenant_product" UNIQUE (tenant_id, product_id)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS technical_sheet_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        sheet_id uuid NOT NULL REFERENCES technical_sheets(id) ON DELETE CASCADE,
        ingredient_product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        quantity numeric(14, 4) NOT NULL,
        unit "products_unit_enum" NOT NULL DEFAULT 'un',
        sort_order integer NOT NULL DEFAULT 0,
        CONSTRAINT "UQ_technical_sheet_items_sheet_ingredient"
          UNIQUE (sheet_id, ingredient_product_id)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS recipe_productions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        sheet_id uuid NOT NULL REFERENCES technical_sheets(id) ON DELETE RESTRICT,
        location_id uuid NOT NULL REFERENCES stock_locations(id) ON DELETE RESTRICT,
        quantity_produced numeric(14, 4) NOT NULL,
        notes text,
        created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS recipe_productions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS technical_sheet_items CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS technical_sheets CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS stock_minimums CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS stock_movements CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS stock_balances CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS stock_locations CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "stock_movement_type_enum" CASCADE`);
  }
}
