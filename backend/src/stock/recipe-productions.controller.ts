import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { RecipeProductionsService } from './recipe-productions.service';
import { CreateRecipeProductionDto } from './dto/stock.dto';

@ApiTags('recipe-productions')
@Controller('recipe-productions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RecipeProductionsController {
  constructor(private readonly service: RecipeProductionsService) {}

  @Get()
  findAll(@CurrentUser() user: User, @Query('limit') limit?: string) {
    return this.service.findAll(user.tenantId, limit ? Number(limit) : 50);
  }

  @Post()
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Registrar produção de receita' })
  create(@Body() dto: CreateRecipeProductionDto, @CurrentUser() user: User) {
    return this.service.create(dto, user.tenantId, user.id);
  }
}
