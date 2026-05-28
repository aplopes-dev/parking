import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User, UserRole } from '../users/entities/user.entity';
import {
  CancelFiscalInvoiceDto,
  CreateFiscalAccountantDto,
  CreateFiscalNumberVoidDto,
  CreateFiscalOrderDto,
  CreateFiscalOrderFromPdvDto,
  CreateFiscalReturnDto,
  EmitFiscalInvoiceDto,
  FiscalInvoicesQueryDto,
  FiscalOrdersQueryDto,
  FiscalReturnsQueryDto,
  UpdateFiscalReturnDto,
  UpdateFiscalAccountantDto,
  UpdateFiscalOrderDto,
  UpdateFiscalSettingsDto,
} from './dto/fiscal.dto';
import { FiscalInvoiceType } from './entities/fiscal.entities';
import { FiscalService } from './fiscal.service';

@ApiTags('fiscal')
@Controller('fiscal')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...Object.values(UserRole))
@ApiBearerAuth()
export class FiscalController {
  constructor(private readonly fiscal: FiscalService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Resumo fiscal do tenant' })
  overview(@CurrentUser() user: User) {
    return this.fiscal.getOverview(user.tenantId);
  }

  @Get('settings')
  getSettings(@CurrentUser() user: User) {
    return this.fiscal.getOrCreateSettings(user.tenantId);
  }

  @Patch('settings')
  updateSettings(@CurrentUser() user: User, @Body() dto: UpdateFiscalSettingsDto) {
    return this.fiscal.updateSettings(user.tenantId, dto);
  }

  @Get('orders')
  listOrders(@CurrentUser() user: User, @Query() query: FiscalOrdersQueryDto) {
    return this.fiscal.listOrders(user.tenantId, query);
  }

  @Get('orders/:id')
  getOrder(@CurrentUser() user: User, @Param('id') id: string) {
    return this.fiscal.getOrder(user.tenantId, id);
  }

  @Post('orders')
  createOrder(@CurrentUser() user: User, @Body() dto: CreateFiscalOrderDto) {
    return this.fiscal.createOrder(user, dto);
  }

  @Post('orders/from-pdv')
  createFromPdv(@CurrentUser() user: User, @Body() dto: CreateFiscalOrderFromPdvDto) {
    return this.fiscal.createOrderFromPdv(user, dto);
  }

  @Patch('orders/:id')
  updateOrder(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateFiscalOrderDto,
  ) {
    return this.fiscal.updateOrder(user.tenantId, id, dto);
  }

  @Get('returns')
  listReturns(@CurrentUser() user: User, @Query() query: FiscalReturnsQueryDto) {
    return this.fiscal.listReturns(user.tenantId, query);
  }

  @Post('returns')
  createReturn(@CurrentUser() user: User, @Body() dto: CreateFiscalReturnDto) {
    return this.fiscal.createReturn(user, dto);
  }

  @Patch('returns/:id')
  updateReturn(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateFiscalReturnDto,
  ) {
    return this.fiscal.updateReturn(user.tenantId, id, dto);
  }

  @Delete('returns/:id')
  deleteReturn(@CurrentUser() user: User, @Param('id') id: string) {
    return this.fiscal.deleteReturn(user.tenantId, id);
  }

  @Get('invoices')
  listInvoices(@CurrentUser() user: User, @Query() query: FiscalInvoicesQueryDto) {
    return this.fiscal.listInvoices(user.tenantId, query);
  }

  @Get('invoices/:id')
  getInvoice(@CurrentUser() user: User, @Param('id') id: string) {
    return this.fiscal.getInvoice(user.tenantId, id);
  }

  @Post('invoices/emit')
  emit(@CurrentUser() user: User, @Body() dto: EmitFiscalInvoiceDto) {
    return this.fiscal.emitInvoice(user, dto);
  }

  @Post('invoices/:id/cancel')
  cancel(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: CancelFiscalInvoiceDto,
  ) {
    return this.fiscal.cancelInvoice(user, id, dto);
  }

  @Post('invoices/import')
  @UseInterceptors(FileInterceptor('file'))
  importInvoice(
    @CurrentUser() user: User,
    @Body('xmlContent') xmlContent: string,
    @Body('invoiceType') invoiceType: FiscalInvoiceType | undefined,
    @UploadedFile() file?: { buffer: Buffer; originalname?: string },
  ) {
    const content = file?.buffer?.toString('utf-8') ?? xmlContent ?? '';
    return this.fiscal.importInvoice(
      user,
      content,
      invoiceType,
      file?.buffer,
    );
  }

  @Get('number-voids')
  listVoids(@CurrentUser() user: User) {
    return this.fiscal.listNumberVoids(user.tenantId);
  }

  @Post('number-voids')
  createVoid(@CurrentUser() user: User, @Body() dto: CreateFiscalNumberVoidDto) {
    return this.fiscal.createNumberVoid(user, dto);
  }

  @Get('accountants')
  listAccountants(@CurrentUser() user: User) {
    return this.fiscal.listAccountants(user.tenantId);
  }

  @Post('accountants')
  createAccountant(@CurrentUser() user: User, @Body() dto: CreateFiscalAccountantDto) {
    return this.fiscal.createAccountant(user.tenantId, dto);
  }

  @Patch('accountants/:id')
  updateAccountant(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateFiscalAccountantDto,
  ) {
    return this.fiscal.updateAccountant(user.tenantId, id, dto);
  }

  @Delete('accountants/:id')
  deleteAccountant(@CurrentUser() user: User, @Param('id') id: string) {
    return this.fiscal.deleteAccountant(user.tenantId, id);
  }
}
