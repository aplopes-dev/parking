import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterOrganizationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(32)
  @Matches(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, {
    message:
      'Slug deve conter apenas letras minúsculas, números e hífens, sem começar ou terminar com hífen',
  })
  slug: string;

  @IsEmail()
  adminEmail: string;

  @IsString()
  @MinLength(6)
  adminPassword: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  adminName: string;

  /** Código do grupo de lojas (rede/franquia) para vincular na criação. */
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Código do grupo: letras minúsculas, números e hífens',
  })
  storeGroupCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  unitLabel?: string;
}
