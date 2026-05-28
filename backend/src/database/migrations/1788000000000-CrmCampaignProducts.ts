import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrmCampaignProducts1788000000000 implements MigrationInterface {
  name = 'CrmCampaignProducts1788000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS crm_campaign_products (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        campaign_id uuid NOT NULL REFERENCES crm_campaigns(id) ON DELETE CASCADE,
        product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_crm_campaign_products_campaign_product"
          UNIQUE (campaign_id, product_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_crm_campaign_products_campaign"
      ON crm_campaign_products (campaign_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_crm_campaign_products_tenant"
      ON crm_campaign_products (tenant_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS crm_campaign_products CASCADE`);
  }
}
