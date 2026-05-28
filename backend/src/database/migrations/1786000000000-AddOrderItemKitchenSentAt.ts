import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderItemKitchenSentAt1786000000000 implements MigrationInterface {
  name = 'AddOrderItemKitchenSentAt1786000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE order_items
      ADD COLUMN IF NOT EXISTS kitchen_sent_at TIMESTAMP;
    `);
    await queryRunner.query(`
      UPDATE order_items
      SET kitchen_sent_at = "createdAt"
      WHERE kitchen_status = 'enviado_cozinha' AND kitchen_sent_at IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE order_items DROP COLUMN IF EXISTS kitchen_sent_at;
    `);
  }
}
