import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class PagbankRegisterAccountDto {
  @ApiProperty({ enum: ['BUYER', 'SELLER', 'ENTERPRISE'] })
  @IsEnum(['BUYER', 'SELLER', 'ENTERPRISE'])
  type: 'BUYER' | 'SELLER' | 'ENTERPRISE';

  @ApiProperty()
  @IsEmail()
  @MaxLength(120)
  email: string;

  @ApiProperty({ description: 'Objeto person conforme documentação PagBank' })
  @IsObject()
  person: Record<string, unknown>;

  @ApiProperty({ description: 'tos_acceptance com user_ip e date' })
  @IsObject()
  tosAcceptance: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessCategory?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  company?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
