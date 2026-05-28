import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PagbankConnectSmsRequestDto {
  @ApiProperty({ example: '1234' })
  @IsString()
  @MaxLength(20)
  bankBranch: string;

  @ApiProperty({ example: '12345678-9' })
  @IsString()
  @MaxLength(30)
  accountNumber: string;
}

export class PagbankConnectSmsConfirmDto extends PagbankConnectSmsRequestDto {
  @ApiProperty({ description: 'ID retornado em /connect/sms/request (ASMS_...)' })
  @IsString()
  smsSessionId: string;

  @ApiProperty({ description: 'Código recebido por SMS' })
  @IsString()
  @MaxLength(10)
  code: string;
}

export class UpdateConnectSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pagbankConnectRedirectUri?: string | null;
}
