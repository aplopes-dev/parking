import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Schema mínimo multitenant: tenants + users.
 * Idempotente (IF NOT EXISTS) para instalações novas após remoção do legado financeiro.
 */
export class CoreTenantsAndUsers1770000000000 implements MigrationInterface {
  name = 'CoreTenantsAndUsers1770000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "users_role_enum" AS ENUM('admin', 'manager', 'developer', 'hr');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "users_level_enum" AS ENUM('junior', 'pleno', 'senior');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        name character varying NOT NULL,
        slug character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_tenants_slug" UNIQUE (slug)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        email character varying NOT NULL,
        password character varying NOT NULL,
        name character varying NOT NULL,
        role "users_role_enum" NOT NULL DEFAULT 'developer',
        level "users_level_enum",
        "photoKey" character varying,
        "photoMimeType" character varying,
        "managerId" uuid REFERENCES users(id) ON DELETE SET NULL,
        active boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_tenant_id_email" UNIQUE (tenant_id, email)
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS users CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS tenants CASCADE`);
  }
}
