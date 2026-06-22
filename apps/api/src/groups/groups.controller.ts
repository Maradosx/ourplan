import { Controller, Get, Post, Patch, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GroupsService } from './groups.service';

class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  name!: string;
}

class AddMemberDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;
}

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private groups: GroupsService) {}

  @Get()
  getGroups(@Request() req: any) {
    return this.groups.getGroups(req.user.sub);
  }

  @Post()
  createGroup(@Request() req: any, @Body() body: CreateGroupDto) {
    return this.groups.createGroup(req.user.sub, body.name);
  }

  @Patch(':id')
  renameGroup(@Request() req: any, @Param('id') id: string, @Body() body: CreateGroupDto) {
    return this.groups.renameGroup(req.user.sub, id, body.name);
  }

  @Delete(':id')
  deleteGroup(@Request() req: any, @Param('id') id: string) {
    return this.groups.deleteGroup(req.user.sub, id);
  }

  @Post(':id/members')
  addMember(@Request() req: any, @Param('id') id: string, @Body() body: AddMemberDto) {
    return this.groups.addMember(req.user.sub, id, body.userId);
  }

  @Delete(':id/members/:userId')
  removeMember(@Request() req: any, @Param('id') id: string, @Param('userId') userId: string) {
    return this.groups.removeMember(req.user.sub, id, userId);
  }
}
