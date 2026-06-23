import {
  ArgumentsHost,
  Catch,
  ConflictException,
  ExceptionFilter,
  HttpException,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

/**
 * Translates known Prisma errors into appropriate HTTP responses so that
 * client-triggerable database errors (deleting a missing row, violating a
 * unique constraint, etc.) return 4xx codes instead of a generic 500 that
 * leaks internal details.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let httpException: HttpException;

    switch (exception.code) {
      case 'P2025': // Record to update/delete does not exist
        httpException = new NotFoundException(
          'The requested resource was not found.',
        );
        break;
      case 'P2002': {
        // Unique constraint failed
        const target = (exception.meta?.target as string[] | undefined)?.join(
          ', ',
        );
        httpException = new ConflictException(
          target
            ? `A record with this ${target} already exists.`
            : 'Duplicate record.',
        );
        break;
      }
      case 'P2003': // Foreign key constraint failed
        httpException = new BadRequestException(
          'Related resource does not exist.',
        );
        break;
      default:
        this.logger.error(
          `Unhandled Prisma error ${exception.code}: ${exception.message}`,
        );
        response.status(500).json({
          statusCode: 500,
          message: 'Internal server error',
        });
        return;
    }

    const status = httpException.getStatus();
    response.status(status).json(httpException.getResponse());
  }
}
