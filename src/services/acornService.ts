import { 
  collection,
  doc, 
  getDoc, 
  setDoc, 
  addDoc,
  deleteDoc,
  updateDoc, 
  onSnapshot,
  increment
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { ACORN_CONFIG, MiniroomGiftProduct } from '../config/weddingConfig';
import { bgmPlayer } from '../utils/soundSynthesizer';

export interface UserAcornProfile {
  acorns: number;
  claimed: {
    welcome?: boolean;
    guestbook?: boolean;
    ilchon?: boolean;
    miniroomGift?: boolean;
  };
  eligible?: {
    ilchon?: boolean;
    guestbook?: boolean;
    miniroomGift?: boolean;
  };
  purchasedGiftIds?: string[];
  displayedGiftIds?: string[];
  pendingGiftIds?: string[];
  answeredQuestionIds?: string[];
  quizDaily?: {
    date: string;
    earned: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface DisplayedMiniroomGift {
  id: string;
  giftId: string;
  name: string;
  emoji: string;
  senderName: string;
  senderUid?: string;
  createdAt: string;
}

const USERS_PATH = 'users';
const MINIROOM_GIFTS_PATH = 'miniroomGifts';
const MINIROOM_STATS_PATH = 'miniroomStats';
const HEARTS_DOC_ID = 'hearts';
const LOCAL_PROFILE_KEY_PREFIX = 'cyworld_acorn_profile_v1_';
const LOCAL_EVENT_NAME = 'cyworld-acorn-profile-updated';
const LOCAL_GIFTS_KEY = 'cyworld_miniroom_gifts_v1';
const LOCAL_GIFTS_EVENT_NAME = 'cyworld-miniroom-gifts-updated';
const LOCAL_HEARTS_KEY = 'cyworld_miniroom_hearts_v1';
const LOCAL_HEARTS_EVENT_NAME = 'cyworld-miniroom-hearts-updated';

export class AcornService {
  /**
   * Helper to format current date as YYYY-MM-DD
   */
  public static getTodayString(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private static getLocalKey(uid?: string): string {
    return `${LOCAL_PROFILE_KEY_PREFIX}${uid || 'guest'}`;
  }

  private static readLocalProfile(uid?: string): UserAcornProfile {
    const fallback: UserAcornProfile = {
      acorns: 0,
      claimed: {},
      eligible: {},
      purchasedGiftIds: [],
      displayedGiftIds: [],
      pendingGiftIds: [],
      answeredQuestionIds: [],
      quizDaily: { date: this.getTodayString(), earned: 0 },
    };

    try {
      const raw = localStorage.getItem(this.getLocalKey(uid));
      if (!raw) {
        // Also check guest fallback if uid-specific key is empty
        if (uid) {
          const guestRaw = localStorage.getItem(this.getLocalKey(''));
          if (guestRaw) {
            return { ...fallback, ...JSON.parse(guestRaw) };
          }
        }
        return fallback;
      }
      return { ...fallback, ...JSON.parse(raw) };
    } catch {
      return fallback;
    }
  }

  private static writeLocalProfile(uid: string | undefined, profile: UserAcornProfile): void {
    try {
      const normalized: UserAcornProfile = {
        acorns: Math.max(0, profile.acorns || 0),
        claimed: profile.claimed || {},
        eligible: profile.eligible || {},
        purchasedGiftIds: profile.purchasedGiftIds || [],
        displayedGiftIds: profile.displayedGiftIds || [],
        pendingGiftIds: profile.pendingGiftIds || [],
        answeredQuestionIds: profile.answeredQuestionIds || [],
        quizDaily: profile.quizDaily || { date: this.getTodayString(), earned: 0 },
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      };
      localStorage.setItem(this.getLocalKey(uid), JSON.stringify(normalized));
      window.dispatchEvent(new CustomEvent(LOCAL_EVENT_NAME, { detail: { uid: uid || 'guest', profile: normalized } }));
    } catch {
      // Ignore storage errors
    }
  }

  private static mergeProfiles(remote: UserAcornProfile, local: UserAcornProfile): UserAcornProfile {
    const remoteTime = remote.updatedAt ? Date.parse(remote.updatedAt) : 0;
    const localTime = local.updatedAt ? Date.parse(local.updatedAt) : 0;
    const preferRemote = remoteTime >= localTime;

    return {
      acorns: preferRemote ? (remote.acorns ?? 0) : (local.acorns ?? 0),
      claimed: {
        welcome: !!(remote.claimed?.welcome || local.claimed?.welcome),
        guestbook: !!(remote.claimed?.guestbook || local.claimed?.guestbook),
        ilchon: !!(remote.claimed?.ilchon || local.claimed?.ilchon),
        miniroomGift: !!(remote.claimed?.miniroomGift || local.claimed?.miniroomGift),
      },
      eligible: {
        ilchon: !!(remote.eligible?.ilchon || local.eligible?.ilchon),
        guestbook: !!(remote.eligible?.guestbook || local.eligible?.guestbook),
        miniroomGift: !!(remote.eligible?.miniroomGift || local.eligible?.miniroomGift),
      },
      purchasedGiftIds: Array.from(
        new Set([...(remote.purchasedGiftIds || []), ...(local.purchasedGiftIds || [])])
      ),
      displayedGiftIds: Array.from(
        new Set([...(remote.displayedGiftIds || []), ...(local.displayedGiftIds || [])])
      ),
      pendingGiftIds: preferRemote
        ? (remote.pendingGiftIds || [])
        : (local.pendingGiftIds || []),
      answeredQuestionIds: Array.from(
        new Set([...(remote.answeredQuestionIds || []), ...(local.answeredQuestionIds || [])])
      ),
      quizDaily:
        (remote.quizDaily?.date === this.getTodayString() ? remote.quizDaily.earned : 0) >=
        (local.quizDaily?.date === this.getTodayString() ? local.quizDaily.earned : 0)
          ? remote.quizDaily || { date: this.getTodayString(), earned: 0 }
          : local.quizDaily || { date: this.getTodayString(), earned: 0 },
      createdAt: remote.createdAt || local.createdAt,
      updatedAt: preferRemote ? remote.updatedAt : local.updatedAt,
    };
  }

  /**
   * Real-time listener for current user's acorn balance and claimed tasks.
   * Works seamlessly with Firestore when authenticated and falls back to local state if auth is unavailable.
   */
  public static subscribeUserAcorns(
    uid: string,
    onData: (data: UserAcornProfile) => void
  ): () => void {
    // Immediately emit local cached state so UI updates without delay
    onData(this.readLocalProfile(uid));

    const handleLocalUpdate = (e: Event) => {
      const custom = e as CustomEvent<{ uid: string; profile: UserAcornProfile }>;
      if (!custom.detail || custom.detail.uid === (uid || 'guest')) {
        onData(this.readLocalProfile(uid));
      }
    };
    window.addEventListener(LOCAL_EVENT_NAME, handleLocalUpdate);

    if (!uid) {
      return () => {
        window.removeEventListener(LOCAL_EVENT_NAME, handleLocalUpdate);
      };
    }

    const docRef = doc(db, USERS_PATH, uid);
    const unsubFirestore = onSnapshot(
      docRef,
      (snapshot) => {
        const local = this.readLocalProfile(uid);
        if (snapshot.exists()) {
          const data = snapshot.data() as UserAcornProfile;
          const remote: UserAcornProfile = {
            acorns: data.acorns || 0,
            claimed: data.claimed || {},
            eligible: data.eligible || {},
            purchasedGiftIds: data.purchasedGiftIds || [],
            displayedGiftIds: data.displayedGiftIds || [],
            pendingGiftIds: data.pendingGiftIds || [],
            answeredQuestionIds: data.answeredQuestionIds || [],
            quizDaily: data.quizDaily || { date: this.getTodayString(), earned: 0 },
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
          const merged = this.mergeProfiles(remote, local);
          this.writeLocalProfile(uid, merged);
          onData(merged);
        } else {
          onData(local);
        }
      },
      (error) => {
        // Fallback to local profile if Firestore permissions/auth prevent reading
        console.warn('Firestore user profile read fallback:', error);
        onData(this.readLocalProfile(uid));
      }
    );

    return () => {
      window.removeEventListener(LOCAL_EVENT_NAME, handleLocalUpdate);
      unsubFirestore();
    };
  }

  /**
   * Claim welcome bonus (+5 acorns).
   */
  public static async claimWelcomeReward(
    uid: string,
    onShowToast: (msg: string) => void
  ): Promise<void> {
    const local = this.readLocalProfile(uid);
    if (local.claimed?.welcome) return;

    if (!uid) {
      const updated: UserAcornProfile = {
        ...local,
        acorns: (local.acorns || 0) + ACORN_CONFIG.WELCOME_REWARD,
        claimed: { ...local.claimed, welcome: true },
        updatedAt: new Date().toISOString(),
      };
      this.writeLocalProfile(uid, updated);
      bgmPlayer.playChime();
      onShowToast(`🌰 +${ACORN_CONFIG.WELCOME_REWARD} 도토리 스토어에서 확인해보세요`);
      return;
    }

    const docRef = doc(db, USERS_PATH, uid);
    try {
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        const initialProfile: UserAcornProfile = {
          acorns: ACORN_CONFIG.WELCOME_REWARD,
          claimed: {
            welcome: true,
            guestbook: !!local.claimed?.guestbook,
            ilchon: !!local.claimed?.ilchon,
          },
          eligible: {
            ...local.eligible,
          },
          answeredQuestionIds: local.answeredQuestionIds || [],
          quizDaily: local.quizDaily || { date: this.getTodayString(), earned: 0 },
          createdAt: new Date().toISOString(),
        };
        await setDoc(docRef, initialProfile);
        this.writeLocalProfile(uid, initialProfile);
        bgmPlayer.playChime();
        onShowToast(`🌰 +${ACORN_CONFIG.WELCOME_REWARD} 도토리 스토어에서 확인해보세요`);
      } else {
        const data = snap.data() as UserAcornProfile;
        if (!data.claimed?.welcome) {
          const currentAcorns = data.acorns || 0;
          const nextAcorns = currentAcorns + ACORN_CONFIG.WELCOME_REWARD;
          await updateDoc(docRef, {
            acorns: nextAcorns,
            'claimed.welcome': true,
            updatedAt: new Date().toISOString(),
          });
          this.writeLocalProfile(uid, {
            ...data,
            acorns: nextAcorns,
            claimed: { ...(data.claimed || {}), welcome: true },
          });
          bgmPlayer.playChime();
          onShowToast(`🌰 +${ACORN_CONFIG.WELCOME_REWARD} 도토리 스토어에서 확인해보세요`);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${USERS_PATH}/${uid}`);
    }
  }

  /**
   * Claim reward on first guestbook creation (+10 acorns).
   */
  public static async claimGuestbookReward(
    uid: string,
    onShowToast: (msg: string) => void
  ): Promise<void> {
    const local = this.readLocalProfile(uid);
    if (local.claimed?.guestbook) return;

    if (!uid) {
      const updated: UserAcornProfile = {
        ...local,
        acorns: (local.acorns || 0) + ACORN_CONFIG.GUESTBOOK_REWARD,
        claimed: { ...local.claimed, guestbook: true },
        updatedAt: new Date().toISOString(),
      };
      this.writeLocalProfile(uid, updated);
      bgmPlayer.playChime();
      onShowToast(`🌰 +${ACORN_CONFIG.GUESTBOOK_REWARD} 도토리 스토어에서 확인해보세요`);
      return;
    }

    const docRef = doc(db, USERS_PATH, uid);
    try {
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        const initialProfile: UserAcornProfile = {
          acorns: ACORN_CONFIG.GUESTBOOK_REWARD,
          claimed: {
            welcome: false,
            guestbook: true,
            ilchon: false,
          },
          answeredQuestionIds: [],
          quizDaily: { date: this.getTodayString(), earned: 0 },
          createdAt: new Date().toISOString(),
        };
        await setDoc(docRef, initialProfile);
        this.writeLocalProfile(uid, initialProfile);
        bgmPlayer.playChime();
        onShowToast(`🌰 +${ACORN_CONFIG.GUESTBOOK_REWARD} 도토리 스토어에서 확인해보세요`);
      } else {
        const data = snap.data() as UserAcornProfile;
        if (!data.claimed?.guestbook) {
          const currentAcorns = data.acorns || 0;
          const nextAcorns = currentAcorns + ACORN_CONFIG.GUESTBOOK_REWARD;
          await updateDoc(docRef, {
            acorns: nextAcorns,
            'claimed.guestbook': true,
            updatedAt: new Date().toISOString(),
          });
          this.writeLocalProfile(uid, {
            ...data,
            acorns: nextAcorns,
            claimed: { ...(data.claimed || {}), guestbook: true },
          });
          bgmPlayer.playChime();
          onShowToast(`🌰 +${ACORN_CONFIG.GUESTBOOK_REWARD} 도토리 스토어에서 확인해보세요`);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${USERS_PATH}/${uid}`);
    }
  }

  /**
   * Unlock ilchon reward button after submitting ilchon request (without auto-claiming).
   */
  public static async unlockIlchonReward(uid: string): Promise<void> {
    const local = this.readLocalProfile(uid);
    const nextLocal: UserAcornProfile = {
      ...local,
      eligible: { ...(local.eligible || {}), ilchon: true },
      updatedAt: new Date().toISOString(),
    };
    this.writeLocalProfile(uid, nextLocal);

    if (!uid) return;
    const docRef = doc(db, USERS_PATH, uid);

    try {
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        const initialProfile: UserAcornProfile = {
          acorns: 0,
          claimed: {
            welcome: false,
            guestbook: false,
            ilchon: false,
          },
          eligible: {
            ilchon: true,
          },
          answeredQuestionIds: [],
          quizDaily: { date: this.getTodayString(), earned: 0 },
          createdAt: new Date().toISOString(),
        };
        await setDoc(docRef, initialProfile);
      } else {
        const data = snap.data() as UserAcornProfile;
        if (!data.eligible?.ilchon && !data.claimed?.ilchon) {
          await updateDoc(docRef, {
            'eligible.ilchon': true,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      console.warn('Firestore unlockIlchonReward notice (local state unlocked):', error);
    }
  }

  /**
   * Claim reward on first ilchon request (+10 acorns).
   */
  public static async claimIlchonReward(
    uid: string,
    onShowToast: (msg: string) => void
  ): Promise<void> {
    const local = this.readLocalProfile(uid);
    if (local.claimed?.ilchon) return;

    if (!uid) {
      const updated: UserAcornProfile = {
        ...local,
        acorns: (local.acorns || 0) + ACORN_CONFIG.ILCHON_REWARD,
        claimed: { ...local.claimed, ilchon: true },
        eligible: { ...local.eligible, ilchon: true },
        updatedAt: new Date().toISOString(),
      };
      this.writeLocalProfile(uid, updated);
      bgmPlayer.playChime();
      onShowToast(`🌰 +${ACORN_CONFIG.ILCHON_REWARD} 도토리 스토어에서 확인해보세요`);
      return;
    }

    const docRef = doc(db, USERS_PATH, uid);
    try {
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        const initialProfile: UserAcornProfile = {
          acorns: ACORN_CONFIG.ILCHON_REWARD,
          claimed: {
            welcome: false,
            guestbook: false,
            ilchon: true,
          },
          eligible: {
            ilchon: true,
          },
          answeredQuestionIds: [],
          quizDaily: { date: this.getTodayString(), earned: 0 },
          createdAt: new Date().toISOString(),
        };
        await setDoc(docRef, initialProfile);
        this.writeLocalProfile(uid, initialProfile);
        bgmPlayer.playChime();
        onShowToast(`🌰 +${ACORN_CONFIG.ILCHON_REWARD} 도토리 스토어에서 확인해보세요`);
      } else {
        const data = snap.data() as UserAcornProfile;
        if (!data.claimed?.ilchon) {
          const currentAcorns = data.acorns || 0;
          const nextAcorns = currentAcorns + ACORN_CONFIG.ILCHON_REWARD;
          await updateDoc(docRef, {
            acorns: nextAcorns,
            'claimed.ilchon': true,
            'eligible.ilchon': true,
            updatedAt: new Date().toISOString(),
          });
          this.writeLocalProfile(uid, {
            ...data,
            acorns: nextAcorns,
            claimed: { ...(data.claimed || {}), ilchon: true },
            eligible: { ...(data.eligible || {}), ilchon: true },
          });
          bgmPlayer.playChime();
          onShowToast(`🌰 +${ACORN_CONFIG.ILCHON_REWARD} 도토리 스토어에서 확인해보세요`);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${USERS_PATH}/${uid}`);
    }
  }

  /**
   * Record correct answer and reward +5 acorns if eligible.
   * Rules:
   * 1. 1 reward (+5) per question ID per user.
   * 2. Daily limit: max 20 acorns per day.
   */
  public static async recordQuizCorrectAnswer(
    uid: string,
    questionId: string
  ): Promise<{ rewarded: boolean; reason?: 'already_answered' | 'daily_limit' | 'success'; earnedDelta: number }> {
    const today = this.getTodayString();

    if (!uid) {
      const local = this.readLocalProfile('');
      const answeredIds = local.answeredQuestionIds || [];
      if (answeredIds.includes(questionId)) {
        return { rewarded: false, reason: 'already_answered', earnedDelta: 0 };
      }
      const isSameDay = local.quizDaily?.date === today;
      const currentDailyEarned = isSameDay ? (local.quizDaily?.earned || 0) : 0;
      if (currentDailyEarned >= ACORN_CONFIG.QUIZ_DAILY_MAX) {
        return { rewarded: false, reason: 'daily_limit', earnedDelta: 0 };
      }
      const earnedDelta = ACORN_CONFIG.QUIZ_REWARD;
      const updated: UserAcornProfile = {
        ...local,
        acorns: (local.acorns || 0) + earnedDelta,
        answeredQuestionIds: [...answeredIds, questionId],
        quizDaily: { date: today, earned: currentDailyEarned + earnedDelta },
        updatedAt: new Date().toISOString(),
      };
      this.writeLocalProfile('', updated);
      return { rewarded: true, reason: 'success', earnedDelta };
    }

    const docRef = doc(db, USERS_PATH, uid);
    try {
      const snap = await getDoc(docRef);
      let profile: UserAcornProfile = {
        acorns: 0,
        claimed: {},
        answeredQuestionIds: [],
        quizDaily: { date: today, earned: 0 },
      };

      if (snap.exists()) {
        profile = snap.data() as UserAcornProfile;
      }

      const answeredIds = profile.answeredQuestionIds || [];
      if (answeredIds.includes(questionId)) {
        return { rewarded: false, reason: 'already_answered', earnedDelta: 0 };
      }

      const isSameDay = profile.quizDaily?.date === today;
      const currentDailyEarned = isSameDay ? (profile.quizDaily?.earned || 0) : 0;

      if (currentDailyEarned >= ACORN_CONFIG.QUIZ_DAILY_MAX) {
        return { rewarded: false, reason: 'daily_limit', earnedDelta: 0 };
      }

      const earnedDelta = ACORN_CONFIG.QUIZ_REWARD; // +5
      const newDailyEarned = currentDailyEarned + earnedDelta;
      const newAcorns = (profile.acorns || 0) + earnedDelta;
      const newAnsweredIds = [...answeredIds, questionId];

      if (!snap.exists()) {
        const nextProfile: UserAcornProfile = {
          acorns: newAcorns,
          claimed: {},
          answeredQuestionIds: newAnsweredIds,
          quizDaily: { date: today, earned: newDailyEarned },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(docRef, nextProfile);
        this.writeLocalProfile(uid, nextProfile);
      } else {
        await updateDoc(docRef, {
          acorns: newAcorns,
          answeredQuestionIds: newAnsweredIds,
          quizDaily: { date: today, earned: newDailyEarned },
          updatedAt: new Date().toISOString(),
        });
        this.writeLocalProfile(uid, {
          ...profile,
          acorns: newAcorns,
          answeredQuestionIds: newAnsweredIds,
          quizDaily: { date: today, earned: newDailyEarned },
          updatedAt: new Date().toISOString(),
        });
      }

      return { rewarded: true, reason: 'success', earnedDelta };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${USERS_PATH}/${uid}`);
      return { rewarded: false, earnedDelta: 0 };
    }
  }

  /**
   * Batch reward after completing all 4 quiz questions in a round.
   * Awards +5 acorns per correct answer, capped at QUIZ_DAILY_MAX (20) per day.
   */
  public static async recordQuizRoundReward(
    uid: string,
    correctQuestionIds: string[]
  ): Promise<{ rewarded: boolean; reason?: 'no_correct' | 'daily_limit' | 'success'; earnedDelta: number }> {
    const today = this.getTodayString();
    const correctCount = correctQuestionIds.length;

    if (correctCount === 0) {
      return { rewarded: false, reason: 'no_correct', earnedDelta: 0 };
    }

    if (!uid) {
      const local = this.readLocalProfile('');
      const isSameDay = local.quizDaily?.date === today;
      const currentDailyEarned = isSameDay ? (local.quizDaily?.earned || 0) : 0;
      const remainingDaily = Math.max(0, ACORN_CONFIG.QUIZ_DAILY_MAX - currentDailyEarned);

      if (remainingDaily <= 0) {
        return { rewarded: false, reason: 'daily_limit', earnedDelta: 0 };
      }

      const earnedDelta = Math.min(correctCount * ACORN_CONFIG.QUIZ_REWARD, remainingDaily);
      const newAnsweredIds = Array.from(
        new Set([...(local.answeredQuestionIds || []), ...correctQuestionIds])
      );

      const updated: UserAcornProfile = {
        ...local,
        acorns: (local.acorns || 0) + earnedDelta,
        answeredQuestionIds: newAnsweredIds,
        quizDaily: { date: today, earned: currentDailyEarned + earnedDelta },
        updatedAt: new Date().toISOString(),
      };
      this.writeLocalProfile('', updated);
      return { rewarded: true, reason: 'success', earnedDelta };
    }

    const docRef = doc(db, USERS_PATH, uid);
    try {
      const snap = await getDoc(docRef);
      let profile: UserAcornProfile = {
        acorns: 0,
        claimed: {},
        answeredQuestionIds: [],
        quizDaily: { date: today, earned: 0 },
      };

      if (snap.exists()) {
        profile = snap.data() as UserAcornProfile;
      }

      const isSameDay = profile.quizDaily?.date === today;
      const currentDailyEarned = isSameDay ? (profile.quizDaily?.earned || 0) : 0;
      const remainingDaily = Math.max(0, ACORN_CONFIG.QUIZ_DAILY_MAX - currentDailyEarned);

      if (remainingDaily <= 0) {
        return { rewarded: false, reason: 'daily_limit', earnedDelta: 0 };
      }

      const earnedDelta = Math.min(correctCount * ACORN_CONFIG.QUIZ_REWARD, remainingDaily);
      const newDailyEarned = currentDailyEarned + earnedDelta;
      const newAcorns = (profile.acorns || 0) + earnedDelta;
      const newAnsweredIds = Array.from(
        new Set([...(profile.answeredQuestionIds || []), ...correctQuestionIds])
      );

      if (!snap.exists()) {
        const nextProfile: UserAcornProfile = {
          acorns: newAcorns,
          claimed: {},
          answeredQuestionIds: newAnsweredIds,
          quizDaily: { date: today, earned: newDailyEarned },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(docRef, nextProfile);
        this.writeLocalProfile(uid, nextProfile);
      } else {
        await updateDoc(docRef, {
          acorns: newAcorns,
          answeredQuestionIds: newAnsweredIds,
          quizDaily: { date: today, earned: newDailyEarned },
          updatedAt: new Date().toISOString(),
        });
        this.writeLocalProfile(uid, {
          ...profile,
          acorns: newAcorns,
          answeredQuestionIds: newAnsweredIds,
          quizDaily: { date: today, earned: newDailyEarned },
          updatedAt: new Date().toISOString(),
        });
      }

      return { rewarded: true, reason: 'success', earnedDelta };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${USERS_PATH}/${uid}`);
      return { rewarded: false, earnedDelta: 0 };
    }
  }

  // ==================== MINIROOM GIFTS METHODS ====================

  private static readLocalMiniroomGifts(): DisplayedMiniroomGift[] {
    try {
      const raw = localStorage.getItem(LOCAL_GIFTS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private static writeLocalMiniroomGifts(gifts: DisplayedMiniroomGift[]): void {
    try {
      localStorage.setItem(LOCAL_GIFTS_KEY, JSON.stringify(gifts));
      window.dispatchEvent(new CustomEvent(LOCAL_GIFTS_EVENT_NAME, { detail: gifts }));
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Subscribe to gifts displayed in the Miniroom (Firestore + localStorage fallback).
   */
  public static subscribeMiniroomGifts(
    onData: (gifts: DisplayedMiniroomGift[]) => void
  ): () => void {
    let remoteGifts: DisplayedMiniroomGift[] = [];

    const emitMerged = () => {
      const localGifts = this.readLocalMiniroomGifts();
      const map = new Map<string, DisplayedMiniroomGift>();
      for (const g of remoteGifts) {
        map.set(g.id, g);
      }
      for (const lg of localGifts) {
        const existsInRemote = remoteGifts.some(
          (rg) => rg.id === lg.id || (rg.giftId === lg.giftId && rg.createdAt === lg.createdAt)
        );
        if (!existsInRemote) {
          map.set(lg.id, lg);
        }
      }
      const list = Array.from(map.values()).sort((a, b) =>
        (a.createdAt || '').localeCompare(b.createdAt || '')
      );
      onData(list);
    };

    emitMerged();

    const handleLocalGiftEvent = () => emitMerged();
    window.addEventListener(LOCAL_GIFTS_EVENT_NAME, handleLocalGiftEvent);

    const unsubFirestore = onSnapshot(
      collection(db, MINIROOM_GIFTS_PATH),
      (snapshot) => {
        remoteGifts = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<DisplayedMiniroomGift, 'id'>),
        }));
        emitMerged();
      },
      (error) => {
        console.warn('Firestore miniroomGifts read notice:', error);
        emitMerged();
      }
    );

    return () => {
      window.removeEventListener(LOCAL_GIFTS_EVENT_NAME, handleLocalGiftEvent);
      unsubFirestore();
    };
  }

  /**
   * Purchase a gift item from the Gift Shelf using acorns.
   * Allows purchasing the same gift multiple times.
   * Does NOT unlock the Miniroom mission until the user actually displays the gift in the Miniroom.
   */
  public static async purchaseGift(
    uid: string,
    gift: MiniroomGiftProduct
  ): Promise<{ success: boolean; reason?: 'insufficient_acorns' }> {
    const local = this.readLocalProfile(uid);
    if ((local.acorns || 0) < gift.price) {
      return { success: false, reason: 'insufficient_acorns' };
    }

    const nowIso = new Date().toISOString();
    const nextAcorns = Math.max(0, (local.acorns || 0) - gift.price);
    const nextPurchased = Array.from(new Set([...(local.purchasedGiftIds || []), gift.id]));
    const nextPending = [...(local.pendingGiftIds || []), gift.id].slice(-25);

    const updatedLocal: UserAcornProfile = {
      ...local,
      acorns: nextAcorns,
      purchasedGiftIds: nextPurchased,
      pendingGiftIds: nextPending,
      updatedAt: nowIso,
    };

    if (!uid) {
      this.writeLocalProfile(uid, updatedLocal);
      bgmPlayer.playChime();
      return { success: true };
    }

    const docRef = doc(db, USERS_PATH, uid);
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as UserAcornProfile;
        const remoteAcorns = data.acorns || 0;
        if (remoteAcorns < gift.price) {
          return { success: false, reason: 'insufficient_acorns' };
        }
        const serverNextAcorns = Math.max(0, remoteAcorns - gift.price);
        const serverNextPurchased = Array.from(new Set([...(data.purchasedGiftIds || []), gift.id]));
        const serverNextPending = [...(data.pendingGiftIds || []), gift.id].slice(-25);
        await updateDoc(docRef, {
          acorns: serverNextAcorns,
          purchasedGiftIds: serverNextPurchased,
          pendingGiftIds: serverNextPending,
          updatedAt: nowIso,
        });
        this.writeLocalProfile(uid, {
          ...data,
          acorns: serverNextAcorns,
          purchasedGiftIds: serverNextPurchased,
          pendingGiftIds: serverNextPending,
          updatedAt: nowIso,
        });
      } else {
        this.writeLocalProfile(uid, updatedLocal);
      }
      bgmPlayer.playChime();
      return { success: true };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${USERS_PATH}/${uid}`);
      return { success: false };
    }
  }

  /**
   * Remove one copy of giftId from pendingGiftIds once placed in Miniroom.
   */
  private static consumeOnePendingGift(pending: string[], giftId: string): string[] {
    const idx = pending.indexOf(giftId);
    if (idx === -1) return pending;
    return [...pending.slice(0, idx), ...pending.slice(idx + 1)];
  }

  /**
   * Display a purchased gift in the Miniroom and unlock the '미니룸에 선물 보내기' mission reward button.
   */
  public static async displayGiftInMiniroom(
    uid: string,
    gift: MiniroomGiftProduct,
    senderName?: string
  ): Promise<void> {
    const nowIso = new Date().toISOString();
    const cleanSender = (senderName || '').trim().slice(0, 30) || '축하 하객';
    const local = this.readLocalProfile(uid);

    const nextDisplayed = Array.from(new Set([...(local.displayedGiftIds || []), gift.id]));
    const nextPending = this.consumeOnePendingGift(local.pendingGiftIds || [], gift.id);
    const updatedLocal: UserAcornProfile = {
      ...local,
      displayedGiftIds: nextDisplayed,
      pendingGiftIds: nextPending,
      eligible: { ...(local.eligible || {}), miniroomGift: true },
      updatedAt: nowIso,
    };
    this.writeLocalProfile(uid, updatedLocal);

    const giftPayload = {
      giftId: gift.id.slice(0, 50),
      name: gift.name.slice(0, 50),
      emoji: gift.emoji.slice(0, 10),
      senderName: cleanSender,
      senderUid: (uid || 'guest').slice(0, 128),
      createdAt: nowIso,
    };

    try {
      const docRef = await addDoc(collection(db, MINIROOM_GIFTS_PATH), giftPayload);
      const currentLocalGifts = this.readLocalMiniroomGifts();
      this.writeLocalMiniroomGifts([
        ...currentLocalGifts,
        { id: docRef.id, ...giftPayload },
      ]);
    } catch (error) {
      console.warn('Firestore miniroomGift display fallback to local:', error);
      const currentLocalGifts = this.readLocalMiniroomGifts();
      this.writeLocalMiniroomGifts([
        ...currentLocalGifts,
        { id: `local-gift-${Date.now()}`, ...giftPayload },
      ]);
    }

    if (uid) {
      const userRef = doc(db, USERS_PATH, uid);
      try {
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data() as UserAcornProfile;
          const serverDisplayed = Array.from(new Set([...(data.displayedGiftIds || []), gift.id]));
          const serverPending = this.consumeOnePendingGift(data.pendingGiftIds || [], gift.id);
          await updateDoc(userRef, {
            displayedGiftIds: serverDisplayed,
            pendingGiftIds: serverPending,
            'eligible.miniroomGift': true,
            updatedAt: nowIso,
          });
        }
      } catch (error) {
        console.warn('Firestore user displayedGiftIds sync notice:', error);
      }
    }

    bgmPlayer.playChime();
  }

  /**
   * Claim the '미니룸에 선물 보내기' reward (+10 acorns) after purchasing & displaying a gift in Miniroom.
   */
  public static async claimMiniroomGiftReward(
    uid: string,
    onShowToast: (msg: string) => void
  ): Promise<void> {
    const local = this.readLocalProfile(uid);
    if (local.claimed?.miniroomGift || !local.eligible?.miniroomGift) return;

    const nowIso = new Date().toISOString();

    if (!uid) {
      const updated: UserAcornProfile = {
        ...local,
        acorns: (local.acorns || 0) + ACORN_CONFIG.MINIROOM_GIFT_REWARD,
        claimed: { ...local.claimed, miniroomGift: true },
        eligible: { ...local.eligible, miniroomGift: true },
        updatedAt: nowIso,
      };
      this.writeLocalProfile(uid, updated);
      bgmPlayer.playChime();
      onShowToast(`🌰 +${ACORN_CONFIG.MINIROOM_GIFT_REWARD} 도토리 스토어에서 확인해보세요`);
      return;
    }

    const docRef = doc(db, USERS_PATH, uid);
    try {
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        const initialProfile: UserAcornProfile = {
          acorns: ACORN_CONFIG.MINIROOM_GIFT_REWARD,
          claimed: {
            welcome: !!local.claimed?.welcome,
            guestbook: !!local.claimed?.guestbook,
            ilchon: !!local.claimed?.ilchon,
            miniroomGift: true,
          },
          eligible: {
            ...local.eligible,
            miniroomGift: true,
          },
          purchasedGiftIds: local.purchasedGiftIds || [],
          displayedGiftIds: local.displayedGiftIds || [],
          answeredQuestionIds: local.answeredQuestionIds || [],
          quizDaily: local.quizDaily || { date: this.getTodayString(), earned: 0 },
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        await setDoc(docRef, initialProfile);
        this.writeLocalProfile(uid, initialProfile);
        bgmPlayer.playChime();
        onShowToast(`🌰 +${ACORN_CONFIG.MINIROOM_GIFT_REWARD} 도토리 스토어에서 확인해보세요`);
      } else {
        const data = snap.data() as UserAcornProfile;
        if (!data.claimed?.miniroomGift) {
          const currentAcorns = data.acorns || 0;
          const nextAcorns = currentAcorns + ACORN_CONFIG.MINIROOM_GIFT_REWARD;
          await updateDoc(docRef, {
            acorns: nextAcorns,
            'claimed.miniroomGift': true,
            'eligible.miniroomGift': true,
            updatedAt: nowIso,
          });
          this.writeLocalProfile(uid, {
            ...data,
            acorns: nextAcorns,
            claimed: { ...(data.claimed || {}), miniroomGift: true },
            eligible: { ...(data.eligible || {}), miniroomGift: true },
            updatedAt: nowIso,
          });
          bgmPlayer.playChime();
          onShowToast(`🌰 +${ACORN_CONFIG.MINIROOM_GIFT_REWARD} 도토리 스토어에서 확인해보세요`);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${USERS_PATH}/${uid}`);
    }
  }

  /**
   * Admin helper to remove a displayed miniroom gift.
   */
  public static async deleteMiniroomGift(giftDocId: string): Promise<void> {
    const localGifts = this.readLocalMiniroomGifts().filter((g) => g.id !== giftDocId);
    this.writeLocalMiniroomGifts(localGifts);
    if (!giftDocId.startsWith('local-gift-')) {
      try {
        await deleteDoc(doc(db, MINIROOM_GIFTS_PATH, giftDocId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `${MINIROOM_GIFTS_PATH}/${giftDocId}`);
      }
    }
  }

  // ==================== MINIROOM CELEBRATION HEARTS METHODS ====================

  public static getCachedMiniroomHearts(): number {
    try {
      const raw = localStorage.getItem(LOCAL_HEARTS_KEY);
      if (!raw) return 0;
      const parsed = parseInt(raw, 10);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    } catch {
      return 0;
    }
  }

  private static setCachedMiniroomHearts(count: number, dispatchEvent = true): void {
    const normalized = Math.max(0, Math.floor(count));
    try {
      localStorage.setItem(LOCAL_HEARTS_KEY, String(normalized));
      if (dispatchEvent) {
        window.dispatchEvent(new CustomEvent(LOCAL_HEARTS_EVENT_NAME, { detail: normalized }));
      }
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Real-time subscription to accumulated celebration hearts in the Miniroom.
   * Syncs across app tabs, browser tabs, and visitors via Firestore + local cache.
   */
  public static subscribeMiniroomHearts(onData: (count: number) => void): () => void {
    onData(this.getCachedMiniroomHearts());

    const handleLocalEvent = (e: Event) => {
      const custom = e as CustomEvent<number>;
      if (typeof custom.detail === 'number') {
        onData(custom.detail);
      } else {
        onData(this.getCachedMiniroomHearts());
      }
    };

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === LOCAL_HEARTS_KEY) {
        onData(this.getCachedMiniroomHearts());
      }
    };

    window.addEventListener(LOCAL_HEARTS_EVENT_NAME, handleLocalEvent);
    window.addEventListener('storage', handleStorageEvent);

    const unsubFirestore = onSnapshot(
      doc(db, MINIROOM_STATS_PATH, HEARTS_DOC_ID),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const remoteCount =
            typeof data?.count === 'number' && Number.isFinite(data.count)
              ? Math.max(0, Math.floor(data.count))
              : 0;
          this.setCachedMiniroomHearts(remoteCount, false);
          onData(remoteCount);
        } else {
          this.setCachedMiniroomHearts(0, false);
          onData(0);
        }
      },
      (error) => {
        console.warn('Firestore miniroomStats hearts read notice:', error);
        onData(this.getCachedMiniroomHearts());
      }
    );

    return () => {
      window.removeEventListener(LOCAL_HEARTS_EVENT_NAME, handleLocalEvent);
      window.removeEventListener('storage', handleStorageEvent);
      unsubFirestore();
    };
  }

  /**
   * Increment accumulated celebration hearts by +1 cleanly and atomically.
   */
  public static async incrementMiniroomHearts(): Promise<void> {
    const optimistic = this.getCachedMiniroomHearts() + 1;
    this.setCachedMiniroomHearts(optimistic, true);

    try {
      await setDoc(
        doc(db, MINIROOM_STATS_PATH, HEARTS_DOC_ID),
        {
          count: increment(1),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (error) {
      console.warn('Firestore miniroomStats hearts increment notice:', error);
    }
  }

  /**
   * Reset accumulated celebration hearts to 0 (Admin only).
   */
  public static async resetMiniroomHearts(): Promise<void> {
    const docPath = `${MINIROOM_STATS_PATH}/${HEARTS_DOC_ID}`;
    try {
      await setDoc(doc(db, MINIROOM_STATS_PATH, HEARTS_DOC_ID), {
        count: 0,
        updatedAt: new Date().toISOString(),
      });
      this.setCachedMiniroomHearts(0, true);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  }
}
