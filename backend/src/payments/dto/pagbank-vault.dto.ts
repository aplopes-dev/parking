import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PagbankVaultHolderDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxId?: string;
}

export class PagbankVaultCardDto {
  @ApiProperty({ description: 'Cartão criptografado (SDK PagBank no browser)' })
  @IsString()
  encrypted: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  securityCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => PagbankVaultHolderDto)
  holder?: PagbankVaultHolderDto;

  @ApiPropertyOptional({ description: 'Mescla campos extras aceitos pela API /tokens/cards' })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

export class Pagbank3dsSessionDto {
  @ApiPropertyOptional({ description: 'Valor em centavos (contexto da sessão)' })
  @IsOptional()
  amountCents?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
