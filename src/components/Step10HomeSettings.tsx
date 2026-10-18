import React, { useEffect } from 'react';
import { FestivalSettings } from '../types';

interface Step10HomeSettingsProps {
  settings: FestivalSettings | null;
  setSettings: (settings: FestivalSettings | null) => void;
}

const EMPTY: FestivalSettings = {
  id: '',
  festival_id: '',
  show_on_home: false,
  is_featured: false,
  priority: 0,
  show_from: null,
  show_until: null,
  show_in_calendar: true,
  created_at: '',
  updated_at: '',
};

export const Step10HomeSettings: React.FC<Step10HomeSettingsProps> = ({ settings, setSettings }) => {
  useEffect(() => {
    if (!settings) setSettings({ ...EMPTY, id: `settings-${Date.now()}` });
  }, []);

  const set = (field: keyof FestivalSettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
  };

  if (!settings) return <p className="text-xs text-[#d0c5af]/60">Initialising…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-serif-headline text-lg font-bold text-[#f2ca50] mb-1">Home Page Settings</h3>
        <p className="text-xs text-[#d0c5af]/70">Control how this festival appears on the home page and calendar.</p>
      </div>

      <div className="space-y-3">
        {[
          { field: 'show_on_home' as const, label: 'Show on Home Page', desc: 'Display this festival on the home page' },
          { field: 'is_featured' as const, label: 'Featured Festival', desc: 'Mark as a featured / highlighted festival' },
          { field: 'show_in_calendar' as const, label: 'Show in Festival Calendar', desc: 'Include in the festival calendar view' },
        ].map(({ field, label, desc }) => (
          <label key={field} className="flex items-center gap-3 cursor-pointer p-4 bg-[#0c1321] rounded-xl border border-white/10 hover:border-white/20 transition-colors">
            <input
              type="checkbox"
              checked={settings[field] as boolean}
              onChange={(e) => set(field, e.target.checked)}
              className="rounded border-white/20 bg-[#0c1321] text-[#f2ca50] focus:ring-[#f2ca50]"
            />
            <div>
              <span className="text-sm font-semibold text-[#f2ca50] block">{label}</span>
              <span className="text-xs text-[#d0c5af]/60">{desc}</span>
            </div>
          </label>
        ))}
      </div>

      <div>
        <label className="text-xs font-semibold text-[#f2ca50] block mb-1.5">Priority (0 = lowest)</label>
        <input
          type="number"
          min={0}
          max={100}
          value={settings.priority}
          onChange={(e) => set('priority', parseInt(e.target.value) || 0)}
          className="w-full bg-[#0c1321] border border-white/10 rounded-lg py-2 px-3 text-sm text-[#dce2f6] focus:ring-1 focus:ring-[#f2ca50] outline-none"
        />
        <p className="text-xs text-[#d0c5af]/50 mt-1">Higher priority festivals appear first on the home page.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-[#f2ca50] block mb-1.5">Start Showing Date</label>
          <input
            type="date"
            value={settings.show_from || ''}
            onChange={(e) => set('show_from', e.target.value || null)}
            className="w-full bg-[#0c1321] border border-white/10 rounded-lg py-2 px-3 text-sm text-[#dce2f6] focus:ring-1 focus:ring-[#f2ca50] outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-[#f2ca50] block mb-1.5">Stop Showing Date</label>
          <input
            type="date"
            value={settings.show_until || ''}
            onChange={(e) => set('show_until', e.target.value || null)}
            className="w-full bg-[#0c1321] border border-white/10 rounded-lg py-2 px-3 text-sm text-[#dce2f6] focus:ring-1 focus:ring-[#f2ca50] outline-none"
          />
        </div>
      </div>
    </div>
  );
};
