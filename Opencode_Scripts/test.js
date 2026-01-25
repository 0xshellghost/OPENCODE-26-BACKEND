import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const count = await prisma.leaderboardEvent.count();
console.log('LeaderboardEvent rows:', count);
