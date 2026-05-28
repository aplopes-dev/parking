import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PdvSettings } from './entities/pdv-settings.entity';
import { UpdatePdvSettingsDto } from './dto/pdv.dto';

@Injectable()
export class PdvSettingsService {
  constructor(
    @InjectRepository(PdvSettings)
    private readonly repository: Repository<PdvSettings>,
  ) {}

  async getOrCreate(tenantId: string): Promise<PdvSettings> {
    let settings = await this.repository.findOne({ where: { tenantId } });
    if (!settings) {
      settings = await this.repository.save(this.repository.create({ tenantId }));
    }
    return settings;
  }

  async update(tenantId: string, dto: UpdatePdvSettingsDto): Promise<PdvSettings> {
    const settings = await this.getOrCreate(tenantId);
    if (dto.defaultServiceFeePercent !== undefined) {
      settings.defaultServiceFeePercent = dto.defaultServiceFeePercent.toFixed(2);
    }
    if (dto.allowSplitBill !== undefined) settings.allowSplitBill = dto.allowSplitBill;
    if (dto.mapsEnabled !== undefined) settings.mapsEnabled = dto.mapsEnabled;
    if (dto.mapsEmbedUrl !== undefined) settings.mapsEmbedUrl = dto.mapsEmbedUrl ?? null;
    return this.repository.save(settings);
  }
}
