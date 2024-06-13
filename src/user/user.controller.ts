import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { GetCurrentUser } from 'src/commons/decorators';

@ApiTags('Users')
@Controller('users')
export class UserController {
  @Get('me')
  getMe(@GetCurrentUser() user: User) {
    return user;
  }
}
