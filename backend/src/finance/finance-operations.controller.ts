import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User, UserRole } from '../users/entities/user.entity';
import { FinanceBillType } from './entities/finance-extended.entities';
import {
  CloseCashSessionDto,
  CreateAdvanceDto,
  CreateBankStatementLineDto,
  CreateCardReceivableDto,
  CreateFinanceBillDto,
  CreateFinanceTransferDto,
  CreatePayrollLineDto,
  CreatePayrollRunDto,
  CreatePrepaidWalletDto,
  CreateReceiptDto,
  CreateRecurringRuleDto,
  FinanceCalendarQueryDto,
  FinancePeriodQueryDto,
  MatchBankLineDto,
  OpenCashSessionDto,
  PrepaidMovementDto,
  SettleBillsDto,
  SettleByCounterpartyDto,
  UpsertDailyReconciliationDto,
} from './dto/finance-operations.dto';
import { FinanceOperationsService } from './finance-operations.service';
import { FinanceReportsService } from './finance-reports.service';

@ApiTags('finance')
@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...Object.values(UserRole))
@ApiBearerAuth()
export class FinanceOperationsController {
  constructor(
    private readonly ops: FinanceOperationsService,
    private readonly reports: FinanceReportsService,
  ) {}

  @Get('bills')
  listBills(@CurrentUser() user: User, @Query('billType') billType?: FinanceBillType) {
    return this.ops.listBills(user.tenantId, billType);
  }

  @Post('bills')
  createBill(@Body() dto: CreateFinanceBillDto, @CurrentUser() user: User) {
    return this.ops.createBill(user.tenantId, dto);
  }

  @Post('bills/settle')
  settleBills(@Body() dto: SettleBillsDto, @CurrentUser() user: User) {
    return this.ops.settleBills(user, dto);
  }

  @Post('bills/settle-by-counterparty')
  settleByCounterparty(@Body() dto: SettleByCounterpartyDto, @CurrentUser() user: User) {
    return this.ops.settleByCounterparty(user, dto);
  }

  @Get('transfers')
  listTransfers(@CurrentUser() user: User) {
    return this.ops.listTransfers(user.tenantId);
  }

  @Post('transfers')
  createTransfer(@Body() dto: CreateFinanceTransferDto, @CurrentUser() user: User) {
    return this.ops.createTransfer(user, dto);
  }

  @Get('recurring')
  listRecurring(@CurrentUser() user: User) {
    return this.ops.listRecurring(user.tenantId);
  }

  @Post('recurring')
  createRecurring(@Body() dto: CreateRecurringRuleDto, @CurrentUser() user: User) {
    return this.ops.createRecurring(user.tenantId, dto);
  }

  @Post('recurring/run-due')
  runRecurring(@CurrentUser() user: User) {
    return this.ops.runRecurringDue(user);
  }

  @Get('advances')
  listAdvances(@CurrentUser() user: User) {
    return this.ops.listAdvances(user.tenantId);
  }

  @Post('advances')
  createAdvance(@Body() dto: CreateAdvanceDto, @CurrentUser() user: User) {
    return this.ops.createAdvance(user.tenantId, dto);
  }

  @Post('advances/:id/settle')
  settleAdvance(@Param('id') id: string, @CurrentUser() user: User) {
    return this.ops.settleAdvance(user, id);
  }

  @Get('payroll')
  listPayroll(@CurrentUser() user: User) {
    return this.ops.listPayrollRuns(user.tenantId);
  }

  @Get('payroll/users')
  payrollUsers(@CurrentUser() user: User) {
    return this.ops.listTenantUsers(user.tenantId);
  }

  @Post('payroll')
  createPayroll(@Body() dto: CreatePayrollRunDto, @CurrentUser() user: User) {
    return this.ops.createPayrollRun(user.tenantId, dto);
  }

  @Get('payroll/:id')
  getPayroll(@Param('id') id: string, @CurrentUser() user: User) {
    return this.ops.getPayrollRun(user.tenantId, id);
  }

  @Post('payroll/:id/lines')
  addPayrollLine(
    @Param('id') id: string,
    @Body() dto: CreatePayrollLineDto,
    @CurrentUser() user: User,
  ) {
    return this.ops.addPayrollLine(user.tenantId, id, dto);
  }

  @Post('payroll/:id/close')
  closePayroll(
    @Param('id') id: string,
    @Body('accountId') accountId: string,
    @CurrentUser() user: User,
  ) {
    return this.ops.closePayrollRun(user, id, accountId);
  }

  @Delete('payroll/:id')
  removePayroll(@Param('id') id: string, @CurrentUser() user: User) {
    return this.ops.removePayrollRun(user.tenantId, id);
  }

  @Get('cash-sessions')
  listCashSessions(@CurrentUser() user: User) {
    return this.ops.listCashSessions(user.tenantId);
  }

  @Post('cash-sessions/open')
  openCash(@Body() dto: OpenCashSessionDto, @CurrentUser() user: User) {
    return this.ops.openCashSession(user, dto.accountId, dto.openingBalance, dto.notes);
  }

  @Post('cash-sessions/:id/close')
  closeCash(
    @Param('id') id: string,
    @Body() dto: CloseCashSessionDto,
    @CurrentUser() user: User,
  ) {
    return this.ops.closeCashSession(user, id, dto.countedBalance, dto.notes);
  }

  @Get('daily-reconciliation')
  listDaily(@CurrentUser() user: User, @Query() query: FinancePeriodQueryDto) {
    return this.ops.listDailyReconciliations(user.tenantId, query);
  }

  @Post('daily-reconciliation')
  upsertDaily(@Body() dto: UpsertDailyReconciliationDto, @CurrentUser() user: User) {
    return this.ops.upsertDailyReconciliation(user.tenantId, dto);
  }

  @Get('card-receivables')
  listCards(@CurrentUser() user: User) {
    return this.ops.listCardReceivables(user.tenantId);
  }

  @Post('card-receivables')
  createCard(@Body() dto: CreateCardReceivableDto, @CurrentUser() user: User) {
    return this.ops.createCardReceivable(user.tenantId, dto);
  }

  @Post('card-receivables/:id/deposit')
  depositCard(
    @Param('id') id: string,
    @Body('accountId') accountId: string,
    @CurrentUser() user: User,
  ) {
    return this.ops.depositCardReceivable(user, id, accountId);
  }

  @Get('bank-lines')
  listBankLines(@CurrentUser() user: User, @Query('accountId') accountId?: string) {
    return this.ops.listBankLines(user.tenantId, accountId);
  }

  @Post('bank-lines')
  createBankLine(@Body() dto: CreateBankStatementLineDto, @CurrentUser() user: User) {
    return this.ops.createBankLine(user.tenantId, dto);
  }

  @Post('bank-lines/:id/match')
  matchBankLine(
    @Param('id') id: string,
    @Body() dto: MatchBankLineDto,
    @CurrentUser() user: User,
  ) {
    return this.ops.matchBankLine(user.tenantId, id, dto.transactionId);
  }

  @Get('prepaid-wallets')
  listPrepaid(@CurrentUser() user: User) {
    return this.ops.listPrepaidWallets(user.tenantId);
  }

  @Post('prepaid-wallets')
  createPrepaid(@Body() dto: CreatePrepaidWalletDto, @CurrentUser() user: User) {
    return this.ops.createPrepaidWallet(user.tenantId, dto);
  }

  @Post('prepaid-wallets/:id/movements')
  prepaidMovement(
    @Param('id') id: string,
    @Body() dto: PrepaidMovementDto,
    @CurrentUser() user: User,
  ) {
    return this.ops.prepaidMovement(user.tenantId, id, dto);
  }

  @Get('receipts')
  listReceipts(@CurrentUser() user: User) {
    return this.ops.listReceipts(user.tenantId);
  }

  @Post('receipts')
  createReceipt(@Body() dto: CreateReceiptDto, @CurrentUser() user: User) {
    return this.ops.createReceipt(user.tenantId, dto);
  }

  @Get('reports/calendar')
  @ApiOperation({ summary: 'Calendário financeiro por mês' })
  calendar(@CurrentUser() user: User, @Query() query: FinanceCalendarQueryDto) {
    return this.reports.getCalendar(user.tenantId, query);
  }

  @Get('reports/statement/:accountId')
  @ApiOperation({ summary: 'Extrato de conta' })
  statement(
    @Param('accountId') accountId: string,
    @CurrentUser() user: User,
    @Query() query: FinancePeriodQueryDto,
  ) {
    return this.reports.getAccountStatement(user.tenantId, accountId, query);
  }

  @Get('reports/dre')
  dre(@CurrentUser() user: User, @Query() query: FinancePeriodQueryDto) {
    return this.reports.getDre(user.tenantId, query);
  }

  @Get('reports/cash-flow')
  cashFlow(@CurrentUser() user: User, @Query() query: FinancePeriodQueryDto) {
    return this.reports.getCashFlow(user.tenantId, query);
  }

  @Get('reports/dashboard')
  dashboard(@CurrentUser() user: User, @Query() query: FinancePeriodQueryDto) {
    return this.reports.getFinanceDashboard(user.tenantId, query);
  }
}
