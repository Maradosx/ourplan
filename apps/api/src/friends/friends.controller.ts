import { Controller, Get, Post, Param, UseGuards, Request, ConflictException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(@Request() req: any) {
    const userId = req.user.sub;
    const friendships = await this.prisma.friendship.findMany({
      where: { status: 'accepted', OR: [{ requesterId: userId }, { addresseeId: userId }] },
      include: {
        requester: { select: { id: true, displayName: true, username: true, avatarUrl: true, profileSlug: true } },
        addressee: { select: { id: true, displayName: true, username: true, avatarUrl: true, profileSlug: true } },
      },
    });
    return friendships.map((f) => (f.requesterId === userId ? f.addressee : f.requester));
  }

  @Get('pending')
  async pending(@Request() req: any) {
    const pending = await this.prisma.friendship.findMany({
      where: { addresseeId: req.user.sub, status: 'pending' },
      include: { requester: { select: { id: true, displayName: true, username: true, avatarUrl: true, profileSlug: true } } },
    });
    return pending.map((f) => ({ ...f.requester, friendshipId: f.id }));
  }

  @Post(':id/accept')
  async accept(@Request() req: any, @Param('id') id: string) {
    return this.prisma.friendship.update({
      where: { id, addresseeId: req.user.sub },
      data: { status: 'accepted' },
    });
  }

  @Post(':id/decline')
  async decline(@Request() req: any, @Param('id') id: string) {
    return this.prisma.friendship.delete({ where: { id, addresseeId: req.user.sub } });
  }

  @Post('request/:targetId')
  async sendRequest(@Request() req: any, @Param('targetId') targetId: string) {
    const myId = req.user.sub;
    if (myId === targetId) throw new ConflictException('Cannot add yourself');
    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: myId, addresseeId: targetId },
          { requesterId: targetId, addresseeId: myId },
        ],
      },
    });
    if (existing) throw new ConflictException('Friend request already exists');
    return this.prisma.friendship.create({
      data: { requesterId: myId, addresseeId: targetId, status: 'pending' },
    });
  }

  @Post(':id/unfriend')
  async unfriend(@Request() req: any, @Param('id') friendshipId: string) {
    return this.prisma.friendship.deleteMany({
      where: {
        id: friendshipId,
        OR: [{ requesterId: req.user.sub }, { addresseeId: req.user.sub }],
      },
    });
  }
}
