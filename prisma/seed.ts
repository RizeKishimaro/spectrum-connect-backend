// // prisma/seed.ts
// import { PrismaClient } from '@prisma/client'

// const prisma = new PrismaClient()

// async function main() {
//   // Creating the agent "Martin Elio"
//   const martin = {
//     id: "cma7o5hzv00033h8v8r5m8ncj",
//     name: "Martin Elio",
//     sipUname: "1006",
//     sipPassword: "1006",
//     password: "$2b$10$K5TOyNryIPiMZF7pcMTEZehBTsCRTimfcbYRdmifZjfVkg20RTpn.",
//     firstName: "Martin",
//     lastName: "Elio",
//     phoneNumber: "09978551579",
//     SIPTech: "PJSIP",
//     status: "AVAILABLE",
//     updatedAt: new Date("2025-05-03T04:56:19.452Z"),
//     systemCompanyId: 2,
//   }

//   // Create mock calls for Martin Elio
//   await prisma.callLog.createMany({
//     data: [
//       {
//         agentId: martin.id,
//         createdAt: new Date(),
//         duration: 230, // 3 minutes 50 seconds
//       },
//       {
//         agentId: martin.id,
//         createdAt: new Date(new Date().setDate(new Date().getDate() - 1)),
//         duration: 180, // 3 minutes
//       },
//       {
//         agentId: martin.id,
//         createdAt: new Date(new Date().setDate(new Date().getDate() - 2)),
//         duration: 200, // 3 minutes 20 seconds
//       },
//     ],
//   })

//   console.log('Seed data for Martin Elio created! ✨')
// }

// main()
//   .catch(e => {
//     throw e
//   })
//   .finally(async () => {
//     await prisma.$disconnect()
//   })

