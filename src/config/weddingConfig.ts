/**
 * Central Wedding Configuration File
 * Easily modify couple information, wedding date, venue, bank accounts, and albums here.
 */

export interface DiaryItem {
  id: string;
  date: string;
  year: string;
  title: string;
  shortSummary: string;
  fullStory: string;
  mood: string;
  moodEmoji: string;
  image?: string;
  weather?: string;
  order?: number;
}

export interface PhotoItem {
  id: string;
  folderId: string;
  title: string;
  date: string;
  location: string;
  imageUrl: string;
  caption: string;
}

export interface PhotoFolder {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface IlchonItem {
  id: string;
  name: string;
  relationship: string;
  ilchonName: string;
  message: string;
  emoji: string;
  side: 'groom' | 'bride' | 'both';
}

export const ADMIN_EMAILS = [
  'phonick705@gmail.com',
  'admin@wedding.com',
];

export const WEDDING_CONFIG = {
  // Couple Information
  groom: {
    name: '김재현',
    phone: '010-1234-5678',
    fatherName: '김정호',
    fatherPhone: '010-3333-5678',
    motherName: '박선미',
    motherPhone: '010-4444-5678',
    account: {
      bank: '국민은행',
      accountNumber: '921602-01-234567',
      holder: '김재현',
    },
    fatherAccount: {
      bank: '신한은행',
      accountNumber: '110-234-567890',
      holder: '김정호',
    },
    motherAccount: {
      bank: '농협은행',
      accountNumber: '302-1234-5678-91',
      holder: '박선미',
    },
  },
  bride: {
    name: '정하은',
    phone: '010-9876-5432',
    fatherName: '정진우',
    fatherPhone: '010-5555-9876',
    motherName: '최은경',
    motherPhone: '010-6666-9876',
    account: {
      bank: '카카오뱅크',
      accountNumber: '3333-04-1234567',
      holder: '정하은',
    },
    fatherAccount: {
      bank: '우리은행',
      accountNumber: '1002-345-678901',
      holder: '정진우',
    },
    motherAccount: {
      bank: '하나은행',
      accountNumber: '284-910234-56707',
      holder: '최은경',
    },
  },

  // Wedding Ceremony Details
  ceremony: {
    date: '2026-05-23T12:30:00',
    dateDisplay: '2026년 5월 23일 토요일 낮 12시 30분',
    dateShort: '2026.05.23 SAT 12:30 PM',
    venueName: '아펠가모 반포점',
    hallName: 'LL층 그랜드볼룸',
    address: '서울특별시 서초구 반포대로 235 (반포동 63-7)',
    detailAddress: '효성빌딩 LL층',
    tel: '02-3431-0230',
    parkingGuide: '건물 지하 주차장 2시간 무료 (안내데스크 주차 도장)',
    subwayGuide: '지하철 3, 7, 9호선 고속터미널역 5번 출구 도보 5분',
    busGuide: '서울성모병원 또는 고속터미널 하차 (간선 405, 740 / 지선 5413)',
    mapUrls: {
      naver: 'https://m.map.naver.com/search2/search.naver?query=아펠가모+반포',
      kakao: 'https://map.kakao.com/link/search/아펠가모+반포',
      tmap: 'https://tmap.life/nav/search?query=아펠가모+반포',
    },
    latitude: 37.5028,
    longitude: 127.0048,
  },

  // Cyworld Profile & Status
  miniroom: {
    todayWord: '우리 결혼합니다 💍',
    bgmTitle: '♬ 이루마 - Wedding March (Lo-Fi Ver.)',
    todayVisits: 482,
    totalVisits: 13820,
    relationStartDate: '2025-11-08',
  },

  // Invitation Message
  invitation: {
    title: '📖 초대장',
    greetingShort: '각자 서로 다른 길을 걸어온 저희가 이제 부부의 연으로 한 길을 걸어가고자 합니다. 항상 처음을 생각하며, 서로를 아끼고 배려하며 살겠습니다...',
    greetingFull: `각자 서로 다른 길을 걸어온 저희가
이제 부부의 연으로 한 길을 걸어가고자 합니다.

처음 눈이 마주쳤던 봄날의 설렘을 잊지 않고,
살아가며 마주할 모든 계절을
서로의 손을 꼭 잡고 지혜롭게 걸어가겠습니다.

바쁘시더라도 부디 오셔서
저희의 새로운 시작을 따뜻한 온기로
축복해 주시면 더없는 기쁨이 되겠습니다.`,
    quote: '“서로가 서로에게 가장 편안한 쉼터가 되어주겠습니다.”',
  },

  // Photo Album Folders
  photoFolders: [
    { id: 'folder-wedding', name: '웨딩 스튜디오', icon: '💍', description: '가장 찬란했던 우리들의 순간' },
    { id: 'folder-trip', name: '함께한 여행', icon: '✈️', description: '국내외 곳곳을 누비며 쌓은 추억' },
    { id: 'folder-daily', name: '우리의 첫 만남 & 일상', icon: '🌱', description: '2019년부터 지금까지의 소소한 날들' },
  ] as PhotoFolder[],

  // Photos (styled with cute polaroid aesthetic)
  photos: [
    {
      id: 'p-1',
      folderId: 'folder-wedding',
      title: '설레는 우리의 첫 컷',
      date: '2026.02.14',
      location: '성수 스튜디오',
      imageUrl: '/assets/aistudio/image_12f57ab4.png',
      caption: '미니홈피 감성 그대로, 우리 둘만의 웨딩 촬영!',
    },
    {
      id: 'p-2',
      folderId: 'folder-wedding',
      title: '꽃과 함께 눈부신 날',
      date: '2026.02.14',
      location: '가든 정원 세트',
      imageUrl: '/assets/aistudio/image_12f57ab4.png',
      caption: '화관 쓴 하은이의 미소가 너무 아름다웠던 순간.',
    },
    {
      id: 'p-3',
      folderId: 'folder-wedding',
      title: '베일 속의 약속',
      date: '2026.02.14',
      location: '성수 스튜디오',
      imageUrl: '/assets/aistudio/image_12f57ab4.png',
      caption: '평생 손잡고 웃으며 살자는 약속을 새기며.',
    },
    {
      id: 'p-4',
      folderId: 'folder-trip',
      title: '제주 비자림 산책길',
      date: '2021.07.03',
      location: '제주 구좌읍',
      imageUrl: '/assets/aistudio/image_12f57ab4.png',
      caption: '비 내린 숲길에서 들었던 상쾌한 풀내음과 너의 웃음소리.',
    },
    {
      id: 'p-5',
      folderId: 'folder-trip',
      title: '겨울 삿포로 눈꽃 여행',
      date: '2023.12.24',
      location: '오타루 운하',
      imageUrl: '/assets/aistudio/image_12f57ab4.png',
      caption: '추운 날씨에도 손난로 하나 나눠쥐고 마냥 행복했던 크리스마스.',
    },
    {
      id: 'p-6',
      folderId: 'folder-daily',
      title: '호두를 처음 만난 날',
      date: '2022.08.20',
      location: '우리들의 집',
      imageUrl: '/assets/aistudio/image_12f57ab4.png',
      caption: '세 번째 가족이 된 사랑스러운 강아지 호두!',
    },
    {
      id: 'p-7',
      folderId: 'folder-daily',
      title: '프러포즈 요트 위에서',
      date: '2025.05.17',
      location: '여의도 한강공원',
      imageUrl: '/assets/aistudio/image_12f57ab4.png',
      caption: '노을이 하늘을 붉게 물들일 때 건넸던 반지와 눈물.',
    },
  ] as PhotoItem[],

  // Love Story Diary Timeline
  diaryEntries: [
    {
      id: 'diary-1',
      date: '2025.11.08',
      year: '2025',
      title: '첫 만남, 설레는 우리의 시작 🌸',
      shortSummary: '가을바람 불던 날 어색하게 건넸던 첫 인사.',
      fullStory: '따스한 햇살이 내리쬐던 11월의 주말, 작은 카페에서 처음 만났습니다. 어색한 침묵 속에서도 눈이 마주칠 때마다 터져 나오던 웃음. 그날 헤어지며 나눈 "조심히 들어가세요"라는 인사가 평생을 함께할 인연의 시작이 되었습니다.',
      mood: '두근두근 설렘',
      moodEmoji: '🥰',
      weather: '선선한 가을날 🍂',
    },
    {
      id: 'diary-2',
      date: '2025.12.24',
      year: '2025',
      title: '함께 보낸 첫 크리스마스 🎄',
      shortSummary: '하얀 눈꽃과 따스했던 첫 겨울의 추억.',
      fullStory: '둘이서 맞이한 첫 성탄절! 추운 날씨에도 손난로 하나 나눠쥐고 명동 거리를 걸으며 마냥 행복했던 날. 서로의 온기를 나누며 이 사람과 평생 함께하고 싶다는 확신을 갖게 되었습니다.',
      mood: '짜릿한 행복',
      moodEmoji: '❄️',
      weather: '화이트 크리스마스 ☃️',
    },
    {
      id: 'diary-3',
      date: '2026.01.15',
      year: '2026',
      title: '우리 집 막내, 강아지 호두를 맞이한 날 🐶',
      shortSummary: '작은 발걸음으로 우리 마음에 쏙 들어온 호두.',
      fullStory: '보호소에서 눈이 계속 밟히던 강아지 호두를 정식 입양했습니다. 낯가림이 심했던 아이가 처음으로 우리 품에 얼굴을 파묻고 꼬리를 흔들던 날, 우리는 둘이 아닌 셋이 되었고 진짜 한 가족이 되었습니다.',
      mood: '포근한 감동',
      moodEmoji: '🐾',
      weather: '비 온 뒤 맑음 🌈',
    },
    {
      id: 'diary-4',
      date: '2026.03.14',
      year: '2026',
      title: '양가 부모님께 인사드리던 떨리는 날 💐',
      shortSummary: '정성스레 준비한 과일바구니와 따뜻했던 격려.',
      fullStory: '손에 땀을 쥐며 양가 부모님을 뵈러 갔던 날. "우리 아들 잘 부탁하네", "우리 예쁜 딸 손에 물 한 방울 안 묻히게 아껴줄 거지?"라며 꼭 쥐어주시던 부모님들의 손에서 깊은 사랑과 신뢰를 느낄 수 있었습니다.',
      mood: '감사와 든든함',
      moodEmoji: '🙏',
      weather: '온화한 봄 🌸',
    },
    {
      id: 'diary-5',
      date: '2026.04.10',
      year: '2026',
      title: '노을 지는 한강에서 받은 눈물의 프러포즈 💍',
      shortSummary: '“하은아, 남은 내 모든 생을 너와 함께하고 싶어.”',
      fullStory: '평범한 주말 데이트인 줄 알고 나갔던 한강 요트. 노을이 황금빛으로 번지는 순간, 재현이가 직접 준비한 영상과 함께 무릎을 꿇었습니다. 떨리는 손으로 건넨 다이아 반지와 진심 어린 편지에 펑펑 울며 고개를 끄덕였습니다.',
      mood: '평생의 감동',
      moodEmoji: '💍',
      weather: '붉은 노을 🌅',
    },
    {
      id: 'diary-6',
      date: '2026.05.23',
      year: '2026',
      title: '마침내 오늘, 영원한 짝꿍이 됩니다 💒',
      shortSummary: '사랑하는 모든 분들의 축복 속에서 새로운 발걸음을 내딛습니다.',
      fullStory: '함께 울고 웃으며 쌓아온 시간들이 오늘 하나의 가정을 이룹니다. 앞으로도 지금처럼 서로를 가장 먼저 생각하고, 매일 저녁 마주 앉아 밥을 먹으며 따뜻하게 안아주는 부부가 되겠습니다.',
      mood: '더없이 벅찬 기쁨',
      moodEmoji: '👰🤵',
      weather: '눈부시게 맑음 ☀️',
    },
  ] as DiaryItem[],

  // Ilchon (Besties & Family)
  ilchons: [
    {
      id: 'ilchon-1',
      name: '김민석',
      relationship: '신랑의 15년 지기 베프',
      ilchonName: '영원한 롤 듀오',
      message: '재현아 결혼 진짜 축하한다! 유부남 돼도 칼바람 주말 1판은 허락받고 와라 ㅋㅋㅋ 행복해라!',
      emoji: '🎮',
      side: 'groom',
    },
    {
      id: 'ilchon-2',
      name: '이지원',
      relationship: '신부의 소울메이트',
      ilchonName: '평생 먹방 메이트',
      message: '하은아 청첩장 받자마자 눈물 찔끔 흘림 ㅠㅠ 세상에서 가장 사랑스러운 우리 신부 행복만 가득하자!',
      emoji: '🍰',
      side: 'bride',
    },
    {
      id: 'ilchon-3',
      name: '김수진',
      relationship: '신랑 친누나',
      ilchonName: '동생 반품 불가',
      message: '재현아 이제 올케 말만 잘 들으면 평화가 온다! 올케, 우리 철부지 동생 사람 만들어줘서 고마워요 💕',
      emoji: '👑',
      side: 'groom',
    },
    {
      id: 'ilchon-4',
      name: '정도윤',
      relationship: '신부 남동생',
      ilchonName: '처남 1호',
      message: '매형 환영합니다! 누나 잔소리 대처 매뉴얼 필요하시면 언제든 처남한테 소주 한 잔 사주십쇼 ㅎㅎ',
      emoji: '🍺',
      side: 'bride',
    },
    {
      id: 'ilchon-5',
      name: '박성훈 선배',
      relationship: '대학 동아리 선배',
      ilchonName: 'CC 전설의 목격자',
      message: '동아리방에서 둘이 눈맞아서 몰래 사귀던 게 엊그제 같은데 청첩장을 받다니... 세월 빠르다! 축복해!',
      emoji: '🎸',
      side: 'both',
    },
    {
      id: 'ilchon-6',
      name: '정해인 대리',
      relationship: '신랑 직장 동기',
      ilchonName: '동기사랑 나라사랑',
      message: '회사 최고의 에이스 김재현 대리님 품절남 합류 경축!! 축의금 두둑이 챙겨서 가겠습니다!',
      emoji: '💼',
      side: 'groom',
    },
    {
      id: 'ilchon-7',
      name: '꽃보다사총사',
      relationship: '신부 고교 삼총사',
      ilchonName: '부케는 내꺼',
      message: '우리 모임 1호 기혼자 등극 축하!! 결혼식 날 제일 크게 환호성 지를 준비 완료됐다 하은아 사랑해 ❤️',
      emoji: '💐',
      side: 'bride',
    },
  ] as IlchonItem[],

  // Default Guestbook Entries
  initialGuestbook: [
    {
      id: 'gb-1',
      author: '민석(영원한 롤 듀오)',
      emoji: '🎉',
      message: '재현아 하은아 결혼 진심으로 축하해! 둘이 서로 배려하면서 알콩달콩 예쁘게 잘 살아라!!',
      createdAt: '2026.05.02 14:15',
    },
    {
      id: 'gb-2',
      author: '지원(평생 먹방 메이트)',
      emoji: '💐',
      message: '미니룸 진짜 미쳤다 넘 귀여워 ㅠㅠ 하은아 5월의 눈부신 신부 모습 기대할게! 사랑해 내 친구!',
      createdAt: '2026.05.03 18:32',
    },
    {
      id: 'gb-3',
      author: '수진(동생 반품 불가)',
      emoji: '🥰',
      message: '재현이 장가가는 날만 손꼽아 기다렸다! 올케랑 둘이 싸우지 말고 건강하게 오래오래 행복하길 기도할게.',
      createdAt: '2026.05.05 11:04',
    },
    {
      id: 'gb-4',
      author: '도윤(처남 1호)',
      emoji: '🥂',
      message: '매형 누나 결혼 축하드려요! 식장에서 제일 멋지게 축하해드릴게요 식사 맛있게 준비해주세요 ㅎㅎ',
      createdAt: '2026.05.07 19:40',
    },
    {
      id: 'gb-5',
      author: '성훈(동아리 선배)',
      emoji: '✨',
      message: '캠퍼스 커플이 마침내 골인하는 역사적인 날이구나. 언제나 지금의 설렘 기억하며 꽃길만 걸어라!',
      createdAt: '2026.05.09 21:10',
    },
  ],
};

/**
 * 도토리 적립 규칙 설정 (config 파일에서 수정 가능)
 */
export const ACORN_CONFIG = {
  WELCOME_REWARD: 5,         // 첫 입장 +5
  GUESTBOOK_REWARD: 10,       // 방명록 첫 작성 +10
  ILCHON_REWARD: 10,          // 일촌 첫 신청 +10
  QUIZ_REWARD: 5,             // 커플 퀴즈 정답 1개당 +5
  QUIZ_DAILY_MAX: 20,         // 커플 퀴즈 하루 최대 20
  QUIZ_QUESTIONS_PER_ROUND: 4 // 한 판당 질문 개수 (4개)
};

export interface QuizQuestion {
  id: string;
  question: string;
  options: [string, string, string, string] | string[];
  answerIndex: number;
  explanation: string;
  order: number;
  createdAt?: string;
}

/**
 * 커플 퀴즈 초기 더미 질문 8개 (Firestore seeding용)
 */
export const INITIAL_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'quiz-1',
    question: '우리가 처음 만난 날은?',
    options: ['2023년 5월 봄날', '2023년 8월 여름', '2023년 10월 가을', '2023년 12월 겨울'],
    answerIndex: 0,
    explanation: '햇살 따뜻하던 5월의 봄날, 친구 모임에서 처음 눈이 마주쳤어요!',
    order: 1,
  },
  {
    id: 'quiz-2',
    question: '고백한 장소는?',
    options: ['한강 반포 달빛광장', '남산타워 전망대', '홍대 조용한 카페', '제주도 해변가'],
    answerIndex: 0,
    explanation: '야경이 아름다운 한강 반포 달빛광장에서 떨리는 마음으로 고백했어요.',
    order: 2,
  },
  {
    id: 'quiz-3',
    question: '첫 여행지는?',
    options: ['제주도 푸른 바다', '강릉 안목해변', '부산 광안리', '경주 보문단지'],
    answerIndex: 1,
    explanation: '함께 바다를 보며 커피를 마셨던 강릉 안목해변이 첫 여행지였답니다.',
    order: 3,
  },
  {
    id: 'quiz-4',
    question: '프러포즈한 곳은?',
    options: ['둘만의 비밀 아지트', '노을 지는 제주 해변', '서울 야경 레스토랑', '첫 데이트 장소'],
    answerIndex: 1,
    explanation: '붉은 노을이 수평선 너머로 번지던 제주 해변에서 평생을 약속했어요 💍',
    order: 4,
  },
  {
    id: 'quiz-5',
    question: '서로의 첫인상은?',
    options: ['웃는 미소가 참 따뜻한 사람', '조용하고 수줍음 많은 사람', '센스 있고 유쾌한 사람', '말이 잘 통하는 편안한 친구'],
    answerIndex: 0,
    explanation: '처음 보는 순간 환하게 웃던 미소가 너무나 따뜻하고 설렜어요.',
    order: 5,
  },
  {
    id: 'quiz-6',
    question: '신랑이 가장 좋아하는 음식은?',
    options: ['신부가 만들어준 김치찌개', '삼겹살과 된장찌개', '신선한 초밥과 회', '바삭한 치킨과 맥주'],
    answerIndex: 0,
    explanation: '신부가 정성껏 끓여준 보글보글 김치찌개를 제일 사랑한답니다!',
    order: 6,
  },
  {
    id: 'quiz-7',
    question: '신부가 가장 좋아하는 색은?',
    options: ['파스텔 핑크', '하늘색 블루', '따스한 크림 베이지', '화사한 레몬 옐로우'],
    answerIndex: 0,
    explanation: '은은하고 사랑스러운 파스텔 핑크를 가장 좋아해요 💕',
    order: 7,
  },
  {
    id: 'quiz-8',
    question: '우리가 처음 같이 본 영화는?',
    options: ['어바웃 타임', '라라랜드', '인터스텔라', '비긴 어게인'],
    answerIndex: 0,
    explanation: '시간의 소중함과 사랑을 일깨워준 \'어바웃 타임\'을 함께 보았어요.',
    order: 8,
  },
];


