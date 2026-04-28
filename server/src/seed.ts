import 'dotenv/config';
import prisma from './prisma';
import { hashPassword } from './utils/hash';
import { generateInviteCode } from './utils/inviteCode';
import { DEFAULT_POINTS } from './services/points.service';

async function seed() {
  console.log('🌱 Seeding database...');

  // Users
  const hash = await hashPassword('kozmu123');

  const [joao, ana, pedro, user4] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'joao@kozmu.app' },
      update: {},
      create: {
        email: 'joao@kozmu.app',
        username: 'joaosilva',
        passwordHash: hash,
        displayName: 'João Silva',
        bio: 'Creator de conteúdo sobre fitness e lifestyle',
        profileType: 'creator',
        platforms: JSON.stringify(['instagram', 'tiktok', 'youtube']),
        totalPoints: 320,
        league: 'gold',
        winCount: 2,
      },
    }),
    prisma.user.upsert({
      where: { email: 'ana@kozmu.app' },
      update: {},
      create: {
        email: 'ana@kozmu.app',
        username: 'anacosta',
        passwordHash: hash,
        displayName: 'Ana Costa',
        bio: 'Social Media Manager | Especialista em Instagram',
        profileType: 'social_media',
        platforms: JSON.stringify(['instagram', 'linkedin']),
        totalPoints: 210,
        league: 'silver',
        winCount: 1,
      },
    }),
    prisma.user.upsert({
      where: { email: 'pedro@kozmu.app' },
      update: {},
      create: {
        email: 'pedro@kozmu.app',
        username: 'pedroalves',
        passwordHash: hash,
        displayName: 'Pedro Alves',
        bio: 'Infoprodutor | Negócios e empreendedorismo',
        profileType: 'specialist',
        platforms: JSON.stringify(['linkedin', 'youtube']),
        totalPoints: 155,
        league: 'silver',
        winCount: 0,
      },
    }),
    prisma.user.upsert({
      where: { email: 'maria@kozmu.app' },
      update: {},
      create: {
        email: 'maria@kozmu.app',
        username: 'mariafernanda',
        passwordHash: hash,
        displayName: 'Maria Fernanda',
        bio: 'Creator de moda e beleza',
        profileType: 'creator',
        platforms: JSON.stringify(['instagram', 'tiktok']),
        totalPoints: 95,
        league: 'bronze',
        winCount: 0,
      },
    }),
  ]);

  // Streaks
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  await Promise.all([
    prisma.streak.upsert({
      where: { userId: joao.id },
      update: {},
      create: {
        userId: joao.id,
        currentStreak: 12,
        bestStreak: 24,
        lastCheckIn: now,
        weeklyCount: 4,
        weeklyTarget: 5,
      },
    }),
    prisma.streak.upsert({
      where: { userId: ana.id },
      update: {},
      create: {
        userId: ana.id,
        currentStreak: 5,
        bestStreak: 8,
        lastCheckIn: yesterday,
        weeklyCount: 3,
        weeklyTarget: 5,
      },
    }),
    prisma.streak.upsert({
      where: { userId: pedro.id },
      update: {},
      create: {
        userId: pedro.id,
        currentStreak: 3,
        bestStreak: 7,
        lastCheckIn: now,
        weeklyCount: 2,
        weeklyTarget: 5,
      },
    }),
    prisma.streak.upsert({
      where: { userId: user4.id },
      update: {},
      create: {
        userId: user4.id,
        currentStreak: 1,
        bestStreak: 4,
        lastCheckIn: now,
        weeklyCount: 1,
        weeklyTarget: 5,
      },
    }),
  ]);

  // Group
  const existingGroup = await prisma.group.findFirst({ where: { name: 'Criadores Elite' } });
  let group = existingGroup;

  if (!group) {
    const cycleEnd = new Date();
    cycleEnd.setDate(cycleEnd.getDate() + 7);

    group = await prisma.group.create({
      data: {
        name: 'Criadores Elite',
        description: 'Grupo de creators comprometidos com consistência diária',
        inviteCode: generateInviteCode(),
        type: 'private',
        cycleDuration: 'weekly',
        maxMembers: 20,
        currentCycleEnd: cycleEnd,
        members: {
          create: [
            { userId: joao.id, role: 'admin', cyclePoints: 65, totalPoints: 320 },
            { userId: ana.id, role: 'member', cyclePoints: 42, totalPoints: 210 },
            { userId: pedro.id, role: 'member', cyclePoints: 30, totalPoints: 155 },
            { userId: user4.id, role: 'member', cyclePoints: 15, totalPoints: 95 },
          ],
        },
        scoringRules: {
          create: Object.entries(DEFAULT_POINTS).map(([format, points]) => ({ format, points })),
        },
      },
    });
  }

  // Challenge
  const existingChallenge = await prisma.challenge.findFirst({ where: { title: 'Constância Semanal' } });
  if (!existingChallenge) {
    const challengeEnd = new Date();
    challengeEnd.setDate(challengeEnd.getDate() + 7);

    const challenge = await prisma.challenge.create({
      data: {
        groupId: group.id,
        title: 'Constância Semanal',
        description: 'Poste 5 dias consecutivos nesta semana',
        type: 'consistency',
        targetCount: 5,
        startDate: new Date(),
        endDate: challengeEnd,
        participants: {
          create: [
            { userId: joao.id, progress: 4 },
            { userId: ana.id, progress: 3 },
            { userId: pedro.id, progress: 2 },
            { userId: user4.id, progress: 1 },
          ],
        },
      },
    });

    // Second challenge
    const monthEnd = new Date();
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    await prisma.challenge.create({
      data: {
        groupId: group.id,
        title: 'Reels do Mês',
        description: 'Publique 12 Reels em 30 dias',
        type: 'format_specific',
        targetCount: 12,
        format: 'reel',
        startDate: new Date(),
        endDate: monthEnd,
        participants: {
          create: [
            { userId: joao.id, progress: 5 },
            { userId: ana.id, progress: 2 },
          ],
        },
      },
    });

    console.log('Challenge created:', challenge.id);
  }

  // Submissions (last 7 days)
  const formats = ['reel', 'carousel', 'feed', 'story', 'reel', 'linkedin'];
  const users = [joao, ana, pedro, user4];

  for (let day = 6; day >= 0; day--) {
    const date = new Date();
    date.setDate(date.getDate() - day);

    for (const u of users) {
      if (Math.random() > 0.3) {
        const format = formats[Math.floor(Math.random() * formats.length)];
        const points = DEFAULT_POINTS[format] ?? 3;

        await prisma.submission.create({
          data: {
            userId: u.id,
            groupId: group.id,
            url: `https://instagram.com/p/seed_${u.username}_${day}`,
            format,
            points,
            status: 'validated',
            validatedAt: date,
            validatedBy: 'auto',
            createdAt: date,
          },
        });
      }
    }
  }

  // Activities
  const activityTypes = ['post_validated', 'streak_extended', 'rank_up'];
  for (const u of [joao, ana, pedro]) {
    for (let i = 0; i < 3; i++) {
      const date = new Date();
      date.setHours(date.getHours() - i * 2 - Math.floor(Math.random() * 4));
      const type = activityTypes[Math.floor(Math.random() * activityTypes.length)];

      await prisma.activity.create({
        data: {
          userId: u.id,
          groupId: group.id,
          type,
          data: JSON.stringify({
            format: formats[Math.floor(Math.random() * 3)],
            points: 5,
            currentStreak: Math.floor(Math.random() * 15) + 1,
          }),
          createdAt: date,
        },
      });
    }
  }

  console.log('✅ Seed completed!');
  console.log('');
  console.log('Demo accounts:');
  console.log('  📧 joao@kozmu.app / kozmu123 (admin do grupo)');
  console.log('  📧 ana@kozmu.app  / kozmu123');
  console.log('  📧 pedro@kozmu.app / kozmu123');
  console.log('  📧 maria@kozmu.app / kozmu123');
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
