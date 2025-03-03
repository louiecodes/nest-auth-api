import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST, // Por ejemplo, smtp.gmail.com
      port: parseInt(process.env.MAIL_PORT, 10), // Por ejemplo, 587
      secure: true, // true para 465, false para otros puertos
      auth: {
        user: process.env.MAIL_USER, // Tu dirección de correo
        pass: process.env.MAIL_PASSWORD, // Tu contraseña de correo o app password
      },
      tls: {
        // False sólo para pruebas
        rejectUnauthorized: process.env.MAIL_TLS === 'true' ? true : false,
      },
    });
  }

  async sendMail(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"App" <${process.env.MAIL_USER}>`, // Remitente
        to, // Destinatario
        subject, // Asunto
        html, // Contenido en HTML
      });
    } catch (error) {
      console.error('Error al enviar el correo:', error);
      throw new Error('No se pudo enviar el correo');
    }
  }

  async sendResetPasswordEmail(
    email: string,
    resetUrl: string,
    username: string,
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Restablecer contraseña</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
            color: #333333;
          }
          .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
          }
          .header img {
            max-width: 100px;
            margin-bottom: 10px;
          }
          .header h1 {
            font-size: 24px;
            margin: 0;
            color: #333333;
          }
          .content {
            line-height: 1.6;
          }
          .content p {
            margin: 10px 0;
          }
          .button {
            display: block;
            text-align: center;
            margin: 20px 0;
          }
          .button a {
            text-decoration: none;
            background-color: #1abc9c;
            color: #ffffff;
            padding: 12px 20px;
            border-radius: 5px;
            font-size: 16px;
            font-weight: bold;
          }
          .footer {
            text-align: center;
            font-size: 12px;
            color: #888888;
            margin-top: 20px;
          }
          .text-wrap {
            word-wrap: break-word;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>App</h1>
            <h1>Restablecimiento de contraseña</h1>
          </div>
          <div class="content">
            <p>Hola, ${username}!</p>
            <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta. Si no realizaste esta solicitud, puedes ignorar este correo.</p>
            <p>Haz clic en el botón a continuación para restablecer tu contraseña:</p>
            <div class="button">
              <a href="${resetUrl}" target="_blank">Restablecer contraseña</a>
            </div>
            <p>Gracias,<br>El equipo de App</p>
          </div>
          <div class="footer">
            <p>Si tienes problemas para hacer clic en el botón, copia y pega el siguiente enlace en tu navegador:</p>
            <p class="text-wrap">${resetUrl}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendMail(email, 'Restablece tu contraseña', html);
  }
}
