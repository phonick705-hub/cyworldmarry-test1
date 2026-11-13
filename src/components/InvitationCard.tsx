import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  MapPin, 
  Phone, 
  MessageSquare, 
  Copy, 
  ChevronDown, 
  ChevronUp, 
  Train, 
  Car,
  Users,
  CreditCard,
  Edit,
  Save,
  X,
  Plus,
  Trash2,
  Check,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { WEDDING_CONFIG } from '../config/weddingConfig';
import { WeddingDataService } from '../services/weddingDataService';
import { bgmPlayer } from '../utils/soundSynthesizer';

export interface BankAccountItem {
  id: string;
  side: 'groom' | 'bride';
  relation: string; // e.g. "신랑", "신랑 아버지", "신랑 어머니", "신부", "신부 아버지", "신부 어머니"
  bank: string;
  accountNumber: string;
  holder: string;
}

interface InvitationCardProps {
  onShowToast: (msg: string) => void;
}

export const InvitationCard: React.FC<InvitationCardProps> = ({ onShowToast }) => {
  const { isAdmin, setShowAdminModal } = useAuth();
  const [config, setConfig] = useState(WEDDING_CONFIG);
  const [isExpanded, setIsExpanded] = useState(false);
  const [openGroomAccount, setOpenGroomAccount] = useState(true);
  const [openBrideAccount, setOpenBrideAccount] = useState(true);
  const [showParentsModal, setShowParentsModal] = useState(false);

  // Dynamic Bank Accounts List
  const defaultGroomAccounts: BankAccountItem[] = [
    {
      id: 'groom-self',
      side: 'groom',
      relation: '신랑',
      bank: config.groom.account.bank || '국민은행',
      accountNumber: config.groom.account.accountNumber || '921602-01-234567',
      holder: config.groom.account.holder || config.groom.name,
    },
    {
      id: 'groom-father',
      side: 'groom',
      relation: '신랑 아버지',
      bank: config.groom.fatherAccount?.bank || '신한은행',
      accountNumber: config.groom.fatherAccount?.accountNumber || '110-234-567890',
      holder: config.groom.fatherAccount?.holder || config.groom.fatherName,
    },
    {
      id: 'groom-mother',
      side: 'groom',
      relation: '신랑 어머니',
      bank: config.groom.motherAccount?.bank || '농협은행',
      accountNumber: config.groom.motherAccount?.accountNumber || '302-1234-5678-91',
      holder: config.groom.motherAccount?.holder || config.groom.motherName,
    },
  ];

  const defaultBrideAccounts: BankAccountItem[] = [
    {
      id: 'bride-self',
      side: 'bride',
      relation: '신부',
      bank: config.bride.account.bank || '카카오뱅크',
      accountNumber: config.bride.account.accountNumber || '3333-04-1234567',
      holder: config.bride.account.holder || config.bride.name,
    },
    {
      id: 'bride-father',
      side: 'bride',
      relation: '신부 아버지',
      bank: config.bride.fatherAccount?.bank || '우리은행',
      accountNumber: config.bride.fatherAccount?.accountNumber || '1002-345-678901',
      holder: config.bride.fatherAccount?.holder || config.bride.fatherName,
    },
    {
      id: 'bride-mother',
      side: 'bride',
      relation: '신부 어머니',
      bank: config.bride.motherAccount?.bank || '하나은행',
      accountNumber: config.bride.motherAccount?.accountNumber || '284-910234-56707',
      holder: config.bride.motherAccount?.holder || config.bride.motherName,
    },
  ];

  const [groomAccounts, setGroomAccounts] = useState<BankAccountItem[]>(defaultGroomAccounts);
  const [brideAccounts, setBrideAccounts] = useState<BankAccountItem[]>(defaultBrideAccounts);

  // Admin Modal States
  // 1. General Invitation Edit Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editGreeting, setEditGreeting] = useState(config.invitation.greetingFull);
  const [editDateDisplay, setEditDateDisplay] = useState(config.ceremony.dateDisplay);
  const [editVenue, setEditVenue] = useState(config.ceremony.venueName);
  const [editHall, setEditHall] = useState(config.ceremony.hallName);
  const [editAddress, setEditAddress] = useState(config.ceremony.address);
  const [isSaving, setIsSaving] = useState(false);

  // 2. Contacts Edit Modal
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactGroomName, setContactGroomName] = useState(config.groom.name);
  const [contactGroomPhone, setContactGroomPhone] = useState(config.groom.phone);
  const [contactGroomFatherName, setContactGroomFatherName] = useState(config.groom.fatherName);
  const [contactGroomFatherPhone, setContactGroomFatherPhone] = useState(config.groom.fatherPhone);
  const [contactGroomMotherName, setContactGroomMotherName] = useState(config.groom.motherName);
  const [contactGroomMotherPhone, setContactGroomMotherPhone] = useState(config.groom.motherPhone);

  const [contactBrideName, setContactBrideName] = useState(config.bride.name);
  const [contactBridePhone, setContactBridePhone] = useState(config.bride.phone);
  const [contactBrideFatherName, setContactBrideFatherName] = useState(config.bride.fatherName);
  const [contactBrideFatherPhone, setContactBrideFatherPhone] = useState(config.bride.fatherPhone);
  const [contactBrideMotherName, setContactBrideMotherName] = useState(config.bride.motherName);
  const [contactBrideMotherPhone, setContactBrideMotherPhone] = useState(config.bride.motherPhone);
  const [isSavingContacts, setIsSavingContacts] = useState(false);

  // 3. Bank Account Add / Edit Modal
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountEditTarget, setAccountEditTarget] = useState<BankAccountItem | null>(null);
  const [accountSide, setAccountSide] = useState<'groom' | 'bride'>('groom');
  const [accountRelation, setAccountRelation] = useState('신랑');
  const [accountBank, setAccountBank] = useState('국민은행');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [isSavingAccount, setIsSavingAccount] = useState(false);

  // Delete Account Confirmation Modal
  const [accountToDelete, setAccountToDelete] = useState<BankAccountItem | null>(null);

  // Secret 5-tap counter
  const [secretTaps, setSecretTaps] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);

  useEffect(() => {
    // Subscribe to invitation configuration in Firestore
    const unsubscribe = WeddingDataService.subscribeInvitationConfig((remoteConfig) => {
      if (remoteConfig) {
        setConfig((prev) => ({
          ...prev,
          ...remoteConfig,
          groom: { ...prev.groom, ...remoteConfig.groom },
          bride: { ...prev.bride, ...remoteConfig.bride },
          ceremony: { ...prev.ceremony, ...remoteConfig.ceremony },
          invitation: { ...prev.invitation, ...remoteConfig.invitation },
        }));

        if (remoteConfig.groomAccounts && Array.isArray(remoteConfig.groomAccounts)) {
          setGroomAccounts(remoteConfig.groomAccounts);
        }
        if (remoteConfig.brideAccounts && Array.isArray(remoteConfig.brideAccounts)) {
          setBrideAccounts(remoteConfig.brideAccounts);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSecretTap = () => {
    const now = Date.now();
    if (now - lastTapTime > 3000) {
      setSecretTaps(1);
    } else {
      const nextCount = secretTaps + 1;
      setSecretTaps(nextCount);
      if (nextCount >= 5) {
        setSecretTaps(0);
        bgmPlayer.playChime();
        setShowAdminModal(true);
        onShowToast('관리자 인증 창을 열었습니다 🔐');
      }
    }
    setLastTapTime(now);
  };

  // Open General Invitation Edit Modal
  const handleOpenEdit = () => {
    setEditGreeting(config.invitation.greetingFull);
    setEditDateDisplay(config.ceremony.dateDisplay);
    setEditVenue(config.ceremony.venueName);
    setEditHall(config.ceremony.hallName);
    setEditAddress(config.ceremony.address);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updatedCeremony = {
        ...config.ceremony,
        dateDisplay: editDateDisplay,
        venueName: editVenue,
        hallName: editHall,
        address: editAddress,
      };

      const updatedInvitation = {
        ...config.invitation,
        greetingFull: editGreeting,
        greetingShort: editGreeting.slice(0, 100) + '...',
      };

      await WeddingDataService.updateInvitationConfig({
        ceremony: updatedCeremony,
        invitation: updatedInvitation,
      });

      setShowEditModal(false);
      bgmPlayer.playChime();
      onShowToast('예식 정보가 수정되었습니다! ✨');
    } catch {
      onShowToast('수정에 실패했습니다. 관리자 권한을 확인해주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  // Open Contacts Edit Modal
  const handleOpenContactEdit = () => {
    setContactGroomName(config.groom.name);
    setContactGroomPhone(config.groom.phone);
    setContactGroomFatherName(config.groom.fatherName);
    setContactGroomFatherPhone(config.groom.fatherPhone);
    setContactGroomMotherName(config.groom.motherName);
    setContactGroomMotherPhone(config.groom.motherPhone);

    setContactBrideName(config.bride.name);
    setContactBridePhone(config.bride.phone);
    setContactBrideFatherName(config.bride.fatherName);
    setContactBrideFatherPhone(config.bride.fatherPhone);
    setContactBrideMotherName(config.bride.motherName);
    setContactBrideMotherPhone(config.bride.motherPhone);

    setShowContactModal(true);
  };

  // Save Contacts
  const handleSaveContacts = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingContacts(true);
    try {
      const updatedGroom = {
        ...config.groom,
        name: contactGroomName.trim(),
        phone: contactGroomPhone.trim(),
        fatherName: contactGroomFatherName.trim(),
        fatherPhone: contactGroomFatherPhone.trim(),
        motherName: contactGroomMotherName.trim(),
        motherPhone: contactGroomMotherPhone.trim(),
      };

      const updatedBride = {
        ...config.bride,
        name: contactBrideName.trim(),
        phone: contactBridePhone.trim(),
        fatherName: contactBrideFatherName.trim(),
        fatherPhone: contactBrideFatherPhone.trim(),
        motherName: contactBrideMotherName.trim(),
        motherPhone: contactBrideMotherPhone.trim(),
      };

      await WeddingDataService.updateInvitationConfig({
        groom: updatedGroom,
        bride: updatedBride,
      });

      setShowContactModal(false);
      bgmPlayer.playChime();
      onShowToast('축하 연락처가 수정되었습니다! 📞');
    } catch {
      onShowToast('연락처 수정에 실패했습니다.');
    } finally {
      setIsSavingContacts(false);
    }
  };

  // Open Account Add / Edit Modal
  const handleOpenAddAccount = (side: 'groom' | 'bride') => {
    setAccountEditTarget(null);
    setAccountSide(side);
    setAccountRelation(side === 'groom' ? '신랑' : '신부');
    setAccountBank('국민은행');
    setAccountNumber('');
    setAccountHolder(side === 'groom' ? config.groom.name : config.bride.name);
    setShowAccountModal(true);
  };

  const handleOpenEditAccount = (acc: BankAccountItem) => {
    setAccountEditTarget(acc);
    setAccountSide(acc.side);
    setAccountRelation(acc.relation);
    setAccountBank(acc.bank);
    setAccountNumber(acc.accountNumber);
    setAccountHolder(acc.holder);
    setShowAccountModal(true);
  };

  // Save (Add or Update) Bank Account
  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNumber.trim() || !accountHolder.trim()) {
      onShowToast('계좌번호와 예금주를 입력해주세요.');
      return;
    }

    setIsSavingAccount(true);
    try {
      let updatedGroom = [...groomAccounts];
      let updatedBride = [...brideAccounts];

      if (accountEditTarget) {
        // Updating existing
        if (accountEditTarget.side === 'groom') {
          if (accountSide === 'groom') {
            updatedGroom = updatedGroom.map((a) =>
              a.id === accountEditTarget.id
                ? { ...a, relation: accountRelation, bank: accountBank, accountNumber: accountNumber.trim(), holder: accountHolder.trim() }
                : a
            );
          } else {
            // Moved to bride
            updatedGroom = updatedGroom.filter((a) => a.id !== accountEditTarget.id);
            updatedBride.push({
              id: accountEditTarget.id,
              side: 'bride',
              relation: accountRelation,
              bank: accountBank,
              accountNumber: accountNumber.trim(),
              holder: accountHolder.trim(),
            });
          }
        } else {
          // was bride
          if (accountSide === 'bride') {
            updatedBride = updatedBride.map((a) =>
              a.id === accountEditTarget.id
                ? { ...a, relation: accountRelation, bank: accountBank, accountNumber: accountNumber.trim(), holder: accountHolder.trim() }
                : a
            );
          } else {
            // Moved to groom
            updatedBride = updatedBride.filter((a) => a.id !== accountEditTarget.id);
            updatedGroom.push({
              id: accountEditTarget.id,
              side: 'groom',
              relation: accountRelation,
              bank: accountBank,
              accountNumber: accountNumber.trim(),
              holder: accountHolder.trim(),
            });
          }
        }
      } else {
        // Adding new
        const newAccount: BankAccountItem = {
          id: `acc-${Date.now()}`,
          side: accountSide,
          relation: accountRelation.trim() || (accountSide === 'groom' ? '신랑' : '신부'),
          bank: accountBank.trim() || '국민은행',
          accountNumber: accountNumber.trim(),
          holder: accountHolder.trim(),
        };

        if (accountSide === 'groom') {
          updatedGroom.push(newAccount);
        } else {
          updatedBride.push(newAccount);
        }
      }

      await WeddingDataService.updateInvitationConfig({
        groomAccounts: updatedGroom,
        brideAccounts: updatedBride,
      });

      setGroomAccounts(updatedGroom);
      setBrideAccounts(updatedBride);
      setShowAccountModal(false);
      bgmPlayer.playChime();
      onShowToast(accountEditTarget ? '계좌번호가 수정되었습니다! 💳' : '새 계좌번호가 추가되었습니다! 💳');
    } catch {
      onShowToast('계좌번호 저장에 실패했습니다.');
    } finally {
      setIsSavingAccount(false);
    }
  };

  // Delete Bank Account
  const handleConfirmDeleteAccount = async () => {
    if (!accountToDelete) return;
    try {
      let updatedGroom = groomAccounts;
      let updatedBride = brideAccounts;

      if (accountToDelete.side === 'groom') {
        updatedGroom = groomAccounts.filter((a) => a.id !== accountToDelete.id);
      } else {
        updatedBride = brideAccounts.filter((a) => a.id !== accountToDelete.id);
      }

      await WeddingDataService.updateInvitationConfig({
        groomAccounts: updatedGroom,
        brideAccounts: updatedBride,
      });

      setGroomAccounts(updatedGroom);
      setBrideAccounts(updatedBride);
      setAccountToDelete(null);
      bgmPlayer.playChime();
      onShowToast('계좌번호가 삭제되었습니다. 🗑️');
    } catch {
      onShowToast('계좌번호 삭제에 실패했습니다.');
    }
  };

  // Calculate live D-Day
  const weddingDate = new Date(config.ceremony.date);
  const today = new Date();
  const diffTime = weddingDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const dDayText = diffDays > 0 ? `D-${diffDays}` : diffDays === 0 ? 'D-Day 오늘!' : `D+${Math.abs(diffDays)}`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      onShowToast(`${label} 복사되었습니다! 📋`);
    }).catch(() => {
      onShowToast(`${label} 복사되었습니다!`);
    });
  };

  const BANK_OPTIONS = [
    '국민은행', '신한은행', '우리은행', '하나은행', '농협은행',
    '카카오뱅크', '토스뱅크', '기업은행', 'SC제일은행', '우체국',
    '새마을금고', '신협', '수협', 'iM뱅크(대구)', '부산은행', '경남은행', '광주은행'
  ];

  return (
    <div className="w-full space-y-3.5">
      {/* Admin Mode Quick Edit Buttons (Rendered ONLY when isAdmin is true) */}
      {isAdmin && (
        <div className="bg-[#FFF9DB] border-2 border-[#3B2F2F] p-2.5 rounded-lg shadow-[3px_3px_0_#3B2F2F] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-pixel font-bold text-[#856404]">
            <Edit className="w-4 h-4 text-[#D9480F]" />
            <span>초대장 & 연락처 & 계좌 관리</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleOpenContactEdit}
              className="retro-btn bg-white hover:bg-[#FAF7F0] text-[#3B2F2F] px-2 py-1 text-[11px] font-pixel flex items-center gap-1 cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5 text-[#2E8BFF]" />
              <span>연락처 편집</span>
            </button>
            <button
              onClick={handleOpenEdit}
              className="retro-btn bg-[#2E8BFF] text-white px-2 py-1 text-[11px] font-pixel flex items-center gap-1 cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>예식 정보 편집</span>
            </button>
          </div>
        </div>
      )}

      {/* 📖 초대장 Card */}
      <div className="retro-box p-4 bg-white space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-dashed border-[#dcd1be] pb-2">
          <h2 className="font-pixel text-base font-bold text-[#2E8BFF] flex items-center gap-1.5">
            <span>📖</span>
            <span>초대장</span>
          </h2>
          <span className="font-pixel text-xs bg-[#2E8BFF] text-white px-2 py-0.5 rounded shadow-[1px_1px_0_#3B2F2F]">
            {dDayText}
          </span>
        </div>

        {/* Invitation Prose */}
        <div className="text-xs sm:text-[13px] leading-relaxed text-[#4A3B32] font-body">
          {isExpanded ? (
            <div className="space-y-2 whitespace-pre-line animate-fadeIn">
              <p>{config.invitation.greetingFull}</p>
              <div className="pt-2 text-center text-[#2E8BFF] font-pixel text-xs">
                {config.invitation.quote}
              </div>
            </div>
          ) : (
            <p className="line-clamp-3">
              {config.invitation.greetingShort}
            </p>
          )}

          <div className="text-right pt-1.5">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[#2E8BFF] hover:text-[#1c68cc] font-pixel text-xs inline-flex items-center gap-0.5 cursor-pointer py-1"
            >
              <span>{isExpanded ? '접기' : '더 읽기'}</span>
              <span>{isExpanded ? '‹' : '›'}</span>
            </button>
          </div>
        </div>

        {/* Parents and Couple Relationship Lines */}
        <div className="bg-[#FAF7F0] border-2 border-[#3B2F2F] rounded p-3 text-center space-y-1.5 text-xs font-pixel shadow-[2px_2px_0_#3B2F2F]">
          <div className="flex items-center justify-center gap-2 text-[#3B2F2F]">
            <span className="font-bold">{config.groom.fatherName}</span>
            <span>·</span>
            <span className="font-bold">{config.groom.motherName}</span>
            <span className="text-[#888888] text-[11px]">의 장남</span>
            <span className="font-bold text-[#2E8BFF] text-sm">{config.groom.name}</span>
          </div>

          <div className="flex items-center justify-center gap-2 text-[#3B2F2F]">
            <span className="font-bold">{config.bride.fatherName}</span>
            <span>·</span>
            <span className="font-bold">{config.bride.motherName}</span>
            <span className="text-[#888888] text-[11px]">의 장녀</span>
            <span className="font-bold text-[#F4A6B7] text-sm">{config.bride.name}</span>
          </div>
        </div>
      </div>

      {/* 📅 예식 일시 및 장소 안내 카드 */}
      <div className="retro-box p-4 bg-white space-y-3.5">
        <div className="flex items-center justify-between border-b-2 border-dashed border-[#dcd1be] pb-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#2E8BFF]" />
            <h3 className="font-pixel text-sm font-bold text-[#3B2F2F]">예식 안내</h3>
          </div>
          {isAdmin && (
            <button
              onClick={handleOpenEdit}
              className="text-[#2E8BFF] hover:underline font-pixel text-[11px] flex items-center gap-0.5 cursor-pointer"
            >
              <Edit className="w-3 h-3" />
              <span>수정</span>
            </button>
          )}
        </div>

        {/* Date & Time */}
        <div className="bg-[#FFFDF9] border border-[#3B2F2F] rounded p-2.5 flex items-start gap-2.5 shadow-[2px_2px_0_#3B2F2F]">
          <div className="w-8 h-8 rounded bg-[#2E8BFF] text-white flex flex-col items-center justify-center font-pixel shrink-0 text-[10px] leading-tight">
            <span>5월</span>
            <span className="text-xs font-bold">23</span>
          </div>
          <div className="space-y-0.5 text-xs">
            <div className="font-pixel font-bold text-[#3B2F2F] text-xs sm:text-sm">
              {config.ceremony.dateDisplay}
            </div>
            <div className="text-[#666666] font-body">
              토요일 낮 12시 30분
            </div>
          </div>
        </div>

        {/* Location & Hall */}
        <div className="bg-[#FFFDF9] border border-[#3B2F2F] rounded p-2.5 flex items-start gap-2.5 shadow-[2px_2px_0_#3B2F2F]">
          <div className="w-8 h-8 rounded bg-[#F4A6B7] text-[#3B2F2F] flex items-center justify-center font-pixel shrink-0">
            <MapPin className="w-4 h-4 text-[#3B2F2F]" />
          </div>
          <div className="space-y-0.5 text-xs flex-1">
            <div className="font-pixel font-bold text-[#3B2F2F] text-xs sm:text-sm flex items-center justify-between">
              <span>{config.ceremony.venueName}</span>
              <span className="text-[11px] font-normal text-[#2E8BFF] bg-[#EBF4FF] px-1.5 py-0.2 rounded border border-[#2E8BFF]">
                {config.ceremony.hallName}
              </span>
            </div>
            <div className="text-[#555555] font-body text-[11px] leading-snug">
              {config.ceremony.address} ({config.ceremony.detailAddress})
            </div>
          </div>
        </div>

        {/* Map Links & Copy Address */}
        <div className="space-y-2 pt-1">
          <div className="grid grid-cols-3 gap-1.5 text-xs font-pixel">
            <a
              href={config.ceremony.mapUrls.naver}
              target="_blank"
              rel="noreferrer"
              className="retro-btn bg-[#03C75A] text-white py-2 px-1 text-center flex items-center justify-center gap-1 hover:brightness-105"
            >
              <span>네이버 지도</span>
            </a>
            <a
              href={config.ceremony.mapUrls.kakao}
              target="_blank"
              rel="noreferrer"
              className="retro-btn bg-[#FEE500] text-[#191919] py-2 px-1 text-center flex items-center justify-center gap-1 hover:brightness-95"
            >
              <span>카카오맵</span>
            </a>
            <a
              href={config.ceremony.mapUrls.tmap}
              target="_blank"
              rel="noreferrer"
              className="retro-btn bg-[#2F3438] text-white py-2 px-1 text-center flex items-center justify-center gap-1 hover:brightness-110"
            >
              <span>티맵 안내</span>
            </a>
          </div>

          <button
            onClick={() => copyToClipboard(config.ceremony.address, '웨딩홀 주소가')}
            className="w-full retro-btn bg-[#FAF7F0] hover:bg-[#F2ECE0] text-[#3B2F2F] py-2 px-3 text-xs font-pixel flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-[#2E8BFF]" />
            <span>웨딩홀 주소 복사하기</span>
          </button>
        </div>

        {/* Transportation Guide */}
        <div className="bg-[#FAF7F0] border border-[#3B2F2F] rounded p-2.5 text-xs space-y-2">
          <div className="flex items-start gap-2">
            <Train className="w-3.5 h-3.5 text-[#2E8BFF] shrink-0 mt-0.5" />
            <div className="font-body text-[11px] text-[#444444]">
              <strong className="font-pixel text-[#3B2F2F]">지하철:</strong> {config.ceremony.subwayGuide}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Car className="w-3.5 h-3.5 text-[#E03131] shrink-0 mt-0.5" />
            <div className="font-body text-[11px] text-[#444444]">
              <strong className="font-pixel text-[#3B2F2F]">주차 안내:</strong> {config.ceremony.parkingGuide}
            </div>
          </div>
        </div>
      </div>

      {/* 📞 축하 연락처 */}
      <div className="retro-box p-4 bg-white space-y-3">
        <div className="flex items-center justify-between border-b-2 border-dashed border-[#dcd1be] pb-2">
          <div className="flex items-center gap-1.5">
            <Phone className="w-4 h-4 text-[#2E8BFF]" />
            <h3 className="font-pixel text-sm font-bold text-[#3B2F2F]">축하 연락처</h3>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={handleOpenContactEdit}
                className="text-[11px] font-pixel text-[#D9480F] bg-[#FFF3BF] border border-[#D9480F] px-1.5 py-0.5 rounded flex items-center gap-0.5 hover:bg-[#FFE066] cursor-pointer"
              >
                <Edit className="w-3 h-3" />
                <span>연락처 편집</span>
              </button>
            )}
            <button
              onClick={() => setShowParentsModal(true)}
              className="text-[11px] font-pixel text-[#2E8BFF] hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>혼주 연락처 보기</span>
              <span>›</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-pixel">
          <div className="bg-[#FFFDF9] border-2 border-[#3B2F2F] rounded p-2.5 flex flex-col items-center justify-center gap-1.5 shadow-[2px_2px_0_#3B2F2F]">
            <div className="flex items-center gap-1">
              <span className="text-xs">🤵</span>
              <span className="font-bold text-[#3B2F2F]">신랑 {config.groom.name}</span>
            </div>
            <div className="flex items-center gap-1.5 w-full">
              <a
                href={`tel:${config.groom.phone}`}
                className="flex-1 retro-btn bg-[#2E8BFF] text-white py-1.5 flex items-center justify-center gap-1 cursor-pointer"
              >
                <Phone className="w-3 h-3" />
                <span className="text-[10px]">전화</span>
              </a>
              <a
                href={`sms:${config.groom.phone}`}
                className="flex-1 retro-btn bg-white text-[#3B2F2F] py-1.5 flex items-center justify-center gap-1 cursor-pointer"
              >
                <MessageSquare className="w-3 h-3 text-[#2E8BFF]" />
                <span className="text-[10px]">문자</span>
              </a>
            </div>
          </div>

          <div className="bg-[#FFFDF9] border-2 border-[#3B2F2F] rounded p-2.5 flex flex-col items-center justify-center gap-1.5 shadow-[2px_2px_0_#3B2F2F]">
            <div className="flex items-center gap-1">
              <span className="text-xs">👰</span>
              <span className="font-bold text-[#3B2F2F]">신부 {config.bride.name}</span>
            </div>
            <div className="flex items-center gap-1.5 w-full">
              <a
                href={`tel:${config.bride.phone}`}
                className="flex-1 retro-btn bg-[#F4A6B7] text-[#3B2F2F] py-1.5 flex items-center justify-center gap-1 cursor-pointer"
              >
                <Phone className="w-3 h-3" />
                <span className="text-[10px]">전화</span>
              </a>
              <a
                href={`sms:${config.bride.phone}`}
                className="flex-1 retro-btn bg-white text-[#3B2F2F] py-1.5 flex items-center justify-center gap-1 cursor-pointer"
              >
                <MessageSquare className="w-3 h-3 text-[#F4A6B7]" />
                <span className="text-[10px]">문자</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 💌 마음 전하실 곳 (계좌번호 목록 및 관리자 추가/편집/삭제) */}
      <div className="retro-box p-4 bg-white space-y-3">
        <div className="flex items-center justify-between border-b-2 border-dashed border-[#dcd1be] pb-2">
          <div className="flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-[#2E8BFF]" />
            <h3 className="font-pixel text-sm font-bold text-[#3B2F2F]">마음 전하실 곳</h3>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleOpenAddAccount('groom')}
                className="retro-btn bg-[#EBF4FF] text-[#2E8BFF] px-1.5 py-0.5 text-[10px] font-pixel flex items-center gap-0.5 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>신랑측 계좌추가</span>
              </button>
              <button
                onClick={() => handleOpenAddAccount('bride')}
                className="retro-btn bg-[#FFF0F4] text-[#D9480F] px-1.5 py-0.5 text-[10px] font-pixel flex items-center gap-0.5 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>신부측 계좌추가</span>
              </button>
            </div>
          )}
        </div>

        <p className="font-body text-[11px] text-[#666666] leading-relaxed">
          참석이 어려우신 분들을 위해 계좌번호를 기재하였습니다. 따뜻한 축하의 마음에 감사드립니다.
        </p>

        {/* Groom Accounts Accordion */}
        <div className="border-2 border-[#3B2F2F] rounded-md overflow-hidden bg-[#FFFDF9] shadow-[2px_2px_0_#3B2F2F]">
          <button
            onClick={() => setOpenGroomAccount(!openGroomAccount)}
            className="w-full px-3 py-2.5 flex items-center justify-between text-xs font-pixel bg-[#EBF4FF] text-[#3B2F2F] cursor-pointer"
          >
            <span className="font-bold flex items-center gap-1.5">
              <span>🤵</span>
              <span>신랑측 계좌번호 ({groomAccounts.length}개)</span>
            </span>
            {openGroomAccount ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {openGroomAccount && (
            <div className="p-3 space-y-2 border-t border-[#3B2F2F] text-xs font-pixel divide-y divide-dashed divide-[#dcd1be]">
              {groomAccounts.length === 0 ? (
                <div className="py-2 text-center text-[#888888] text-[11px]">등록된 계좌가 없습니다.</div>
              ) : (
                groomAccounts.map((acc) => (
                  <div key={acc.id} className="pt-2 first:pt-0 flex items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-[#2E8BFF] text-white text-[10px] px-1.5 py-0.2 rounded font-pixel">
                          {acc.relation}
                        </span>
                        <span className="font-bold text-[#3B2F2F]">
                          {acc.bank} {acc.accountNumber}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#666666]">
                        예금주: <strong className="text-[#3B2F2F]">{acc.holder}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => copyToClipboard(acc.accountNumber, `${acc.relation} 계좌번호가`)}
                        className="retro-btn bg-white hover:bg-[#FAF7F0] px-2 py-1 text-[11px] flex items-center gap-1 cursor-pointer"
                        title="계좌번호 복사"
                      >
                        <Copy className="w-3 h-3 text-[#2E8BFF]" />
                        <span>복사</span>
                      </button>

                      {/* Admin inline edit & delete for this account */}
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => handleOpenEditAccount(acc)}
                            className="retro-btn bg-[#FFF3BF] text-[#D9480F] px-1.5 py-1 text-[11px] cursor-pointer"
                            title="계좌 수정"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setAccountToDelete(acc)}
                            className="retro-btn bg-[#FFF0F0] text-[#E03131] px-1.5 py-1 text-[11px] cursor-pointer"
                            title="계좌 삭제"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}

              {/* Admin Button inside Accordion */}
              {isAdmin && (
                <div className="pt-2 text-center">
                  <button
                    onClick={() => handleOpenAddAccount('groom')}
                    className="w-full retro-btn bg-white hover:bg-[#FAF7F0] text-[#2E8BFF] py-1.5 text-xs font-pixel flex items-center justify-center gap-1 cursor-pointer border border-dashed border-[#2E8BFF]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ 신랑측 새 계좌번호 추가하기</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bride Accounts Accordion */}
        <div className="border-2 border-[#3B2F2F] rounded-md overflow-hidden bg-[#FFFDF9] shadow-[2px_2px_0_#3B2F2F]">
          <button
            onClick={() => setOpenBrideAccount(!openBrideAccount)}
            className="w-full px-3 py-2.5 flex items-center justify-between text-xs font-pixel bg-[#FFF0F4] text-[#3B2F2F] cursor-pointer"
          >
            <span className="font-bold flex items-center gap-1.5">
              <span>👰</span>
              <span>신부측 계좌번호 ({brideAccounts.length}개)</span>
            </span>
            {openBrideAccount ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {openBrideAccount && (
            <div className="p-3 space-y-2 border-t border-[#3B2F2F] text-xs font-pixel divide-y divide-dashed divide-[#dcd1be]">
              {brideAccounts.length === 0 ? (
                <div className="py-2 text-center text-[#888888] text-[11px]">등록된 계좌가 없습니다.</div>
              ) : (
                brideAccounts.map((acc) => (
                  <div key={acc.id} className="pt-2 first:pt-0 flex items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-[#F4A6B7] text-[#3B2F2F] text-[10px] px-1.5 py-0.2 rounded font-pixel">
                          {acc.relation}
                        </span>
                        <span className="font-bold text-[#3B2F2F]">
                          {acc.bank} {acc.accountNumber}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#666666]">
                        예금주: <strong className="text-[#3B2F2F]">{acc.holder}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => copyToClipboard(acc.accountNumber, `${acc.relation} 계좌번호가`)}
                        className="retro-btn bg-white hover:bg-[#FAF7F0] px-2 py-1 text-[11px] flex items-center gap-1 cursor-pointer"
                        title="계좌번호 복사"
                      >
                        <Copy className="w-3 h-3 text-[#F4A6B7]" />
                        <span>복사</span>
                      </button>

                      {/* Admin inline edit & delete for this account */}
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => handleOpenEditAccount(acc)}
                            className="retro-btn bg-[#FFF3BF] text-[#D9480F] px-1.5 py-1 text-[11px] cursor-pointer"
                            title="계좌 수정"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setAccountToDelete(acc)}
                            className="retro-btn bg-[#FFF0F0] text-[#E03131] px-1.5 py-1 text-[11px] cursor-pointer"
                            title="계좌 삭제"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}

              {/* Admin Button inside Accordion */}
              {isAdmin && (
                <div className="pt-2 text-center">
                  <button
                    onClick={() => handleOpenAddAccount('bride')}
                    className="w-full retro-btn bg-white hover:bg-[#FAF7F0] text-[#D9480F] py-1.5 text-xs font-pixel flex items-center justify-center gap-1 cursor-pointer border border-dashed border-[#F4A6B7]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ 신부측 새 계좌번호 추가하기</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Secret Admin 5-Tap Seal at Bottom */}
      <div className="pt-1 text-center">
        <button
          onClick={handleSecretTap}
          type="button"
          className="text-xs text-[#b8ab97] hover:text-[#3B2F2F] inline-flex items-center gap-1 font-pixel select-none cursor-pointer p-1 transition-opacity opacity-70 hover:opacity-100"
          title="Cyworld Wedding Seal"
        >
          <span>💍</span>
          <span className="text-[10px]">CYWORLD WEDDING SEAL</span>
          {secretTaps > 1 && <span className="text-[9px] text-[#2E8BFF]">({secretTaps}/5)</span>}
        </button>
      </div>

      {/* ========================================================
          ADMIN MODALS (Rendered ONLY when isAdmin is true)
      ======================================================== */}

      {/* 1. Contacts Edit Modal */}
      {showContactModal && isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
          <div className="retro-box bg-white max-w-sm w-full p-4 space-y-3 shadow-[6px_6px_0_#2E8BFF] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b-2 border-[#3B2F2F] pb-2">
              <div className="flex items-center gap-1.5 font-pixel text-xs font-bold text-[#2E8BFF]">
                <Phone className="w-4 h-4" />
                <span>축하 연락처 편집 (관리자)</span>
              </div>
              <button
                onClick={() => setShowContactModal(false)}
                className="text-[#888888] font-bold p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveContacts} className="space-y-3 text-xs font-pixel">
              {/* Groom Contacts Section */}
              <div className="bg-[#EBF4FF] p-2.5 rounded border border-[#2E8BFF] space-y-2">
                <div className="text-[#2E8BFF] font-bold flex items-center gap-1">
                  <span>🤵</span>
                  <span>신랑측 연락처</span>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="text-[10px] text-[#666666] block">신랑 성함</label>
                    <input
                      type="text"
                      value={contactGroomName}
                      onChange={(e) => setContactGroomName(e.target.value)}
                      className="w-full px-2 py-1 border border-[#3B2F2F] rounded bg-white text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#666666] block">신랑 전화번호</label>
                    <input
                      type="text"
                      value={contactGroomPhone}
                      onChange={(e) => setContactGroomPhone(e.target.value)}
                      className="w-full px-2 py-1 border border-[#3B2F2F] rounded bg-white text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 border-t border-dashed border-[#b6d4fe] pt-1.5">
                  <div>
                    <label className="text-[10px] text-[#666666] block">아버지 성함</label>
                    <input
                      type="text"
                      value={contactGroomFatherName}
                      onChange={(e) => setContactGroomFatherName(e.target.value)}
                      className="w-full px-2 py-1 border border-[#3B2F2F] rounded bg-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#666666] block">아버지 전화번호</label>
                    <input
                      type="text"
                      value={contactGroomFatherPhone}
                      onChange={(e) => setContactGroomFatherPhone(e.target.value)}
                      className="w-full px-2 py-1 border border-[#3B2F2F] rounded bg-white text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 border-t border-dashed border-[#b6d4fe] pt-1.5">
                  <div>
                    <label className="text-[10px] text-[#666666] block">어머니 성함</label>
                    <input
                      type="text"
                      value={contactGroomMotherName}
                      onChange={(e) => setContactGroomMotherName(e.target.value)}
                      className="w-full px-2 py-1 border border-[#3B2F2F] rounded bg-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#666666] block">어머니 전화번호</label>
                    <input
                      type="text"
                      value={contactGroomMotherPhone}
                      onChange={(e) => setContactGroomMotherPhone(e.target.value)}
                      className="w-full px-2 py-1 border border-[#3B2F2F] rounded bg-white text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Bride Contacts Section */}
              <div className="bg-[#FFF0F4] p-2.5 rounded border border-[#F4A6B7] space-y-2">
                <div className="text-[#D9480F] font-bold flex items-center gap-1">
                  <span>👰</span>
                  <span>신부측 연락처</span>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="text-[10px] text-[#666666] block">신부 성함</label>
                    <input
                      type="text"
                      value={contactBrideName}
                      onChange={(e) => setContactBrideName(e.target.value)}
                      className="w-full px-2 py-1 border border-[#3B2F2F] rounded bg-white text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#666666] block">신부 전화번호</label>
                    <input
                      type="text"
                      value={contactBridePhone}
                      onChange={(e) => setContactBridePhone(e.target.value)}
                      className="w-full px-2 py-1 border border-[#3B2F2F] rounded bg-white text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 border-t border-dashed border-[#fed2dc] pt-1.5">
                  <div>
                    <label className="text-[10px] text-[#666666] block">아버지 성함</label>
                    <input
                      type="text"
                      value={contactBrideFatherName}
                      onChange={(e) => setContactBrideFatherName(e.target.value)}
                      className="w-full px-2 py-1 border border-[#3B2F2F] rounded bg-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#666666] block">아버지 전화번호</label>
                    <input
                      type="text"
                      value={contactBrideFatherPhone}
                      onChange={(e) => setContactBrideFatherPhone(e.target.value)}
                      className="w-full px-2 py-1 border border-[#3B2F2F] rounded bg-white text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 border-t border-dashed border-[#fed2dc] pt-1.5">
                  <div>
                    <label className="text-[10px] text-[#666666] block">어머니 성함</label>
                    <input
                      type="text"
                      value={contactBrideMotherName}
                      onChange={(e) => setContactBrideMotherName(e.target.value)}
                      className="w-full px-2 py-1 border border-[#3B2F2F] rounded bg-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#666666] block">어머니 전화번호</label>
                    <input
                      type="text"
                      value={contactBrideMotherPhone}
                      onChange={(e) => setContactBrideMotherPhone(e.target.value)}
                      className="w-full px-2 py-1 border border-[#3B2F2F] rounded bg-white text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowContactModal(false)}
                  className="retro-btn flex-1 bg-white hover:bg-[#FAF7F0] text-[#3B2F2F] py-2 cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSavingContacts}
                  className="retro-btn-blue flex-2 py-2 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingContacts ? '저장 중...' : '연락처 저장하기'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Bank Account Add / Edit Modal */}
      {showAccountModal && isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
          <div className="retro-box bg-white max-w-sm w-full p-4 space-y-3 shadow-[6px_6px_0_#2E8BFF]">
            <div className="flex items-center justify-between border-b-2 border-[#3B2F2F] pb-2">
              <div className="flex items-center gap-1.5 font-pixel text-xs font-bold text-[#2E8BFF]">
                <CreditCard className="w-4 h-4" />
                <span>{accountEditTarget ? '계좌번호 수정' : '새 계좌번호 추가'}</span>
              </div>
              <button
                onClick={() => setShowAccountModal(false)}
                className="text-[#888888] font-bold p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-2.5 text-xs font-pixel">
              {/* Side Selector */}
              <div>
                <label className="text-[11px] text-[#3B2F2F] block mb-1">측 구분 *</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setAccountSide('groom');
                      if (accountRelation === '신부') setAccountRelation('신랑');
                    }}
                    className={`retro-btn py-1.5 text-xs font-pixel cursor-pointer ${
                      accountSide === 'groom'
                        ? 'bg-[#2E8BFF] text-white shadow-[2px_2px_0_#3B2F2F]'
                        : 'bg-white text-[#3B2F2F]'
                    }`}
                  >
                    🤵 신랑측
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAccountSide('bride');
                      if (accountRelation === '신랑') setAccountRelation('신부');
                    }}
                    className={`retro-btn py-1.5 text-xs font-pixel cursor-pointer ${
                      accountSide === 'bride'
                        ? 'bg-[#F4A6B7] text-[#3B2F2F] shadow-[2px_2px_0_#3B2F2F]'
                        : 'bg-white text-[#3B2F2F]'
                    }`}
                  >
                    👰 신부측
                  </button>
                </div>
              </div>

              {/* Relation / Tag */}
              <div>
                <label className="text-[11px] text-[#3B2F2F] block mb-1">구분/관계 *</label>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {(accountSide === 'groom'
                    ? ['신랑', '신랑 아버지', '신랑 어머니']
                    : ['신부', '신부 아버지', '신부 어머니']
                  ).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setAccountRelation(preset);
                        if (preset.includes('아버지')) {
                          setAccountHolder(accountSide === 'groom' ? config.groom.fatherName : config.bride.fatherName);
                        } else if (preset.includes('어머니')) {
                          setAccountHolder(accountSide === 'groom' ? config.groom.motherName : config.bride.motherName);
                        } else {
                          setAccountHolder(accountSide === 'groom' ? config.groom.name : config.bride.name);
                        }
                      }}
                      className={`text-[10px] px-1.5 py-0.5 border rounded cursor-pointer ${
                        accountRelation === preset
                          ? 'bg-[#3B2F2F] text-white border-[#3B2F2F]'
                          : 'bg-[#FAF7F0] text-[#666666] border-[#d8cdb8]'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={accountRelation}
                  onChange={(e) => setAccountRelation(e.target.value)}
                  placeholder="예: 신랑, 신랑 아버지, 신랑 동생"
                  className="w-full px-2 py-1.5 border border-[#3B2F2F] rounded bg-[#FFFDF9]"
                  required
                />
              </div>

              {/* Bank Selection */}
              <div>
                <label className="text-[11px] text-[#3B2F2F] block mb-1">은행명 *</label>
                <select
                  value={accountBank}
                  onChange={(e) => setAccountBank(e.target.value)}
                  className="w-full px-2 py-1.5 border border-[#3B2F2F] rounded bg-white text-xs font-pixel mb-1"
                >
                  {BANK_OPTIONS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={accountBank}
                  onChange={(e) => setAccountBank(e.target.value)}
                  placeholder="직접 은행명 입력 가능"
                  className="w-full px-2 py-1 border border-[#d8cdb8] rounded bg-[#FFFDF9] text-[11px]"
                />
              </div>

              {/* Account Number */}
              <div>
                <label className="text-[11px] text-[#3B2F2F] block mb-1">계좌번호 *</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="'-' 포함 또는 숫자만 입력"
                  className="w-full px-2 py-1.5 border border-[#3B2F2F] rounded bg-[#FFFDF9]"
                  required
                />
              </div>

              {/* Account Holder */}
              <div>
                <label className="text-[11px] text-[#3B2F2F] block mb-1">예금주 *</label>
                <input
                  type="text"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  placeholder="예금주 성함"
                  className="w-full px-2 py-1.5 border border-[#3B2F2F] rounded bg-[#FFFDF9]"
                  required
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="retro-btn flex-1 bg-white hover:bg-[#FAF7F0] text-[#3B2F2F] py-2 cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSavingAccount}
                  className="retro-btn-blue flex-2 py-2 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingAccount ? '저장 중...' : '계좌 저장하기'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Delete Account Confirmation Modal */}
      {accountToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="retro-box bg-white max-w-xs w-full p-4 space-y-3 text-center shadow-[6px_6px_0_#3B2F2F]">
            <div className="text-3xl">🗑️</div>
            <h4 className="font-pixel text-sm font-bold text-[#3B2F2F]">계좌를 삭제할까요?</h4>
            <p className="text-xs font-body text-[#666666]">
              [{accountToDelete.relation}] {accountToDelete.bank} {accountToDelete.accountNumber} ({accountToDelete.holder})
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setAccountToDelete(null)}
                className="retro-btn flex-1 bg-gray-200 py-2 text-xs font-pixel cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={handleConfirmDeleteAccount}
                className="retro-btn flex-1 bg-[#E03131] text-white py-2 text-xs font-pixel cursor-pointer"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. General Ceremony / Greeting Edit Modal */}
      {showEditModal && isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
          <div className="retro-box bg-white max-w-sm w-full p-4 space-y-3 shadow-[6px_6px_0_#D9480F] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b-2 border-[#3B2F2F] pb-2">
              <div className="flex items-center gap-1.5 font-pixel text-xs font-bold text-[#D9480F]">
                <Edit className="w-4 h-4" />
                <span>예식 및 초대장 정보 편집</span>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-[#888888] font-bold p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-2.5 text-xs font-pixel">
              <div className="space-y-1">
                <label className="text-[11px] text-[#3B2F2F]">예식 일시 문구</label>
                <input
                  type="text"
                  value={editDateDisplay}
                  onChange={(e) => setEditDateDisplay(e.target.value)}
                  className="w-full px-2 py-1.5 border border-[#3B2F2F] rounded bg-[#FFFDF9]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#3B2F2F]">예식장명</label>
                  <input
                    type="text"
                    value={editVenue}
                    onChange={(e) => setEditVenue(e.target.value)}
                    className="w-full px-2 py-1.5 border border-[#3B2F2F] rounded bg-[#FFFDF9]"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#3B2F2F]">홀 이름</label>
                  <input
                    type="text"
                    value={editHall}
                    onChange={(e) => setEditHall(e.target.value)}
                    className="w-full px-2 py-1.5 border border-[#3B2F2F] rounded bg-[#FFFDF9]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#3B2F2F]">예식장 주소</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-2 py-1.5 border border-[#3B2F2F] rounded bg-[#FFFDF9]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#3B2F2F]">초대 문구 전문</label>
                <textarea
                  value={editGreeting}
                  onChange={(e) => setEditGreeting(e.target.value)}
                  rows={4}
                  className="w-full font-body text-xs p-2 border border-[#3B2F2F] rounded bg-[#FFFDF9] outline-none resize-none leading-relaxed"
                  required
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="retro-btn flex-1 bg-white hover:bg-[#FAF7F0] text-[#3B2F2F] py-2"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="retro-btn-blue flex-2 py-2 flex items-center justify-center gap-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? '저장 중...' : 'Firestore에 저장'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Parents Modal */}
      {showParentsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="retro-box bg-white max-w-sm w-full p-4 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between border-b-2 border-[#3B2F2F] pb-2">
              <h4 className="font-pixel text-sm font-bold flex items-center gap-1.5 text-[#3B2F2F]">
                <Users className="w-4 h-4 text-[#2E8BFF]" />
                <span>혼주 연락처 안내</span>
              </h4>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button
                    onClick={() => {
                      setShowParentsModal(false);
                      handleOpenContactEdit();
                    }}
                    className="text-[#D9480F] bg-[#FFF3BF] border border-[#D9480F] px-1.5 py-0.5 rounded font-pixel text-[10px] flex items-center gap-0.5 cursor-pointer"
                  >
                    <Edit className="w-3 h-3" />
                    <span>편집</span>
                  </button>
                )}
                <button
                  onClick={() => setShowParentsModal(false)}
                  className="font-pixel text-sm text-[#888888] hover:text-[#3B2F2F] px-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-3 text-xs font-pixel">
              <div className="bg-[#FAF7F0] p-2.5 rounded border border-[#3B2F2F] space-y-2">
                <div className="text-[#2E8BFF] font-bold">신랑측 혼주</div>
                <div className="flex items-center justify-between">
                  <span>아버지 {config.groom.fatherName}</span>
                  <div className="flex gap-1">
                    <a href={`tel:${config.groom.fatherPhone}`} className="retro-btn bg-white px-2 py-1 text-[10px]">전화</a>
                    <a href={`sms:${config.groom.fatherPhone}`} className="retro-btn bg-white px-2 py-1 text-[10px]">문자</a>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>어머니 {config.groom.motherName}</span>
                  <div className="flex gap-1">
                    <a href={`tel:${config.groom.motherPhone}`} className="retro-btn bg-white px-2 py-1 text-[10px]">전화</a>
                    <a href={`sms:${config.groom.motherPhone}`} className="retro-btn bg-white px-2 py-1 text-[10px]">문자</a>
                  </div>
                </div>
              </div>

              <div className="bg-[#FFF0F4] p-2.5 rounded border border-[#3B2F2F] space-y-2">
                <div className="text-[#F4A6B7] font-bold">신부측 혼주</div>
                <div className="flex items-center justify-between">
                  <span>아버지 {config.bride.fatherName}</span>
                  <div className="flex gap-1">
                    <a href={`tel:${config.bride.fatherPhone}`} className="retro-btn bg-white px-2 py-1 text-[10px]">전화</a>
                    <a href={`sms:${config.bride.fatherPhone}`} className="retro-btn bg-white px-2 py-1 text-[10px]">문자</a>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>어머니 {config.bride.motherName}</span>
                  <div className="flex gap-1">
                    <a href={`tel:${config.bride.motherPhone}`} className="retro-btn bg-white px-2 py-1 text-[10px]">전화</a>
                    <a href={`sms:${config.bride.motherPhone}`} className="retro-btn bg-white px-2 py-1 text-[10px]">문자</a>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowParentsModal(false)}
              className="w-full retro-btn bg-[#3B2F2F] text-white py-2 text-xs font-pixel cursor-pointer mt-2"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
