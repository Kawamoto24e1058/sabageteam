import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import type { Member, Session, CheckIn, TeamResult } from './types';
import { db } from './firebase';
import {
	collection, doc, setDoc, deleteDoc, onSnapshot
} from 'firebase/firestore';

// ============================================================
// localStorage 永続化ヘルパー（端末ごとのUI状態用）
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
// UI状態ストア（端末ごとに保持）
// ============================================================

export const currentSessionId = persist<string | null>('sm_current_session', null);
export const teamResults      = persist<Record<string, TeamResult>>('sm_team_results', {});
export const numTeams         = persist<number>('sm_num_teams', 2);

// ============================================================
// Firestore リアルタイム共有ストア
// ============================================================

export const members     = writable<Member[]>([]);
export const sessions    = writable<Session[]>([]);
export const allCheckIns = writable<CheckIn[]>([]);

// データ読み込み完了フラグ
export const membersLoaded = writable(false);

// Firebase Auth 状態
export const currentUserId = writable<string | null>(null);
export const authReady     = writable(false);

// Firestore リスナー起動（ブラウザのみ）
if (browser) {
	onSnapshot(collection(db, 'members'), (snap) => {
		members.set(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Member)));
		membersLoaded.set(true);
	});
	onSnapshot(collection(db, 'sessions'), (snap) => {
		sessions.set(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Session)));
	});
	onSnapshot(collection(db, 'checkins'), (snap) => {
		allCheckIns.set(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CheckIn)));
	});
}

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

export const currentUser = derived(
	[members, currentUserId],
	([$m, $id]) => ($id ? ($m.find((m) => m.id === $id) ?? null) : null)
);

export const myCheckIns = derived(
	[allCheckIns, currentUserId],
	([$all, $id]) => ($id ? $all.filter((ci) => ci.memberId === $id) : [])
);

export const mySessionIds = derived(myCheckIns, ($my) => new Set($my.map((ci) => ci.sessionId)));

export const mySessions = derived(
	[sessions, mySessionIds],
	([$s, $ids]) =>
		$s.filter((s) => $ids.has(s.id)).sort((a, b) => b.date.localeCompare(a.date))
);

// ============================================================
// ユーティリティ
// ============================================================

export function generateId(): string {
	return Math.random().toString(36).slice(2, 10);
}

// ============================================================
// Firestore CRUD 操作
// ============================================================

export async function addMember(member: Member): Promise<void> {
	await setDoc(doc(db, 'members', member.id), member);
}

export async function deleteMember(id: string): Promise<void> {
	await deleteDoc(doc(db, 'members', id));
}

export async function addSession(session: Session): Promise<void> {
	await setDoc(doc(db, 'sessions', session.id), session);
}

export async function deleteSession(id: string): Promise<void> {
	await deleteDoc(doc(db, 'sessions', id));
}

export async function checkInMember(
	sessionId: string,
	memberId: string,
	gearType: 'own' | 'rental'
): Promise<void> {
	const id = `${sessionId}_${memberId}`;
	await setDoc(doc(db, 'checkins', id), {
		id, memberId, sessionId, gearType,
		checkedInAt: new Date().toISOString()
	});
	teamResults.update((r) => { const u = { ...r }; delete u[sessionId]; return u; });
}

export async function checkOutMember(sessionId: string, memberId: string): Promise<void> {
	await deleteDoc(doc(db, 'checkins', `${sessionId}_${memberId}`));
	teamResults.update((r) => { const u = { ...r }; delete u[sessionId]; return u; });
}
