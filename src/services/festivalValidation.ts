import type { Festival, FestivalOccurrence, FestivalContent, FestivalSettings } from '../types';

export const festivalFields = ['name','alternate_name','slug','festival_type','primary_deity','associated_deities','tradition','short_description','is_active','cover_media_id'] as const;
export const occurrenceFields = ['year','festival_date','tithi_name','paksha','nakshatra_name','yoga_name','shubha_muhurta_start','shubha_muhurta_end','puja_time_start','puja_time_end','rahu_kalam_start','rahu_kalam_end','yamagandam_start','yamagandam_end','gulika_kalam_start','gulika_kalam_end','fasting_enabled','fasting_type','parana_required','parana_time','fasting_rules','custom_timings'] as const;
export const contentFields = ['festival_description','spiritual_significance','festival_story','scriptural_references','puja_name','puja_duration_minutes','puja_description','puja_samagri','puja_vidhi','story_r2_key','story_r2_url','puja_r2_key','puja_r2_url','related_scriptures','related_slokas','related_mantras','related_stotrams','related_music','related_stories'] as const;
export const settingsFields = ['show_on_home','is_featured','priority','show_from','show_until','show_in_calendar'] as const;
export const pickFields = (value: object, fields: readonly string[]) => Object.fromEntries(Object.entries(value).filter(([key, v]) => fields.includes(key) && v !== undefined));
export const festivalSlug = (name: string) => name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const parseFestivalSections = (text: string) => text.split(/^##\s+/m).filter(block => block.trim()).map(block => {
  const [title, ...body] = block.split('\n');
  return { title: title.trim(), content: body.join('\n').trim() };
});
export function festivalTime(value?: string | null): string {
  if (!value || !Number.isFinite(Date.parse(value))) return '';
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value));
}
export interface FestivalDraft {
  festival: Partial<Festival>;
  occurrence: Partial<FestivalOccurrence>;
  content: Partial<FestivalContent>;
  settings: Partial<FestivalSettings>;
}
export type FestivalIssue = { step: number; field: string; message: string };
export function validateFestival(draft: FestivalDraft, publish = false): FestivalIssue[] {
  const { festival: f, occurrence: o, content: c, settings: s } = draft;
  const errors: FestivalIssue[] = [];
  const add = (step: number, field: string, message: string) => errors.push({ step, field, message });
  if (!f.name?.trim()) add(1, 'name', 'Festival name is required.');
  if (!f.short_description?.trim()) add(1, 'short_description', 'Short description is required.');
  if (!['Major Festival','Ekadashi','Purnima','Amavasya','Jayanti','Vrata','Utsava','Other'].includes(f.festival_type ?? '')) add(1, 'festival_type', 'Choose a festival type.');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(f.slug || festivalSlug(f.name || ''))) add(1, 'slug', 'Use lowercase letters, numbers and single hyphens for the slug.');
  if (publish && !o.festival_date) add(2, 'festival_date', 'Festival date is required to publish.');
  if (o.year != null && (!Number.isInteger(o.year) || o.year < 1 || o.year > 9999)) add(2, 'year', 'Enter a whole year between 1 and 9999.');
  if (f.tradition && !['general','vaishnava','shaiva','shakta','smarta','other'].includes(f.tradition)) add(1, 'tradition', 'Choose a valid tradition.');
  if (o.paksha && !['Shukla Paksha','Krishna Paksha'].includes(o.paksha)) add(2, 'paksha', 'Choose a valid Paksha.');
  if (o.festival_date && (!/^\d{4}-\d{2}-\d{2}$/.test(o.festival_date) || !Number.isFinite(Date.parse(o.festival_date)) || new Date(o.festival_date).toISOString().slice(0,10) !== o.festival_date)) add(2, 'festival_date', 'Enter a valid festival date.');
  if (o.festival_date && o.year != null && Number.isFinite(Number(o.year)) && Number(o.festival_date.slice(0,4)) !== Number(o.year)) add(2, 'year', 'Year must match the festival date.');
  for (const prefix of ['shubha_muhurta','puja_time','rahu_kalam','yamagandam','gulika_kalam']) {
    const start = o[`${prefix}_start` as keyof FestivalOccurrence] as string;
    const end = o[`${prefix}_end` as keyof FestivalOccurrence] as string;
    const invalidRange = Boolean(
      (start && !Number.isFinite(Date.parse(start))) ||
      (end && !Number.isFinite(Date.parse(end))) ||
      (start && end && Date.parse(end) < Date.parse(start))
    );
    if (invalidRange) add(3, prefix, 'Enter valid timings with the end at or after the start.');
  }
  (o.custom_timings || []).forEach((t, i) => {
    if (!t.name.trim() || !/^([01]\d|2[0-3]):[0-5]\d$/.test(t.start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(t.end)) add(3, `custom_timings.${i}`, 'Custom timings need a name and valid start/end times.');
    else if (t.end < t.start) add(3, `custom_timings.${i}`, 'End time must not precede start time.');
  });
  if (o.parana_time && !Number.isFinite(Date.parse(o.parana_time))) add(4, 'parana_time', 'Enter a valid Parana time.');
  if (publish && o.fasting_enabled && o.parana_required && !o.parana_time) add(4, 'parana_time', 'Enter the required Parana time.');
  if (c.puja_duration_minutes != null && (!Number.isInteger(c.puja_duration_minutes) || c.puja_duration_minutes < 1)) add(6, 'puja_duration_minutes', 'Puja duration must be a positive integer.');
  (c.puja_samagri || []).forEach((item, i) => { if (!item.item.trim()) add(6, `puja_samagri.${i}`, 'Enter a samagri item or remove the empty row.'); });
  for (const field of ['related_scriptures','related_slokas','related_mantras','related_stotrams','related_music','related_stories'] as const) {
    (c[field] || []).forEach((item, i) => { if (!item.title.trim()) add(7, `${field}.${i}`, 'Enter a title or remove the empty reference.'); });
  }
  if (s.priority != null && (!Number.isInteger(s.priority) || s.priority < 0 || s.priority > 100)) add(8, 'priority', 'Priority must be between 0 and 100.');
  for (const field of ['show_from', 'show_until'] as const) {
    const value = s[field];
    if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0,10) !== value)) add(8, field, 'Enter a valid calendar date.');
  }
  if (s.show_from && s.show_until && s.show_from > s.show_until) add(8, 'show_until', 'Stop showing date must not precede start showing date.');
  return errors;
}
