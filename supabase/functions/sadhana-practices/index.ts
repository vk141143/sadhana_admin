import { requireAdmin } from '../_shared/requireAdmin.ts';
import {
  createSadhanaPracticesHandler,
  type SadhanaPracticeRepository,
} from '../_shared/sadhanaPractices.ts';
import type {
  SadhanaPractice,
  SadhanaPracticeInput,
  SadhanaPracticeUpdate,
} from '../../../src/types/sadhanaPractice.ts';

const handler = createSadhanaPracticesHandler({
  async authorize(request, write): Promise<SadhanaPracticeRepository> {
    const { db } = await requireAdmin(request, write);
    const table = () => db.from('sadhana_practices');

    return {
      async list() {
        return await table()
          .select('*')
          .order('display_order', { ascending: true })
          .order('name', { ascending: true }) as {
            data: SadhanaPractice[] | null;
            error: { code?: string } | null;
          };
      },
      async find(id) {
        return await table().select('*').eq('id', id).maybeSingle() as {
          data: SadhanaPractice | null;
          error: { code?: string } | null;
        };
      },
      async create(input: SadhanaPracticeInput) {
        return await table().insert(input).select('*').single() as {
          data: SadhanaPractice | null;
          error: { code?: string } | null;
        };
      },
      async update(id, input: SadhanaPracticeUpdate) {
        return await table().update(input).eq('id', id).is('archived_at', null).select('*').maybeSingle() as {
          data: SadhanaPractice | null;
          error: { code?: string } | null;
        };
      },
      async archive(id) {
        return await table().update({ is_active: false, archived_at: new Date().toISOString() })
          .eq('id', id).is('archived_at', null).select('*').maybeSingle() as {
            data: SadhanaPractice | null;
            error: { code?: string } | null;
          };
      },
      async validateScriptureReference(reference) {
        const { data: scripture, error: scriptureError } = await db.from('scriptures')
          .select('id')
          .eq('id', reference.scriptureId)
          .maybeSingle();
        if (scriptureError) return { data: null, error: scriptureError };
        if (!scripture) return { data: false, error: null };
        if (!reference.chapterId) return { data: true, error: null };

        const { data: chapter, error: chapterError } = await db.from('chapters')
          .select('id, chapter_number')
          .eq('id', reference.chapterId)
          .eq('scripture_id', reference.scriptureId)
          .maybeSingle();
        if (chapterError) return { data: null, error: chapterError };
        if (!chapter || reference.chapterNumber !== undefined &&
            chapter.chapter_number !== reference.chapterNumber) {
          return { data: false, error: null };
        }

        const verseNumbers = [reference.startVerse, reference.endVerse]
          .filter((value): value is number => value !== undefined);
        if (verseNumbers.length) {
          const { data: verses, error: verseError } = await db.from('slokas')
            .select('verse_number')
            .eq('chapter_id', reference.chapterId)
            .in('verse_number', [...new Set(verseNumbers)]);
          if (verseError) return { data: null, error: verseError };
          const found = new Set((verses ?? []).map(verse => verse.verse_number));
          if (verseNumbers.some(number => !found.has(number))) return { data: false, error: null };
        }
        return { data: true, error: null };
      },
    };
  },
});

Deno.serve(handler);
