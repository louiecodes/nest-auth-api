import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import * as argon from 'argon2';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthDto } from './dto';
import { JwtPayload, Tokens } from './types';
import { UpdateUserDto } from 'src/user/dto/update-user.dto';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async signin(dto: AuthDto): Promise<Tokens> {
    try {
      const user = await this.prisma.user.findFirstOrThrow({
        where: {
          email: dto.email,
        },
      });

      if (!user) throw new ForbiddenException('Credentials incorrect');

      const pwMatches = await argon.verify(user.password, dto.password);

      if (!pwMatches) throw new ForbiddenException('Credentials incorrect');

      const tokens = await this.getTokens(user.id, user.email);
      await this.updateRefreshTokenHash(user.id, tokens.refresh_token);
      return tokens;
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError) {
        if (e.code === 'P2002') {
          throw new ForbiddenException('Credentials taken');
        }
      }
      throw e;
    }
  }

  async signup(dto: AuthDto) {
    try {
      const hash = await argon.hash(dto.password);
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: hash,
        },
      });

      const tokens = await this.getTokens(user.id, user.email);
      await this.updateRefreshTokenHash(user.id, tokens.refresh_token);
      return tokens;
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError) {
        if (e.code === 'P2002') {
          throw new ForbiddenException('Credentials taken');
        }
      }
      throw e;
    }
  }

  async logout(userId: number): Promise<boolean> {
    await this.prisma.user.updateMany({
      where: {
        id: userId,
        refreshToken: {
          not: null,
        },
      },
      data: {
        refreshToken: null,
      },
    });
    return true;
  }

  async refreshTokens(userId: number, rt: string): Promise<Tokens> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
    if (!user || !user.refreshToken)
      throw new ForbiddenException('Access Denied');

    const rtMatches = await argon.verify(user.refreshToken, rt);
    if (!rtMatches) throw new ForbiddenException('Access Denied');

    const tokens = await this.getTokens(user.id, user.email);
    await this.updateRefreshTokenHash(user.id, tokens.refresh_token);

    return tokens;
  }

  async updateRefreshTokenHash(userId: number, rt: string): Promise<void> {
    const hash = await argon.hash(rt);
    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        refreshToken: hash,
      },
    });
  }

  async getTokens(userId: number, email: string): Promise<Tokens> {
    const secretAccessToken = this.config.get('JWT_SECRET_ACCESS_TOKEN');
    const secretRefreshToken = this.config.get('JWT_SECRET_REFRESH_TOKEN');
    const atExpiresIn = this.config.get('JWT_AT_EXPIRES_IN');
    const rtExpiresIn = this.config.get('JWT_RT_EXPIRES_IN');

    const jwtPayload: JwtPayload = {
      id: userId,
      email: email,
    };

    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(jwtPayload, {
        secret: secretAccessToken,
        expiresIn: atExpiresIn,
      }),
      this.jwtService.signAsync(jwtPayload, {
        secret: secretRefreshToken,
        expiresIn: rtExpiresIn,
      }),
    ]);

    return {
      access_token: at,
      refresh_token: rt,
    };
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<UpdateUserDto> {
    try {
      // Buscar al usuario por su ID
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Verificar la contraseña actual
      const isPasswordValid = await argon.verify(
        user.password,
        currentPassword,
      );

      if (!isPasswordValid) {
        throw new BadRequestException('Incorrect password');
      }

      // Hashear la nueva contraseña
      const hashedPassword = await argon.hash(newPassword);

      // Actualizar la contraseña en la base de datos
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });
      delete updatedUser.password;
      delete updatedUser.refreshToken;
      return updatedUser;
    } catch (error) {
      throw new BadRequestException();
    }
  }

  async forgotPassword(email: string) {
    // Buscar al usuario por su email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      // Generar un token único
      const resetToken = this.jwtService.sign(
        { userId: user.id },
        {
          secret: this.config.get('JWT_RESET_PASSWORD_SECRET'),
          expiresIn: '1h', // Expira en 1 hora
        },
      );
      // Guardar el token en la base de datos
      await this.prisma.user.update({
        where: { id: user.id },
        data: { resetPasswordToken: resetToken },
      });
      // Enviar correo electrónico al usuario con el token (reemplaza con tu servicio de email)
      await this.sendResetPasswordEmail(user.email, resetToken, user.firstName);
    }

    return { message: 'Email sent' };
  }

  private async sendResetPasswordEmail(
    email: string,
    token: string,
    username: string,
  ): Promise<void> {
    const resetUrl = `${this.config.get('FRONTEND_URL')}/reset-password/${token}`;
    await this.mailService.sendResetPasswordEmail(email, resetUrl, username);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      // Verificar el token
      const payload = this.jwtService.verify(token, {
        secret: this.config.get('JWT_RESET_PASSWORD_SECRET'),
      });

      // Buscar al usuario asociado al token
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user || user.resetPasswordToken !== token) {
        throw new BadRequestException('Invalid or expired token');
      }

      // Hashear la nueva contraseña
      const hashedPassword = await argon.hash(newPassword);

      // Actualizar la contraseña en la base de datos
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetPasswordToken: null, // Limpia el token después de usarlo
        },
      });
    } catch (error) {
      throw new BadRequestException('Invalid or expired token');
    }
  }
}
