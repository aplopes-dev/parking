import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCrmTables1774000000000 implements MigrationInterface {
  name = 'CreateCrmTables1774000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "crm_segment_enum" AS ENUM('novo', 'regular', 'vip', 'inativo');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "crm_interaction_type_enum" AS ENUM(
          'ligacao', 'visita', 'pedido', 'campanha', 'observacao', 'fidelidade'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "crm_campaign_status_enum" AS ENUM('rascunho', 'ativa', 'pausada', 'encerrada');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "crm_campaign_type_enum" AS ENUM('promocao', 'desconto', 'combo', 'comunicado');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "crm_campaign_channel_enum" AS ENUM('whatsapp', 'email', 'pdv', 'geral');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "crm_discount_type_enum" AS ENUM('percentual', 'valor_fixo', 'nenhum');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "crm_loyalty_tier_enum" AS ENUM('bronze', 'prata', 'ouro');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "crm_loyalty_tx_type_enum" AS ENUM('ganho', 'resgate', 'ajuste');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS crm_customer_profiles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        segment "crm_segment_enum" NOT NULL DEFAULT 'novo',
        tags character varying(255),
        preferred_channel character varying(32),
        marketing_opt_in boolean NOT NULL DEFAULT true,
        last_contact_at TIMESTAMP,
        crm_notes text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_crm_profiles_tenant_customer" UNIQUE (tenant_id, customer_id)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS crm_interactions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        type "crm_interaction_type_enum" NOT NULL,
        subject character varying(200) NOT NULL,
        notes text,
        created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_crm_interactions_customer"
      ON crm_interactions (tenant_id, customer_id, "createdAt" DESC);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS crm_campaigns (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name character varying(200) NOT NULL,
        description text,
        type "crm_campaign_type_enum" NOT NULL DEFAULT 'promocao',
        status "crm_campaign_status_enum" NOT NULL DEFAULT 'rascunho',
        channel "crm_campaign_channel_enum" NOT NULL DEFAULT 'geral',
        discount_type "crm_discount_type_enum" NOT NULL DEFAULT 'nenhum',
        discount_value numeric(14, 2) NOT NULL DEFAULT 0,
        audience_segment "crm_segment_enum",
        starts_at TIMESTAMP,
        ends_at TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_crm_campaigns_tenant_status"
      ON crm_campaigns (tenant_id, status);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS crm_loyalty_programs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name character varying(200) NOT NULL,
        description text,
        points_per_real numeric(10, 4) NOT NULL DEFAULT 1,
        redeem_rate numeric(10, 4) NOT NULL DEFAULT 0.01,
        min_redeem_points integer NOT NULL DEFAULT 100,
        tier_silver_min integer NOT NULL DEFAULT 500,
        tier_gold_min integer NOT NULL DEFAULT 2000,
        active boolean NOT NULL DEFAULT true,
        is_default boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS crm_loyalty_accounts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        program_id uuid NOT NULL REFERENCES crm_loyalty_programs(id) ON DELETE CASCADE,
        points_balance integer NOT NULL DEFAULT 0,
        lifetime_points integer NOT NULL DEFAULT 0,
        tier "crm_loyalty_tier_enum" NOT NULL DEFAULT 'bronze',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_loyalty_account" UNIQUE (tenant_id, customer_id, program_id)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS crm_loyalty_transactions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        account_id uuid NOT NULL REFERENCES crm_loyalty_accounts(id) ON DELETE CASCADE,
        type "crm_loyalty_tx_type_enum" NOT NULL,
        points integer NOT NULL,
        balance_after integer NOT NULL,
        notes text,
        reference_type character varying(64),
        reference_id uuid,
        created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS crm_loyalty_transactions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS crm_loyalty_accounts CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS crm_loyalty_programs CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS crm_campaigns CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS crm_interactions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS crm_customer_profiles CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "crm_loyalty_tx_type_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "crm_loyalty_tier_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "crm_discount_type_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "crm_campaign_channel_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "crm_campaign_type_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "crm_campaign_status_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "crm_interaction_type_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "crm_segment_enum" CASCADE`);
  }
}
