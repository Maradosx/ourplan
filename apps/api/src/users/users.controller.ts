import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { IsOptional, IsString, MaxLength, IsObject } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  bio?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

class UpdatePreferencesDto {
  @IsOptional()
  @IsObject()
  notificationPrefs?: Record<string, boolean>;

  @IsOptional()
  @IsObject()
  privacyPrefs?: Record<string, boolean>;
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private prisma: PrismaService) {}

  /** True if the two users have an accepted friendship (either direction). */
  private async isAcceptedFriend(a: string, b: string): Promise<boolean> {
    const f = await this.prisma.friendship.findFirst({
      where: {
        status: 'accepted',
        OR: [
          { requesterId: a, addresseeId: b },
          { requesterId: b, addresseeId: a },
        ],
      },
      select: { id: true },
    });
    return !!f;
  }

  /** Get my notification + privacy preferences */
  @Get('me/preferences')
  async getPreferences(@Request() req: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.sub },
      select: { notificationPrefs: true, privacyPrefs: true },
    });
    return {
      notificationPrefs: user?.notificationPrefs ?? {
        event_reminder: true,
        friend_request: true,
        friend_accept: true,
        group_invite: true,
      },
      privacyPrefs: user?.privacyPrefs ?? {
        publicProfile: true,
        showEvents: true,
        allowSearch: true,
      },
    };
  }

  /** Update my notification + privacy preferences */
  @Patch('me/preferences')
  async updatePreferences(
    @Request() req: any,
    @Body() body: UpdatePreferencesDto,
  ) {
    const updated = await this.prisma.user.update({
      where: { id: req.user.sub },
      data: {
        ...(body.notificationPrefs !== undefined
          ? { notificationPrefs: body.notificationPrefs }
          : {}),
        ...(body.privacyPrefs !== undefined
          ? { privacyPrefs: body.privacyPrefs }
          : {}),
      },
      select: { notificationPrefs: true, privacyPrefs: true },
    });
    return updated;
  }

  /** Update my own profile (displayName, bio, avatarUrl) */
  @Patch('me')
  async updateMe(@Request() req: any, @Body() body: UpdateMeDto) {
    const { displayName, bio, avatarUrl } = body;
    if (displayName !== undefined && !displayName.trim()) {
      throw new BadRequestException('Display name cannot be empty');
    }
    const updated = await this.prisma.user.update({
      where: { id: req.user.sub },
      data: {
        ...(displayName !== undefined
          ? { displayName: displayName.trim() }
          : {}),
        ...(bio !== undefined ? { bio: bio.trim() || null } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      },
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
    return updated;
  }

  /** Search users by username or displayName (respects the "Discoverable" toggle) */
  @Get('search')
  async search(@Query('q') q: string, @Request() req: any) {
    if (!q || q.length < 2) return [];
    const results = await this.prisma.user.findMany({
      where: {
        AND: [
          { id: { not: req.user.sub } },
          {
            OR: [
              { username: { contains: q, mode: 'insensitive' } },
              { displayName: { contains: q, mode: 'insensitive' } },
              { profileSlug: { contains: q, mode: 'insensitive' } },
            ],
          },
        ],
      },
      // Over-fetch then filter so disabled-discovery users don't shrink the result set.
      select: {
        id: true,
        displayName: true,
        username: true,
        avatarUrl: true,
        profileSlug: true,
        privacyPrefs: true,
      },
      take: 40,
    });
    return results
      .filter(
        (u) =>
          (u.privacyPrefs as Record<string, boolean> | null)?.allowSearch !==
          false,
      )
      .slice(0, 20)
      .map(({ privacyPrefs, ...rest }) => rest);
  }

  /** Public profile by profileSlug (respects the "Public Profile" toggle) */
  @Get(':slug')
  async getProfile(@Param('slug') slug: string, @Request() req: any) {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ profileSlug: slug }, { username: slug }] },
      select: {
        id: true,
        displayName: true,
        username: true,
        profileSlug: true,
        avatarUrl: true,
        bio: true,
        privacyPrefs: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const isPublic =
      (user.privacyPrefs as Record<string, boolean> | null)?.publicProfile !==
      false;
    if (!isPublic && user.id !== req.user.sub) {
      // Private profile: only the owner or accepted friends may view it. Return 404
      // (not 403) so a private profile is indistinguishable from a non-existent one.
      const friend = await this.isAcceptedFriend(req.user.sub, user.id);
      if (!friend) throw new NotFoundException('User not found');
    }

    const { privacyPrefs, ...publicProfile } = user;
    return publicProfile;
  }

  /** Public/friends schedules for a profile */
  @Get(':slug/schedules')
  async getSchedules(@Param('slug') slug: string, @Request() req: any) {
    const target = await this.prisma.user.findFirst({
      where: { OR: [{ profileSlug: slug }, { username: slug }] },
      select: { id: true, privacyPrefs: true },
    });
    if (!target) return [];

    // Respect the "Show Events on profile" toggle (owner can always see their own).
    const showEvents =
      (target.privacyPrefs as Record<string, boolean> | null)?.showEvents !==
      false;
    if (!showEvents && target.id !== req.user.sub) return [];

    const isFriend = await this.isAcceptedFriend(req.user.sub, target.id);

    const now = new Date();
    const until = new Date();
    until.setDate(now.getDate() + 14);

    return this.prisma.schedule.findMany({
      where: {
        userId: target.id,
        startDatetime: { gte: now, lte: until },
        visibility: isFriend ? { in: ['friends', 'public'] } : 'public',
      },
      orderBy: { startDatetime: 'asc' },
      take: 10,
    });
  }

  /** Check friendship status between me and a profile */
  @Get(':slug/friend-status')
  async friendStatus(@Param('slug') slug: string, @Request() req: any) {
    const myId = req.user.sub;
    const target = await this.prisma.user.findFirst({
      where: { OR: [{ profileSlug: slug }, { username: slug }] },
      select: { id: true },
    });
    if (!target) return { status: 'none' };

    if (myId === target.id) return { status: 'self' };

    const friendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: myId, addresseeId: target.id },
          { requesterId: target.id, addresseeId: myId },
        ],
      },
    });

    if (!friendship) return { status: 'none' };
    if (friendship.status === 'accepted') return { status: 'friends' };
    if (friendship.requesterId === myId) return { status: 'pending_sent' };
    return { status: 'pending_received', friendshipId: friendship.id };
  }
}
