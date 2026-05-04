import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import type { Member, Session, CheckIn, TeamResult } from './types';
import { db, auth } from './firebase';
import {
	collection, doc, setDoc, deleteDoc, onSnapshot,
	writeBatch, updateDoc, query, where
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

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
export const numTeams         = persist<number>('sm_num_teams', 2);

// ============================================================
// Firestore リアルタイム共有ストア
// ============================================================

export const members          = writable<Member[]>([]);
export const sessions         = writable<Session[]>([]);
export const allCheckIns      = writable<CheckIn[]>([]);
// currentCheckIns：現在選択中セッション専用（Firestore query で更新）
export const currentCheckIns  = writable<CheckIn[]>([]);
// チーム分け結果（Firestore共有 → 参加者も閲覧可能）
export const teamResultsStore = writable<Record<string, TeamResult>>({});

// データ読み込み完了フラグ
export const membersLoaded = writable(false);

// Firebase Auth 状態
export const currentUserId = writable<string | null>(null);
export const authReady     = writable(false);

// ============================================================
// 認証確定後に Firestore リスナーを起動／サインアウト時に停止
// ============================================================

// セッション専用チェックインリスナー（モジュールスコープ）
let unsubSessionCI: (() => void) | null = null;

function resubscribeSessionCI(sessionId: string | null) {
	if (unsubSessionCI) { unsubSessionCI(); unsubSessionCI = null; }
	currentCheckIns.set([]);
	if (!sessionId) return;
	const q = query(collection(db, 'checkins'), where('sessionId', '==', sessionId));
	unsubSessionCI = onSnapshot(q, (snap) => {
		currentCheckIns.set(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CheckIn)));
	});
}

if (browser) {
	// Firestore リスナーの解除関数を保持
	let unsubFirestore: Array<() => void> = [];

	function startFirestoreListeners() {
		// 既存リスナーをまず全解除（二重起動防止）
		unsubFirestore.forEach((fn) => fn());
		unsubFirestore = [];

		unsubFirestore.push(
			onSnapshot(
				collection(db, 'members'),
				(snap) => {
					members.set(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Member)));
					membersLoaded.set(true);
				},
				(_err) => { membersLoaded.set(true); }
			)
		);
		unsubFirestore.push(
			onSnapshot(collection(db, 'sessions'), (snap) => {
				sessions.set(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Session)));
			})
		);
		// allCheckIns は participationCounts・myCheckIns 用（全セッション分）
		unsubFirestore.push(
			onSnapshot(collection(db, 'checkins'), (snap) => {
				allCheckIns.set(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CheckIn)));
			})
		);
		unsubFirestore.push(
			onSnapshot(collection(db, 'teamResults'), (snap) => {
				const map: Record<string, TeamResult> = {};
				for (const d of snap.docs) map[d.id] = d.data() as TeamResult;
				teamResultsStore.set(map);
			})
		);

		// currentSessionId が変わるたびにセッション専用チェックインを再取得
		const unsubSidForCI = currentSessionId.subscribe(resubscribeSessionCI);
		unsubFirestore.push(unsubSidForCI);
	}

	function stopFirestoreListeners() {
		// リスナー解除 → ストアをリセット
		unsubFirestore.forEach((fn) => fn());
		unsubFirestore = [];
		if (unsubSessionCI) { unsubSessionCI(); unsubSessionCI = null; }
		members.set([]);
		sessions.set([]);
		allCheckIns.set([]);
		currentCheckIns.set([]);
		teamResultsStore.set({});
		membersLoaded.set(false);
	}

	onAuthStateChanged(auth, (user) => {
		currentUserId.set(user?.uid ?? null);
		authReady.set(true);

		if (user) {
			// ログイン時：リスナー開始
			startFirestoreListeners();
		} else {
			// ログアウト時：リスナー停止＆ストアクリア
			stopFirestoreListeners();
			membersLoaded.set(true); // onboarding へのリダイレクトを動かす
		}
	});
}

// ============================================================
// 派生ストア
// ============================================================

export const currentSession = derived(
	[sessions, currentSessionId],
	([$s, $id]) => $s.find((s) => s.id === $id) ?? null
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
	[teamResultsStore, currentSessionId],
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

// 参加済み OR 自分が作成したセッション（セッション一覧ページ用）
export const mySessions = derived(
	[sessions, mySessionIds, currentUserId],
	([$s, $ids, $uid]) =>
		$s
			.filter((s) => $ids.has(s.id) || (!!$uid && s.createdBy === $uid))
			.sort((a, b) => b.date.localeCompare(a.date))
);

// 自分がチェックインしたセッションのみ（ホーム履歴リスト用）
export const myParticipatedSessions = derived(
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
	// チェックイン変更時はチーム結果をクリア
	clearTeamResult(sessionId).catch(() => {});
}

export async function checkOutMember(sessionId: string, memberId: string): Promise<void> {
	await deleteDoc(doc(db, 'checkins', `${sessionId}_${memberId}`));
	clearTeamResult(sessionId).catch(() => {});
}

// ── チーム結果 CRUD ─────────────────────────────────────────
export async function saveTeamResult(sessionId: string, result: TeamResult): Promise<void> {
	await setDoc(doc(db, 'teamResults', sessionId), result);
}

export async function clearTeamResult(sessionId: string): Promise<void> {
	await deleteDoc(doc(db, 'teamResults', sessionId));
}

// ── セッション終了（ステータス更新＋全員チェックアウト） ──────
// チーム結果は履歴として保持する
export async function endSession(
	sessionId: string,
	memberIds: string[]
): Promise<void> {
	const batch = writeBatch(db);
	// 全参加者のチェックインを一括削除
	for (const memberId of memberIds) {
		batch.delete(doc(db, 'checkins', `${sessionId}_${memberId}`));
	}
	// セッションを終了済みに更新
	batch.update(doc(db, 'sessions', sessionId), { status: 'ended' });
	await batch.commit();
}
