import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { CrmCustomersService } from './crm-customers.service';
import {
  CrmCustomersQueryDto,
  CreateCrmInteractionDto,
  UpdateCrmProfileDto,
} from './dto/crm.dto';

@ApiTags('crm-customers')
@Controller('crm/customers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CrmCustomersController {
  constructor(private readonly service: CrmCustomersService) {}

  @Get()
  @ApiOperation({ summary: 'Base de clientes CRM' })
  findAll(@CurrentUser() user: User, @Query() query: CrmCustomersQueryDto) {
    return this.service.findAll(user.tenantId, query);
  }

  @Post('interactions')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  addInteraction(@Body() dto: CreateCrmInteractionDto, @CurrentUser() user: User) {
    return this.service.addInteraction(dto, user.tenantId, user.id);
  }

  @Get(':customerId')
  findOne(@Param('customerId') customerId: string, @CurrentUser() user: User) {
    return this.service.findOne(user.tenantId, customerId);
  }

  @Patch(':customerId/profile')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  updateProfile(
    @Param('customerId') customerId: string,
    @Body() dto: UpdateCrmProfileDto,
    @CurrentUser() user: User,
  ) {
    return this.service.updateProfile(user.tenantId, customerId, dto);
  }
}
