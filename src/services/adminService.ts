import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { ADMIN_EMAILS } from '../config/weddingConfig';

export interface AdminAccountEntry {
  email: string;
  note?: string;
  addedBy: string;
  createdAt: string;
}

const ADMINS_COLLECTION = 'admins';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class AdminService {
  public static isPrimaryAdminEmail(email: string | null | undefined): boolean {
    if (!email) return false;
    const normalized = email.toLowerCase().trim();
    return ADMIN_EMAILS.some((e) => e.toLowerCase().trim() === normalized);
  }

  public static subscribeAdminAccounts(
    onData: (accounts: AdminAccountEntry[]) => void
  ): () => void {
    const colRef = collection(db, ADMINS_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items: AdminAccountEntry[] = snapshot.docs.map((d) => {
          const data = d.data() as Partial<AdminAccountEntry>;
          return {
            email: (data.email || d.id).toLowerCase().trim(),
            note: data.note || '',
            addedBy: data.addedBy || '',
            createdAt: data.createdAt || '',
          };
        });
        items.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
        onData(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, ADMINS_COLLECTION);
      }
    );
  }

  public static async addAdminAccount(
    rawEmail: string,
    note: string,
    addedByEmail: string
  ): Promise<void> {
    const email = rawEmail.toLowerCase().trim();
    if (!EMAIL_REGEX.test(email) || email.length < 5 || email.length > 100) {
      throw new Error('올바른 구글 이메일 주소를 입력해주세요.');
    }
    if (this.isPrimaryAdminEmail(email)) {
      throw new Error('이미 기본 관리자로 등록된 이메일입니다.');
    }

    const docPath = `${ADMINS_COLLECTION}/${email}`;
    try {
      await setDoc(doc(db, ADMINS_COLLECTION, email), {
        email,
        note: note.trim().slice(0, 50),
        addedBy: (addedByEmail || 'phonick705@gmail.com').toLowerCase().trim().slice(0, 100),
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, docPath);
    }
  }

  public static async removeAdminAccount(email: string): Promise<void> {
    const normalized = email.toLowerCase().trim();
    if (this.isPrimaryAdminEmail(normalized)) {
      throw new Error('기본 관리자 계정은 삭제할 수 없습니다.');
    }

    const docPath = `${ADMINS_COLLECTION}/${normalized}`;
    try {
      await deleteDoc(doc(db, ADMINS_COLLECTION, normalized));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, docPath);
    }
  }
}
