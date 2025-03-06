import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  Pagination,
  PaginationMeta,
  PaginationResponse,
} from 'src/commons/types';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserResponseDto } from './dto/user-response.dto';
import { CreateUserDto } from './dto/create-user.dto';
import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    search?: string,
    params?: Pagination,
  ): Promise<PaginationResponse<UserResponseDto>> {
    const { skip = 0, take = 10, orderBy, order } = params || {};

    try {
      const total = await this.prisma.user.count({
        where: {
          OR: search
            ? [
                { firstName: { contains: search } },
                { lastName: { contains: search } },
                { email: { contains: search } },
              ]
            : undefined,
        },
      });
      // Calcula la página actual y el total de páginas
      const page = Math.ceil(skip / take) + 1;
      const pages = Math.ceil(total / take);

      const users = await this.prisma.user.findMany({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: {
            select: {
              name: true,
            },
          },
          createdAt: true,
        },
        where: {
          OR: search
            ? [
                { firstName: { contains: search } },
                { lastName: { contains: search } },
                { email: { contains: search } },
              ]
            : undefined,
        },
        skip: parseInt(skip.toString()),
        take: parseInt(take.toString()),
        orderBy: orderBy ? { [orderBy]: order } : undefined,
      });

      // Construye la respuesta con meta y datos
      const meta: PaginationMeta = {
        total,
        page,
        limit: take,
        pages,
        orderBy: params.orderBy || null,
        order: params.order || null,
      };

      return {
        meta,
        data: users,
      };
    } catch (e) {
      throw new InternalServerErrorException('Error retrieving users');
    }
  }

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    try {
      const hash = await argon.hash(createUserDto.password);
      const user = await this.prisma.user.create({
        data: {
          firstName: createUserDto.firstName,
          lastName: createUserDto.lastName,
          email: createUserDto.email,
          password: hash,
          roleId: createUserDto.role,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return user;
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError) {
        if (e.code === 'P2002') {
          throw new ForbiddenException('Credentials taken');
        }
      }
      throw new InternalServerErrorException('Error creating user');
    }
  }

  async update(
    userId: number,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    try {
      // Verificar si el email ya existe en otro usuario
      if (updateUserDto.email) {
        const existingUser = await this.prisma.user.findUnique({
          where: { email: updateUserDto.email },
        });

        if (existingUser && existingUser.id !== userId) {
          throw new BadRequestException('Email already in use');
        }
      }

      // Si está cambiando la contraseña, la hasheamos
      if (updateUserDto.password) {
        const hash = await argon.hash(updateUserDto.password);
        updateUserDto.password = hash;
      }

      const user = await this.prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          ...updateUserDto,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return user;
    } catch (e) {
      console.log(e);
      throw new BadRequestException('Error updating user');
    }
  }
}
