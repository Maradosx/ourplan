import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) {}

  async getGroups(userId: string) {
    return this.prisma.group.findMany({
      where: { members: { some: { userId } } },
      include: {
        members: {
          include: {
            user: { select: { id: true, displayName: true, avatarUrl: true, username: true } },
          },
          orderBy: { role: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createGroup(userId: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) throw new BadRequestException('Group name cannot be empty');
    return this.prisma.group.create({
      data: {
        name: trimmed,
        ownerId: userId,
        members: { create: { userId, role: 'owner' } },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, displayName: true, avatarUrl: true, username: true } },
          },
        },
      },
    });
  }

  async renameGroup(userId: string, groupId: string, name: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.ownerId !== userId) throw new ForbiddenException();
    return this.prisma.group.update({ where: { id: groupId }, data: { name: name.trim() } });
  }

  async deleteGroup(userId: string, groupId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.ownerId !== userId) throw new ForbiddenException();
    return this.prisma.group.delete({ where: { id: groupId } });
  }

  async addMember(userId: string, groupId: string, memberId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.ownerId !== userId) throw new ForbiddenException();
    if (memberId === userId) throw new BadRequestException('Already in group as owner');
    // Must be friends
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        status: 'accepted',
        OR: [
          { requesterId: userId, addresseeId: memberId },
          { requesterId: memberId, addresseeId: userId },
        ],
      },
    });
    if (!friendship) throw new BadRequestException('Must be friends to add to group');
    return this.prisma.groupMember.upsert({
      where: { groupId_userId: { groupId, userId: memberId } },
      create: { groupId, userId: memberId, role: 'member' },
      update: {},
    });
  }

  async removeMember(userId: string, groupId: string, memberId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.ownerId !== userId && userId !== memberId) throw new ForbiddenException();
    if (memberId === group.ownerId) throw new BadRequestException("Cannot remove group owner");
    return this.prisma.groupMember.delete({
      where: { groupId_userId: { groupId, userId: memberId } },
    });
  }
}
