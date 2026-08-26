import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export class InternalServerError {
  @ApiProperty({ example: 'UA-COM-000' })
  code: string;

  @ApiProperty({ example: 'Internal server error' })
  message: string;

  @ApiProperty({ example: HttpStatus.INTERNAL_SERVER_ERROR })
  statusCode: number;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  traceId: string;

  @ApiProperty({ example: '2026-07-25T20:58:13.123Z' })
  timestamp: string;
}
