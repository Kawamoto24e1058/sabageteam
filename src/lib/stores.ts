import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import type { Member, Session, CheckIn, TeamResult } from './types';
import { MOCK_MEMBERS, MOCK_SESSIONS, MOCK_CHECKINS } from './mockData';

// ============================================================
// localStorage 永続化ヘルパー
// ============================================================

function persist<T>(key: string, initial: T) {
	const stored = browser ? localStorage.getItem(key) : null;
	const store = writable<T>(stored ? JSON.parse(stored) : initial);
	if (browser) {
		store.subscribe((v) => localStorage.setItem(key, JSON.stringify(v)));
	}
	return store;
}

// ============================================================
// 永続化ストア
// ============================================================

export const members        = persist<Member[]>('sm_members',          MOCK_MEMBERS);
export const sessions       = persist<Session[]>('sm_sessions',         MOCK_SESSIONS);
export const allCheckIns    = persist<CheckIn[]>('sm_checkins',         MOCK_CHECKINS);
export const currentSessionId = persist<string | null>('sm_current_session', null);
export const teamResults    = persist<Record<string, TeamResult>>('sm_team_results', {});

/** チーム数設定（2〜6） */
export const numTeams = persist<number>('sm_num_teams', 2);

// ============================================================
// 派生ストア
// ============================================================

export const currentSession = derived(
	[sessions, currentSessionId],
	([$s, $id]) => $s.find((s) => s.id === $id) ?? null
);

export const currentCheckIns = derived(
	[allCheckIns, currentSessionId],
	([$all, $id]) => ($id ? $all.filter((ci) => ci.sessionId === $id) : [])
);

export const participationCounts = derived(allCheckIns, ($all) => {
	const map = new Map<string, number>();
	for (const ci of $all) map.set(ci.memberId, (map.get(ci.memberId) ?? 0) + 1);
	return map;
});

export const currentCheckedInIds    = derived(currentCheckIns, ($c) => new Set($c.map((ci) => ci.memberId)));
export const currentCheckedInCount  = derived(currentCheckIns, ($c) => $c.length);
export const currentOwnGearCount    = derived(currentCheckIns, ($c) => $c.filter((ci) => ci.gearType === 'own').length);
export const currentRentalGearCount = derived(currentCheckIns, ($c) => $c.filter((ci) => ci.gearType === 'rental').length);

export const currentTeamResult = derived(
	[teamResults, currentSessionId],
	([$r, $id]) => ($id ? ($r[$id] ?? null) : null)
);

// ============================================================
// ユーティリティ
// ============================================================

export function generateId(): string {
	return Math.random().toString(36).slice(2, 10);
}

export function checkInMember(sessionId: string, memberId: string, gearType: 'own' | 'rental') {
	allCheckIns.update((list) => {
		const exists = list.find((ci) => ci.memberId === memberId && ci.sessionId === sessionId);
		if (exists) return list.map((ci) =>
			ci.memberId === memberId && ci.sessionId === sessionId ? { ...ci, gearType } : ci
		);
		return [...list, { id: generateId(), memberId, sessionId, gearType, checkedInAt: new Date().toISOString() }];
	});
	teamResults.update((r) => { const u = { ...r }; delete u[sessionId]; return u; });
}

export function checkOutMember(sessionId: string, memberId: string) {
	allCheckIns.update((list) => list.filter((ci) => !(ci.memberId === memberId && ci.sessionId === sessionId)));
	teamResults.update((r) => { const u = { ...r }; delete u[sessionId]; return u; });
}
