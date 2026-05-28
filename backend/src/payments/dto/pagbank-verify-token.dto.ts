import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PagbankEnvironment } from '../entities/payment-settings.entity';

export class PagbankVerifyTokenDto {
  @ApiPropertyOptional({
    description: 'Token a testar; se omitido, usa o token já salvo nas configurações',
  })
  @IsOptional()
  @IsString()
  token?: string;

  @ApiPropertyOptional({
    description: 'Ambiente a usar no teste (deve coincidir com o seletor da tela Geral)',
    enum: PagbankEnvironment,
  })
  @IsOptional()
  @IsEnum(PagbankEnvironment)
  environment?: PagbankEnvironment;
}
