import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { HardwareHeartbeatDto, HardwareLprReadDto } from './dto/parking-hardware.dto';
import { HardwareRequestContext, ParkingDeviceGuard } from './parking-device.guard';
import { ParkingHardwareService } from './parking-hardware.service';

type HardwareRequest = Request & { hardware: HardwareRequestContext };

@ApiTags('parking-hardware-device')
@Controller('parking/hardware/device')
@UseGuards(ParkingDeviceGuard)
@ApiHeader({ name: 'X-Device-Key', description: 'Chave API do dispositivo' })
export class ParkingHardwareDeviceController {
  constructor(private readonly hardwareService: ParkingHardwareService) {}

  @Post('lpr')
  lprRead(@Req() req: HardwareRequest, @Body() dto: HardwareLprReadDto) {
    return this.hardwareService.handleDeviceLprRead(req.hardware.device, dto);
  }

  @Post('heartbeat')
  heartbeat(@Req() req: HardwareRequest, @Body() dto: HardwareHeartbeatDto) {
    return this.hardwareService.handleHeartbeat(req.hardware.device, dto);
  }

  @Get('commands/poll')
  pollCommands(@Req() req: HardwareRequest) {
    return this.hardwareService.pollCommands(req.hardware.device);
  }

  @Post('commands/:commandId/ack')
  ackCommand(
    @Req() req: HardwareRequest,
    @Param('commandId') commandId: string,
    @Body() body: { success?: boolean },
  ) {
    return this.hardwareService.ackCommand(
      req.hardware.device,
      commandId,
      body?.success !== false,
    );
  }
}
