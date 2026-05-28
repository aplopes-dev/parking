import {
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
  IsIn,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  ALL_USER_ROLES,
  UserRole,
  DeveloperLevel,
} from '../entities/user.entity';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  name: string;

  @IsIn(ALL_USER_ROLES, {
    message: `role must be one of the following values: ${ALL_USER_ROLES.join(', ')}`,
  })
  role: UserRole;

  @IsEnum(DeveloperLevel)
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  level?: DeveloperLevel;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  managerId?: string | null;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === ''
      ? undefined
      : value === true || value === 'true',
  )
  active?: boolean;
}
