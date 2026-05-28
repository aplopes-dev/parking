import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { PagbankSandboxTestService } from './pagbank-sandbox-test.service';
import {
  PagbankCompleteDebit3dsTestDto,
  PagbankQuerySplitTestDto,
  PagbankRunRecurringTestDto,
} from './dto/pagbank-sandbox-test.dto';
import { PagbankVerifyTokenDto } from './dto/pagbank-verify-token.dto';

@ApiTags('payments-pagbank-test')
@Controller('payments/pagbank/test')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PagbankSandboxTestController {
  constructor(private readonly sandboxTest: PagbankSandboxTestService) {}

  @Get('panel')
  getPanel(@CurrentUser() user: User) {
    return this.sandboxTest.getTestPanel(user.tenantId);
  }

  @Post('verify-token')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  verifyToken(@Body() dto: PagbankVerifyTokenDto, @CurrentUser() user: User) {
    return this.sandboxTest.verifyToken(user.tenantId, dto.token, dto.environment);
  }

  @Post('ensure-plan')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  ensurePlan(@CurrentUser() user: User) {
    return this.sandboxTest.ensureTestPlan(user.tenantId);
  }

  @Post('recurring/run')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  runRecurring(@Body() dto: PagbankRunRecurringTestDto, @CurrentUser() user: User) {
    return this.sandboxTest.runRecurringScenario(user.tenantId, dto.scenarioId);
  }

  @Post('orders/pix')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  runOrdersPix(@CurrentUser() user: User) {
    return this.sandboxTest.runOrdersPixSandbox(user.tenantId);
  }

  @Post('orders/boleto')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  runOrdersBoleto(@CurrentUser() user: User) {
    return this.sandboxTest.runOrdersBoletoSandbox(user.tenantId);
  }

  @Post('orders/split')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  runOrdersSplit(@CurrentUser() user: User) {
    return this.sandboxTest.runOrdersSplitSandbox(user.tenantId);
  }

  @Post('orders/split/pix')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  runOrdersSplitPix(@CurrentUser() user: User) {
    return this.sandboxTest.runOrdersSplitPixSandbox(user.tenantId);
  }

  @Post('orders/split/query')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  runOrdersSplitQuery(
    @Body() dto: PagbankQuerySplitTestDto,
    @CurrentUser() user: User,
  ) {
    return this.sandboxTest.runOrdersSplitQuerySandbox(user.tenantId, dto);
  }

  @Post('orders/card')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  runOrdersCard(@Body() dto: PagbankRunRecurringTestDto, @CurrentUser() user: User) {
    return this.sandboxTest.runOrdersCardSandbox(user.tenantId, dto.scenarioId);
  }

  @Post('orders/debit/prepare')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  prepareOrdersDebit3ds(@Body() dto: PagbankRunRecurringTestDto, @CurrentUser() user: User) {
    return this.sandboxTest.prepareOrdersDebit3dsSandbox(user.tenantId, dto.scenarioId);
  }

  @Post('orders/debit/complete')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  completeOrdersDebit3ds(
    @Body() dto: PagbankCompleteDebit3dsTestDto,
    @CurrentUser() user: User,
  ) {
    return this.sandboxTest.completeOrdersDebit3dsSandbox(
      user.tenantId,
      dto.scenarioId,
      dto.threeDsId,
    );
  }
}
