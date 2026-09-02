import 'dotenv/config';
import { PrismaService } from '../src/prisma/prisma.service';

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();
  try {
    const businesses = await prisma.business.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        createdAt: true,
        _count: { select: { staff: true, services: true, bookings: true } },
      },
    });
    console.table(businesses.map((business) => ({
      id: business.id,
      name: business.name,
      createdAt: business.createdAt.toISOString(),
      users: business._count.staff,
      services: business._count.services,
      bookings: business._count.bookings,
    })));
    if (businesses.length > 1) {
      console.error('BLOCKED: choose the canonical Business and review/reassign every related row before deleting duplicates. This script never mutates data.');
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
