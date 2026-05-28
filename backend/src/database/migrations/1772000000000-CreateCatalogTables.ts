import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCatalogTables1772000000000 implements MigrationInterface {
  name = 'CreateCatalogTables1772000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_groups (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name character varying(120) NOT NULL,
        description text,
        sort_order integer NOT NULL DEFAULT 0,
        active boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_product_groups_tenant_name" UNIQUE (tenant_id, name)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_product_groups_tenant_active"
      ON product_groups (tenant_id, active);
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "products_unit_enum" AS ENUM('un', 'kg', 'l', 'porcao');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS products (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        group_id uuid REFERENCES product_groups(id) ON DELETE SET NULL,
        name character varying(200) NOT NULL,
        description text,
        sku character varying(64),
        cost_price numeric(14, 2) NOT NULL DEFAULT 0,
        sale_price numeric(14, 2) NOT NULL DEFAULT 0,
        unit "products_unit_enum" NOT NULL DEFAULT 'un',
        active boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_products_tenant_name" UNIQUE (tenant_id, name)
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_products_tenant_sku"
      ON products (tenant_id, sku)
      WHERE sku IS NOT NULL AND sku <> '';
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_products_tenant_group"
      ON products (tenant_id, group_id);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name character varying(200) NOT NULL,
        email character varying(255),
        phone character varying(32),
        document character varying(32),
        birth_date date,
        address text,
        city character varying(120),
        state character varying(2),
        zip_code character varying(16),
        allergy_notes text,
        notes text,
        active boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_customers_tenant_name"
      ON customers (tenant_id, name);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_customers_tenant_phone"
      ON customers (tenant_id, phone);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS customers CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS products CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS product_groups CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "products_unit_enum" CASCADE`);
  }
}
