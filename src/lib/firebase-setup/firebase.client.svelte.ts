import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
	getAuth,
	onAuthStateChanged,
	GoogleAuthProvider,
	signInWithPopup,
	signInWithRedirect,
	getRedirectResult,
	setPersistence,
	browserLocalPersistence,
	signOut as fbSignOut,
	type User,
	type Auth,
	sendSignInLinkToEmail,
	isSignInWithEmailLink,
	signInWithEmailLink,
	createUserWithEmailAndPassword,
	signInWithEmailAndPassword,
	sendPasswordResetEmail,
	signInWithCustomToken as firebaseSignInWithCustomToken
} from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getAnalytics, type Analytics } from 'firebase/analytics';
import { type Firestore, initializeFirestore } from 'firebase/firestore';
import { env as publicEnv } from '$env/dynamic/public';
import { browser } from '$app/environment';

const firebaseConfig = {
	apiKey: publicEnv.PUBLIC_FIREBASE_API_KEY,
	authDomain: publicEnv.PUBLIC_FIREBASE_AUTH_DOMAIN,
	projectId: publicEnv.PUBLIC_FIREBASE_PROJECT_ID,
	storageBucket: publicEnv.PUBLIC_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: publicEnv.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	appId: publicEnv.PUBLIC_FIREBASE_APP_ID,
	measurementId: publicEnv.PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Internal state using runes
let app = $state<FirebaseApp>();
let auth = $state<Auth>();
let storage = $state<FirebaseStorage>();
let db = $state<Firestore>();
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let analytics = $state<Analytics>();

const authListeners: ((user: User | null) => void)[] = [];

export function initFirebase() {
	if (!browser) return;
	if (app) return; // Already initialized

	if (!publicEnv.PUBLIC_FIREBASE_API_KEY || !publicEnv.PUBLIC_FIREBASE_PROJECT_ID) {
		console.warn('Missing PUBLIC_FIREBASE_* env vars. Firebase client will not initialize.');
		return;
	}

	try {
		app = getApps()[0] ?? initializeApp(firebaseConfig);
	} catch (err) {
		console.error('Error initializing Firebase', err);
	}

	if (!app) return;

	try {
		auth = getAuth(app);
	} catch (error) {
		console.error('Error getting auth', error);
	}
	try {
		storage = getStorage(app);
	} catch (error) {
		console.error('Error getting storage', error);
	}
	try {
		db = initializeFirestore(app, { ignoreUndefinedProperties: true });
	} catch (error) {
		console.error('Error getting db', error);
	}

	try {
		analytics = getAnalytics(app);
	} catch (e) {
		console.error('Error getting analytics', e);
	}

	// Prefer durable local persistence
	if (auth) {
		setPersistence(auth, browserLocalPersistence).catch((e) => {
			console.error('Error setting persistence', e);
		});

		// Subscribe queued listeners
		authListeners.forEach((cb) => onAuthStateChanged(auth!, cb));
		authListeners.length = 0;
	}
}

// ... existing code ...

export function onAuth(cb: (user: User | null) => void) {
	if (!auth) {
		authListeners.push(cb);
		// Return unsub that removes from queue if not yet subscribed
		return () => {
			const idx = authListeners.indexOf(cb);
			if (idx !== -1) authListeners.splice(idx, 1);
		};
	}
	return onAuthStateChanged(auth, cb);
}

// Getters
export function getFirebaseApp() {
	return app;
}
export function getAppStorage() {
	return storage;
}
export function getAppAuth() {
	return auth;
}
export function getAppFirestore() {
	return db;
}

const provider = new GoogleAuthProvider();

function isIOS() {
	if (typeof navigator === 'undefined') return false;
	return /iP(hone|ad|od)/.test(navigator.userAgent);
}
function isInAppBrowser() {
	if (typeof navigator === 'undefined') return false;
	const ua = navigator.userAgent || '';
	return (
		/(FBAN|FBAV|Instagram|Line\/|Twitter|LinkedInApp|WhatsApp|Snapchat|; wv\))/i.test(ua) ||
		(typeof (navigator as Navigator & { standalone?: boolean }).standalone === 'boolean' &&
			(navigator as Navigator & { standalone?: boolean }).standalone === true)
	);
}

// Exported actions that work with the state
export async function signInWithGoogle(): Promise<User | null> {
	if (!auth) throw new Error('Firebase Auth not initialized');

	// On iOS and many in‑app browsers, popup is unsupported; use redirect for reliability.
	const forceRedirect = isIOS() || isInAppBrowser();
	if (!forceRedirect) {
		try {
			const cred = await signInWithPopup(auth, provider);
			return cred.user ?? null;
		} catch (e: unknown) {
			console.error('Error signing in with Google', e);
			const code = (e as { code?: string } | null | undefined)?.code ?? '';
			const msg = (e as { message?: string } | null | undefined)?.message ?? '';
			const isPopupIssue =
				String(code).includes('popup') ||
				String(code).includes('operation-not-supported') ||
				String(msg).toLowerCase().includes('popup');
			if (!isPopupIssue) {
				throw e;
			}
		}
	}

	if (isInAppBrowser()) {
		try {
			alert(
				'If sign-in does not complete, open this page in Safari and try again. In-app browsers sometimes block login.'
			);
		} catch {
			// ignore
		}
	}

	await signInWithRedirect(auth, provider);
	return null;
}

export async function sendMagicLink(email: string, redirectTo: string) {
	if (!auth) throw new Error('Firebase Auth not initialized');

	// Create action code settings
	const actionCodeSettings = {
		// URL you want to redirect back to. The domain (www.example.com) for this
		// URL must be in the authorized domains list in the Firebase Console.
		url: redirectTo,
		// This must be true.
		handleCodeInApp: true
	};

	try {
		await sendSignInLinkToEmail(auth, email, actionCodeSettings);
		// Save the email locally so you don't need to ask the user for it again
		// if they open the link on the same device.
		if (browser) {
			window.localStorage.setItem('emailForSignIn', email);
		}
		return true;
	} catch (error) {
		console.error('Error sending email link', error);
		throw error;
	}
}

export async function completeMagicLinkSignIn(url: string) {
	if (!auth) throw new Error('Firebase Auth not initialized');

	if (!isSignInWithEmailLink(auth, url)) {
		return null;
	}

	const email = window.localStorage.getItem('emailForSignIn');
	if (!email) {
		// User opened the link on a different device. To prevent session fixation
		// attacks, ask the user to provide the associated email again.
		// For now, returning specific status to let UI handle prompt
		return { status: 'needs_email' };
	}

	try {
		const result = await signInWithEmailLink(auth, email, url);
		window.localStorage.removeItem('emailForSignIn');
		return { status: 'success', user: result.user };
	} catch (error) {
		console.error('Error signing in with email link', error);
		throw error;
	}
}

export async function signInWithEmailLinkDirect(email: string, url: string) {
	if (!auth) throw new Error('Firebase Auth not initialized');
	const result = await signInWithEmailLink(auth, email, url);
	window.localStorage.removeItem('emailForSignIn');
	return result.user;
}

export async function createAccountWithPassword(email: string, pass: string) {
	if (!auth) throw new Error('Firebase Auth not initialized');
	const result = await createUserWithEmailAndPassword(auth, email, pass);
	return result.user;
}

export async function signInWithPassword(email: string, pass: string) {
	if (!auth) throw new Error('Firebase Auth not initialized');
	const result = await signInWithEmailAndPassword(auth, email, pass);
	return result.user;
}

export async function signInWithCustomToken(token: string) {
	if (!auth) throw new Error('Firebase Auth not initialized');
	const result = await firebaseSignInWithCustomToken(auth, token);
	return result.user;
}

export async function resetPassword(email: string, redirectTo?: string) {
	if (!auth) throw new Error('Firebase Auth not initialized');
	const actionCodeSettings = redirectTo
		? {
				url: redirectTo,
				handleCodeInApp: true
			}
		: undefined;
	await sendPasswordResetEmail(auth, email, actionCodeSettings);
	return true;
}

export async function signOut(): Promise<void> {
	if (!auth) return;
	return fbSignOut(auth);
}

export async function getIdToken(forceRefresh = false): Promise<string | null> {
	if (!auth) return null;
	const user = auth.currentUser;
	if (!user) return null;
	return user.getIdToken(forceRefresh);
}

export const redirectResultReady = async () => {
	if (!auth) return;
	try {
		await getRedirectResult(auth);
	} catch (e) {
		const msg = (e as { message?: string } | null)?.message ?? '';
		if (msg.includes('missing initial state') || msg.includes('storage-partitioned')) {
			console.warn(
				'Redirect sign-in implementation note: Session storage lost (common in PWA/iOS). User may need to sign in again.',
				msg
			);
			return;
		}
		console.error('Error getting redirect result', e);
	}
};

export function getFriendlyErrorMessage(err: unknown): string {
	const code = (err as { code?: string } | null)?.code;
	if (!code) return (err as { message?: string } | null)?.message || 'An unknown error occurred.';

	switch (code) {
		case 'auth/invalid-credential':
		case 'auth/user-not-found':
		case 'auth/wrong-password':
			return "Oops! That email or password didn't work. Maybe a typo?";
		case 'auth/email-already-in-use':
			return 'That email is already taken. Try logging in instead?';
		case 'auth/weak-password':
			return 'Password should be at least 6 characters. Make it strong!';
		case 'auth/invalid-email':
			return "That doesn't look like a real email. Try again?";
		case 'auth/too-many-requests':
			return 'Whoa, slow down! Too many attempts. Take a breather.';
		case 'auth/network-request-failed':
			return 'Network hiccup. Check your connection and try again.';
		case 'auth/popup-closed-by-user':
			return 'Sign-in cancelled. Did you get cold feet?';
		case 'auth/user-disabled':
			return 'This account is in the penalty box (disabled).';
		default:
			return (
				(err as { message?: string } | null)?.message?.replace(/^Firebase: /, '') ||
				'An error occurred.'
			);
	}
}
