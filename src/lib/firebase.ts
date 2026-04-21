import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
	apiKey: 'AIzaSyCPvUBAO0IrI3NviRS6mvIpJHkBzW9zyKk',
	authDomain: 'sabage-team.firebaseapp.com',
	projectId: 'sabage-team',
	storageBucket: 'sabage-team.firebasestorage.app',
	messagingSenderId: '334685900701',
	appId: '1:334685900701:web:43a5bc221a9944afc4e974'
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const db   = getFirestore(app);
export const auth = getAuth(app);
