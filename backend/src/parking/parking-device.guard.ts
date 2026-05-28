import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParkingAccessDevice } from './entities/parking-access-device.entity';

export type HardwareRequestContext = {
  device: ParkingAccessDevice;
  tenantId: string;
};

@Injectable()
export class ParkingDeviceGuard implements CanActivate {
  constructor(
    @InjectRepository(ParkingAccessDevice)
    private readonly devicesRepo: Repository<ParkingAccessDevice>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const apiKey =
      req.headers['x-device-key'] ??
      req.headers['x-api-key'] ??
      this.extractBearer(req.headers.authorization);

    if (!apiKey || typeof apiKey !== 'string') {
      throw new UnauthorizedException('Chave do dispositivo ausente');
    }

    const device = await this.devicesRepo.findOne({
      where: { apiKey: apiKey.trim(), active: true },
      relations: ['facility'],
    });

    if (!device) {
      throw new UnauthorizedException('Dispositivo não autorizado');
    }

    req.hardware = { device, tenantId: device.tenantId } satisfies HardwareRequestContext;
    return true;
  }

  private extractBearer(authHeader?: string): string | null {
    if (!authHeader?.startsWith('Bearer ')) return null;
    return authHeader.slice(7).trim();
  }
}
