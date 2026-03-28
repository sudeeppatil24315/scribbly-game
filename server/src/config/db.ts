import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

prisma.$connect()
  .then(() => console.log('✅ Database connected'))
  .catch((err) => {
    console.error('❌ Database connection error:', err);
    process.exit(1);
  });

export default prisma;
