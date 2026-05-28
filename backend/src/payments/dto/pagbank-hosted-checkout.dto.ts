import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PagbankCustomerDto } from './pagbank-orders.dto';

export class PagbankHostedCheckoutDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  amountCents?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referenceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => PagbankCustomerDto)
  customer?: PagbankCustomerDto;

  @ApiPropertyOptional({ description: 'URL de retorno após pagamento no checkout PagBank' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  returnUrl?: string;

  @ApiPropertyOptional({ description: 'URL após finalizar pagamento (redirect_url)' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  redirectUrl?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 — expiração do checkout' })
  @IsOptional()
  @IsString()
  expirationDate?: string;
}
