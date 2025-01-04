import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtPayload } from '../types';

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('JWT_SECRET_ACCESS_TOKEN'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: {
        id: payload.id,
      },
      include: {
        Role: {
          select: {
            name: true,
          },
        },
      },
    });
    delete user.password;
    delete user.refreshToken;

    return user;
  }
}
