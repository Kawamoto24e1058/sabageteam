/**
 * Firebase Authentication ラッパー
 * Email/Password・Google・Apple サインインをサポート
 */

import { auth, db } from './firebase';
import {
	createUserWithEmailAndPassword,
	signInWithEmailAndPassword,
	signInWithPopup,
	GoogleAuthProvider,
	OAuthProvider,
	signOut as firebaseSignOut,
	type User
} from 'firebase/auth';
import {
	doc, setDoc, getDoc, collection, query, where, getDocs
} from 'firebase/firestore';
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

	// 名前と学籍番号がなければ作成不可（Googleサインイン初回など）
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

// ── 学籍番号の重複チェック ──────────────────────────────────
async function isStudentIdTaken(studentId: string): Promise<boolean> {
	const q    = query(collection(db, 'members'), where('studentId', '==', studentId.trim()));
	const snap = await getDocs(q);
	return !snap.empty;
}

// ── メール/パスワード 新規登録 ─────────────────────────────
// 順序：① Auth アカウント作成（認証済み状態になる）
//        ② 学籍番号重複チェック（認証済みなので Firestore が読める）
//        ③ メンバードキュメント作成
//        ※ ②で重複があれば Auth アカウントを削除してロールバック
export async function authRegister(
	email: string,
	password: string,
	name: string,
	studentId: string
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
	let cred;
	try {
		// ① まず Auth アカウントを作成
		cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
	} catch (e: unknown) {
		const code = (e as { code?: string }).code;
		if (code === 'auth/email-already-in-use') return { ok: false, error: 'このメールアドレスはすでに使用されています' };
		if (code === 'auth/weak-password')         return { ok: false, error: 'パスワードは6文字以上にしてください' };
		return { ok: false, error: '登録に失敗しました。もう一度お試しください。' };
	}

	try {
		// ② 認証済みになったので学籍番号の重複チェックが可能
		if (await isStudentIdTaken(studentId)) {
			await cred.user.delete(); // Auth アカウントをロールバック
			return { ok: false, error: 'この学籍番号はすでに登録されています' };
		}
		// ③ メンバードキュメント作成
		await ensureMemberDoc(cred.user, name, studentId);
		return { ok: true, userId: cred.user.uid };
	} catch {
		// 途中で失敗した場合も Auth アカウントを削除
		await cred.user.delete().catch(() => {});
		return { ok: false, error: '登録に失敗しました。もう一度お試しください。' };
	}
}

// ── メール/パスワード ログイン ──────────────────────────────
export async function authLogin(
	email: string,
	password: string
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
	try {
		const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
		return { ok: true, userId: cred.user.uid };
	} catch {
		return { ok: false, error: 'メールアドレスまたはパスワードが正しくありません' };
	}
}

// ── ソーシャルサインイン共通：メンバードキュメントの存在確認 ──
async function checkMemberExists(uid: string): Promise<boolean> {
	try {
		const snap = await getDoc(doc(db, 'members', uid));
		return snap.exists();
	} catch {
		// Firestore 読み取り失敗時は新規扱いにして登録フローへ進める
		return false;
	}
}

function socialErrorMessage(code: string | undefined): string {
	if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return '';
	if (code === 'auth/unauthorized-domain')  return 'このドメインはFirebase Authの承認済みドメインに登録されていません。Firebase Console > Authentication > Settings > 承認済みドメインに追加してください。';
	if (code === 'auth/popup-blocked')        return 'ポップアップがブロックされました。ブラウザの設定でポップアップを許可してください。';
	return 'ログインに失敗しました。もう一度お試しください。';
}

// ── Google サインイン ────────────────────────────────────
export async function authSignInWithGoogle(): Promise<
	{ ok: true; userId: string; isNew: boolean; displayName: string | null } |
	{ ok: false; error: string }
> {
	try {
		const provider = new GoogleAuthProvider();
		const cred     = await signInWithPopup(auth, provider);
		const exists   = await checkMemberExists(cred.user.uid);
		return { ok: true, userId: cred.user.uid, isNew: !exists, displayName: cred.user.displayName };
	} catch (e: unknown) {
		const code = (e as { code?: string }).code;
		console.error('Google sign-in error:', code, e);
		return { ok: false, error: socialErrorMessage(code) };
	}
}

// ── Apple サインイン ─────────────────────────────────────
export async function authSignInWithApple(): Promise<
	{ ok: true; userId: string; isNew: boolean; displayName: string | null } |
	{ ok: false; error: string }
> {
	try {
		const provider = new OAuthProvider('apple.com');
		provider.addScope('name');
		provider.addScope('email');
		const cred   = await signInWithPopup(auth, provider);
		const exists = await checkMemberExists(cred.user.uid);
		return { ok: true, userId: cred.user.uid, isNew: !exists, displayName: cred.user.displayName };
	} catch (e: unknown) {
		const code = (e as { code?: string }).code;
		console.error('Apple sign-in error:', code, e);
		return { ok: false, error: socialErrorMessage(code) };
	}
}

// ── サインアウト ────────────────────────────────────────
export async function authSignOut(): Promise<void> {
	await firebaseSignOut(auth);
}
