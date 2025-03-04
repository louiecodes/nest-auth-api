import {
  Controller,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { GetCurrentUser, Roles } from 'src/commons/decorators';
import { UserService } from './user.service';
import { PaginationResponse } from 'src/commons/types';
import { UserResponse } from './dto/user-response.dto';
import { RolesGuard } from 'src/commons/guards';
import { Role } from 'src/enums';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get('me')
  getMe(@GetCurrentUser() user: User) {
    return user;
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.SuperAdmin)
  findAll(
    @Query('search') search?: string,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
    @Query('orderBy') orderBy?: string,
    @Query('order') order?: 'asc' | 'desc',
  ): Promise<PaginationResponse<UserResponse>> {
    const skip = (page - 1) * limit;
    return this.userService.findAll(search, {
      skip,
      take: limit,
      orderBy,
      order,
    });
  }
}
