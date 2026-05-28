import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Readable } from 'stream';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User, UserRole } from '../users/entities/user.entity';
import {
  CreateFinanceAccountDto,
  CreateFinanceCategoryDto,
  CreateFinanceSourceDto,
  CreateFinanceTagDto,
  CreateFinanceTransactionDto,
  FinanceTransactionsQueryDto,
  UpdateFinanceAccountDto,
  UpdateFinanceCategoryDto,
  UpdateFinanceSourceDto,
  UpdateFinanceTagDto,
  UpdateFinanceTransactionDto,
} from './dto/finance.dto';
import { FinanceService, MemoryUploadedFile } from './finance.service';

const ATTACHMENT_MAX = 15 * 1024 * 1024;

@ApiTags('finance')
@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...Object.values(UserRole))
@ApiBearerAuth()
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Visão geral e lançamentos filtrados' })
  getOverview(@CurrentUser() user: User, @Query() query: FinanceTransactionsQueryDto) {
    return this.finance.getOverview(user.tenantId, query);
  }

  @Get('transactions/:id/attachment')
  @ApiOperation({ summary: 'Baixar anexo do lançamento' })
  async downloadAttachment(@Param('id') id: string, @CurrentUser() user: User) {
    const { buffer, filename, mimeType } = await this.finance.getTransactionAttachmentBuffer(
      user.tenantId,
      id,
    );
    return new StreamableFile(Readable.from(buffer), {
      type: mimeType,
      disposition: `attachment; filename="${encodeURIComponent(filename)}"`,
    });
  }

  @Post('transactions')
  @UseInterceptors(FileInterceptor('attachment', { limits: { fileSize: ATTACHMENT_MAX } }))
  @ApiOperation({ summary: 'Criar lançamento' })
  async createTransaction(
    @Req() req: Request,
    @UploadedFile() attachment: MemoryUploadedFile | undefined,
    @CurrentUser() user: User,
  ) {
    const dto = await this.parseBody(CreateFinanceTransactionDto, req.body);
    return this.finance.createTransaction(user, dto, attachment);
  }

  @Patch('transactions/:id')
  @UseInterceptors(FileInterceptor('attachment', { limits: { fileSize: ATTACHMENT_MAX } }))
  @ApiOperation({ summary: 'Atualizar lançamento' })
  async updateTransaction(
    @Param('id') id: string,
    @Req() req: Request,
    @UploadedFile() attachment: MemoryUploadedFile | undefined,
    @CurrentUser() user: User,
  ) {
    const dto = await this.parseBody(UpdateFinanceTransactionDto, req.body);
    return this.finance.updateTransaction(user.tenantId, id, dto, attachment);
  }

  @Delete('transactions/:id')
  @ApiOperation({ summary: 'Excluir lançamento' })
  removeTransaction(@Param('id') id: string, @CurrentUser() user: User) {
    return this.finance.removeTransaction(user.tenantId, id);
  }

  @Post('accounts')
  createAccount(@Body() dto: CreateFinanceAccountDto, @CurrentUser() user: User) {
    return this.finance.createAccount(user.tenantId, dto);
  }

  @Patch('accounts/:id')
  updateAccount(
    @Param('id') id: string,
    @Body() dto: UpdateFinanceAccountDto,
    @CurrentUser() user: User,
  ) {
    return this.finance.updateAccount(user.tenantId, id, dto);
  }

  @Delete('accounts/:id')
  removeAccount(@Param('id') id: string, @CurrentUser() user: User) {
    return this.finance.removeAccount(user.tenantId, id);
  }

  @Post('sources')
  createSource(@Body() dto: CreateFinanceSourceDto, @CurrentUser() user: User) {
    return this.finance.createSource(user.tenantId, dto);
  }

  @Patch('sources/:id')
  updateSource(
    @Param('id') id: string,
    @Body() dto: UpdateFinanceSourceDto,
    @CurrentUser() user: User,
  ) {
    return this.finance.updateSource(user.tenantId, id, dto);
  }

  @Delete('sources/:id')
  removeSource(@Param('id') id: string, @CurrentUser() user: User) {
    return this.finance.removeSource(user.tenantId, id);
  }

  @Post('categories')
  createCategory(@Body() dto: CreateFinanceCategoryDto, @CurrentUser() user: User) {
    return this.finance.createCategory(user.tenantId, dto);
  }

  @Patch('categories/:id')
  updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateFinanceCategoryDto,
    @CurrentUser() user: User,
  ) {
    return this.finance.updateCategory(user.tenantId, id, dto);
  }

  @Delete('categories/:id')
  removeCategory(@Param('id') id: string, @CurrentUser() user: User) {
    return this.finance.removeCategory(user.tenantId, id);
  }

  @Post('tags')
  createTag(@Body() dto: CreateFinanceTagDto, @CurrentUser() user: User) {
    return this.finance.createTag(user.tenantId, dto);
  }

  @Patch('tags/:id')
  updateTag(@Param('id') id: string, @Body() dto: UpdateFinanceTagDto, @CurrentUser() user: User) {
    return this.finance.updateTag(user.tenantId, id, dto);
  }

  @Delete('tags/:id')
  removeTag(@Param('id') id: string, @CurrentUser() user: User) {
    return this.finance.removeTag(user.tenantId, id);
  }

  private async parseBody<T extends object>(
    cls: new () => T,
    raw: Record<string, unknown>,
  ): Promise<T> {
    const dto = plainToInstance(cls, raw, { enableImplicitConversion: true });
    const errors = await validate(dto, { whitelist: true, forbidUnknownValues: false });
    if (errors.length) {
      const msg = errors
        .flatMap((e) => (e.constraints ? Object.values(e.constraints) : []))
        .join('; ');
      throw new BadRequestException(msg || 'Dados inválidos');
    }
    return dto;
  }
}
