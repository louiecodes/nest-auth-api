import {
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
import { UserResponse } from './dto/user-response.dto';
import { CreateUserDto } from './dto/create-user.dto';
import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    search?: string,
    params?: Pagination,
  ): Promise<PaginationResponse<UserResponse>> {
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

  async create(createUserDto: CreateUserDto) {
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
}
