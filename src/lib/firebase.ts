/**
 * Firebase 初期設定の雛形
 *
 * 【使い方】
 * 1. Firebase Console でプロジェクトを作成し、Webアプリを追加する
 * 2. 取得した firebaseConfig の値を下記に入力する
 * 3. Firestore Database を有効化する（テストモードで開始推奨）
 *
 * 現状はモックデータで動作するため、この設定は不要です。
 * Firebase連携フェーズで有効化してください。
 */

// import { initializeApp } from 'firebase/app';
// import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
	apiKey: 'YOUR_API_KEY',
	authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
	projectId: 'YOUR_PROJECT_ID',
	storageBucket: 'YOUR_PROJECT_ID.appspot.com',
	messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
	appId: 'YOUR_APP_ID'
};

// const app = initializeApp(firebaseConfig);
// export const db = getFirestore(app);

export { firebaseConfig };

/**
 * 将来的な Firestore 連携のイメージ（コメントアウト）
 *
 * --- メンバー取得 ---
 * import { collection, getDocs } from 'firebase/firestore';
 * const snap = await getDocs(collection(db, 'members'));
 * const members = snap.docs.map(d => ({ id: d.id, ...d.data() }));
 *
 * --- チェックイン保存 ---
 * import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
 * await setDoc(doc(db, 'sessions', todayId, 'checkIns', memberId), {
 *   memberId,
 *   gearType,
 *   checkedInAt: serverTimestamp()
 * });
 *
 * --- チーム結果保存 ---
 * await setDoc(doc(db, 'sessions', todayId, 'teamResult', 'latest'), {
 *   red: result.red.map(m => m.id),
 *   yellow: result.yellow.map(m => m.id),
 *   createdAt: serverTimestamp()
 * });
 */
