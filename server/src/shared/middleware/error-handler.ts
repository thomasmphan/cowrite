import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../utils/errors.js';

export function errorHandler(
  error: FastifyError,
  request : FastifyRequest,
  reply: FastifyReply
): void {
  if (error instanceof AppError) {
    request.log.warn({ error }, error.message);
    reply.status(error.statusCode).send({
      error: error.code,
      message: error.message,
    });
    return;
  }

  if (error.validation) {
    request.log.warn({ error }, 'Validation error');
    reply.status(400).send({
      error: 'VALIDATION_ERROR',
      message: error.message,
    });
    return;
  }

  request.log.error({ error }, 'Unhandled error');
  reply.status(500).send({
    error: 'INTERNAL_SERVER_ERROR',
    message: 'Something went wrong',
  });
}
