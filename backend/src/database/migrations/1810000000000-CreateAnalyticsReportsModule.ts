import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAnalyticsReportsModule1810000000000 implements MigrationInterface {
  name = 'CreateAnalyticsReportsModule1810000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE analytics_online_access_log (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        channel varchar(32) NOT NULL,
        source varchar(64) NOT NULL DEFAULT 'menu',
        accessed_at timestamptz NOT NULL DEFAULT now(),
        metadata jsonb
      );
    `);
    await queryRunner.query(`
      CREATE INDEX idx_analytics_online_access_tenant_date
      ON analytics_online_access_log(tenant_id, accessed_at DESC);
    `);

    await queryRunner.query(`
      CREATE TABLE analytics_kpi_targets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        metric_key varchar(64) NOT NULL,
        label varchar(255) NOT NULL,
        target_value decimal(14,2) NOT NULL,
        period varchar(16) NOT NULL DEFAULT 'monthly',
        active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(tenant_id, metric_key)
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS analytics_kpi_targets`);
    await queryRunner.query(`DROP TABLE IF EXISTS analytics_online_access_log`);
  }
}
