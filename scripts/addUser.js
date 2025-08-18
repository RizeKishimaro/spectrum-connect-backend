// scripts/insertUser.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = 's3cur3@pa$$word'; // your plaintext password
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@wavenet.se',
      password: hashedPassword,
      sipUser: '1001',
      sipPass: 'sipSecret123',
      status: 'OFFLINE',           // make sure matches your AgentStatus enum
      roles: 'admin',              // make sure matches your Role enum
      systemCompanyId: 1,          // set the company id you want
      createdAt: new Date(),
    },
  });

  console.log('Inserted user:', user);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());

