import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType, auth } from './firebase';
import { 
  WEDDING_CONFIG, 
  DiaryItem, 
  PhotoItem, 
  PhotoFolder, 
  IlchonItem,
  QuizQuestion,
  INITIAL_QUIZ_QUESTIONS
} from '../config/weddingConfig';

export interface FirestoreGuestbookItem {
  id: string;
  author: string;
  authorName?: string;
  ilchonName?: string;
  emoji: string;
  message: string;
  authorUid: string;
  createdAt: string;
  updatedAt?: string;
  edited?: boolean;
}

export interface FirestoreIlchonItem extends IlchonItem {
  id: string;
  status: 'pending' | 'approved';
  authorUid?: string;
  createdAt?: string;
}

const GUESTBOOK_PATH = 'guestbook';
const ILCHON_PATH = 'ilchon';
const INVITATION_PATH = 'invitation';
const DIARY_PATH = 'diary';
const PHOTOS_PATH = 'photos';
const FOLDERS_PATH = 'photoFolders';
const QUIZ_PATH = 'quizQuestions';

const RATE_LIMIT_KEY = 'cyworld_ilchon_last_request_time';
const RATE_LIMIT_SECONDS = 30;

export class WeddingDataService {
  private static isSeeding = false;

  /**
   * Initializes and seeds default data to Firestore if collections are empty.
   */
  public static async autoSeedIfEmpty(): Promise<void> {
    if (this.isSeeding) return;
    this.isSeeding = true;

    try {
      // 1. Seed Invitation Config if missing
      const invDocRef = doc(db, INVITATION_PATH, 'main');
      const invSnap = await getDoc(invDocRef);
      if (!invSnap.exists()) {
        try {
          await setDoc(invDocRef, {
            groom: WEDDING_CONFIG.groom,
            bride: WEDDING_CONFIG.bride,
            ceremony: WEDDING_CONFIG.ceremony,
            invitation: WEDDING_CONFIG.invitation,
            miniroom: WEDDING_CONFIG.miniroom,
            updatedAt: new Date().toISOString(),
          });
        } catch {
          // May require admin permission
        }
      }

      // 2. Check and seed guestbook if empty
      const gbSnap = await getDocs(query(collection(db, GUESTBOOK_PATH), limit(1)));
      if (gbSnap.empty) {
        for (const item of WEDDING_CONFIG.initialGuestbook) {
          try {
            await setDoc(doc(db, GUESTBOOK_PATH, item.id), {
              author: item.author,
              authorName: item.author.split('(')[0] || item.author,
              ilchonName: item.author.includes('(') ? item.author.split('(')[1].replace(')', '') : '',
              emoji: item.emoji,
              message: item.message,
              authorUid: 'seed-admin',
              createdAt: item.createdAt,
              edited: false,
            });
          } catch {
            // Ignore seed permission if client is anonymous
          }
        }
      }

      // 3. Check and seed Ilchons if empty
      const ilchonSnap = await getDocs(query(collection(db, ILCHON_PATH), limit(1)));
      if (ilchonSnap.empty) {
        for (const item of WEDDING_CONFIG.ilchons) {
          try {
            await setDoc(doc(db, ILCHON_PATH, item.id), {
              ...item,
              status: 'approved',
              authorUid: 'seed-admin',
              createdAt: '2026.05.01 12:00',
            });
          } catch {
            // Ignore seed error
          }
        }
      }

      // 4. Check and seed Diary if empty
      const diarySnap = await getDocs(query(collection(db, DIARY_PATH), limit(1)));
      if (diarySnap.empty) {
        for (let i = 0; i < WEDDING_CONFIG.diaryEntries.length; i++) {
          const item = WEDDING_CONFIG.diaryEntries[i];
          try {
            await setDoc(doc(db, DIARY_PATH, item.id), {
              ...item,
              order: i,
              createdAt: item.date,
            });
          } catch {
            // Ignore seed error
          }
        }
      }

      // 5. Check and seed Photo Folders & Photos if empty
      const folderSnap = await getDocs(query(collection(db, FOLDERS_PATH), limit(1)));
      if (folderSnap.empty) {
        for (let i = 0; i < WEDDING_CONFIG.photoFolders.length; i++) {
          const f = WEDDING_CONFIG.photoFolders[i];
          try {
            await setDoc(doc(db, FOLDERS_PATH, f.id), {
              ...f,
              order: i,
            });
          } catch {
            // Ignore
          }
        }
      }

      const photoSnap = await getDocs(query(collection(db, PHOTOS_PATH), limit(1)));
      if (photoSnap.empty) {
        for (let i = 0; i < WEDDING_CONFIG.photos.length; i++) {
          const p = WEDDING_CONFIG.photos[i];
          try {
            await setDoc(doc(db, PHOTOS_PATH, p.id), {
              ...p,
              order: i,
            });
          } catch {
            // Ignore
          }
        }
      }

      // 6. Check and seed Quiz Questions if empty
      const quizSnap = await getDocs(query(collection(db, QUIZ_PATH), limit(1)));
      if (quizSnap.empty) {
        for (const q of INITIAL_QUIZ_QUESTIONS) {
          try {
            await setDoc(doc(db, QUIZ_PATH, q.id), {
              question: q.question,
              options: q.options,
              answerIndex: q.answerIndex,
              explanation: q.explanation,
              order: q.order,
              createdAt: new Date().toISOString(),
            });
          } catch {
            // Ignore
          }
        }
      }
    } catch (e) {
      console.warn('Auto seed check completed with notice:', e);
    } finally {
      this.isSeeding = false;
    }
  }

  // ==================== GUESTBOOK METHODS ====================
  public static subscribeGuestbook(
    onData: (entries: FirestoreGuestbookItem[]) => void
  ): () => void {
    const q = collection(db, GUESTBOOK_PATH);
    return onSnapshot(
      q,
      (snapshot) => {
        const list: FirestoreGuestbookItem[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<FirestoreGuestbookItem, 'id'>),
        }));

        // Sort latest first
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        onData(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, GUESTBOOK_PATH);
      }
    );
  }

  public static async addGuestbook(data: {
    authorName: string;
    ilchonName?: string;
    emoji: string;
    message: string;
    authorUid: string;
  }): Promise<string> {
    const name = data.authorName.trim() || '익명의 일촌';
    const ilchon = data.ilchonName?.trim();
    const authorDisplay = ilchon ? `${name}(${ilchon})` : name;

    const now = new Date();
    const formattedDate = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    try {
      const docRef = await addDoc(collection(db, GUESTBOOK_PATH), {
        author: authorDisplay,
        authorName: name,
        ilchonName: ilchon || '',
        emoji: data.emoji || '💕',
        message: data.message.trim(),
        authorUid: data.authorUid,
        createdAt: formattedDate,
        edited: false,
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, GUESTBOOK_PATH);
    }
  }

  public static async updateGuestbook(
    id: string,
    data: {
      authorName: string;
      ilchonName?: string;
      emoji: string;
      message: string;
    }
  ): Promise<void> {
    const path = `${GUESTBOOK_PATH}/${id}`;
    const name = data.authorName.trim() || '익명의 일촌';
    const ilchon = data.ilchonName?.trim();
    const authorDisplay = ilchon ? `${name}(${ilchon})` : name;

    const now = new Date();
    const formattedDate = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    try {
      await updateDoc(doc(db, GUESTBOOK_PATH, id), {
        author: authorDisplay,
        authorName: name,
        ilchonName: ilchon || '',
        emoji: data.emoji,
        message: data.message.trim(),
        updatedAt: formattedDate,
        edited: true,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  public static async deleteGuestbook(id: string): Promise<void> {
    const path = `${GUESTBOOK_PATH}/${id}`;
    try {
      await deleteDoc(doc(db, GUESTBOOK_PATH, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  // ==================== ILCHON METHODS ====================
  public static subscribeApprovedIlchons(
    onData: (items: FirestoreIlchonItem[]) => void
  ): () => void {
    const q = query(collection(db, ILCHON_PATH), where('status', '==', 'approved'));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: FirestoreIlchonItem[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<FirestoreIlchonItem, 'id'>),
        }));
        onData(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, ILCHON_PATH);
      }
    );
  }

  public static subscribePendingIlchons(
    onData: (items: FirestoreIlchonItem[]) => void
  ): () => void {
    const q = query(collection(db, ILCHON_PATH), where('status', '==', 'pending'));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: FirestoreIlchonItem[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<FirestoreIlchonItem, 'id'>),
        }));
        onData(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, ILCHON_PATH);
      }
    );
  }

  public static async requestIlchon(data: {
    name: string;
    relationship: string;
    ilchonName: string;
    message: string;
    emoji: string;
    side?: 'groom' | 'bride' | 'both';
  }): Promise<void> {
    // Rate limit verification (30 seconds per browser)
    const lastRequest = localStorage.getItem(RATE_LIMIT_KEY);
    const now = Date.now();
    if (lastRequest) {
      const diffSec = (now - parseInt(lastRequest, 10)) / 1000;
      if (diffSec < RATE_LIMIT_SECONDS) {
        const remaining = Math.ceil(RATE_LIMIT_SECONDS - diffSec);
        throw new Error(`연속 신청 방지를 위해 ${remaining}초 후에 다시 신청해주세요! ⏳`);
      }
    }

    const formattedDate = new Date().toISOString();
    try {
      await addDoc(collection(db, ILCHON_PATH), {
        name: data.name.trim(),
        relationship: data.relationship.trim(),
        ilchonName: data.ilchonName.trim(),
        message: data.message.trim(),
        emoji: data.emoji || '🤝',
        side: data.side || 'both',
        status: 'pending',
        authorUid: auth.currentUser?.uid || 'anon',
        createdAt: formattedDate,
      });
      localStorage.setItem(RATE_LIMIT_KEY, now.toString());
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, ILCHON_PATH);
    }
  }

  public static async approveIlchon(id: string): Promise<void> {
    const path = `${ILCHON_PATH}/${id}`;
    try {
      await updateDoc(doc(db, ILCHON_PATH, id), {
        status: 'approved',
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  public static async deleteIlchon(id: string): Promise<void> {
    const path = `${ILCHON_PATH}/${id}`;
    try {
      await deleteDoc(doc(db, ILCHON_PATH, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  public static async updateIlchon(id: string, data: Partial<IlchonItem>): Promise<void> {
    const path = `${ILCHON_PATH}/${id}`;
    try {
      await updateDoc(doc(db, ILCHON_PATH, id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  // ==================== INVITATION CONFIG ====================
  public static subscribeInvitationConfig(onData: (config: any) => void): () => void {
    return onSnapshot(
      doc(db, INVITATION_PATH, 'main'),
      (snapshot) => {
        if (snapshot.exists()) {
          onData(snapshot.data());
        } else {
          onData(null);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `${INVITATION_PATH}/main`);
      }
    );
  }

  public static async updateInvitationConfig(updatedData: any): Promise<void> {
    const path = `${INVITATION_PATH}/main`;
    try {
      await setDoc(doc(db, INVITATION_PATH, 'main'), {
        ...updatedData,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.email || 'admin',
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  // ==================== DIARY METHODS ====================
  public static subscribeDiary(onData: (items: DiaryItem[]) => void): () => void {
    return onSnapshot(
      collection(db, DIARY_PATH),
      (snapshot) => {
        const list: DiaryItem[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<DiaryItem, 'id'>),
        }));
        // Sort chronologically
        list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        onData(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, DIARY_PATH);
      }
    );
  }

  public static async addDiary(item: Omit<DiaryItem, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, DIARY_PATH), {
        ...item,
        createdAt: new Date().toISOString(),
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, DIARY_PATH);
    }
  }

  public static async updateDiary(id: string, item: Partial<DiaryItem>): Promise<void> {
    const path = `${DIARY_PATH}/${id}`;
    try {
      await updateDoc(doc(db, DIARY_PATH, id), item);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  public static async deleteDiary(id: string): Promise<void> {
    const path = `${DIARY_PATH}/${id}`;
    try {
      await deleteDoc(doc(db, DIARY_PATH, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  // ==================== PHOTOS & STORAGE ====================
  public static subscribePhotoFolders(onData: (folders: PhotoFolder[]) => void): () => void {
    return onSnapshot(
      collection(db, FOLDERS_PATH),
      (snapshot) => {
        const list: PhotoFolder[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<PhotoFolder, 'id'>),
        }));
        onData(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, FOLDERS_PATH);
      }
    );
  }

  public static subscribePhotos(onData: (photos: PhotoItem[]) => void): () => void {
    return onSnapshot(
      collection(db, PHOTOS_PATH),
      (snapshot) => {
        const list: PhotoItem[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<PhotoItem, 'id'>),
        }));
        onData(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, PHOTOS_PATH);
      }
    );
  }

  public static async uploadPhotoFile(file: File): Promise<string> {
    const filename = `photos/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const storageRef = ref(storage, filename);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  }

  public static async addPhoto(photo: Omit<PhotoItem, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, PHOTOS_PATH), {
        ...photo,
        createdAt: new Date().toISOString(),
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, PHOTOS_PATH);
    }
  }

  public static async deletePhoto(id: string): Promise<void> {
    const path = `${PHOTOS_PATH}/${id}`;
    try {
      await deleteDoc(doc(db, PHOTOS_PATH, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  public static async addPhotoFolder(folder: Omit<PhotoFolder, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, FOLDERS_PATH), {
        ...folder,
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, FOLDERS_PATH);
    }
  }

  public static async deletePhotoFolder(folderId: string): Promise<void> {
    const path = `${FOLDERS_PATH}/${folderId}`;
    try {
      await deleteDoc(doc(db, FOLDERS_PATH, folderId));
      // Delete photos in this folder
      const photosSnap = await getDocs(query(collection(db, PHOTOS_PATH), where('folderId', '==', folderId)));
      for (const p of photosSnap.docs) {
        await deleteDoc(p.ref);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  // ==================== COUPLE QUIZ METHODS ====================
  public static subscribeQuizQuestions(onData: (questions: QuizQuestion[]) => void): () => void {
    return onSnapshot(
      collection(db, QUIZ_PATH),
      (snapshot) => {
        const list: QuizQuestion[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<QuizQuestion, 'id'>),
        }));
        list.sort((a, b) => (a.order || 0) - (b.order || 0));
        onData(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, QUIZ_PATH);
      }
    );
  }

  public static async addQuizQuestion(data: Omit<QuizQuestion, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, QUIZ_PATH), {
        ...data,
        createdAt: new Date().toISOString(),
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, QUIZ_PATH);
    }
  }

  public static async updateQuizQuestion(id: string, data: Partial<QuizQuestion>): Promise<void> {
    const path = `${QUIZ_PATH}/${id}`;
    try {
      await updateDoc(doc(db, QUIZ_PATH, id), {
        ...data,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  public static async deleteQuizQuestion(id: string): Promise<void> {
    const path = `${QUIZ_PATH}/${id}`;
    try {
      await deleteDoc(doc(db, QUIZ_PATH, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
}
