import { ArgumentsHost } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaExceptionFilter } from './prisma-exception.filter';

/**
 * Builds a fake ArgumentsHost whose HTTP response exposes jest.fn() status()/json()
 * spies. status() returns `this` so the fluent `status().json()` chain works.
 */
function buildHost() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status, json }),
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

/**
 * Constructs a PrismaClientKnownRequestError-shaped object. We avoid coupling to
 * the constructor signature (which has varied across Prisma versions) by building
 * a plain object with the same `code`/`meta` shape and tagging its prototype so
 * `instanceof Prisma.PrismaClientKnownRequestError` and the @Catch decorator hold.
 */
function makePrismaError(code: string, meta?: Record<string, unknown>) {
  const err = Object.create(Prisma.PrismaClientKnownRequestError.prototype);
  err.code = code;
  err.meta = meta;
  err.message = `Prisma error ${code}`;
  err.clientVersion = 'test';
  return err as Prisma.PrismaClientKnownRequestError;
}

describe('PrismaExceptionFilter', () => {
  let filter: PrismaExceptionFilter;

  beforeEach(() => {
    filter = new PrismaExceptionFilter();
  });

  it('maps P2025 (record not found) to 404', () => {
    const { host, status, json } = buildHost();

    filter.catch(makePrismaError('P2025'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404 }),
    );
  });

  it('maps P2002 (unique constraint) to 409 and names the offending target', () => {
    const { host, status, json } = buildHost();

    filter.catch(makePrismaError('P2002', { target: ['email'] }), host);

    expect(status).toHaveBeenCalledWith(409);
    const body = json.mock.calls[0][0];
    expect(body).toMatchObject({ statusCode: 409 });
    expect(body.message).toContain('email');
  });

  it('maps P2002 with no target meta to a generic 409 conflict', () => {
    const { host, status, json } = buildHost();

    filter.catch(makePrismaError('P2002'), host);

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        message: 'Duplicate record.',
      }),
    );
  });

  it('maps P2003 (foreign key constraint) to 400', () => {
    const { host, status, json } = buildHost();

    filter.catch(makePrismaError('P2003'), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 }),
    );
  });

  it('maps any unknown Prisma code to a sanitized 500 (no internal leak)', () => {
    const { host, status, json } = buildHost();

    filter.catch(makePrismaError('P9999'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Internal server error',
    });
  });
});
