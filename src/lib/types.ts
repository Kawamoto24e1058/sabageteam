import type { TeamConfig } from './teamColors';

// ============================================================
// 型定義
// ============================================================

export type GearType = 'own' | 'rental';

export interface Member {
	id: string;
	name: string;
	studentId: string;
	createdAt: string;
}

export interface Session {
	id: string;
	title: string;
	date: string;
	location?: string;
	createdAt: string;
}

export interface CheckIn {
	id: string;
	memberId: string;
	sessionId: string;
	gearType: GearType;
	checkedInAt: string;
}

export interface TeamMember extends Member {
	gearType: GearType;
	gearScore: number;
	expScore: number;
	totalScore: number;
	totalSessions: number;
}

/** 1チーム分のデータ */
export interface TeamSlot {
	config: TeamConfig;
	members: TeamMember[];
	totalScore: number;
}

/** N チームの振り分け結果 */
export interface TeamResult {
	slots: TeamSlot[];
}
