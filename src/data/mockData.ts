import {
  UserSeeker,
  AudioTrack,
  Album,
  Transaction,
  Renewal,
  RecentActivity,
  ScriptureItem,
  FestivalEvent,
} from '../types';

export const ADMIN_PROFILE = {
  name: 'Acharya Das',
  role: 'Chief Steward',
  badge: 'Premium Access',
  avatarUrl:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBRWoTtKbIpRB6720W31S7beO6m1c457Nf6cZOhTK__JyJc_JeWAg0zlceH_skPSY9DLwFC-3oo1sG_OUU1XiPza-CID7A4gu2beSfvDZxD8aKuTLOycE66MIfK3Cd-qpt5gD43oqyHFepqk93rdknCpTKyNFi9DIYQxl_GJeyW8jxzzSHZwxDWooZp66D42eqf6KcsJnm7FiyOlvC8G-UUBGJa9gYBXxNY4IjXMkoBZyhrQJr7WGsNpg',
};

export const INITIAL_SEEKERS: UserSeeker[] = [
  {
    id: 'usr-1',
    name: 'Arjun Varma',
    email: 'arjun.v@dharma.com',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    avatarUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCe5n8rG1nWnbnpCq8jipX8qL8CG1VgaXP0iW55tRDrILZz7gWaVTvbArewu-ZV8DtqxCarku3cWPbTry3nz1Xu-oNx_lQpk0JYdIZ7IWN1KNcYXsfg3zLzt9pZQHv2LqQkTsmZL8FNE0BJQTdPfwWZzMvXJ3N_h7pxnxeyPsHBtCDqWR7SvJmhWOz9spw5WV4USA_tudI0RgvEjYYyvLcZekLyzVyZe1mmHTJaSMBMMUTnp9QCM44UYg',
    joinedDate: 'Oct 12, 2023',
    subscription: 'Dharma Elite',
    status: 'Active',
    phone: '+91 98765 43210',
    totalSadhanas: 342,
  },
  {
    id: 'usr-2',
    name: 'Sarah Jenkins',
    email: 'sarah.j@yoga.org',
    country: 'USA',
    countryCode: 'US',
    flag: '🇺🇸',
    avatarUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBbARO0eao_KH3NozA-B8gTZk90vvdNX54yf4jgWOgS2hcpEt2ujvnjc8NfG7_ZEh2FTe9BfTQ65ML4R37_3zK0-ybeTMgWzLfQyYbqjOi1x7uEmWcs4v0yR0VUfZceQyTqQVGte5cCJdPuw-Dw7sr4J-kOIaZRMix2-sdvp0aFU-m93Q6_CvMXPBfmGlwQcKTwYzpXmV0RjIv3CWWkXIBon2DWw2TlXsnt-GMOexIITXJtVKvyL0npbg',
    joinedDate: 'Nov 05, 2023',
    subscription: 'Free Seeker',
    status: 'Active',
    phone: '+1 415 555 0192',
    totalSadhanas: 89,
  },
  {
    id: 'usr-3',
    name: 'Rajesh K.',
    email: 'rk.spirit@gmail.com',
    country: 'UK',
    countryCode: 'GB',
    flag: '🇬🇧',
    avatarUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCzgb84Cab7Axt-3VWpd6aUjYB7HkpY0wEExnbegwiFvuvHT2qBfDY_Pdw1H_UUBlR5C5V8KD8Pz-zv2cAoFKJsWHGfu3_hPKd3eXAi9zo9x1Bp1gcZHQTcJUABmiwZnatSlgjD7ep8xU0KzTlcHhcBg_PDKNQ0SqySnB4M2d4mjmiOMrz-BEey-AYc06b9rqGY2Z1EcsLQnj0AzeXYmZnis_ZLfpo62yAvNShNfVQgE71ggXd4gLcp1A',
    joinedDate: 'Dec 01, 2023',
    subscription: 'Sadhaka Pro',
    status: 'Inactive',
    phone: '+44 20 7946 0912',
    totalSadhanas: 156,
  },
  {
    id: 'usr-4',
    name: 'Meera Iyer',
    email: 'meera.iyer@vedic.co',
    country: 'Singapore',
    countryCode: 'SG',
    flag: '🇸🇬',
    avatarUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAHKpcivJPNhASU2EYglAoB7oMalwGPMc_lakJuxo-PA_4peIXPgGJXHOpVl-AaIaLkMf5ymDzRjb1hVTSdVR273XHuv2tq9bqXzU7FMd2dQ1AT2aYUMbaj3FCxVtiPb__PBocGAc0x-88iZZqYD5rgHIH3RfRtu2ZHdq3OgjpDQ7UkbJNzSfvnNhL7_6ggJcfF9r-CJ-eQwuyB3gz1kq2qu8lmkHILumMJgR8fu2L9PgPAfTnILJA6BA',
    joinedDate: 'Jan 14, 2024',
    subscription: 'Dharma Elite',
    status: 'Active',
    phone: '+65 6789 0123',
    totalSadhanas: 512,
  },
  {
    id: 'usr-5',
    name: 'Priya Patel',
    email: 'priya.patel@ahimsa.io',
    country: 'Canada',
    countryCode: 'CA',
    flag: '🇨🇦',
    avatarUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
    joinedDate: 'Feb 02, 2024',
    subscription: 'Sadhaka Pro',
    status: 'Active',
    phone: '+1 416 901 2345',
    totalSadhanas: 210,
  },
  {
    id: 'usr-6',
    name: 'Vikram Sengupta',
    email: 'v.sengupta@kolkata.org',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    avatarUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
    joinedDate: 'Mar 19, 2024',
    subscription: 'Dharma Elite',
    status: 'Active',
    phone: '+91 91234 56789',
    totalSadhanas: 430,
  },
  {
    id: 'usr-7',
    name: 'Elena Rostova',
    email: 'elena@dharma-europe.eu',
    country: 'Germany',
    countryCode: 'DE',
    flag: '🇩🇪',
    avatarUrl:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=250',
    joinedDate: 'Apr 08, 2024',
    subscription: 'Free Seeker',
    status: 'Active',
    phone: '+49 30 123456',
    totalSadhanas: 45,
  },
  {
    id: 'usr-8',
    name: 'Ananya Sharma',
    email: 'ananya@sanskrit.in',
    country: 'India',
    countryCode: 'IN',
    flag: '🇮🇳',
    avatarUrl:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=250',
    joinedDate: 'May 11, 2024',
    subscription: 'Sadhaka Pro',
    status: 'Suspended',
    phone: '+91 99887 76655',
    totalSadhanas: 18,
  },
];

export const INITIAL_ALBUMS: Album[] = [
  {
    id: 'alb-1',
    title: 'Eternal Vedas Vol. I',
    artist: 'Vedic Scholars Ensemble',
    description:
      'Master recordings of the Rigveda Samhita, digitally remastered for deep meditation.',
    releaseYear: 2023,
    coverUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCaQYZkd6b0uA0xMqmiHFm6FREXQtBtj1Ri3fGVrr_74BczZpMUkqDNEAXpHrAlxR4bDc68KnqEvQLR2ngJQhI7-2Abhzt_38glWa8i1F-a2yx14c8Lg3WnAIq33qDVRkEGPe9HbHPoYPf9D7Nnfq65olSRkiXTCr-zLP_hEp4FBL-s5X7enXj5j3cBO2q6DWLqk6XurDE6b0966qtRKpzopHCylT_-Q6YUuzRlZnvxfRXHVN6_Dbw0SA',
    tag: 'Trending Now',
    trackCount: 24,
    totalDuration: '4h 20m',
    status: 'Premium',
  },
  {
    id: 'alb-2',
    title: 'Evening Ragas',
    artist: 'Pandit Shivkumar',
    description:
      'Restorative sitar and bansuri melodies aligned with dusk twilight vibrations.',
    releaseYear: 2024,
    coverUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBBn12zLDugGz_pVnxZGA8ceUHUl5MjoMW7eL_-TGlpzIfLSBfUyW_I5CbY8LLK9b66YmTR1g-fAjOc6c_XAjaJyYnXkf7zrhICUg4wTQYN5tIzz1tWd0UU7he12fdu57MDrGkKhkeyzlml5xL5HKyZXRqaY4FjQml3GZAtJfEhbOux_FEnUkf66e_8swj5-yKjQ4PAdCjJiWUMvIu2X5r9VFH4G6J_rYxAdz0mjzMOGmYsNndiV5Wcsw',
    tag: 'Dusk Melodies',
    trackCount: 12,
    totalDuration: '1h 45m',
    status: 'Premium',
  },
  {
    id: 'alb-3',
    title: 'Sonic Healing',
    artist: 'Inner Silence',
    description:
      'Resonant singing bowls and subtle drone frequencies for chakra alignment.',
    releaseYear: 2023,
    coverUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuABS-G2B29gAn6mIsbUvONohDc1N6TCyueDAWtKszuKfYW_LH3QHGofTtlw9csGe-YojXkfPqhVNeeN35oAwAvW41o_azEkZ3Pv5I3X7S64-_U77vZd7MN43G9OFABbhTNGh2HUzFGZ5UEM6eovTKxXmcfiRe9UK0OPRkSuBMY2SLVK-9y4Rb9Tc6-9khrOZvCkoiCSqrOsnyOsI3lZ7W75zBxTBvNiPihUU4ea6qFbEJrVYwlUhbzWSA',
    tag: 'Sound Bath',
    trackCount: 8,
    totalDuration: '1h 10m',
    status: 'Public',
  },
  {
    id: 'alb-4',
    title: 'Upanishad Chants',
    artist: 'Rishikesh Monks',
    description:
      'Authentic oral tradition recitations from Mandukya and Chandogya Upanishads.',
    releaseYear: 2024,
    coverUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDV00S2P4sDgIunuVzzX_pApC2-zJ7vDFbMIMbR6ENaw5-EYmg1OdigwWTnz4DxuxK2YDtu_kriGd6nbKh5uQuYt2ie3QqMbGY-SrYTqGzDeoBg-dztdOdSfDiMGMw1619lz0PTZUB_nUyiBihYAeiQY7D9hExYmQ9v0mlV234VsUPpeIFBEEWArRNsde26aaN9PZIBigJYigHL67jCdD2PNQPgJaYJJXkLL9vQFfseaFyJKMqxxy9yMw',
    tag: 'Sacred Text',
    trackCount: 16,
    totalDuration: '2h 50m',
    status: 'Premium',
  },
];

export const INITIAL_AUDIO_TRACKS: AudioTrack[] = [
  {
    id: 'trk-1',
    trackNumber: '01',
    title: 'Ganesh Atharvashirsha',
    artist: 'Vedic Scholars Ensemble',
    category: 'Stotram',
    language: 'Sanskrit',
    duration: '12:45',
    durationSeconds: 765,
    isPremium: true,
    status: 'Active',
    albumId: 'alb-1',
    coverUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDV00S2P4sDgIunuVzzX_pApC2-zJ7vDFbMIMbR6ENaw5-EYmg1OdigwWTnz4DxuxK2YDtu_kriGd6nbKh5uQuYt2ie3QqMbGY-SrYTqGzDeoBg-dztdOdSfDiMGMw1619lz0PTZUB_nUyiBihYAeiQY7D9hExYmQ9v0mlV234VsUPpeIFBEEWArRNsde26aaN9PZIBigJYigHL67jCdD2PNQPgJaYJJXkLL9vQFfseaFyJKMqxxy9yMw',
  },
  {
    id: 'trk-2',
    trackNumber: '02',
    title: 'Gayatri Mantra (108 Times)',
    artist: 'Traditional Chants',
    category: 'Japa',
    language: 'Sanskrit',
    duration: '25:12',
    durationSeconds: 1512,
    isPremium: false,
    status: 'Active',
    albumId: 'alb-1',
    coverUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBBn12zLDugGz_pVnxZGA8ceUHUl5MjoMW7eL_-TGlpzIfLSBfUyW_I5CbY8LLK9b66YmTR1g-fAjOc6c_XAjaJyYnXkf7zrhICUg4wTQYN5tIzz1tWd0UU7he12fdu57MDrGkKhkeyzlml5xL5HKyZXRqaY4FjQml3GZAtJfEhbOux_FEnUkf66e_8swj5-yKjQ4PAdCjJiWUMvIu2X5r9VFH4G6J_rYxAdz0mjzMOGmYsNndiV5Wcsw',
  },
  {
    id: 'trk-3',
    trackNumber: '03',
    title: 'Shiva Tandava Stotram',
    artist: 'Pandit V. Kumar',
    category: 'Stotram',
    language: 'Sanskrit',
    duration: '09:42',
    durationSeconds: 582,
    isPremium: true,
    status: 'Active',
    albumId: 'alb-1',
    coverUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCaQYZkd6b0uA0xMqmiHFm6FREXQtBtj1Ri3fGVrr_74BczZpMUkqDNEAXpHrAlxR4bDc68KnqEvQLR2ngJQhI7-2Abhzt_38glWa8i1F-a2yx14c8Lg3WnAIq33qDVRkEGPe9HbHPoYPf9D7Nnfq65olSRkiXTCr-zLP_hEp4FBL-s5X7enXj5j3cBO2q6DWLqk6XurDE6b0966qtRKpzopHCylT_-Q6YUuzRlZnvxfRXHVN6_Dbw0SA',
  },
  {
    id: 'trk-4',
    trackNumber: '04',
    title: 'Ancient Vedic Wisdom Vol 2',
    artist: 'Dr. R. Sharma',
    category: 'Satsang',
    language: 'Hindi',
    duration: '45:00',
    durationSeconds: 2700,
    isPremium: true,
    status: 'Processing',
    albumId: 'alb-1',
    coverUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuABS-G2B29gAn6mIsbUvONohDc1N6TCyueDAWtKszuKfYW_LH3QHGofTtlw9csGe-YojXkfPqhVNeeN35oAwAvW41o_azEkZ3Pv5I3X7S64-_U77vZd7MN43G9OFABbhTNGh2HUzFGZ5UEM6eovTKxXmcfiRe9UK0OPRkSuBMY2SLVK-9y4Rb9Tc6-9khrOZvCkoiCSqrOsnyOsI3lZ7W75zBxTBvNiPihUU4ea6qFbEJrVYwlUhbzWSA',
  },
  {
    id: 'trk-5',
    trackNumber: '05',
    title: 'Maha Mrityunjaya Japa',
    artist: 'Sadhvi S. Devi',
    category: 'Japa',
    language: 'Sanskrit',
    duration: '18:30',
    durationSeconds: 1110,
    isPremium: false,
    status: 'Active',
    albumId: 'alb-1',
    coverUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBBn12zLDugGz_pVnxZGA8ceUHUl5MjoMW7eL_-TGlpzIfLSBfUyW_I5CbY8LLK9b66YmTR1g-fAjOc6c_XAjaJyYnXkf7zrhICUg4wTQYN5tIzz1tWd0UU7he12fdu57MDrGkKhkeyzlml5xL5HKyZXRqaY4FjQml3GZAtJfEhbOux_FEnUkf66e_8swj5-yKjQ4PAdCjJiWUMvIu2X5r9VFH4G6J_rYxAdz0mjzMOGmYsNndiV5Wcsw',
  },
  {
    id: 'trk-6',
    trackNumber: '06',
    title: 'Raga Yaman Dusk Meditations',
    artist: 'Pandit Shivkumar',
    category: 'Raga',
    language: 'Instrumental',
    duration: '22:15',
    durationSeconds: 1335,
    isPremium: true,
    status: 'Active',
    albumId: 'alb-2',
    coverUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBBn12zLDugGz_pVnxZGA8ceUHUl5MjoMW7eL_-TGlpzIfLSBfUyW_I5CbY8LLK9b66YmTR1g-fAjOc6c_XAjaJyYnXkf7zrhICUg4wTQYN5tIzz1tWd0UU7he12fdu57MDrGkKhkeyzlml5xL5HKyZXRqaY4FjQml3GZAtJfEhbOux_FEnUkf66e_8swj5-yKjQ4PAdCjJiWUMvIu2X5r9VFH4G6J_rYxAdz0mjzMOGmYsNndiV5Wcsw',
  },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: '#SDH-9021-X81',
    timestamp: 'Oct 21, 2023 10:45 AM',
    contributor: 'Ishaan Gupta',
    service: 'Temple Digital Offering',
    status: 'Completed',
    amount: 250.0,
    timeframeCategory: 'Daily',
  },
  {
    id: '#SDH-9020-K24',
    timestamp: 'Oct 21, 2023 09:12 AM',
    contributor: 'Sita Rao',
    service: 'Monthly Bhagavad Course',
    status: 'Completed',
    amount: 49.99,
    timeframeCategory: 'Daily',
  },
  {
    id: '#SDH-9019-M09',
    timestamp: 'Oct 20, 2023 04:30 PM',
    contributor: 'Arjun Singh',
    service: 'Annual Archana Plan',
    status: 'Processing',
    amount: 599.0,
    timeframeCategory: 'Monthly',
  },
  {
    id: '#SDH-9018-L55',
    timestamp: 'Oct 20, 2023 11:20 AM',
    contributor: 'Priya Mallik',
    service: 'Vedic Audio Pass',
    status: 'Completed',
    amount: 12.5,
    timeframeCategory: 'Daily',
  },
  {
    id: '#SDH-9017-P31',
    timestamp: 'Oct 19, 2023 02:15 PM',
    contributor: 'Rohan Varma',
    service: 'Premium Gold Membership',
    status: 'Completed',
    amount: 149.0,
    timeframeCategory: 'Yearly',
  },
  {
    id: '#SDH-9016-B88',
    timestamp: 'Oct 18, 2023 08:05 AM',
    contributor: 'Kavita Menon',
    service: 'Festival Special Seva',
    status: 'Completed',
    amount: 108.0,
    timeframeCategory: 'Monthly',
  },
  {
    id: '#SDH-9015-Z12',
    timestamp: 'Oct 17, 2023 06:40 PM',
    contributor: 'Devendra Joshi',
    service: 'Guru Dakshina Offering',
    status: 'Pending',
    amount: 500.0,
    timeframeCategory: 'Yearly',
  },
];

export const INITIAL_RENEWALS: Renewal[] = [
  {
    id: 'ren-1',
    user: 'Rohan Varma',
    userInitials: 'RV',
    plan: 'Premium Gold',
    dueDate: 'Tomorrow',
    amount: 149.0,
    avatarBg: 'bg-primary/20 text-primary',
  },
  {
    id: 'ren-2',
    user: 'Anjali Sharma',
    userInitials: 'AS',
    plan: 'Standard Vedic',
    dueDate: 'Oct 24, 2023',
    amount: 29.0,
    avatarBg: 'bg-secondary/20 text-secondary',
  },
  {
    id: 'ren-3',
    user: 'Meera Krishnan',
    userInitials: 'MK',
    plan: 'Premium Gold',
    dueDate: 'Oct 26, 2023',
    amount: 149.0,
    avatarBg: 'bg-error/20 text-error',
  },
];

export const INITIAL_ACTIVITIES: RecentActivity[] = [
  {
    id: 'act-1',
    title: 'New Milestone Reached',
    description: '100,000 users have completed the "21 Day Sadhana Challenge".',
    timeAgo: '2 mins ago',
    type: 'gold',
  },
  {
    id: 'act-2',
    title: 'Server Optimization',
    description: 'Morning peak load handled effectively at 110% capacity.',
    timeAgo: '45 mins ago',
    type: 'gray',
  },
  {
    id: 'act-3',
    title: 'Subscription Surge',
    description:
      'A 24% increase in premium subscriptions following the Maha Shivaratri update.',
    timeAgo: '2 hours ago',
    type: 'emerald',
  },
  {
    id: 'act-4',
    title: 'Support Ticket Resolved',
    description: 'Critical billing issue for User #8821 resolved by Steward Aryan.',
    timeAgo: '5 hours ago',
    type: 'gray',
  },
  {
    id: 'act-5',
    title: 'New Audio Upload',
    description: 'Ganesh Atharvashirsha audio track processed and published.',
    timeAgo: '1 day ago',
    type: 'gold',
  },
];

export const SPIRITUAL_GROWTH_DATA = [
  { month: 'Jan', seekers: 32000, activeSadhanas: 18000 },
  { month: 'Feb', seekers: 45000, activeSadhanas: 24000 },
  { month: 'Mar', seekers: 38000, activeSadhanas: 21000 },
  { month: 'Apr', seekers: 62000, activeSadhanas: 35000 },
  { month: 'May', seekers: 85000, activeSadhanas: 48000 },
  { month: 'Jun', seekers: 58000, activeSadhanas: 31000 },
  { month: 'Jul', seekers: 72000, activeSadhanas: 41000 },
  { month: 'Aug', seekers: 98000, activeSadhanas: 55000 },
  { month: 'Sep', seekers: 88000, activeSadhanas: 49000 },
  { month: 'Oct', seekers: 112000, activeSadhanas: 64000 },
  { month: 'Nov', seekers: 124820, activeSadhanas: 71000 },
  { month: 'Dec', seekers: 135000, activeSadhanas: 82000 },
];

export const POPULAR_SADHANAS_DATA = [
  { name: 'Mantra Chanting', value: 45, color: '#f2ca50' },
  { name: 'Pranayama', value: 28, color: '#10b981' },
  { name: 'Meditation', value: 27, color: '#adb2ca' },
];

export const USER_TIERS_DATA = [
  { name: 'Premium Gold', value: 68, color: '#f2ca50' },
  { name: 'Standard Vedic', value: 22, color: '#c8cde6' },
  { name: 'Trial Members', value: 10, color: '#c0c6de' },
];

export const SCRIPTURE_ITEMS: ScriptureItem[] = [
  {
    id: 'scp-1',
    title: 'Srimad Bhagavad Gita',
    sanskritTitle: 'श्रीमद्भगवद्गीता',
    versesCount: 700,
    chaptersCount: 18,
    category: 'Smriti',
    description:
      'The 700-verse Hindu scripture that is part of the epic Mahabharata, presenting a synthesis of Hindu ideas about dharma, bhakti, and moksha.',
  },
  {
    id: 'scp-2',
    title: 'Rigveda Samhita',
    sanskritTitle: 'ऋग्वेद संहिता',
    versesCount: 10552,
    chaptersCount: 10,
    category: 'Shruti',
    description:
      'An ancient Indian collection of Vedic Sanskrit hymns. It is one of the four sacred canonical texts of Hinduism.',
  },
  {
    id: 'scp-3',
    title: 'Patanjali Yoga Sutras',
    sanskritTitle: 'पतञ्जलि योगसूत्राणि',
    versesCount: 196,
    chaptersCount: 4,
    category: 'Darshana',
    description:
      'The foundational text of classical Raja Yoga philosophy outlining the Ashtanga (eight-limbed) path.',
  },
];

export const FESTIVAL_EVENTS: FestivalEvent[] = [
  {
    id: 'fst-1',
    title: 'Maha Shivaratri',
    sanskritName: 'महाशिवरात्रि',
    date: 'Feb 15, 2027',
    significance: 'Great Night of Shiva celebrating cosmic stillness & wisdom',
    status: 'Upcoming',
    devoteesExpected: 250000,
  },
  {
    id: 'fst-2',
    title: 'Navaratri & Vijayadashami',
    sanskritName: 'नवरात्रि',
    date: 'Oct 10 - Oct 19, 2026',
    significance:
      'Nine nights honoring the Divine Feminine energy (Shakti)',
    status: 'Upcoming',
    devoteesExpected: 400000,
  },
  {
    id: 'fst-3',
    title: 'Guru Purnima',
    sanskritName: 'गुरु पूर्णिमा',
    date: 'Jul 28, 2026',
    significance:
      'Reverence to spiritual gurus and sage Ved Vyasa',
    status: 'Completed',
    devoteesExpected: 180000,
  },
];
