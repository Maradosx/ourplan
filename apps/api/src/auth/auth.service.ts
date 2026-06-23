import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  private generateSlug(username: string): string {
    return username.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();
    const username = dto.username.toLowerCase().trim();
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing)
      throw new ConflictException('Email or username already taken');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const profileSlug = this.generateSlug(username);

    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        profileSlug,
        displayName: dto.displayName,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        profileSlug: true,
        bio: true,
      },
    });

    return this.signTokens(user.id, user.email, user);
  }

  async login(email: string, password: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const { passwordHash, ...userPublic } = user;
    return this.signTokens(user.id, user.email, userPublic);
  }

  async refresh(token: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });
    if (!stored || stored.expiresAt < new Date()) {
      if (stored) await this.prisma.refreshToken.delete({ where: { token } });
      throw new ForbiddenException('Refresh token expired or invalid');
    }
    await this.prisma.refreshToken.delete({ where: { token } });
    const { passwordHash, ...userPublic } = stored.user;
    return this.signTokens(stored.user.id, stored.user.email, userPublic);
  }

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        profileSlug: true,
        bio: true,
        timezone: true,
      },
    });
  }

  async forgotPassword(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    // Always return the SAME generic response to prevent email enumeration.
    const genericResponse = {
      message: 'If that email exists, a reset link has been sent.',
    };
    if (!user) return genericResponse;

    // Invalidate existing tokens for this user
    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, token: rawToken, expiresAt },
    });

    // SECURITY: the reset token must NEVER be returned in the HTTP response — doing so
    // would let anyone who knows a victim's email take over the account. In production a
    // transactional email provider should send the reset link. For LOCAL development only,
    // the token can be surfaced behind an explicit, fail-closed opt-in flag that defaults OFF.
    const exposeForDev = this.config.get('EXPOSE_RESET_TOKEN') === 'true';
    if (exposeForDev) {
      console.log(
        `[DEV ONLY] Password reset token for ${normalizedEmail}: ${rawToken}`,
      );
      return { ...genericResponse, devToken: rawToken };
    }

    return genericResponse;
  }

  async resetPassword(token: string, newPassword: string) {
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const record = await this.prisma.passwordResetToken.findUnique({
      where: { token },
    });
    if (!record || record.used || record.expiresAt < new Date()) {
      throw new BadRequestException('Reset token is invalid or has expired');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });
    await this.prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { used: true },
    });

    // Invalidate all refresh tokens (force re-login everywhere)
    await this.prisma.refreshToken.deleteMany({
      where: { userId: record.userId },
    });

    return { message: 'Password updated successfully. Please sign in again.' };
  }

  private async signTokens(userId: string, email: string, user: any) {
    const payload = { sub: userId, email };

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
    });

    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '30d'),
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.refreshToken.create({
      data: { token: refreshToken, userId, expiresAt },
    });

    return { accessToken, refreshToken, user };
  }
}
