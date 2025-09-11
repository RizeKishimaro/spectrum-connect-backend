// scripts/insertUser.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = 'adminuser'; // your plaintext password
  const hashedPassword = await bcrypt.hash(password, 10);


  const pjsipEndpoint = await prisma.sIPProvider.create({
    data: {
      name: "FakeVoIP Provider",
      description: "Test SIP provider for dev",
      IpHost: "192.168.100.50",   // fake IP
      // SipTech will default to "pjsip"
    },
  })
  const company = await prisma.systemCompany.create({
    data: {
      name: "HaCk CaT Software Solutions",
      membersCount: "42", // fake number of employees
      address: "1337 Hacker St, Cyber City",
      country: "NowhereLand",
      state: "RootAccess",
      sIPProviderId: pjsipEndpoint.id,  // link to SIP provider
    },
    include: { SIPProvider: true },
  })



  const user = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@wavenet.se',
      password: hashedPassword,
      sipUser: '1001',
      sipPass: 'sipSecret123',
      status: 'OFFLINE',           // make sure matches your AgentStatus enum
      roles: 'admin',              // make sure matches your Role enum
      systemCompanyId: company.id,          // set the company id you want
      createdAt: new Date(),
    },
  });

  console.log('Inserted user:', user);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());

