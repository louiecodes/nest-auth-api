import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { GetCurrentUser, Roles } from 'src/commons/decorators';
import { UserService } from './user.service';
import { PaginationResponse } from 'src/commons/types';
import { UserResponseDto } from './dto/user-response.dto';
import { RolesGuard } from 'src/commons/guards';
import { Role } from 'src/enums';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

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
  ): Promise<PaginationResponse<UserResponseDto>> {
    const skip = (page - 1) * limit;
    return this.userService.findAll(search, {
      skip,
      take: limit,
      orderBy,
      order,
    });
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.SuperAdmin)
  createUser(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.userService.create(createUserDto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SuperAdmin)
  updateUser(
    @Param('id', ParseIntPipe) userId: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.update(userId, updateUserDto);
  }
}
