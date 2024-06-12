import { Controller, Get, UseGuards } from '@nestjs/common';
import { User } from '@prisma/client';
import { GetCurrentUser } from 'src/commons/decorators';
import { AccessTokenGuard } from 'src/commons/guards';

@UseGuards(AccessTokenGuard)
@Controller('users')
export class UserController {
  @Get('me')
  getMe(@GetCurrentUser() user: User) {
    return user;
  }
}
