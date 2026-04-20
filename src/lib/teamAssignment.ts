import type { Member, CheckIn, GearType, TeamMember, TeamSlot, TeamResult } from './types';
import { TEAM_CONFIGS } from './teamColors';

// ============================================================
// スコア計算
// ============================================================

export function calcGearScore(gearType: GearType): number {
	return gearType === 'own' ? 2 : 1;
}

export function calcExpScore(totalSessions: number): number {
	if (totalSessions >= 10) return 2;
	if (totalSessions >= 5)  return 1;
	return 0;
}

export function buildTeamMember(member: Member, checkIn: CheckIn, totalSessions: number): TeamMember {
	const gearScore = calcGearScore(checkIn.gearType);
	const expScore  = calcExpScore(totalSessions);
	return { ...member, gearType: checkIn.gearType, gearScore, expScore, totalScore: gearScore + expScore, totalSessions };
}

// ============================================================
// N チーム振り分けアルゴリズム
// ============================================================

function shuffle<T>(arr: T[]): T[] {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
	return arr;
}

/**
 * チェックイン済みメンバーを numTeams チームに均等振り分け。
 *
 * アルゴリズム:
 *   1. スコア降順ソート（同スコア内はランダム → 毎回違う組み合わせ）
 *   2. 貪欲法：スコア合計が最小のチームに次のメンバーを割り当て
 */
export function assignTeams(
	members: Member[],
	sessionCheckIns: CheckIn[],
	participationCounts: Map<string, number>,
	numTeams: number
): TeamResult {
	const n = Math.max(2, Math.min(numTeams, TEAM_CONFIGS.length));

	if (sessionCheckIns.length === 0) {
		return { slots: TEAM_CONFIGS.slice(0, n).map((config) => ({ config, members: [], totalScore: 0 })) };
	}

	const checkInMap = new Map<string, CheckIn>();
	for (const ci of sessionCheckIns) checkInMap.set(ci.memberId, ci);

	// TeamMember に変換
	const teamMembers: TeamMember[] = members
		.filter((m) => checkInMap.has(m.id))
		.map((m) => buildTeamMember(m, checkInMap.get(m.id)!, participationCounts.get(m.id) ?? 0));

	// 同スコアグループ内をシャッフル
	const grouped = new Map<number, TeamMember[]>();
	for (const tm of teamMembers) {
		const b = grouped.get(tm.totalScore) ?? [];
		b.push(tm);
		grouped.set(tm.totalScore, b);
	}
	for (const b of grouped.values()) shuffle(b);

	// スコア降順ソート
	const sorted: TeamMember[] = Array.from(grouped.entries())
		.sort(([a], [b]) => b - a)
		.flatMap(([, bucket]) => bucket);

	// N チームに貪欲割り当て
	const slots: TeamSlot[] = TEAM_CONFIGS.slice(0, n).map((config) => ({
		config,
		members: [],
		totalScore: 0
	}));

	for (const tm of sorted) {
		// 合計スコアが最小のチームを選ぶ
		const minIdx = slots.reduce((mi, s, i) => (s.totalScore < slots[mi].totalScore ? i : mi), 0);
		slots[minIdx].members.push(tm);
		slots[minIdx].totalScore += tm.totalScore;
	}

	return { slots };
}
