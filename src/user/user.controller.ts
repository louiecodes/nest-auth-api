import { Controller, Get } from '@nestjs/common';
import { User } from '@prisma/client';
import { GetCurrentUser } from 'src/commons/decorators';

@Controller('users')
export class UserController {
  @Get('me')
  getMe(@GetCurrentUser() user: User) {
    return user;
  }
}
