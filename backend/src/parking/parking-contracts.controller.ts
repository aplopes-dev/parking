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
  AddAgreementVehicleDto,
  AddSubscriptionVehicleDto,
  CreateParkingAgreementDto,
  CreateParkingSubscriptionDto,
  ListContractsQueryDto,
  PlateLookupQueryDto,
  UpdateContractVehicleDto,
  UpdateParkingAgreementDto,
  UpdateParkingSubscriptionDto,
} from './dto/parking-contracts.dto';
import { ParkingContractsService } from './parking-contracts.service';

const PARKING_ROLES = Object.values(UserRole);

@ApiTags('parking-contracts')
@Controller('parking')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...PARKING_ROLES)
@ApiBearerAuth()
export class ParkingContractsController {
  constructor(private readonly contractsService: ParkingContractsService) {}

  @Get('access/lookup')
  lookupPlate(@CurrentUser() user: User, @Query() query: PlateLookupQueryDto) {
    return this.contractsService.lookupByPlate(user.tenantId, query);
  }

  @Get('subscriptions')
  listSubscriptions(@CurrentUser() user: User, @Query() query: ListContractsQueryDto) {
    return this.contractsService.listSubscriptions(user.tenantId, query);
  }

  @Post('subscriptions')
  createSubscription(
    @CurrentUser() user: User,
    @Body() dto: CreateParkingSubscriptionDto,
  ) {
    return this.contractsService.createSubscription(user.tenantId, dto, user.id);
  }

  @Patch('subscriptions/:id')
  updateSubscription(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateParkingSubscriptionDto,
  ) {
    return this.contractsService.updateSubscription(user.tenantId, id, dto, user.id);
  }

  @Post('subscriptions/:id/vehicles')
  addSubscriptionVehicle(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: AddSubscriptionVehicleDto,
  ) {
    return this.contractsService.addSubscriptionVehicle(user.tenantId, id, dto);
  }

  @Patch('subscription-vehicles/:vehicleId')
  updateSubscriptionVehicle(
    @CurrentUser() user: User,
    @Param('vehicleId') vehicleId: string,
    @Body() dto: UpdateContractVehicleDto,
  ) {
    return this.contractsService.updateSubscriptionVehicle(user.tenantId, vehicleId, dto);
  }

  @Get('agreements')
  listAgreements(@CurrentUser() user: User, @Query() query: ListContractsQueryDto) {
    return this.contractsService.listAgreements(user.tenantId, query);
  }

  @Post('agreements')
  createAgreement(@CurrentUser() user: User, @Body() dto: CreateParkingAgreementDto) {
    return this.contractsService.createAgreement(user.tenantId, dto, user.id);
  }

  @Patch('agreements/:id')
  updateAgreement(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateParkingAgreementDto,
  ) {
    return this.contractsService.updateAgreement(user.tenantId, id, dto, user.id);
  }

  @Post('agreements/:id/vehicles')
  addAgreementVehicle(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: AddAgreementVehicleDto,
  ) {
    return this.contractsService.addAgreementVehicle(user.tenantId, id, dto);
  }

  @Patch('agreement-vehicles/:vehicleId')
  updateAgreementVehicle(
    @CurrentUser() user: User,
    @Param('vehicleId') vehicleId: string,
    @Body() dto: UpdateContractVehicleDto,
  ) {
    return this.contractsService.updateAgreementVehicle(user.tenantId, vehicleId, dto);
  }
}
