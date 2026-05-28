import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { CrmLoyaltyService } from './crm-loyalty.service';
import {
  AdjustLoyaltyPointsDto,
  CreateLoyaltyProgramDto,
  EarnLoyaltyFromPurchaseDto,
  UpdateLoyaltyProgramDto,
} from './dto/crm.dto';

@ApiTags('crm-loyalty')
@Controller('crm/loyalty')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CrmLoyaltyController {
  constructor(private readonly service: CrmLoyaltyService) {}

  @Get('programs')
  findPrograms(@CurrentUser() user: User) {
    return this.service.findPrograms(user.tenantId);
  }

  @Post('programs')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  createProgram(@Body() dto: CreateLoyaltyProgramDto, @CurrentUser() user: User) {
    return this.service.createProgram(dto, user.tenantId);
  }

  @Patch('programs/:id')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  updateProgram(
    @Param('id') id: string,
    @Body() dto: UpdateLoyaltyProgramDto,
    @CurrentUser() user: User,
  ) {
    return this.service.updateProgram(id, user.tenantId, dto);
  }

  @Get('accounts')
  findAccounts(@CurrentUser() user: User, @Query('programId') programId?: string) {
    return this.service.findAccounts(user.tenantId, programId);
  }

  @Get('transactions')
  findTransactions(
    @CurrentUser() user: User,
    @Query('accountId') accountId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findTransactions(
      user.tenantId,
      accountId,
      limit ? Number(limit) : 50,
    );
  }

  @Post('adjust')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Ajustar pontos (ganho, resgate ou ajuste)' })
  adjustPoints(@Body() dto: AdjustLoyaltyPointsDto, @CurrentUser() user: User) {
    return this.service.adjustPoints(dto, user.tenantId, user.id);
  }

  @Post('earn-purchase')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Creditar pontos por valor de compra' })
  earnFromPurchase(@Body() dto: EarnLoyaltyFromPurchaseDto, @CurrentUser() user: User) {
    return this.service.earnFromPurchase(dto, user.tenantId, user.id);
  }
}
