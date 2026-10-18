import React from 'react';
import { FestivalOccurrence } from '../types';

interface Props {
  occurrence: Partial<FestivalOccurrence>;
  setOccurrence: (o: Partial<FestivalOccurrence>) => void;
}

const ipt = 'w-full bg-[#19202e] border border-white/10 rounded-lg py-2 px-3 text-sm text-[#dce2f6] placeholder-[#d0c5af]/30 focus:ring-1 focus:ring-[#f2ca50] outline-none';
const lbl = 'text-[10px] text-[#d0c5af]/60 block mb-1';

export const Step2DatePanchanga: React.FC<Props> = ({ occurrence, setOccurrence }) => {
  const set = (field: keyof FestivalOccurrence, value: any) =>
    setOccurrence({ ...occurrence, [field]: value });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-serif-headline text-lg font-bold text-[#f2ca50] mb-1">Panchanga</h3>
        <p className="text-xs text-[#d0c5af]/70">Vedic calendar details for this festival occurrence.</p>
      </div>

      {/* Date & Year */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-[#f2ca50] block mb-1.5">Festival Date <span className="text-rose-400">*</span></label>
          <input type="date" className={ipt} value={occurrence.festival_date || ''}
            onChange={e => set('festival_date', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold text-[#f2ca50] block mb-1.5">Year</label>
          <input type="number" className={ipt} value={occurrence.year || new Date().getFullYear()}
            onChange={e => set('year', Number(e.target.value))} />
        </div>
      </div>

      {/* Tithi */}
      <div className="p-4 bg-[#0c1321] rounded-xl border border-white/10 space-y-3">
        <p className="text-xs font-semibold text-[#f2ca50]">Tithi</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Tithi Name</label>
            <input type="text" className={ipt} value={occurrence.tithi_name || ''}
              onChange={e => set('tithi_name', e.target.value)} placeholder="e.g., Ashtami" />
          </div>
          <div>
            <label className={lbl}>Paksha</label>
            <select className={ipt} value={occurrence.paksha || ''}
              onChange={e => set('paksha', e.target.value)}>
              <option value="">Select Paksha</option>
              <option value="Shukla Paksha">Shukla Paksha</option>
              <option value="Krishna Paksha">Krishna Paksha</option>
            </select>
          </div>
        </div>
      </div>

      {/* Nakshatra */}
      <div className="p-4 bg-[#0c1321] rounded-xl border border-white/10 space-y-3">
        <p className="text-xs font-semibold text-[#f2ca50]">Nakshatra</p>
        <div>
          <label className={lbl}>Nakshatra Name</label>
          <input type="text" className={ipt} value={occurrence.nakshatra_name || ''}
            onChange={e => set('nakshatra_name', e.target.value)} placeholder="e.g., Rohini" />
        </div>
      </div>

      {/* Yoga */}
      <div className="p-4 bg-[#0c1321] rounded-xl border border-white/10 space-y-3">
        <p className="text-xs font-semibold text-[#f2ca50]">Yoga</p>
        <div>
          <label className={lbl}>Yoga Name</label>
          <input type="text" className={ipt} value={occurrence.yoga_name || ''}
            onChange={e => set('yoga_name', e.target.value)} placeholder="e.g., Harshana" />
        </div>
      </div>
    </div>
  );
};
