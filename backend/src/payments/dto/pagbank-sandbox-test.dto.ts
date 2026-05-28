import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PagbankRunRecurringTestDto {
  @ApiProperty({ example: 'mc_success' })
  @IsString()
  @MaxLength(64)
  scenarioId: string;
}

export class PagbankCompleteDebit3dsTestDto {
  @ApiProperty({ example: '3ds_visa_debit_auth' })
  @IsString()
  @MaxLength(64)
  scenarioId: string;

  @ApiProperty({ example: '3DS_15CB7893-4D23-44FA-97B7-AC1BE516D418' })
  @IsString()
  @MaxLength(80)
  threeDsId: string;
}

export class PagbankQuerySplitTestDto {
  @ApiPropertyOptional({ example: 'SPLI_1234-5678-90AB-CDEF' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  splitId?: string;

  @ApiPropertyOptional({ description: 'ID da transação local PagBank' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  transactionId?: string;

  @ApiPropertyOptional({ example: 'ORDE_08DE032B-A890-4BB8-BBDE-CD88521871A0' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  pagbankOrderId?: string;
}
