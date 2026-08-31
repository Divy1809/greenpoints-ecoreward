const BADGES = [
  { id: 'first-green-step', name: 'First Green Step', threshold: 0, requiredActivities: 1, description: 'Record your first eco activity.' },
  { id: 'eco-starter', name: 'Eco Starter', threshold: 100, description: 'Earn 100 GreenPoints.' },
  { id: 'green-champion', name: 'Green Champion', threshold: 500, description: 'Earn 500 GreenPoints.' },
  { id: 'sustainability-hero', name: 'Sustainability Hero', threshold: 1000, description: 'Earn 1,000 GreenPoints.' },
];

function badgeStatus(activities) {
  const chronological = activities.slice().sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  return BADGES.map((badge) => {
    let points = 0; let count = 0; let earnedAt = null;
    for (const activity of chronological) {
      points += activity.points; count += 1;
      if (!earnedAt && points >= badge.threshold && (!badge.requiredActivities || count >= badge.requiredActivities)) earnedAt = activity.timestamp;
    }
    return { ...badge, earned: Boolean(earnedAt), earnedAt };
  });
}

function monthlyReport(activities, month = new Date().toISOString().slice(0, 7)) {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('month must use YYYY-MM format.');
  const [year, numericMonth] = month.split('-').map(Number);
  const current = activities.filter((a) => a.timestamp.slice(0, 7) === month);
  const previousMonth = new Date(Date.UTC(year, numericMonth - 2, 1)).toISOString().slice(0, 7);
  const previous = activities.filter((a) => a.timestamp.slice(0, 7) === previousMonth);
  const sum = (items) => items.reduce((total, item) => total + item.points, 0);
  const activityBreakdown = current.reduce((all, activity) => {
    all[activity.type] ||= { activities: 0, points: 0 };
    all[activity.type].activities += 1; all[activity.type].points += activity.points; return all;
  }, {});
  return { month, totalActivities: current.length, totalPoints: sum(current), activityBreakdown, previousPeriod: { month: previousMonth, totalActivities: previous.length, totalPoints: sum(previous) }, badgesEarned: badgeStatus(activities).filter((badge) => badge.earnedAt?.slice(0, 7) === month) };
}

async function dashboardForUser(user, repository) {
  const activities = await repository.activitiesForUser(user.userId);
  const leaderboard = await repository.leaderboard();
  const totalPoints = leaderboard.find((entry) => entry.userId === user.userId)?.points || 0;
  const badges = badgeStatus(activities);
  const nextBadge = badges.find((badge) => !badge.earned) || null;
  const nextProgress = nextBadge ? { badge: nextBadge.name, current: nextBadge.requiredActivities ? activities.length : totalPoints, target: nextBadge.requiredActivities ? nextBadge.requiredActivities : nextBadge.threshold } : { badge: 'All badges earned', current: totalPoints, target: totalPoints };
  return { profile: user, totalPoints, activityCount: activities.length, recentActivities: activities.slice(0, 5), leaderboard: leaderboard.map((entry, index) => ({ ...entry, rank: index + 1, isCurrentUser: entry.userId === user.userId })), rank: leaderboard.findIndex((entry) => entry.userId === user.userId) + 1, badges, nextProgress, monthlyReport: monthlyReport(activities) };
}

module.exports = { BADGES, badgeStatus, monthlyReport, dashboardForUser };
