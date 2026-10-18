import React from 'react';
import { FestivalOccurrence, FestivalContent, FestivalMedia, FestivalSettings } from '../types';

interface Props {
  formData: any;
  occurrence: Partial<FestivalOccurrence>;
  content: Partial<FestivalContent>;
  media: FestivalMedia[];
  settings: Partial<FestivalSettings> | null;
  bannerUrl: string;
}

const Row: React.FC<{ label: string; value?: string | null }> = ({ label, value }) =>
  value ? <p className="text-xs text-[#d0c5af]"><span className="text-[#f2ca50]">{label}:</span> {value}</p> : null;

const fmt = (ts: string | null | undefined) => ts ? ts.slice(11, 16) : '';

export const Step11Review: React.FC<Props> = ({ formData, occurrence, content, media, settings, bannerUrl }) => {
  const warnings: string[] = [];
  if (!formData.name?.trim())                warnings.push('Festival name is missing');
  if (!occurrence.festival_date)             warnings.push('Festival date is missing');
  if (!bannerUrl)                            warnings.push('Cover image is missing');
  if (!content.festival_description?.trim()) warnings.push('Festival description is missing');

  const relatedCount = [
    content.related_scriptures, content.related_slokas, content.related_mantras,
    content.related_stotrams, content.related_music, content.related_stories,
  ].reduce((sum, arr) => sum + ((arr as any[])?.length ?? 0), 0);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-serif-headline text-lg font-bold text-[#f2ca50] mb-1">Review & Publish</h3>
        <p className="text-xs text-[#d0c5af]/70">Review all details before publishing.</p>
      </div>

      {warnings.length > 0 && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1">
          <p className="text-xs font-semibold text-amber-300">Warnings</p>
          {warnings.map(w => (
            <p key={w} className="text-xs text-amber-300 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-xs">warning</span>{w}
            </p>
          ))}
        </div>
      )}

      {bannerUrl && (
        <div className="rounded-xl overflow-hidden border border-white/10 h-32">
          <img src={bannerUrl} alt="Festival" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Festival Details */}
      <div className="p-4 bg-[#0c1321] rounded-xl border border-white/10 space-y-2">
        <p className="text-xs font-semibold text-[#f2ca50] mb-2">Festival Details</p>
        <Row label="Name"              value={formData.name} />
        <Row label="Alternate Name"    value={formData.alternate_name} />
        <Row label="Type"              value={formData.festival_type} />
        <Row label="Tradition"         value={formData.tradition} />
        <Row label="Primary Deity"     value={formData.primary_deity} />
        <Row label="Short Description" value={formData.short_description} />
        <Row label="Status"            value={formData.status} />
        <Row label="Active"            value={(formData.is_active ?? true) ? 'Yes' : 'No'} />
      </div>

      {/* Panchanga */}
      {occurrence.festival_date && (
        <div className="p-4 bg-[#0c1321] rounded-xl border border-white/10 space-y-2">
          <p className="text-xs font-semibold text-[#f2ca50] mb-2">Panchanga</p>
          <Row label="Date"      value={occurrence.festival_date} />
          <Row label="Year"      value={String(occurrence.year)} />
          <Row label="Tithi"     value={[occurrence.paksha, occurrence.tithi_name].filter(Boolean).join(' — ')} />
          <Row label="Nakshatra" value={occurrence.nakshatra_name} />
          <Row label="Yoga"      value={occurrence.yoga_name} />
        </div>
      )}

      {/* Timings */}
      {(occurrence.shubha_muhurta_start || occurrence.puja_time_start || occurrence.rahu_kalam_start) && (
        <div className="p-4 bg-[#0c1321] rounded-xl border border-white/10 space-y-2">
          <p className="text-xs font-semibold text-[#f2ca50] mb-2">Timings</p>
          {occurrence.shubha_muhurta_start && <Row label="Shubha Muhurta" value={`${fmt(occurrence.shubha_muhurta_start)} – ${fmt(occurrence.shubha_muhurta_end)}`} />}
          {occurrence.puja_time_start      && <Row label="Puja Time"      value={`${fmt(occurrence.puja_time_start)} – ${fmt(occurrence.puja_time_end)}`} />}
          {occurrence.rahu_kalam_start     && <Row label="Rahu Kalam"     value={`${fmt(occurrence.rahu_kalam_start)} – ${fmt(occurrence.rahu_kalam_end)}`} />}
          {occurrence.yamagandam_start     && <Row label="Yamagandam"     value={`${fmt(occurrence.yamagandam_start)} – ${fmt(occurrence.yamagandam_end)}`} />}
          {occurrence.gulika_kalam_start   && <Row label="Gulika Kalam"   value={`${fmt(occurrence.gulika_kalam_start)} – ${fmt(occurrence.gulika_kalam_end)}`} />}
          {(occurrence.custom_timings?.length ?? 0) > 0 && (
            <Row label="Custom Timings" value={`${occurrence.custom_timings!.length} added`} />
          )}
        </div>
      )}

      {/* Fasting */}
      {occurrence.fasting_enabled && (
        <div className="p-4 bg-[#0c1321] rounded-xl border border-white/10 space-y-2">
          <p className="text-xs font-semibold text-[#f2ca50] mb-2">Fasting / Vrata</p>
          <Row label="Type"            value={occurrence.fasting_type} />
          <Row label="Rules"           value={occurrence.fasting_rules} />
          <Row label="Parana Required" value={occurrence.parana_required ? 'Yes' : 'No'} />
          {occurrence.parana_required && occurrence.parana_time && (
            <Row label="Parana Time" value={fmt(occurrence.parana_time)} />
          )}
        </div>
      )}

      {/* Festival Content */}
      {(content.festival_description || content.spiritual_significance || content.story_r2_url) && (
        <div className="p-4 bg-[#0c1321] rounded-xl border border-white/10 space-y-2">
          <p className="text-xs font-semibold text-[#f2ca50] mb-2">Festival Content</p>
          {content.festival_description  && <Row label="Description"         value="✓ Added" />}
          {content.spiritual_significance && <Row label="Spiritual Significance" value="✓ Added" />}
          {content.story_r2_url          && <Row label="Story JSON"           value="✓ Uploaded to R2" />}
        </div>
      )}

      {/* Puja */}
      {(content.puja_name || content.puja_r2_url) && (
        <div className="p-4 bg-[#0c1321] rounded-xl border border-white/10 space-y-2">
          <p className="text-xs font-semibold text-[#f2ca50] mb-2">Puja</p>
          {content.puja_name    && <Row label="Puja Name"    value={content.puja_name} />}
          {content.puja_r2_url  && <Row label="Puja Vidhi"   value="✓ Uploaded to R2" />}
          {(content.puja_samagri as any[])?.length > 0 && (
            <Row label="Samagri Items" value={`${(content.puja_samagri as any[]).length} items`} />
          )}
        </div>
      )}

      {/* Related Content */}
      {relatedCount > 0 && (
        <div className="p-4 bg-[#0c1321] rounded-xl border border-white/10 space-y-2">
          <p className="text-xs font-semibold text-[#f2ca50] mb-2">Related Content</p>
          <Row label="Linked Items" value={`${relatedCount} reference(s) linked`} />
        </div>
      )}

      {/* Media */}
      {media.length > 0 && (
        <div className="p-4 bg-[#0c1321] rounded-xl border border-white/10 space-y-2">
          <p className="text-xs font-semibold text-[#f2ca50] mb-2">Media</p>
          <Row label="Files" value={`${media.length} file(s) uploaded to R2`} />
          {media.find(m => m.is_cover) && <Row label="Cover Image" value="✓ Set" />}
        </div>
      )}

      {/* Publishing Settings */}
      {settings && (
        <div className="p-4 bg-[#0c1321] rounded-xl border border-white/10 space-y-2">
          <p className="text-xs font-semibold text-[#f2ca50] mb-2">Publishing Settings</p>
          <Row label="Show on Home"      value={settings.show_on_home ? 'Yes' : 'No'} />
          <Row label="Featured"          value={settings.is_featured ? 'Yes' : 'No'} />
          <Row label="Show in Calendar"  value={settings.show_in_calendar ? 'Yes' : 'No'} />
          {settings.priority !== undefined && settings.priority > 0 && (
            <Row label="Priority" value={String(settings.priority)} />
          )}
          {settings.show_from  && <Row label="Show From"  value={settings.show_from} />}
          {settings.show_until && <Row label="Show Until" value={settings.show_until} />}
        </div>
      )}

      <div className={`p-4 rounded-xl border text-xs ${warnings.length === 0 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'}`}>
        <p className="font-semibold mb-1">{warnings.length === 0 ? 'Ready to Publish' : 'Review Warnings Above'}</p>
        <p>{warnings.length === 0
          ? 'Click "Publish Festival" to make it live in the app.'
          : 'You can still publish, but consider fixing the warnings first.'}</p>
      </div>
    </div>
  );
};
