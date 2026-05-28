import { IsInt } from 'class-validator';
import { Transform } from 'class-transformer';

/** PATCH exclusivo para reordenar listagens (evita validação do Update*Dto completo). */
export class SortOrderOnlyDto {
  @IsInt()
  @Transform(({ value }) => Number(value))
  sortOrder: number;
}
