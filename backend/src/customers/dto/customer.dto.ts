import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCustomerDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @IsEmail()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  email?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  @Transform(({ value }) => (value === '' ? null : value))
  phone?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  @Transform(({ value }) => (value === '' ? null : value))
  document?: string | null;

  @IsDateString()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  birthDate?: string | null;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  address?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  @Transform(({ value }) => (value === '' ? null : value))
  city?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(2)
  @Transform(({ value }) => (value === '' ? null : value))
  state?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(16)
  @Transform(({ value }) => (value === '' ? null : value))
  zipCode?: string | null;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  allergyNotes?: string | null;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  notes?: string | null;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === ''
      ? undefined
      : value === true || value === 'true',
  )
  active?: boolean;

  @IsInt()
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : Number(value)))
  sortOrder?: number;
}

export class UpdateCustomerDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  email?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  @Transform(({ value }) => (value === '' ? null : value))
  phone?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  @Transform(({ value }) => (value === '' ? null : value))
  document?: string | null;

  @IsDateString()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  birthDate?: string | null;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  address?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  @Transform(({ value }) => (value === '' ? null : value))
  city?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(2)
  @Transform(({ value }) => (value === '' ? null : value))
  state?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(16)
  @Transform(({ value }) => (value === '' ? null : value))
  zipCode?: string | null;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  allergyNotes?: string | null;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  notes?: string | null;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === ''
      ? undefined
      : value === true || value === 'true',
  )
  active?: boolean;

  @IsInt()
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : Number(value)))
  sortOrder?: number;
}
