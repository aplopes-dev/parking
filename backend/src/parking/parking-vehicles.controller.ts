import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User, UserRole } from '../users/entities/user.entity';
import {
  CreateParkingVehicleDto,
  ListParkingVehiclesQueryDto,
  UpdateParkingVehicleDto,
} from './dto/parking-vehicles.dto';
import { ParkingVehiclesService } from './parking-vehicles.service';

const PARKING_ROLES = Object.values(UserRole);

@ApiTags('parking-vehicles')
@Controller('parking/vehicles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...PARKING_ROLES)
@ApiBearerAuth()
export class ParkingVehiclesController {
  constructor(private readonly service: ParkingVehiclesService) {}

  @Get()
  list(@CurrentUser() user: User, @Query() query: ListParkingVehiclesQueryDto) {
    return this.service.list(user.tenantId, query);
  }

  @Get('plate/:plate')
  getByPlate(@CurrentUser() user: User, @Param('plate') plate: string) {
    return this.service.getByPlate(user.tenantId, plate);
  }

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateParkingVehicleDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateParkingVehicleDto,
  ) {
    return this.service.update(user.tenantId, id, dto);
  }
}
