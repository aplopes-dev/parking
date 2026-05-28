import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { ComandasService } from './comandas.service';
import { CreateComandaDto, UpdateComandaDto } from './dto/pdv.dto';

@ApiTags('comandas')
@Controller('comandas')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ComandasController {
  constructor(private readonly service: ComandasService) {}

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.service.findAll(user.tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.findOne(id, user.tenantId);
  }

  @Post()
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  create(@Body() dto: CreateComandaDto, @CurrentUser() user: User) {
    return this.service.create(dto, user.tenantId);
  }

  @Patch(':id')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateComandaDto,
    @CurrentUser() user: User,
  ) {
    return this.service.update(id, user.tenantId, dto);
  }

  @Delete(':id')
  @Roles(...Object.values(UserRole))
  @UseGuards(RolesGuard)
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.remove(id, user.tenantId);
  }
}
