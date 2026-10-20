import { Body, Controller, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { Authenticated, CurrentUser } from '../../common/auth/decorators.js';
import { User } from '../../database/entities/index.js';
import { toPublicUser } from '../auth/auth.service.js';
import { UpdateMeDto } from './dto/update-me.dto.js';

@ApiTags('users')
@Controller('users')
@Authenticated()
export class UsersController {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  @Patch('me')
  async updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateMeDto) {
    const current = await this.users.findOneByOrFail({ id: user.id });
    if (dto.displayName !== undefined) current.displayName = dto.displayName;
    if (dto.targetLevel !== undefined) current.targetLevel = dto.targetLevel;
    return toPublicUser(await this.users.save(current));
  }
}
