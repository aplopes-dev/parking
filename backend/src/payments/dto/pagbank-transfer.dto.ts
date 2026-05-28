import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PagbankTransferP2pDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankBranch?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accountNumber?: string;
}

export class PagbankTransferPixDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  key?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxId?: string;
}

export class PagbankCreateTransferDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  amountCents: number;

  @ApiProperty({ enum: ['P2P', 'PIX'] })
  @IsEnum(['P2P', 'PIX'])
  instrumentType: 'P2P' | 'PIX';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(72)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  referenceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => PagbankTransferP2pDto)
  p2p?: PagbankTransferP2pDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => PagbankTransferPixDto)
  pix?: PagbankTransferPixDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  notificationUrl?: string;
}
