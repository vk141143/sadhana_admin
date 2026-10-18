import React from 'react';
import { FestivalOccurrence, CustomTiming } from '../types';

interface Props {
  occurrence: Partial<FestivalOccurrence>;
  setOccurrence: (o: Partial<FestivalOccurrence>) => void;
}

const ipt = 'w-full bg-[#19202e] border border-white/10 rounded-lg py-1.5 px-2 text-xs text-[#dce2f6] focus:ring-1 focus:ring-[#f2ca50] outline-none';
const lbl = 'text-[10px] text-[#d0c5af]/60 block mb-1';

const TimeRange: React.FC<{
  label: string;
  startKey: keyof FestivalOccurrence;
  endKey: keyof FestivalOccurrence;
  occurrence: Partial<FestivalOccurrence>;
  set: (k: keyof FestivalOccurrence, v: any) => void;
  color?: string;
}> = ({ label, startKey, endKey, occurrence, set, color = 'border-white/10' }) => (
  <div className={`p-3 bg-[#0c1321] rounded-xl border ${color}`}>
    <p className="text-xs font-semibold text-[#f2ca50] mb-2">{label}</p>
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className={lbl}>Start</label>
        <input type="time" className={ipt}
          value={(occurrence[startKey] as string)?.slice(11, 16) || ''}
          onChange={e => {
            const base = occurrence.festival_date || new Date().toISOString().split('T')[0];
            set(startKey, e.target.value ? `${base}T${e.target.value}:00+05:30` : null);
          }} />
      </div>
      <div>
        <label className={lbl}>End</label>
        <input type="time" className={ipt}
          value={(occurrence[endKey] as string)?.slice(11, 16) || ''}
          onChange={e => {
            const base = occurrence.festival_date || new Date().toISOString().split('T')[0];
            set(endKey, e.target.value ? `${base}T${e.target.value}:00+05:30` : null);
          }} />
      </div>
    </div>
  </div>
);

export const Step7Timings: React.FC<Props> = ({ occurrence, setOccurrence }) => {
  const set = (field: keyof FestivalOccurrence, value: any) =>
    setOccurrence({ ...occurrence, [field]: value });

  const customTimings: CustomTiming[] = occurrence.custom_timings || [];

  const addCustom = () =>
    setOccurrence({ ...occurrence, custom_timings: [...customTimings, { name: '', start: '', end: '', description: '' }] });

  const setCustom = (i: number, field: keyof CustomTiming, val: string) => {
    const updated = customTimings.map((t, idx) => idx === i ? { ...t, [field]: val } : t);
    setOccurrence({ ...occurrence, custom_timings: updated });
  };

  const removeCustom = (i: number) =>
    setOccurrence({ ...occurrence, custom_timings: customTimings.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-serif-headline text-lg font-bold text-[#f2ca50] mb-1">Auspicious & Important Timings</h3>
        <p className="text-xs text-[#d0c5af]/70">Set key timings for this festival occurrence.</p>
      </div>

      {/* Auspicious */}
      <div>
        <h4 className="text-xs font-semibold text-emerald-400 mb-3">Auspicious Timings</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <TimeRange label="Shubha Muhurta" startKey="shubha_muhurta_start" endKey="shubha_muhurta_end" occurrence={occurrence} set={set} color="border-emerald-500/10" />
          <TimeRange label="Puja Time"      startKey="puja_time_start"      endKey="puja_time_end"      occurrence={occurrence} set={set} color="border-emerald-500/10" />
        </div>
      </div>

      {/* Inauspicious */}
      <div>
        <h4 className="text-xs font-semibold text-rose-400 mb-3">Inauspicious Timings</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <TimeRange label="Rahu Kalam"   startKey="rahu_kalam_start"   endKey="rahu_kalam_end"   occurrence={occurrence} set={set} color="border-rose-500/10" />
          <TimeRange label="Yamagandam"   startKey="yamagandam_start"   endKey="yamagandam_end"   occurrence={occurrence} set={set} color="border-rose-500/10" />
          <TimeRange label="Gulika Kalam" startKey="gulika_kalam_start" endKey="gulika_kalam_end" occurrence={occurrence} set={set} color="border-rose-500/10" />
        </div>
      </div>

      {/* Custom timings */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-[#f2ca50]">Custom Important Timings</h4>
          <button onClick={addCustom}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#f2ca50]/10 text-[#f2ca50] text-xs font-semibold rounded-lg hover:bg-[#f2ca50]/20 transition-colors">
            <span className="material-symbols-outlined text-sm">add</span>Add Timing
          </button>
        </div>
        {customTimings.length === 0 && (
          <p className="text-xs text-[#d0c5af]/40 text-center py-4 border border-dashed border-white/10 rounded-xl">
            No custom timings. Click "Add Timing" to add special timings like Nishita Kala.
          </p>
        )}
        <div className="space-y-3">
          {customTimings.map((t, i) => (
            <div key={i} className="p-3 bg-[#0c1321] rounded-xl border border-[#f2ca50]/10 space-y-2">
              <div className="flex items-center justify-between">
                <input
                  className="flex-1 bg-transparent border-b border-white/10 py-1 text-sm text-[#dce2f6] placeholder-[#d0c5af]/30 outline-none focus:border-[#f2ca50]"
                  value={t.name} onChange={e => setCustom(i, 'name', e.target.value)}
                  placeholder="Timing name (e.g., Nishita Kala)" />
                <button onClick={() => removeCustom(i)} className="ml-2 text-rose-400 hover:text-rose-300">
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={lbl}>Start</label>
                  <input type="time" className={ipt} value={t.start}
                    onChange={e => setCustom(i, 'start', e.target.value)} />
                </div>
                <div>
                  <label className={lbl}>End</label>
                  <input type="time" className={ipt} value={t.end}
                    onChange={e => setCustom(i, 'end', e.target.value)} />
                </div>
              </div>
              <input
                className="w-full bg-transparent border-b border-white/10 py-1 text-xs text-[#d0c5af] placeholder-[#d0c5af]/30 outline-none focus:border-[#f2ca50]"
                value={t.description} onChange={e => setCustom(i, 'description', e.target.value)}
                placeholder="Description (optional)" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
