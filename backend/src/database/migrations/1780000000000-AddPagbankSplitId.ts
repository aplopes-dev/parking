import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPagbankSplitId1780000000000 implements MigrationInterface {
  name = 'AddPagbankSplitId1780000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE pagbank_transactions
      ADD COLUMN IF NOT EXISTS pagbank_split_id character varying(80);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_pagbank_transactions_split"
      ON pagbank_transactions (pagbank_split_id)
      WHERE pagbank_split_id IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_pagbank_transactions_split"`);
    await queryRunner.query(`
      ALTER TABLE pagbank_transactions
      DROP COLUMN IF EXISTS pagbank_split_id;
    `);
  }
}
