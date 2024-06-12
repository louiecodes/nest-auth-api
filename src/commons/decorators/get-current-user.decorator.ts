import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * El parametro data es opcional
 * y puede recibir un atributo de User
 * para finalmente devolverlo.
 */
export const GetCurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    if (data) {
      return request.user[data];
    }

    return request.user;
  },
);
