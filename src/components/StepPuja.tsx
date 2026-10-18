import React, { useState } from 'react';
import { FestivalContent } from '../types';

interface Props {
  content: Partial<FestivalContent>;
  setContent: (c: Partial<FestivalContent>) => void;
}

type SamagriItem = { item: string; quantity: string; required: boolean };
type VidhiSection = { title: string; content: string };

const ipt = 'w-full bg-[#19202e] border border-white/10 rounded-lg py-2 px-3 text-sm text-[#dce2f6] placeholder-[#d0c5af]/30 focus:ring-1 focus:ring-[#f2ca50] outline-none';
const lbl = 'text-xs font-semibold text-[#f2ca50] block mb-1.5';

export const StepPuja: React.FC<Props> = ({ content, setContent }) => {
  const set = (field: keyof FestivalContent, val: any) =>
    setContent({ ...content, [field]: val });

  const samagri: SamagriItem[] = (content.puja_samagri as SamagriItem[]) || [];
  const vidhi: VidhiSection[] = (content.puja_vidhi as VidhiSection[]) || [];

  const [vidhiText, setVidhiText] = useState(
    vidhi.map(s => `## ${s.title}\n${s.content}`).join('\n\n') || ''
  );

  const addSamagri = () => set('puja_samagri', [...samagri, { item: '', quantity: '', required: true }]);
  const setSamagri = (i: number, field: keyof SamagriItem, val: any) => {
    const updated = samagri.map((s, idx) => idx === i ? { ...s, [field]: val } : s);
    set('puja_samagri', updated);
  };
  const removeSamagri = (i: number) => set('puja_samagri', samagri.filter((_, idx) => idx !== i));

  const parseVidhiText = (text: string): VidhiSection[] =>
    text.split(/\n##\s+/).filter(Boolean).map(block => {
      const [title, ...rest] = block.split('\n');
      return { title: title.trim(), content: rest.join('\n').trim() };
    });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-serif-headline text-lg font-bold text-[#f2ca50] mb-1">Puja & Devotional Practice</h3>
        <p className="text-xs text-[#d0c5af]/70">Puja details, samagri list, and step-by-step vidhi.</p>
      </div>

      {/* Puja basics */}
      <div>
        <label className={lbl}>Puja Name</label>
        <input className={ipt} value={content.puja_name || ''}
          onChange={e => set('puja_name', e.target.value)}
          placeholder="e.g., Janmashtami Puja" />
      </div>

      <div>
        <label className={lbl}>Puja Description</label>
        <textarea className={`${ipt} resize-none`} rows={3}
          value={content.puja_description || ''}
          onChange={e => set('puja_description', e.target.value)}
          placeholder="Brief description of the puja..." />
      </div>

      {/* Samagri */}
      <div className="p-4 bg-[#0c1321] rounded-xl border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-[#f2ca50]">Puja Samagri</p>
          <button onClick={addSamagri}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#f2ca50]/10 text-[#f2ca50] text-xs font-semibold rounded-lg hover:bg-[#f2ca50]/20 transition-colors">
            <span className="material-symbols-outlined text-sm">add</span>Add Item
          </button>
        </div>

        {samagri.length === 0 && (
          <p className="text-xs text-[#d0c5af]/40 text-center py-3 border border-dashed border-white/10 rounded-xl">
            No items yet. Click "Add Item" to add samagri.
          </p>
        )}

        <div className="space-y-2">
          {samagri.map((s, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
              <input className={ipt} value={s.item}
                onChange={e => setSamagri(i, 'item', e.target.value)}
                placeholder="Item (e.g., Tulasi)" />
              <input className="w-24 bg-[#19202e] border border-white/10 rounded-lg py-2 px-2 text-sm text-[#dce2f6] placeholder-[#d0c5af]/30 focus:ring-1 focus:ring-[#f2ca50] outline-none"
                value={s.quantity}
                onChange={e => setSamagri(i, 'quantity', e.target.value)}
                placeholder="Qty" />
              <label className="flex items-center gap-1 text-xs text-[#d0c5af]/60 cursor-pointer whitespace-nowrap">
                <input type="checkbox" checked={s.required}
                  onChange={e => setSamagri(i, 'required', e.target.checked)}
                  className="accent-[#f2ca50]" />
                Req.
              </label>
              <button onClick={() => removeSamagri(i)} className="text-rose-400 hover:text-rose-300">
                <span className="material-symbols-outlined text-sm">delete</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Puja Vidhi text editor — JSON stored in content state, R2 upload handled in Step4Content */}
      <div className="p-4 bg-[#0c1321] rounded-xl border border-white/10 space-y-3">
        <div>
          <p className="text-xs font-semibold text-[#f2ca50]">Puja Vidhi Steps</p>
          <p className="text-[10px] text-[#d0c5af]/50 mt-0.5">
            Use <code className="text-[#f2ca50]">## Section Title</code> to split into steps.
          </p>
        </div>
        <textarea
          className="w-full bg-[#19202e] border border-white/10 rounded-lg py-2 px-3 text-sm text-[#dce2f6] placeholder-[#d0c5af]/30 focus:ring-1 focus:ring-[#f2ca50] outline-none resize-none font-mono"
          rows={8}
          value={vidhiText}
          onChange={e => setVidhiText(e.target.value)}
          onBlur={() => set('puja_vidhi', parseVidhiText(vidhiText))}
          placeholder={'## Preparation\nGather all samagri...\n\n## Sankalpa\nTake sankalpa...\n\n## Main Puja\nBegin with...'}
        />
      </div>
    </div>
  );
};
