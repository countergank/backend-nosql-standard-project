import { IsNotEmpty } from 'class-validator';

/**
 * Body for `PUT /v1/admin/parameters/:key`.
 *
 * Accepts any JSON-scalar value (string, number or boolean) — the store coerces
 * and validates it against the registered definition, returning 422
 * `PARAMETER_INVALID_VALUE` on mismatch.
 */
export class UpdateParameterDto {
  @IsNotEmpty()
  value: string | number | boolean;
}
