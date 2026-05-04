/**
 * Firebase Authentication ラッパー（匿名認証）
 */

import { auth, db } from './firebase';
import { signOut as firebaseSignOut, type User } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import type { Member } from './types';

// ── Firestore にメンバードキュメントが存在するか確認・作成 ─────
export async function ensureMemberDoc(
	user: User,
	name?: string,
	studentId?: string
): Promise<Member | null> {
	const ref  = doc(db, 'members', user.uid);
	const snap = await getDoc(ref);
	if (snap.exists()) return snap.data() as Member;

	if (!name || !studentId) return null;

	const member: Member = {
		id: user.uid,
		name: name.trim(),
		studentId: studentId.trim(),
		createdAt: new Date().toISOString()
	};
	await setDoc(ref, member);
	return member;
}

// ── サインアウト ────────────────────────────────────────
export async function authSignOut(): Promise<void> {
	await firebaseSignOut(auth);
}
