import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Starting to clear the database...');

  // Delete from child tables first to respect foreign key constraints
  const deletedMembers = await prisma.projectMember.deleteMany({});
  console.log(`Deleted ${deletedMembers.count} Project Members`);

  const deletedProjects = await prisma.project.deleteMany({});
  console.log(`Deleted ${deletedProjects.count} Projects`);

  const deletedUsers = await prisma.user.deleteMany({});
  console.log(`Deleted ${deletedUsers.count} Users`);

  console.log('✅ All data successfully cleared from the database!');
}

main()
  .catch((e) => {
    console.error('❌ Error clearing database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
