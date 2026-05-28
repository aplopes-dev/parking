import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { PagBankMetaDto } from '../../pdv/dto/pdv.dto';

export class OpenTableDto {
  @IsInt()
  @Min(1)
  @Transform(({ value }) => Number(value))
  guestCount: number;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  waiterName: string;
}

export class MobileAddItemDto {
  @IsUUID()
  productId: string;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  @Transform(({ value }) => Number(value))
  quantity: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class MobilePaymentDto {
  @IsString()
  method: 'cash' | 'credit' | 'debit' | 'pix';

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Transform(({ value }) => Number(value))
  amount: number;

  @ValidateNested()
  @Type(() => PagBankMetaDto)
  @IsOptional()
  pagBank?: PagBankMetaDto;
}
