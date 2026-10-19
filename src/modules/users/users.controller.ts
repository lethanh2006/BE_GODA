import { Body, Controller, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { Authenticated, CurrentUser } from '../../common/auth/decorators.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { toPublicUser } from '../auth/auth.service.js';
import { UpdateMeDto } from './dto/update-me.dto.js';

@ApiTags('users')
@Controller('users')
@Authenticated()
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Patch('me')
  async updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateMeDto) {
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { displayName: dto.displayName, targetLevel: dto.targetLevel },
    });
    return toPublicUser(updated);
  }
}
