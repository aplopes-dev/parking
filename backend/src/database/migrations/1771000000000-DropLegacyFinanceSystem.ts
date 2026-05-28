import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Remove tabelas e tipos do sistema financeiro/feedback legado.
 * Mantém apenas tenants, users e migrations.
 */
export class DropLegacyFinanceSystem1771000000000 implements MigrationInterface {
  name = 'DropLegacyFinanceSystem1771000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "finance_transaction_tags" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "finance_transactions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payroll_expense_lines" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payroll_expense_sheets" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "finance_keywords" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "finance_tags" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "finance_categories" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "finance_sources" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "finance_accounts" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reverse_feedbacks" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "feedbacks" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cycles" CASCADE`);

    await queryRunner.query(`DROP TYPE IF EXISTS "finance_accounts_type_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "finance_categories_level_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "finance_keywords_scope_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "finance_transactions_type_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "feedbacks_codeadherence_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "feedbacks_validationcompleteness_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "reverse_feedbacks_clarityquestion_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "reverse_feedbacks_availabilityquestion_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "reverse_feedbacks_feedbackqualityquestion_enum" CASCADE`);
  }

  public async down(): Promise<void> {
    // Sem rollback — schema legado removido de propósito.
  }
}
