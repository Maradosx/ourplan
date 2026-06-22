import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';

/**
 * Builds a plain-object mock of the slice of PrismaService that AuthService
 * touches. Every delegate method is a jest.fn() so each test can program its
 * own return values / assert call arguments. No real DB connection is created.
 */
function buildPrismaMock() {
  return {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    passwordResetToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
}

/**
 * Stub ConfigService that returns deterministic test secrets. EXPOSE_RESET_TOKEN
 * is controlled per-test via the `expose` flag so we can exercise both the
 * default (off) and dev-opt-in paths.
 */
function buildConfig(expose?: string) {
  return {
    get: jest.fn((key: string, def?: any) => {
      switch (key) {
        case 'JWT_SECRET':
          return 'test-access-secret';
        case 'JWT_REFRESH_SECRET':
          return 'test-refresh-secret';
        case 'EXPOSE_RESET_TOKEN':
          return expose;
        default:
          return def;
      }
    }),
  } as unknown as ConfigService;
}

describe('AuthService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let jwt: JwtService;

  const makeService = (config: ConfigService) =>
    new AuthService(prisma as unknown as PrismaService, jwt, config);

  beforeEach(() => {
    prisma = buildPrismaMock();
    jwt = new JwtService({});
  });

  // ─── register ──────────────────────────────────────────────────────────────

  describe('register', () => {
    const dto: RegisterDto = {
      displayName: 'Athit B',
      username: 'AthitB', // intentionally mixed-case to prove normalization
      email: 'Athit.B@Example.COM',
      password: 'sup3rSecret!',
    };

    it('normalizes email + username, hashes the password, and returns tokens + user', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      // create() should echo back the (normalized) row the service builds.
      prisma.user.create.mockImplementation(async ({ data }: any) => ({
        id: 'user-1',
        email: data.email,
        username: data.username,
        displayName: data.displayName,
        avatarUrl: null,
        profileSlug: data.profileSlug,
        bio: null,
      }));
      prisma.refreshToken.create.mockResolvedValue({});

      const service = makeService(buildConfig());
      const result = await service.register(dto);

      // Email + username are lowercased/trimmed before the dup check + insert.
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { OR: [{ email: 'athit.b@example.com' }, { username: 'athitb' }] },
      });
      const createArg = prisma.user.create.mock.calls[0][0].data;
      expect(createArg.email).toBe('athit.b@example.com');
      expect(createArg.username).toBe('athitb');
      expect(createArg.profileSlug).toBe('athitb');

      // Password is bcrypt-hashed: ciphertext differs from plaintext but verifies.
      expect(createArg.passwordHash).not.toBe(dto.password);
      await expect(bcrypt.compare(dto.password, createArg.passwordHash)).resolves.toBe(true);

      // Token pair + sanitized user are returned.
      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');
      expect(result.user).toMatchObject({ id: 'user-1', email: 'athit.b@example.com' });
      expect((result.user as any).passwordHash).toBeUndefined();

      // A refresh token row is persisted for rotation/tracking.
      expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
    });

    it('throws ConflictException when email or username already exists', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'existing' });
      const service = makeService(buildConfig());

      await expect(service.register(dto)).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  // ─── login ────────────────────────────────────────────────────────────────

  describe('login', () => {
    let passwordHash: string;

    beforeEach(async () => {
      passwordHash = await bcrypt.hash('correct-horse', 12);
    });

    const seedUser = () => ({
      id: 'user-1',
      email: 'jane@example.com',
      username: 'jane',
      displayName: 'Jane',
      avatarUrl: null,
      profileSlug: 'jane',
      bio: null,
      passwordHash,
    });

    it('normalizes the email before lookup and returns tokens on success', async () => {
      prisma.user.findUnique.mockResolvedValue(seedUser());
      prisma.refreshToken.create.mockResolvedValue({});
      const service = makeService(buildConfig());

      const result = await service.login('  JANE@Example.com  ', 'correct-horse');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'jane@example.com' },
      });
      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');
      // passwordHash must be stripped from the returned user.
      expect((result.user as any).passwordHash).toBeUndefined();
      expect(result.user).toMatchObject({ id: 'user-1', email: 'jane@example.com' });
    });

    it('throws UnauthorizedException when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const service = makeService(buildConfig());

      await expect(service.login('nobody@example.com', 'whatever')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException on a wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue(seedUser());
      const service = makeService(buildConfig());

      await expect(service.login('jane@example.com', 'wrong-password')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });
  });

  // ─── refresh (token rotation) ───────────────────────────────────────────────

  describe('refresh', () => {
    const validStored = () => ({
      token: 'old-refresh-token',
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1h in the future
      user: {
        id: 'user-1',
        email: 'jane@example.com',
        username: 'jane',
        displayName: 'Jane',
        passwordHash: 'irrelevant-hash',
      },
    });

    it('rotates the token: deletes the presented token and issues a fresh pair', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(validStored());
      prisma.refreshToken.delete.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});
      const service = makeService(buildConfig());

      const result = await service.refresh('old-refresh-token');

      // Old token is invalidated...
      expect(prisma.refreshToken.delete).toHaveBeenCalledWith({
        where: { token: 'old-refresh-token' },
      });
      // ...and a brand-new refresh token is persisted.
      expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');
      expect((result.user as any).passwordHash).toBeUndefined();
    });

    it('throws ForbiddenException when the stored token is missing', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);
      const service = makeService(buildConfig());

      await expect(service.refresh('ghost')).rejects.toBeInstanceOf(ForbiddenException);
      // Nothing to delete when no row exists.
      expect(prisma.refreshToken.delete).not.toHaveBeenCalled();
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException and cleans up when the stored token is expired', async () => {
      const expired = validStored();
      expired.expiresAt = new Date(Date.now() - 1000); // already expired
      prisma.refreshToken.findUnique.mockResolvedValue(expired);
      prisma.refreshToken.delete.mockResolvedValue({});
      const service = makeService(buildConfig());

      await expect(service.refresh('old-refresh-token')).rejects.toBeInstanceOf(ForbiddenException);
      // Expired token is purged but no new pair is issued.
      expect(prisma.refreshToken.delete).toHaveBeenCalledWith({
        where: { token: 'old-refresh-token' },
      });
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });
  });

  // ─── forgotPassword (email-enumeration safety) ──────────────────────────────

  describe('forgotPassword', () => {
    const GENERIC = 'If that email exists, a reset link has been sent.';

    it('returns the generic message and creates a token when the user exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.passwordResetToken.deleteMany.mockResolvedValue({});
      prisma.passwordResetToken.create.mockResolvedValue({});
      const service = makeService(buildConfig());

      const res = await service.forgotPassword('jane@example.com');

      expect(res).toEqual({ message: GENERIC });
      expect(prisma.passwordResetToken.create).toHaveBeenCalledTimes(1);
      // No devToken leaks by default.
      expect((res as any).devToken).toBeUndefined();
    });

    it('returns the SAME generic message when the user does NOT exist (no enumeration)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const service = makeService(buildConfig());

      const res = await service.forgotPassword('nobody@example.com');

      expect(res).toEqual({ message: GENERIC });
      // No token churn for non-existent accounts.
      expect(prisma.passwordResetToken.deleteMany).not.toHaveBeenCalled();
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    });

    it('SECURITY: does NOT include devToken when EXPOSE_RESET_TOKEN is unset (default fail-closed)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.passwordResetToken.deleteMany.mockResolvedValue({});
      prisma.passwordResetToken.create.mockResolvedValue({});
      const service = makeService(buildConfig(undefined));

      const res = await service.forgotPassword('jane@example.com');

      expect(res).toEqual({ message: GENERIC });
      expect(res).not.toHaveProperty('devToken');
    });

    it('includes devToken ONLY when EXPOSE_RESET_TOKEN === "true" (explicit dev opt-in)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.passwordResetToken.deleteMany.mockResolvedValue({});
      // Capture the raw token the service generated so we can assert it matches.
      let storedToken: string | undefined;
      prisma.passwordResetToken.create.mockImplementation(async ({ data }: any) => {
        storedToken = data.token;
        return {};
      });
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      const service = makeService(buildConfig('true'));

      const res: any = await service.forgotPassword('jane@example.com');

      expect(res.message).toBe(GENERIC);
      expect(typeof res.devToken).toBe('string');
      // The exposed dev token is exactly the one persisted (not a fresh/mismatched value).
      expect(res.devToken).toBe(storedToken);
      logSpy.mockRestore();
    });
  });

  // ─── resetPassword ──────────────────────────────────────────────────────────

  describe('resetPassword', () => {
    it('rejects passwords shorter than 8 characters with BadRequestException', async () => {
      const service = makeService(buildConfig());

      await expect(service.resetPassword('any-token', 'short')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      // Should fail before any DB lookup.
      expect(prisma.passwordResetToken.findUnique).not.toHaveBeenCalled();
    });

    it('rejects an unknown token', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue(null);
      const service = makeService(buildConfig());

      await expect(service.resetPassword('bad-token', 'newpassword123')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects an already-used token', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'tok-1',
        userId: 'user-1',
        used: true,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      });
      const service = makeService(buildConfig());

      await expect(service.resetPassword('used-token', 'newpassword123')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects an expired token', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'tok-1',
        userId: 'user-1',
        used: false,
        expiresAt: new Date(Date.now() - 1000),
      });
      const service = makeService(buildConfig());

      await expect(service.resetPassword('expired-token', 'newpassword123')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('on success: updates the hash, marks the token used, and clears refresh tokens', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'tok-1',
        userId: 'user-1',
        used: false,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      });
      prisma.user.update.mockResolvedValue({});
      prisma.passwordResetToken.update.mockResolvedValue({});
      prisma.refreshToken.deleteMany.mockResolvedValue({});
      const service = makeService(buildConfig());

      const res = await service.resetPassword('good-token', 'brand-new-password');

      // New password is stored as a bcrypt hash (not plaintext) for the right user.
      const updateArg = prisma.user.update.mock.calls[0][0];
      expect(updateArg.where).toEqual({ id: 'user-1' });
      expect(updateArg.data.passwordHash).not.toBe('brand-new-password');
      await expect(
        bcrypt.compare('brand-new-password', updateArg.data.passwordHash),
      ).resolves.toBe(true);

      // Token is consumed and all sessions are invalidated.
      expect(prisma.passwordResetToken.update).toHaveBeenCalledWith({
        where: { id: 'tok-1' },
        data: { used: true },
      });
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(res).toEqual({ message: 'Password updated successfully. Please sign in again.' });
    });
  });
});
