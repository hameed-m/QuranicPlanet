/**
 * suras.js — Complete Quran Sura Dataset
 * ========================================
 * Canonical metadata for all 114 Suras of the Quran.
 * Each entry contains: id, Arabic name, English name, English meaning,
 * verse count, approximate word count, revelation type, and primary juz.
 *
 * Word counts are based on the standard Uthmani text.
 * Juz values indicate the juz where the sura begins.
 */

/** @typedef {'meccan'|'medinan'} RevelationType */

/**
 * @typedef {Object} Sura
 * @property {number}         id       — 1-based sura number
 * @property {string}         nameAr   — Arabic name
 * @property {string}         nameEn   — Transliterated English name
 * @property {string}         meaning  — English meaning of the name
 * @property {number}         verses   — Number of ayat
 * @property {number}         words    — Approximate word count
 * @property {RevelationType} type     — Meccan or Medinan
 * @property {number}         juz      — Primary juz (where sura begins)
 */

/** @type {Sura[]} */
export const SURAS = [
  { id: 1,   nameAr: 'الفاتحة',      nameEn: 'Al-Fatihah',       meaning: 'The Opening',                verses: 7,    words: 29,    type: 'meccan',  juz: 1  },
  { id: 2,   nameAr: 'البقرة',        nameEn: 'Al-Baqarah',       meaning: 'The Cow',                    verses: 286,  words: 6144,  type: 'medinan', juz: 1  },
  { id: 3,   nameAr: 'آل عمران',      nameEn: 'Aal-Imran',        meaning: 'Family of Imran',            verses: 200,  words: 3503,  type: 'medinan', juz: 3  },
  { id: 4,   nameAr: 'النساء',        nameEn: 'An-Nisa',          meaning: 'The Women',                  verses: 176,  words: 3764,  type: 'medinan', juz: 4  },
  { id: 5,   nameAr: 'المائدة',       nameEn: 'Al-Ma\'idah',      meaning: 'The Table Spread',           verses: 120,  words: 2837,  type: 'medinan', juz: 6  },
  { id: 6,   nameAr: 'الأنعام',       nameEn: 'Al-An\'am',        meaning: 'The Cattle',                 verses: 165,  words: 3055,  type: 'meccan',  juz: 7  },
  { id: 7,   nameAr: 'الأعراف',       nameEn: 'Al-A\'raf',        meaning: 'The Heights',                verses: 206,  words: 3344,  type: 'meccan',  juz: 8  },
  { id: 8,   nameAr: 'الأنفال',       nameEn: 'Al-Anfal',         meaning: 'The Spoils of War',          verses: 75,   words: 1243,  type: 'medinan', juz: 9  },
  { id: 9,   nameAr: 'التوبة',        nameEn: 'At-Tawbah',        meaning: 'The Repentance',             verses: 129,  words: 2506,  type: 'medinan', juz: 10 },
  { id: 10,  nameAr: 'يونس',          nameEn: 'Yunus',            meaning: 'Jonah',                      verses: 109,  words: 1833,  type: 'meccan',  juz: 11 },
  { id: 11,  nameAr: 'هود',           nameEn: 'Hud',              meaning: 'Hud',                        verses: 123,  words: 1947,  type: 'meccan',  juz: 11 },
  { id: 12,  nameAr: 'يوسف',          nameEn: 'Yusuf',            meaning: 'Joseph',                     verses: 111,  words: 1795,  type: 'meccan',  juz: 12 },
  { id: 13,  nameAr: 'الرعد',         nameEn: 'Ar-Ra\'d',         meaning: 'The Thunder',                verses: 43,   words: 854,   type: 'medinan', juz: 13 },
  { id: 14,  nameAr: 'إبراهيم',       nameEn: 'Ibrahim',          meaning: 'Abraham',                    verses: 52,   words: 831,   type: 'meccan',  juz: 13 },
  { id: 15,  nameAr: 'الحجر',         nameEn: 'Al-Hijr',          meaning: 'The Rocky Tract',            verses: 99,   words: 658,   type: 'meccan',  juz: 14 },
  { id: 16,  nameAr: 'النحل',         nameEn: 'An-Nahl',          meaning: 'The Bee',                    verses: 128,  words: 1845,  type: 'meccan',  juz: 14 },
  { id: 17,  nameAr: 'الإسراء',       nameEn: 'Al-Isra',          meaning: 'The Night Journey',          verses: 111,  words: 1560,  type: 'meccan',  juz: 15 },
  { id: 18,  nameAr: 'الكهف',         nameEn: 'Al-Kahf',          meaning: 'The Cave',                   verses: 110,  words: 1583,  type: 'meccan',  juz: 15 },
  { id: 19,  nameAr: 'مريم',          nameEn: 'Maryam',           meaning: 'Mary',                       verses: 98,   words: 972,   type: 'meccan',  juz: 16 },
  { id: 20,  nameAr: 'طه',            nameEn: 'Taha',             meaning: 'Ta-Ha',                      verses: 135,  words: 1354,  type: 'meccan',  juz: 16 },
  { id: 21,  nameAr: 'الأنبياء',      nameEn: 'Al-Anbiya',        meaning: 'The Prophets',               verses: 112,  words: 1174,  type: 'meccan',  juz: 17 },
  { id: 22,  nameAr: 'الحج',          nameEn: 'Al-Hajj',          meaning: 'The Pilgrimage',             verses: 78,   words: 1279,  type: 'medinan', juz: 17 },
  { id: 23,  nameAr: 'المؤمنون',      nameEn: 'Al-Mu\'minun',     meaning: 'The Believers',              verses: 118,  words: 1055,  type: 'meccan',  juz: 18 },
  { id: 24,  nameAr: 'النور',         nameEn: 'An-Nur',           meaning: 'The Light',                  verses: 64,   words: 1320,  type: 'medinan', juz: 18 },
  { id: 25,  nameAr: 'الفرقان',       nameEn: 'Al-Furqan',        meaning: 'The Criterion',              verses: 77,   words: 897,   type: 'meccan',  juz: 18 },
  { id: 26,  nameAr: 'الشعراء',       nameEn: 'Ash-Shu\'ara',     meaning: 'The Poets',                  verses: 227,  words: 1322,  type: 'meccan',  juz: 19 },
  { id: 27,  nameAr: 'النمل',         nameEn: 'An-Naml',          meaning: 'The Ant',                    verses: 93,   words: 1165,  type: 'meccan',  juz: 19 },
  { id: 28,  nameAr: 'القصص',         nameEn: 'Al-Qasas',         meaning: 'The Stories',                verses: 88,   words: 1441,  type: 'meccan',  juz: 20 },
  { id: 29,  nameAr: 'العنكبوت',      nameEn: 'Al-Ankabut',       meaning: 'The Spider',                 verses: 69,   words: 980,   type: 'meccan',  juz: 20 },
  { id: 30,  nameAr: 'الروم',         nameEn: 'Ar-Rum',           meaning: 'The Romans',                 verses: 60,   words: 819,   type: 'meccan',  juz: 21 },
  { id: 31,  nameAr: 'لقمان',         nameEn: 'Luqman',           meaning: 'Luqman',                     verses: 34,   words: 550,   type: 'meccan',  juz: 21 },
  { id: 32,  nameAr: 'السجدة',        nameEn: 'As-Sajdah',        meaning: 'The Prostration',            verses: 30,   words: 374,   type: 'meccan',  juz: 21 },
  { id: 33,  nameAr: 'الأحزاب',       nameEn: 'Al-Ahzab',         meaning: 'The Combined Forces',        verses: 73,   words: 1303,  type: 'medinan', juz: 21 },
  { id: 34,  nameAr: 'سبأ',           nameEn: 'Saba',             meaning: 'Sheba',                      verses: 54,   words: 884,   type: 'meccan',  juz: 22 },
  { id: 35,  nameAr: 'فاطر',          nameEn: 'Fatir',            meaning: 'Originator',                 verses: 45,   words: 780,   type: 'meccan',  juz: 22 },
  { id: 36,  nameAr: 'يس',            nameEn: 'Ya-Sin',           meaning: 'Ya-Sin',                     verses: 83,   words: 733,   type: 'meccan',  juz: 22 },
  { id: 37,  nameAr: 'الصافات',       nameEn: 'As-Saffat',        meaning: 'Those Who Set the Ranks',    verses: 182,  words: 866,   type: 'meccan',  juz: 23 },
  { id: 38,  nameAr: 'ص',             nameEn: 'Sad',              meaning: 'The Letter Sad',             verses: 88,   words: 735,   type: 'meccan',  juz: 23 },
  { id: 39,  nameAr: 'الزمر',         nameEn: 'Az-Zumar',         meaning: 'The Troops',                 verses: 75,   words: 1179,  type: 'meccan',  juz: 23 },
  { id: 40,  nameAr: 'غافر',          nameEn: 'Ghafir',           meaning: 'The Forgiver',               verses: 85,   words: 1228,  type: 'meccan',  juz: 24 },
  { id: 41,  nameAr: 'فصلت',          nameEn: 'Fussilat',         meaning: 'Explained in Detail',        verses: 54,   words: 796,   type: 'meccan',  juz: 24 },
  { id: 42,  nameAr: 'الشورى',        nameEn: 'Ash-Shura',        meaning: 'The Consultation',           verses: 53,   words: 860,   type: 'meccan',  juz: 25 },
  { id: 43,  nameAr: 'الزخرف',        nameEn: 'Az-Zukhruf',       meaning: 'The Ornaments of Gold',      verses: 89,   words: 837,   type: 'meccan',  juz: 25 },
  { id: 44,  nameAr: 'الدخان',        nameEn: 'Ad-Dukhan',        meaning: 'The Smoke',                  verses: 59,   words: 346,   type: 'meccan',  juz: 25 },
  { id: 45,  nameAr: 'الجاثية',       nameEn: 'Al-Jathiyah',      meaning: 'The Crouching',              verses: 37,   words: 488,   type: 'meccan',  juz: 25 },
  { id: 46,  nameAr: 'الأحقاف',       nameEn: 'Al-Ahqaf',         meaning: 'The Wind-Curved Sandhills',  verses: 35,   words: 646,   type: 'meccan',  juz: 26 },
  { id: 47,  nameAr: 'محمد',          nameEn: 'Muhammad',         meaning: 'Muhammad',                   verses: 38,   words: 542,   type: 'medinan', juz: 26 },
  { id: 48,  nameAr: 'الفتح',         nameEn: 'Al-Fath',          meaning: 'The Victory',                verses: 29,   words: 560,   type: 'medinan', juz: 26 },
  { id: 49,  nameAr: 'الحجرات',       nameEn: 'Al-Hujurat',       meaning: 'The Rooms',                  verses: 18,   words: 353,   type: 'medinan', juz: 26 },
  { id: 50,  nameAr: 'ق',             nameEn: 'Qaf',              meaning: 'The Letter Qaf',             verses: 45,   words: 373,   type: 'meccan',  juz: 26 },
  { id: 51,  nameAr: 'الذاريات',      nameEn: 'Adh-Dhariyat',     meaning: 'The Winnowing Winds',        verses: 60,   words: 360,   type: 'meccan',  juz: 26 },
  { id: 52,  nameAr: 'الطور',         nameEn: 'At-Tur',           meaning: 'The Mount',                  verses: 49,   words: 312,   type: 'meccan',  juz: 27 },
  { id: 53,  nameAr: 'النجم',         nameEn: 'An-Najm',          meaning: 'The Star',                   verses: 62,   words: 360,   type: 'meccan',  juz: 27 },
  { id: 54,  nameAr: 'القمر',         nameEn: 'Al-Qamar',         meaning: 'The Moon',                   verses: 55,   words: 342,   type: 'meccan',  juz: 27 },
  { id: 55,  nameAr: 'الرحمن',        nameEn: 'Ar-Rahman',        meaning: 'The Beneficent',             verses: 78,   words: 352,   type: 'medinan', juz: 27 },
  { id: 56,  nameAr: 'الواقعة',       nameEn: 'Al-Waqi\'ah',      meaning: 'The Inevitable',             verses: 96,   words: 379,   type: 'meccan',  juz: 27 },
  { id: 57,  nameAr: 'الحديد',        nameEn: 'Al-Hadid',         meaning: 'The Iron',                   verses: 29,   words: 575,   type: 'medinan', juz: 27 },
  { id: 58,  nameAr: 'المجادلة',      nameEn: 'Al-Mujadila',      meaning: 'The Pleading Woman',         verses: 22,   words: 475,   type: 'medinan', juz: 28 },
  { id: 59,  nameAr: 'الحشر',         nameEn: 'Al-Hashr',         meaning: 'The Exile',                  verses: 24,   words: 447,   type: 'medinan', juz: 28 },
  { id: 60,  nameAr: 'الممتحنة',      nameEn: 'Al-Mumtahanah',    meaning: 'She That Is Examined',       verses: 13,   words: 352,   type: 'medinan', juz: 28 },
  { id: 61,  nameAr: 'الصف',          nameEn: 'As-Saf',           meaning: 'The Ranks',                  verses: 14,   words: 226,   type: 'medinan', juz: 28 },
  { id: 62,  nameAr: 'الجمعة',        nameEn: 'Al-Jumu\'ah',      meaning: 'The Congregation',           verses: 11,   words: 177,   type: 'medinan', juz: 28 },
  { id: 63,  nameAr: 'المنافقون',     nameEn: 'Al-Munafiqun',     meaning: 'The Hypocrites',             verses: 11,   words: 181,   type: 'medinan', juz: 28 },
  { id: 64,  nameAr: 'التغابن',       nameEn: 'At-Taghabun',      meaning: 'The Mutual Disillusion',     verses: 18,   words: 242,   type: 'medinan', juz: 28 },
  { id: 65,  nameAr: 'الطلاق',        nameEn: 'At-Talaq',         meaning: 'The Divorce',                verses: 12,   words: 289,   type: 'medinan', juz: 28 },
  { id: 66,  nameAr: 'التحريم',       nameEn: 'At-Tahrim',        meaning: 'The Prohibition',            verses: 12,   words: 254,   type: 'medinan', juz: 28 },
  { id: 67,  nameAr: 'الملك',         nameEn: 'Al-Mulk',          meaning: 'The Sovereignty',            verses: 30,   words: 333,   type: 'meccan',  juz: 29 },
  { id: 68,  nameAr: 'القلم',         nameEn: 'Al-Qalam',         meaning: 'The Pen',                    verses: 52,   words: 301,   type: 'meccan',  juz: 29 },
  { id: 69,  nameAr: 'الحاقة',        nameEn: 'Al-Haqqah',        meaning: 'The Reality',                verses: 52,   words: 261,   type: 'meccan',  juz: 29 },
  { id: 70,  nameAr: 'المعارج',       nameEn: 'Al-Ma\'arij',      meaning: 'The Ascending Stairways',    verses: 44,   words: 217,   type: 'meccan',  juz: 29 },
  { id: 71,  nameAr: 'نوح',           nameEn: 'Nuh',              meaning: 'Noah',                       verses: 28,   words: 227,   type: 'meccan',  juz: 29 },
  { id: 72,  nameAr: 'الجن',          nameEn: 'Al-Jinn',          meaning: 'The Jinn',                   verses: 28,   words: 286,   type: 'meccan',  juz: 29 },
  { id: 73,  nameAr: 'المزمل',        nameEn: 'Al-Muzzammil',     meaning: 'The Enshrouded One',         verses: 20,   words: 200,   type: 'meccan',  juz: 29 },
  { id: 74,  nameAr: 'المدثر',        nameEn: 'Al-Muddaththir',   meaning: 'The Cloaked One',            verses: 56,   words: 256,   type: 'meccan',  juz: 29 },
  { id: 75,  nameAr: 'القيامة',       nameEn: 'Al-Qiyamah',       meaning: 'The Resurrection',           verses: 40,   words: 164,   type: 'meccan',  juz: 29 },
  { id: 76,  nameAr: 'الإنسان',       nameEn: 'Al-Insan',         meaning: 'The Human',                  verses: 31,   words: 243,   type: 'medinan', juz: 29 },
  { id: 77,  nameAr: 'المرسلات',      nameEn: 'Al-Mursalat',      meaning: 'The Emissaries',             verses: 50,   words: 181,   type: 'meccan',  juz: 29 },
  { id: 78,  nameAr: 'النبأ',         nameEn: 'An-Naba',          meaning: 'The Tidings',                verses: 40,   words: 174,   type: 'meccan',  juz: 30 },
  { id: 79,  nameAr: 'النازعات',      nameEn: 'An-Nazi\'at',      meaning: 'Those Who Drag Forth',       verses: 46,   words: 179,   type: 'meccan',  juz: 30 },
  { id: 80,  nameAr: 'عبس',           nameEn: 'Abasa',            meaning: 'He Frowned',                 verses: 42,   words: 133,   type: 'meccan',  juz: 30 },
  { id: 81,  nameAr: 'التكوير',       nameEn: 'At-Takwir',        meaning: 'The Overthrowing',           verses: 29,   words: 104,   type: 'meccan',  juz: 30 },
  { id: 82,  nameAr: 'الانفطار',      nameEn: 'Al-Infitar',       meaning: 'The Cleaving',               verses: 19,   words: 81,    type: 'meccan',  juz: 30 },
  { id: 83,  nameAr: 'المطففين',      nameEn: 'Al-Mutaffifin',    meaning: 'The Defrauding',             verses: 36,   words: 169,   type: 'meccan',  juz: 30 },
  { id: 84,  nameAr: 'الانشقاق',      nameEn: 'Al-Inshiqaq',      meaning: 'The Sundering',              verses: 25,   words: 108,   type: 'meccan',  juz: 30 },
  { id: 85,  nameAr: 'البروج',        nameEn: 'Al-Buruj',         meaning: 'The Mansions of the Stars',  verses: 22,   words: 109,   type: 'meccan',  juz: 30 },
  { id: 86,  nameAr: 'الطارق',        nameEn: 'At-Tariq',         meaning: 'The Morning Star',           verses: 17,   words: 61,    type: 'meccan',  juz: 30 },
  { id: 87,  nameAr: 'الأعلى',        nameEn: 'Al-A\'la',         meaning: 'The Most High',              verses: 19,   words: 72,    type: 'meccan',  juz: 30 },
  { id: 88,  nameAr: 'الغاشية',       nameEn: 'Al-Ghashiyah',     meaning: 'The Overwhelming',           verses: 26,   words: 92,    type: 'meccan',  juz: 30 },
  { id: 89,  nameAr: 'الفجر',         nameEn: 'Al-Fajr',          meaning: 'The Dawn',                   verses: 30,   words: 139,   type: 'meccan',  juz: 30 },
  { id: 90,  nameAr: 'البلد',         nameEn: 'Al-Balad',         meaning: 'The City',                   verses: 20,   words: 82,    type: 'meccan',  juz: 30 },
  { id: 91,  nameAr: 'الشمس',         nameEn: 'Ash-Shams',        meaning: 'The Sun',                    verses: 15,   words: 54,    type: 'meccan',  juz: 30 },
  { id: 92,  nameAr: 'الليل',         nameEn: 'Al-Layl',          meaning: 'The Night',                  verses: 21,   words: 71,    type: 'meccan',  juz: 30 },
  { id: 93,  nameAr: 'الضحى',         nameEn: 'Ad-Duha',          meaning: 'The Morning Hours',          verses: 11,   words: 40,    type: 'meccan',  juz: 30 },
  { id: 94,  nameAr: 'الشرح',         nameEn: 'Ash-Sharh',        meaning: 'The Relief',                 verses: 8,    words: 27,    type: 'meccan',  juz: 30 },
  { id: 95,  nameAr: 'التين',         nameEn: 'At-Tin',           meaning: 'The Fig',                    verses: 8,    words: 34,    type: 'meccan',  juz: 30 },
  { id: 96,  nameAr: 'العلق',         nameEn: 'Al-Alaq',          meaning: 'The Clot',                   verses: 19,   words: 72,    type: 'meccan',  juz: 30 },
  { id: 97,  nameAr: 'القدر',         nameEn: 'Al-Qadr',          meaning: 'The Power',                  verses: 5,    words: 30,    type: 'meccan',  juz: 30 },
  { id: 98,  nameAr: 'البينة',        nameEn: 'Al-Bayyinah',      meaning: 'The Clear Proof',            verses: 8,    words: 94,    type: 'medinan', juz: 30 },
  { id: 99,  nameAr: 'الزلزلة',       nameEn: 'Az-Zalzalah',      meaning: 'The Earthquake',             verses: 8,    words: 36,    type: 'medinan', juz: 30 },
  { id: 100, nameAr: 'العاديات',      nameEn: 'Al-Adiyat',        meaning: 'The Coursers',               verses: 11,   words: 40,    type: 'meccan',  juz: 30 },
  { id: 101, nameAr: 'القارعة',       nameEn: 'Al-Qari\'ah',      meaning: 'The Calamity',               verses: 11,   words: 36,    type: 'meccan',  juz: 30 },
  { id: 102, nameAr: 'التكاثر',       nameEn: 'At-Takathur',      meaning: 'The Rivalry in Worldly Gain',verses: 8,    words: 28,    type: 'meccan',  juz: 30 },
  { id: 103, nameAr: 'العصر',         nameEn: 'Al-Asr',           meaning: 'The Declining Day',          verses: 3,    words: 14,    type: 'meccan',  juz: 30 },
  { id: 104, nameAr: 'الهمزة',        nameEn: 'Al-Humazah',       meaning: 'The Traducer',               verses: 9,    words: 33,    type: 'meccan',  juz: 30 },
  { id: 105, nameAr: 'الفيل',         nameEn: 'Al-Fil',           meaning: 'The Elephant',               verses: 5,    words: 23,    type: 'meccan',  juz: 30 },
  { id: 106, nameAr: 'قريش',          nameEn: 'Quraysh',          meaning: 'Quraysh',                    verses: 4,    words: 17,    type: 'meccan',  juz: 30 },
  { id: 107, nameAr: 'الماعون',       nameEn: 'Al-Ma\'un',        meaning: 'The Small Kindnesses',       verses: 7,    words: 25,    type: 'meccan',  juz: 30 },
  { id: 108, nameAr: 'الكوثر',        nameEn: 'Al-Kawthar',       meaning: 'The Abundance',              verses: 3,    words: 10,    type: 'meccan',  juz: 30 },
  { id: 109, nameAr: 'الكافرون',      nameEn: 'Al-Kafirun',       meaning: 'The Disbelievers',           verses: 6,    words: 27,    type: 'meccan',  juz: 30 },
  { id: 110, nameAr: 'النصر',         nameEn: 'An-Nasr',          meaning: 'The Divine Support',         verses: 3,    words: 19,    type: 'medinan', juz: 30 },
  { id: 111, nameAr: 'المسد',         nameEn: 'Al-Masad',         meaning: 'The Palm Fibre',             verses: 5,    words: 23,    type: 'meccan',  juz: 30 },
  { id: 112, nameAr: 'الإخلاص',       nameEn: 'Al-Ikhlas',        meaning: 'The Sincerity',              verses: 4,    words: 15,    type: 'meccan',  juz: 30 },
  { id: 113, nameAr: 'الفلق',         nameEn: 'Al-Falaq',         meaning: 'The Daybreak',               verses: 5,    words: 23,    type: 'meccan',  juz: 30 },
  { id: 114, nameAr: 'الناس',         nameEn: 'An-Nas',           meaning: 'Mankind',                    verses: 6,    words: 20,    type: 'meccan',  juz: 30 },
];

/* ─── Helper Accessors ─────────────────────────────────────────────── */

/** Return only the Meccan-revealed suras (86 total). */
export function getMeccanSuras() {
  return SURAS.filter(s => s.type === 'meccan');
}

/** Return only the Medinan-revealed suras (28 total). */
export function getMedinanSuras() {
  return SURAS.filter(s => s.type === 'medinan');
}

/** Look up a single sura by its 1-based id. */
export function getSuraById(id) {
  return SURAS[id - 1] ?? null;
}

/** Get all suras that begin in a specific juz. */
export function getSurasByJuz(juz) {
  return SURAS.filter(s => s.juz === juz);
}
