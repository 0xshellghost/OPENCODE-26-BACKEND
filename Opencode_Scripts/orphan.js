import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function checkOrphans() {
  try {
    const entries = await prisma.leaderboardEntry.findMany({
      select: { id: true, participantId: true, eventName: true }
    });
    
    console.log('Total LeaderboardEntry records:', entries.length);
    
    let orphanedCount = 0;
    let orphanedParticipants = [];
    let orphanedEntries = [];
    
    for (const entry of entries) {
      // Check if participant exists (without including User to avoid the error)
      const participant = await prisma.participant.findUnique({
        where: { participantId: entry.participantId }
      });
      
      if (!participant) {
        console.log('❌ Orphaned entry (no participant):', entry.participantId);
        orphanedEntries.push(entry.id);
        orphanedCount++;
      } else {
        // Check if the user exists separately
        const user = await prisma.user.findUnique({
          where: { githubId: participant.participantId }
        });
        
        if (!user) {
          console.log('❌ Orphaned participant (no user):', participant.participantId);
          orphanedParticipants.push(participant.participantId);
          orphanedCount++;
        }
      }
    }
    
    console.log('\n=== Summary ===');
    console.log('Orphaned records found:', orphanedCount);
    console.log('Orphaned LeaderboardEntries:', orphanedEntries.length);
    console.log('Orphaned Participants:', orphanedParticipants.length);
    
    // Option to clean up
    if (orphanedEntries.length > 0 || orphanedParticipants.length > 0) {
      console.log('\n=== Cleanup Options ===');
      console.log('To delete orphaned leaderboard entries, run:');
      console.log(`await prisma.leaderboardEntry.deleteMany({ where: { id: { in: ${JSON.stringify(orphanedEntries)} } } });`);
      
      if (orphanedParticipants.length > 0) {
        console.log('\nTo delete orphaned participants (and their entries), run:');
        console.log(`await prisma.participant.deleteMany({ where: { participantId: { in: ${JSON.stringify(orphanedParticipants)} } } });`);
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkOrphans();
