import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class PagbankReleaseCustodyDto {
  @ApiPropertyOptional({
    description: 'IDs de conta PagBank (ACCO_...) a liberar. Vazio = todos recebedores ativos.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  receiverAccountIds?: string[];
}

export class PagbankSplitCheckoutOptionsDto {
  @ApiPropertyOptional({ description: 'ISO 8601 — liberação agendada da custódia' })
  @IsOptional()
  @IsString()
  custodyScheduled?: string;
}
