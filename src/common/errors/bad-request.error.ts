import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { GenericError } from './error/error-instances.error';

export class BadRequestError {
  @ApiProperty({ example: HttpStatus.BAD_REQUEST })
  statusCode: number;

  @ApiProperty({ example: new GenericError().code })
  code: string;

  @ApiProperty({ example: new GenericError().message })
  message: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  traceId: string;

  @ApiProperty({ example: '2026-07-25T20:58:13.123Z' })
  timestamp: string;
}
