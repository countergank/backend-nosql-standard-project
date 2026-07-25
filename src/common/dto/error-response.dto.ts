import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 404 })
  statusCode: number;

  @ApiProperty({ example: 'UA-ETY-001' })
  code: string;

  @ApiProperty({ example: 'Entity not found' })
  message: string;

  @ApiPropertyOptional({ example: { field: 'email', message: 'must be unique' } })
  details?: any;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  traceId: string;

  @ApiProperty({ example: '2026-07-25T20:58:13.123Z' })
  timestamp: string;
}
