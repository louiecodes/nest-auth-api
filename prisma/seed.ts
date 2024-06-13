import { PrismaClient } from '@prisma/client';
import * as argon from 'argon2';
import { Role } from '../src/enums/role.enum';

const prisma = new PrismaClient();
async function main() {
  /* Roles */
  const roleSuperAdmin = await prisma.role.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: Role.SuperAdmin,
    },
  });

  const roleAdmin = await prisma.role.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: Role.Admin,
    },
  });

  const roleUser = await prisma.role.upsert({
    where: { id: 3 },
    update: {},
    create: {
      name: Role.User,
    },
  });

  /* Users */
  const louie = await prisma.user.upsert({
    where: { email: 'louie@codes.com' },
    update: {},
    create: {
      email: 'louie@codes.com',
      password: await argon.hash('123456'),
      firstName: 'Louie',
      lastName: 'Codes',
      Role: {
        connect: {
          id: 1, // SuperAdmin
        },
      },
    },
  });

  console.log({ roleSuperAdmin, roleAdmin, roleUser });
  console.log({ louie });
}
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
