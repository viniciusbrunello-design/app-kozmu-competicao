import prisma from '../prisma';

// Brazil stopped DST in 2019 — UTC-3 is now fixed year-round.
const TZ = 'America/Sao_Paulo';

/**
 * Returns 'YYYY-MM-DD' for a given UTC timestamp in Brazil timezone.
 * Using 'sv-SE' locale because it naturally produces ISO format.
 */
function localDateStr(date: Date): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: TZ }).format(date);
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return localDateStr(a) === localDateStr(b);
}

/**
 * Returns true if `date` falls on the day immediately before `reference`,
 * both evaluated in Brazil timezone. Safe to subtract exactly 24h because
 * Brazil has no DST since 2019.
 */
function isLocalYesterday(date: Date, reference: Date): boolean {
  const yesterday = new Date(reference.getTime() - 24 * 60 * 60 * 1000);
  return localDateStr(date) === localDateStr(yesterday);
}

/**
 * Returns true if `date` falls exactly 2 local days before `reference`
 * (i.e., the user missed exactly one day — eligible for catch-up token).
 */
function isLocalTwoDaysAgo(date: Date, reference: Date): boolean {
  const twoDaysAgo = new Date(reference.getTime() - 2 * 24 * 60 * 60 * 1000);
  return localDateStr(date) === localDateStr(twoDaysAgo);
}

function startOfLocalWeek(date: Date): Date {
  const str = localDateStr(date); // 'YYYY-MM-DD'
  const [y, m, d] = str.split('-').map(Number);
  const utcNoon = new Date(Date.UTC(y, m - 1, d, 15, 0, 0)); // noon BRT = 15:00 UTC
  const dow = utcNoon.getUTCDay(); // 0=Sun
  const sundayUtc = new Date(utcNoon.getTime() - dow * 24 * 60 * 60 * 1000);
  sundayUtc.setUTCHours(0, 0, 0, 0);
  return sundayUtc;
}

export async function ensureStreak(userId: string): Promise<void> {
  const existing = await prisma.streak.findUnique({ where: { userId } });
  if (!existing) {
    await prisma.streak.create({
      data: { userId, weekStart: startOfLocalWeek(new Date()) },
    });
  }
}

export async function processCheckIn(userId: string): Promise<{
  extended: boolean;
  reset: boolean;
  shieldUsed: boolean;
  currentStreak: number;
  weeklyCount: number;
  newRecord: boolean;
}> {
  await ensureStreak(userId);

  const streak = await prisma.streak.findUnique({ where: { userId } });
  if (!streak) throw new Error('Streak not found');

  const now = new Date();
  const weekStart = startOfLocalWeek(now);

  let currentStreak = streak.currentStreak;
  let extended = false;
  let reset = false;
  let shieldUsed = false;
  let catchUpTokens = streak.catchUpTokens;

  if (streak.lastCheckIn) {
    const last = new Date(streak.lastCheckIn);

    if (isSameLocalDay(last, now)) {
      // Already checked in today — no change
      return { extended: false, reset: false, shieldUsed: false, currentStreak, weeklyCount: streak.weeklyCount, newRecord: false };
    }

    if (isLocalYesterday(last, now)) {
      currentStreak += 1;
      extended = true;
    } else if (isLocalTwoDaysAgo(last, now) && catchUpTokens > 0 && currentStreak > 0) {
      // Missed exactly one day and has a shield — auto-protect the streak
      currentStreak += 1;
      extended = true;
      shieldUsed = true;
      catchUpTokens -= 1;
    } else {
      // Missed 2+ days (or no shield) — reset to 1
      currentStreak = 1;
      reset = true;
    }
  } else {
    // First ever check-in
    currentStreak = 1;
    extended = true;
  }

  const newRecord = currentStreak > streak.bestStreak;
  const bestStreak = Math.max(streak.bestStreak, currentStreak);

  // Reset weekly count if we crossed into a new local week
  const weekStartStr = localDateStr(weekStart);
  const storedWeekStr = streak.weekStart ? localDateStr(new Date(streak.weekStart)) : null;
  const isNewWeek = storedWeekStr !== weekStartStr;
  const weeklyCount = isNewWeek ? 1 : streak.weeklyCount + 1;

  // Award a new shield when user hits their weekly target
  const hitWeeklyGoal = !isNewWeek && streak.weeklyCount < streak.weeklyTarget && weeklyCount >= streak.weeklyTarget;
  if (hitWeeklyGoal && catchUpTokens < 3) {
    catchUpTokens += 1;
  }

  await prisma.streak.update({
    where: { userId },
    data: {
      currentStreak,
      bestStreak,
      lastCheckIn: now,
      weeklyCount,
      weekStart: isNewWeek ? weekStart : streak.weekStart,
      catchUpTokens,
    },
  });

  return { extended, reset, shieldUsed, currentStreak, weeklyCount, newRecord };
}

export async function getStreakStatus(userId: string): Promise<{
  currentStreak: number;
  bestStreak: number;
  weeklyCount: number;
  weeklyTarget: number;
  catchUpTokens: number;
  atRisk: boolean;
}> {
  await ensureStreak(userId);
  const streak = await prisma.streak.findUnique({ where: { userId } });
  if (!streak) {
    return { currentStreak: 0, bestStreak: 0, weeklyCount: 0, weeklyTarget: 5, catchUpTokens: 1, atRisk: false };
  }

  const now = new Date();
  let atRisk = false;

  if (streak.lastCheckIn && streak.currentStreak > 0) {
    const last = new Date(streak.lastCheckIn);
    const notPostedToday = !isSameLocalDay(last, now);
    const stillAlive = isLocalYesterday(last, now);

    // At risk = streak is active but user hasn't posted yet today (Brazil time).
    atRisk = notPostedToday && stillAlive;
  }

  return {
    currentStreak: streak.currentStreak,
    bestStreak: streak.bestStreak,
    weeklyCount: streak.weeklyCount,
    weeklyTarget: streak.weeklyTarget,
    catchUpTokens: streak.catchUpTokens,
    atRisk,
  };
}
