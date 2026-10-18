import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabaseClient';

export type LibraryScripture = {
  id: string;
  name: string;
  description: string;
  cover_image_url?: string;
  status: 'Draft' | 'Published' | 'Archived';
  created_at?: string;
  updated_at?: string;
};

export type LibraryChapter = {
  id: string;
  scripture_id: string;
  chapter_number: number;
  title: string;
  subtitle?: string;
  description?: string;
  image_url?: string;
  sloka_count: number;
  status: 'Draft' | 'Published' | 'Archived';
  created_at?: string;
  updated_at?: string;
};

export type LibrarySloka = {
  id: string;
  chapter_id: string;
  verse_number: number;
  verse_id: string;
  json_url: string;
  status: 'Draft' | 'Published' | 'Archived';
  created_at?: string;
  updated_at?: string;
};

export type LibraryVersePayload = {
  id: string;
  verse_number: number;
  sanskrit: { devanagari: string; transliteration: string };
  languages: Record<string, { translation: string; meaning: string; explanation: string; example: string }>;
};

export type UserPreferenceRecord = {
  user_id: string;
  preferred_reading_language: string;
  updated_at?: string;
};

export type ReadingProgressRecord = {
  id: string;
  user_id: string;
  scripture_id: string;
  chapter_id: string;
  last_verse_number: number;
  language: string;
  updated_at: string;
};

export type BookmarkRecord = {
  id: string;
  user_id: string;
  scripture_id: string;
  chapter_id: string;
  verse_id: string;
  verse_number: number;
  created_at: string;
};

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  hi: 'हिन्दी',
  te: 'తెలుగు',
  ta: 'தமிழ்',
  kn: 'ಕನ್ನಡ',
  ml: 'മലയാളം',
};

const safeDate = (value?: string) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return '—';
  }
};

const fetchJson = async (url: string): Promise<LibraryVersePayload | null> => {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as LibraryVersePayload;
  } catch {
    return null;
  }
};

export const LibraryView: React.FC = () => {
  const [scriptures, setScriptures] = useState<LibraryScripture[]>([]);
  const [selectedScripture, setSelectedScripture] = useState<LibraryScripture | null>(null);
  const [chapters, setChapters] = useState<LibraryChapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<LibraryChapter | null>(null);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [slokas, setSlokas] = useState<LibrarySloka[]>([]);
  const [chapterContent, setChapterContent] = useState<LibraryVersePayload[]>([]);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [userLanguagePreference, setUserLanguagePreference] = useState<string | null>(null);
  const [continueReading, setContinueReading] = useState<ReadingProgressRecord | null>(null);
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [pendingVerseNumber, setPendingVerseNumber] = useState<number | null>(null);
  const [progressMap, setProgressMap] = useState<Record<string, ReadingProgressRecord>>({});

  const getCurrentUserId = async (): Promise<string | null> => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user.id;
  };

  const loadUserPreference = async (activeUserId: string) => {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', activeUserId)
      .maybeSingle();

    if (!error && data) {
      setUserLanguagePreference(data.preferred_reading_language || null);
    }
  };

  const loadUserProgress = async (activeUserId: string) => {
    const { data, error } = await supabase
      .from('reading_progress')
      .select('*')
      .eq('user_id', activeUserId)
      .order('updated_at', { ascending: false });

    if (error) return;
    const nextProgress = (data || []) as ReadingProgressRecord[];
    setContinueReading(nextProgress[0] || null);
    setProgressMap(Object.fromEntries(nextProgress.map((item) => [item.chapter_id, item])));
  };

  const loadUserBookmarks = async (activeUserId: string) => {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', activeUserId)
      .order('created_at', { ascending: false });

    if (!error) {
      setBookmarks((data || []) as BookmarkRecord[]);
    }
  };

  const saveUserPreference = async (language: string) => {
    if (!userId) return;
    await supabase
      .from('user_preferences')
      .upsert(
        {
          user_id: userId,
          preferred_reading_language: language,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
    setUserLanguagePreference(language);
  };

  const saveReadingProgress = async (payload?: { chapterId?: string; verseNumber?: number; language?: string }) => {
    if (!userId || !selectedScripture || !selectedChapter) return;
    const verse = chapterContent[currentVerseIndex] || null;
    const nextVerseNumber = payload?.verseNumber ?? verse?.verse_number ?? 1;
    const nextLanguage = payload?.language ?? selectedLanguage ?? 'en';

    const progressPayload = {
      user_id: userId,
      scripture_id: selectedScripture.id,
      chapter_id: selectedChapter.id,
      last_verse_number: nextVerseNumber,
      language: nextLanguage,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('reading_progress')
      .upsert(progressPayload, { onConflict: 'user_id,scripture_id,chapter_id' });

    if (!error) {
      const merged = {
        ...progressPayload,
        id: `${userId}-${selectedScripture.id}-${selectedChapter.id}`,
      } as ReadingProgressRecord;
      setProgressMap((prev) => ({ ...prev, [selectedChapter.id]: merged }));
      setContinueReading(merged);
    }
  };

  const toggleBookmark = async () => {
    if (!userId || !selectedScripture || !selectedChapter || !currentVerse) return;

    const existing = bookmarks.find((bookmark) => bookmark.verse_id === currentVerse.id);
    const payload = {
      user_id: userId,
      scripture_id: selectedScripture.id,
      chapter_id: selectedChapter.id,
      verse_id: currentVerse.id,
      verse_number: currentVerse.verse_number,
    };

    if (existing) {
      const { error } = await supabase.from('bookmarks').delete().eq('id', existing.id);
      if (!error) {
        setBookmarks((prev) => prev.filter((item) => item.id !== existing.id));
      }
      return;
    }

    const { data, error } = await supabase
      .from('bookmarks')
      .insert({ ...payload, created_at: new Date().toISOString() })
      .select()
      .single();

    if (!error && data) {
      setBookmarks((prev) => [data as BookmarkRecord, ...prev]);
    }
  };

  const openBookmark = async (bookmark: BookmarkRecord) => {
    const { data: chapterData, error: chapterError } = await supabase
      .from('chapters')
      .select('*')
      .eq('id', bookmark.chapter_id)
      .maybeSingle();

    if (chapterError || !chapterData) return;

    const { data: scriptureData } = await supabase
      .from('scriptures')
      .select('*')
      .eq('id', chapterData.scripture_id)
      .maybeSingle();

    if (!scriptureData) return;

    const nextScripture = scriptureData as LibraryScripture;
    const nextChapter = chapterData as LibraryChapter;
    setShowBookmarks(false);
    setSelectedScripture(nextScripture);
    setSelectedChapter(null);
    setPendingVerseNumber(bookmark.verse_number);
    setCurrentVerseIndex(0);
    await openChapter(nextChapter);
  };

  const loadScriptures = async () => {
    try {
      setLoading(true);
      setError('');
      const { data, error } = await supabase
        .from('scriptures')
        .select('*')
        .eq('status', 'Published')
        .order('name');

      if (error) throw error;
      setScriptures((data || []) as LibraryScripture[]);
    } catch (e: any) {
      setError(e?.message || 'Unable to load library.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadScriptures();
    const loadUserSession = async () => {
      const activeUserId = await getCurrentUserId();
      if (!activeUserId) return;
      setUserId(activeUserId);
      await Promise.all([loadUserPreference(activeUserId), loadUserProgress(activeUserId), loadUserBookmarks(activeUserId)]);
    };
    void loadUserSession();
  }, []);

  useEffect(() => {
    if (!selectedScripture || !selectedChapter || !chapterContent.length || !userId) return;
    const verse = chapterContent[currentVerseIndex];
    if (!verse) return;

    const timeout = window.setTimeout(() => {
      void saveReadingProgress({ verseNumber: verse.verse_number, language: selectedLanguage });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [currentVerseIndex, selectedChapter, selectedScripture, selectedLanguage, userId, chapterContent]);

  useEffect(() => {
    if (pendingVerseNumber === null || !chapterContent.length) return;
    const targetIndex = chapterContent.findIndex((verse) => verse.verse_number === pendingVerseNumber);
    if (targetIndex >= 0) {
      setCurrentVerseIndex(targetIndex);
    }
    setPendingVerseNumber(null);
  }, [chapterContent, pendingVerseNumber]);

  const filteredScriptures = useMemo(() => {
    if (!search.trim()) return scriptures;
    const searchText = search.toLowerCase();
    return scriptures.filter((item) => item.name.toLowerCase().includes(searchText) || item.description.toLowerCase().includes(searchText));
  }, [scriptures, search]);

  const openScripture = async (scripture: LibraryScripture) => {
    setSelectedScripture(scripture);
    setSelectedChapter(null);
    setAvailableLanguages([]);
    setSelectedLanguage(userLanguagePreference || 'en');
    setSlokas([]);
    setChapterContent([]);
    setCurrentVerseIndex(0);
    setError('');

    try {
      setLoading(true);
      const { data, error: chaptersError } = await supabase
        .from('chapters')
        .select('*')
        .eq('scripture_id', scripture.id)
        .eq('status', 'Published')
        .order('chapter_number');

      if (chaptersError) throw chaptersError;
      setChapters((data || []) as LibraryChapter[]);
    } catch (e: any) {
      setError(e?.message || 'Unable to load chapters.');
    } finally {
      setLoading(false);
    }
  };

  const openChapter = async (chapter: LibraryChapter) => {
    setSelectedChapter(chapter);
    setCurrentVerseIndex(0);
    setChapterContent([]);
    setError('');

    try {
      setLoading(true);
      const { data, error: slokaError } = await supabase
        .from('slokas')
        .select('*')
        .eq('chapter_id', chapter.id)
        .eq('status', 'Published')
        .order('verse_number');

      if (slokaError) throw slokaError;

      const records = (data || []) as LibrarySloka[];
      setSlokas(records);

      const languageSet = new Set<string>();
      for (const record of records) {
        const item = await fetchJson(record.json_url);
        if (item && item.languages) {
          Object.keys(item.languages).forEach((lang) => languageSet.add(lang));
        }
      }

      const candidateLanguages = Array.from(languageSet).sort((a, b) => a.localeCompare(b));
      const available = candidateLanguages.length ? candidateLanguages : ['en'];
      const preferredLanguage = userLanguagePreference && available.includes(userLanguagePreference)
        ? userLanguagePreference
        : available[0] || 'en';

      setAvailableLanguages(available);
      setSelectedLanguage(preferredLanguage);
      await loadChapterVerses(chapter.id, preferredLanguage, records);
    } catch (e: any) {
      setError(e?.message || 'Unable to load this chapter.');
    } finally {
      setLoading(false);
    }
  };

  const loadChapterVerses = async (chapterId: string, language: string, records: LibrarySloka[]) => {
    if (!records.length) {
      setChapterContent([]);
      return;
    }

    const verses: LibraryVersePayload[] = [];
    for (const record of records) {
      const item = await fetchJson(record.json_url);
      if (item) {
        verses.push(item);
      }
    }

    const sorted = verses.sort((a, b) => a.verse_number - b.verse_number);
    const savedProgress = progressMap[chapterId];
    const fallbackIndex = savedProgress ? sorted.findIndex((verse) => verse.verse_number === savedProgress.last_verse_number) : -1;
    const nextIndex = fallbackIndex >= 0 ? fallbackIndex : 0;

    setChapterContent(sorted);
    setCurrentVerseIndex(nextIndex);

    const chapterHasSelectedLanguage = sorted.some((item) => item.languages?.[language]);
    if (!chapterHasSelectedLanguage && sorted[0]?.languages) {
      const fallbackLanguage = Object.keys(sorted[0].languages)[0] || 'en';
      setSelectedLanguage(fallbackLanguage);
    }
  };

  const currentVerse = chapterContent[currentVerseIndex] || null;
  const currentLanguageContent = currentVerse?.languages?.[selectedLanguage]
    || currentVerse?.languages?.[Object.keys(currentVerse.languages || {})[0]]
    || null;
  const isVerseBookmarked = !!currentVerse && bookmarks.some((bookmark) => bookmark.verse_id === currentVerse.id);

  const onLanguageChange = async (language: string) => {
    if (!selectedChapter) return;
    setSelectedLanguage(language);
    await saveUserPreference(language);
  };

  const previousVerse = () => setCurrentVerseIndex((index) => Math.max(0, index - 1));
  const nextVerse = () => setCurrentVerseIndex((index) => Math.min(chapterContent.length - 1, index + 1));

  const renderContinueReadingCard = () => {
    if (!continueReading) return null;
    const scripture = scriptures.find((item) => item.id === continueReading.scripture_id);
    return (
      <div className="glass-card rounded-2xl p-5 border border-[#f2ca50]/30">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#f2ca50]">Continue Reading</p>
            <h3 className="font-serif-headline text-2xl text-[#dce2f6] mt-2">{scripture?.name || 'Sacred text'}</h3>
            <p className="text-sm text-[#d0c5af]/80 mt-1">Verse {continueReading.last_verse_number} • {LANGUAGE_LABELS[continueReading.language] || continueReading.language.toUpperCase()}</p>
          </div>
          <button
            onClick={async () => {
              const chapter = chapters.find((item) => item.id === continueReading.chapter_id)
                || (await (async () => {
                  const { data } = await supabase.from('chapters').select('*').eq('id', continueReading.chapter_id).maybeSingle();
                  return data as LibraryChapter | null;
                })());

              if (!chapter) return;
              const scriptureMatch = scriptures.find((item) => item.id === continueReading.scripture_id)
                || (await (async () => {
                  const { data } = await supabase.from('scriptures').select('*').eq('id', continueReading.scripture_id).maybeSingle();
                  return data as LibraryScripture | null;
                })());

              if (scriptureMatch) {
                setSelectedScripture(scriptureMatch);
                setSelectedChapter(null);
                setPendingVerseNumber(continueReading.last_verse_number);
                await openChapter(chapter);
              }
            }}
            className="px-4 py-2 bg-[#f2ca50]/10 text-[#f2ca50] font-bold rounded-lg hover:bg-[#f2ca50] hover:text-[#3c2f00] transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    );
  };

  const renderScripturesView = () => (
    <div className="p-4 md:p-10 space-y-6 pb-28">
      <div>
        <h2 className="font-serif-headline text-3xl md:text-5xl text-[#dce2f6] font-bold">Library</h2>
        <p className="text-sm md:text-base text-[#d0c5af]/80 mt-1">Explore sacred scriptures and continue your reading journey.</p>
      </div>

      <div className="glass-card rounded-2xl p-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search scriptures..."
          className="w-full bg-[#0c1321] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-[#dce2f6] placeholder-[#d0c5af]/30 outline-none focus:ring-1 focus:ring-[#f2ca50]"
        />
      </div>

      {renderContinueReadingCard()}

      <div className="glass-card rounded-2xl p-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#f2ca50]">Saved for later</p>
          <p className="text-sm text-[#d0c5af]">{bookmarks.length} bookmarked verses</p>
        </div>
        <button
          onClick={() => setShowBookmarks(true)}
          className="px-4 py-2 border border-white/10 text-[#dce2f6] rounded-xl text-sm font-semibold hover:border-[#f2ca50]/60"
        >
          Bookmarks
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">{error}</div>
      )}

      {loading ? (
        <div className="glass-card rounded-2xl p-8 text-sm text-[#d0c5af]">Loading library...</div>
      ) : filteredScriptures.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-[#d0c5af]">
          <p className="font-semibold text-lg text-[#dce2f6]">No scriptures available yet.</p>
          <p className="mt-2 text-sm">New spiritual content will appear here soon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredScriptures.map((scripture) => (
            <div key={scripture.id} className="glass-card rounded-2xl p-6 flex flex-col justify-between border-l-4 border-[#f2ca50]">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-serif-headline text-2xl font-bold text-[#dce2f6]">{scripture.name}</h3>
                    <p className="text-xs text-[#f2ca50] mt-1 uppercase tracking-[0.2em]">Published</p>
                  </div>
                  {scripture.cover_image_url && (
                    <img src={scripture.cover_image_url} alt={scripture.name} className="w-14 h-14 rounded-xl object-cover border border-white/10" />
                  )}
                </div>
                <p className="text-sm text-[#d0c5af]/80 mt-4 leading-relaxed">{scripture.description || 'Sacred scripture content.'}</p>
              </div>

              <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between gap-3">
                <span className="text-[11px] text-[#d0c5af]/60">Updated {safeDate(scripture.updated_at)}</span>
                <button
                  onClick={() => openScripture(scripture)}
                  className="px-4 py-2 bg-[#f2ca50]/10 text-[#f2ca50] font-bold rounded-lg hover:bg-[#f2ca50] hover:text-[#3c2f00] transition-colors"
                >
                  Continue Reading
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderBookmarksView = () => (
    <div className="p-4 md:p-10 space-y-6 pb-28">
      <button onClick={() => setShowBookmarks(false)} className="text-xs text-[#f2ca50]">← Back to Library</button>
      <div>
        <p className="text-xs text-[#d0c5af]/70">Library / Bookmarks</p>
        <h2 className="font-serif-headline text-3xl md:text-5xl text-[#dce2f6] font-bold">Bookmarks</h2>
      </div>

      {bookmarks.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-[#d0c5af]">
          <p className="font-semibold text-lg text-[#dce2f6]">No bookmarks yet.</p>
          <p className="mt-2 text-sm">Saved verses will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookmarks.map((bookmark) => (
            <div key={bookmark.id} className="glass-card rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#f2ca50]">Verse {bookmark.verse_number}</p>
                <h3 className="font-serif-headline text-2xl text-[#dce2f6] mt-1">{bookmark.verse_id}</h3>
              </div>
              <button
                onClick={() => void openBookmark(bookmark)}
                className="px-4 py-2 bg-[#f2ca50]/10 text-[#f2ca50] font-bold rounded-lg hover:bg-[#f2ca50] hover:text-[#3c2f00] transition-colors"
              >
                Open
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderScriptureView = () => (
    <div className="p-4 md:p-10 space-y-6 pb-28">
      <button onClick={() => setSelectedScripture(null)} className="text-xs text-[#f2ca50]">← Back to Library</button>
      <div>
        <p className="text-xs text-[#d0c5af]/70">Library / {selectedScripture?.name}</p>
        <h2 className="font-serif-headline text-3xl md:text-5xl text-[#dce2f6] font-bold">{selectedScripture?.name}</h2>
      </div>

      {loading ? (
        <div className="glass-card rounded-2xl p-8 text-sm text-[#d0c5af]">Loading chapters...</div>
      ) : chapters.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-[#d0c5af]">
          <p className="font-semibold text-lg text-[#dce2f6]">No chapters available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {chapters.map((chapter) => (
            <div key={chapter.id} className="glass-card rounded-2xl p-5 border border-white/10 hover:border-[#f2ca50]/40">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#d0c5af]/60">Chapter {chapter.chapter_number}</p>
                  <h3 className="font-serif-headline text-2xl font-bold text-[#dce2f6] mt-1">{chapter.title}</h3>
                </div>
                {chapter.image_url && <img src={chapter.image_url} alt={chapter.title} className="w-14 h-14 rounded-xl object-cover border border-white/10" />}
              </div>

              {chapter.subtitle && <p className="text-sm text-[#f2ca50] mt-2">{chapter.subtitle}</p>}
              {chapter.description && <p className="text-xs text-[#d0c5af]/80 mt-3">{chapter.description}</p>}

              <div className="mt-4 flex items-center justify-between">
                <span className="text-[11px] text-[#d0c5af]/60">{chapter.sloka_count} Slokas</span>
                <button
                  onClick={() => openChapter(chapter)}
                  className="px-3.5 py-2 bg-[#f2ca50]/10 text-[#f2ca50] font-bold rounded-lg hover:bg-[#f2ca50] hover:text-[#3c2f00] transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderReadingView = () => {
    if (!selectedScripture || !selectedChapter) return null;

    return (
      <div className="p-4 md:p-10 space-y-6 pb-28">
        <button onClick={async () => {
          await saveReadingProgress();
          setSelectedChapter(null);
        }} className="text-xs text-[#f2ca50]">← Back to Chapters</button>

        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs text-[#d0c5af]/70">{selectedScripture.name} / Chapter {selectedChapter.chapter_number}</p>
          <div className="mt-2 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="font-serif-headline text-3xl text-[#dce2f6] font-bold">{selectedChapter.title}</h2>
              {selectedChapter.subtitle && <p className="text-sm text-[#f2ca50] mt-1">{selectedChapter.subtitle}</p>}
            </div>

            {availableLanguages.length > 0 && (
              <select
                value={selectedLanguage}
                onChange={(e) => void onLanguageChange(e.target.value)}
                className="bg-[#0c1321] border border-white/10 rounded-xl px-3 py-2 text-sm text-[#dce2f6] outline-none"
              >
                {availableLanguages.map((lang) => (
                  <option key={lang} value={lang}>{LANGUAGE_LABELS[lang] || lang.toUpperCase()}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">{error}</div>
        )}

        <div className="glass-card rounded-2xl p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <button
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-[#dce2f6] text-sm font-semibold"
              onClick={() => void toggleBookmark()}
            >
              <span>{isVerseBookmarked ? '♥' : '♡'}</span>
              {isVerseBookmarked ? 'Bookmarked' : 'Bookmark'}
            </button>
            <button className="px-4 py-2 rounded-xl bg-[#f2ca50]/10 text-[#f2ca50] font-bold text-sm">▶ Listen</button>
          </div>
        </div>

        {loading ? (
          <div className="glass-card rounded-2xl p-8 text-sm text-[#d0c5af]">Loading chapter...</div>
        ) : !currentVerse ? (
          <div className="glass-card rounded-2xl p-8 text-center text-[#d0c5af]">
            <p className="font-semibold text-lg text-[#dce2f6]">No verses available yet.</p>
          </div>
        ) : (
          <div className="glass-card rounded-2xl p-5 md:p-7 space-y-6">
            <div className="flex items-center justify-between text-xs text-[#d0c5af]/70">
              <span>Sloka {currentVerse.verse_number} / {chapterContent.length}</span>
              <span>{LANGUAGE_LABELS[selectedLanguage] || selectedLanguage.toUpperCase()}</span>
            </div>

            <div className="space-y-6">
              <div className="rounded-xl bg-[#0c1321] border border-white/10 p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#f2ca50] mb-2">Sanskrit</p>
                <p className="font-serif-headline text-2xl leading-relaxed text-[#f2ca50]">{currentVerse.sanskrit.devanagari}</p>
                <p className="mt-3 text-sm text-[#d0c5af] italic">{currentVerse.sanskrit.transliteration}</p>
              </div>

              {currentLanguageContent && (
                <div className="space-y-4">
                  <div className="rounded-xl bg-[#0c1321] border border-white/10 p-4">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#f2ca50] mb-2">Translation</p>
                    <p className="text-sm leading-relaxed text-[#dce2f6]">{currentLanguageContent.translation}</p>
                  </div>
                  <div className="rounded-xl bg-[#0c1321] border border-white/10 p-4">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#f2ca50] mb-2">Meaning</p>
                    <p className="text-sm leading-relaxed text-[#dce2f6]">{currentLanguageContent.meaning}</p>
                  </div>
                  <div className="rounded-xl bg-[#0c1321] border border-white/10 p-4">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#f2ca50] mb-2">Explanation</p>
                    <p className="text-sm leading-relaxed text-[#dce2f6]">{currentLanguageContent.explanation}</p>
                  </div>
                  <div className="rounded-xl bg-[#0c1321] border border-white/10 p-4">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#f2ca50] mb-2">Example</p>
                    <p className="text-sm leading-relaxed text-[#dce2f6]">{currentLanguageContent.example}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/10">
              <button
                onClick={previousVerse}
                disabled={currentVerseIndex === 0}
                className="px-4 py-2 rounded-xl border border-white/10 text-sm font-semibold text-[#dce2f6] disabled:opacity-40"
              >
                ← Previous
              </button>
              <button
                onClick={nextVerse}
                disabled={currentVerseIndex >= chapterContent.length - 1}
                className="px-4 py-2 rounded-xl bg-[#f2ca50] text-[#3c2f00] font-bold text-sm disabled:opacity-40"
              >
                Next →
              </button>
            </div>

            {currentVerseIndex >= chapterContent.length - 1 && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                Chapter complete. Continue to the next chapter when available.
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (showBookmarks) return renderBookmarksView();
  if (selectedChapter) return renderReadingView();
  if (selectedScripture) return renderScriptureView();
  return renderScripturesView();
};
