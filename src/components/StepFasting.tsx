import React from 'react';
import { FestivalOccurrence } from '../types';

interface Props {
  occurrence: Partial<FestivalOccurrence>;
  setOccurrence: (o: Partial<FestivalOccurrence>) => void;
}

const ipt = 'w-full bg-[#19202e] border border-white/10 rounded-lg py-2 px-3 text-sm text-[#dce2f6] placeholder-[#d0c5af]/30 focus:ring-1 focus:ring-[#f2ca50] outline-none';
const lbl = 'text-xs font-semibold text-[#f2ca50] block mb-1.5';

export const StepFasting: React.FC<Props> = ({ occurrence, setOccurrence }) => {
  const set = (field: keyof FestivalOccurrence, value: any) =>
    setOccurrence({ ...occurrence, [field]: value });

  const enabled = !!occurrence.fasting_enabled;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-serif-headline text-lg font-bold text-[#f2ca50] mb-1">Vrata / Fasting</h3>
        <p className="text-xs text-[#d0c5af]/70">Configure fasting rules and Parana details for this occurrence.</p>
      </div>

      {/* Toggle */}
      <label className="flex items-center gap-3 p-4 bg-[#0c1321] rounded-xl border border-white/10 cursor-pointer">
        <div
          onClick={() => set('fasting_enabled', !enabled)}
          className={`relative w-10 h-5 rounded-full transition-colors ${enabled ? 'bg-[#f2ca50]' : 'bg-white/10'}`}
        >
          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#dce2f6]">Fasting Enabled</p>
          <p className="text-xs text-[#d0c5af]/60">Toggle to show fasting details for this festival</p>
        </div>
      </label>

      {enabled && (
        <div className="space-y-4">
          <div>
            <label className={lbl}>Fasting Type</label>
            <select className={ipt} value={occurrence.fasting_type || ''} onChange={e => set('fasting_type', e.target.value)}>
              <option value="">Select type</option>
              <option value="nirjala">Nirjala (No water)</option>
              <option value="phalahar">Phalahar (Fruits only)</option>
              <option value="ekadashi">Ekadashi fast</option>
              <option value="partial">Partial fast</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className={lbl}>Fasting Rules</label>
            <textarea className={`${ipt} resize-none`} rows={3}
              value={occurrence.fasting_rules || ''}
              onChange={e => set('fasting_rules', e.target.value)}
              placeholder="Describe the fasting rules, what is allowed/not allowed..." />
          </div>

          {/* Parana */}
          <div className="p-4 bg-[#0c1321] rounded-xl border border-white/10 space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => set('parana_required', !occurrence.parana_required)}
                className={`relative w-9 h-5 rounded-full transition-colors ${occurrence.parana_required ? 'bg-[#f2ca50]' : 'bg-white/10'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${occurrence.parana_required ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              <p className="text-sm font-semibold text-[#dce2f6]">Parana Required</p>
            </label>

            {occurrence.parana_required && (
              <div>
                <label className={lbl}>Parana Time</label>
                <input type="time" className={ipt}
                  value={occurrence.parana_time?.slice(11, 16) || ''}
                  onChange={e => {
                    const base = occurrence.festival_date || new Date().toISOString().split('T')[0];
                    set('parana_time', e.target.value ? `${base}T${e.target.value}:00+05:30` : null);
                  }} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
