import { IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

const CODE_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateStoreGroupDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  @Matches(CODE_REGEX, {
    message: 'Código: apenas letras minúsculas, números e hífens (ex.: rede-centro)',
  })
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  unitLabel?: string;
}

export class UpdateStoreGroupDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class JoinStoreGroupDto {
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  @Matches(CODE_REGEX)
  code: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  unitLabel?: string;
}

export class UpdateUnitLabelDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  unitLabel: string;
}

export class ConsolidatedReportQueryDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}

export class SwitchTenantDto {
  @IsUUID()
  tenantId: string;
}
