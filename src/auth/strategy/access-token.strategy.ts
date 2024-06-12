import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../types';

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    // private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('JWT_SECRET_ACCESS_TOKEN'),
    });
  }

  validate(payload: JwtPayload) {
    return payload;
  }

  //   async validate(payload: { sub: number; email: string }) {
  //     const user = await this.prisma.user.findUniqueOrThrow({
  //       where: {
  //         id: payload.sub,
  //       },
  //     });
  //     delete user.password;
  //     return user;
  //   }
}
