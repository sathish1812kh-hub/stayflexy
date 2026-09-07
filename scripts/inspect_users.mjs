import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()

async function run() {
  const users = await p.user.findMany({
    select: { email: true, status: true, organizationId: true, primaryRole: true },
  })
  for (const u of users) {
    let org = null
    if (u.organizationId) {
      org = await p.organization.findUnique({
        where: { id: u.organizationId },
        select: { slug: true, status: true },
      })
    }
    console.log(u.email, u.status, u.primaryRole, JSON.stringify(org))
  }
}

run().finally(() => p.$disconnect())
