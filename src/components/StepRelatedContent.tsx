import React from 'react';
import { FestivalContent } from '../types';

interface Props {
  content: Partial<FestivalContent>;
  setContent: (c: Partial<FestivalContent>) => void;
}

type RefItem = { id: string; title: string };

const ipt = 'w-full bg-[#19202e] border border-white/10 rounded-lg py-2 px-3 text-sm text-[#dce2f6] placeholder-[#d0c5af]/30 focus:ring-1 focus:ring-[#f2ca50] outline-none';

const SECTIONS: { key: keyof FestivalContent; label: string; icon: string; placeholder: string }[] = [
  { key: 'related_scriptures', label: 'Related Scriptures',  icon: 'menu_book',      placeholder: 'e.g., Bhagavata Purana' },
  { key: 'related_slokas',     label: 'Related Slokas',      icon: 'format_quote',   placeholder: 'e.g., BG 4.8' },
  { key: 'related_mantras',    label: 'Related Mantras',     icon: 'record_voice_over', placeholder: 'e.g., Om Namo Bhagavate' },
  { key: 'related_stotrams',   label: 'Related Stotrams',    icon: 'library_music',  placeholder: 'e.g., Vishnu Sahasranama' },
  { key: 'related_music',      label: 'Related Music',       icon: 'music_note',     placeholder: 'e.g., Janmashtami Bhajan' },
  { key: 'related_stories',    label: 'Related Stories',     icon: 'auto_stories',   placeholder: 'e.g., Birth of Krishna' },
];

const RefSection: React.FC<{
  label: string;
  icon: string;
  placeholder: string;
  items: RefItem[];
  onChange: (items: RefItem[]) => void;
}> = ({ label, icon, placeholder, items, onChange }) => {
  const add = () => onChange([...items, { id: '', title: '' }]);
  const update = (i: number, field: keyof RefItem, val: string) =>
    onChange(items.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div className="p-4 bg-[#0c1321] rounded-xl border border-white/10 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-sm text-[#f2ca50]/70">{icon}</span>
          <p className="text-xs font-semibold text-[#f2ca50]">{label}</p>
        </div>
        <button onClick={add}
          className="flex items-center gap-1 px-3 py-1.5 bg-[#f2ca50]/10 text-[#f2ca50] text-xs font-semibold rounded-lg hover:bg-[#f2ca50]/20 transition-colors">
          <span className="material-symbols-outlined text-sm">add</span>Add
        </button>
      </div>

      {items.length === 0 && (
        <p className="text-xs text-[#d0c5af]/40 text-center py-2 border border-dashed border-white/10 rounded-lg">
          No {label.toLowerCase()} linked yet.
        </p>
      )}

      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
            <input className={ipt} value={item.title}
              onChange={e => update(i, 'title', e.target.value)}
              placeholder={placeholder} />
            <input className={ipt} value={item.id}
              onChange={e => update(i, 'id', e.target.value)}
              placeholder="Content ID (optional)" />
            <button onClick={() => remove(i)} className="text-rose-400 hover:text-rose-300">
              <span className="material-symbols-outlined text-sm">delete</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export const StepRelatedContent: React.FC<Props> = ({ content, setContent }) => {
  const set = (field: keyof FestivalContent, val: any) =>
    setContent({ ...content, [field]: val });

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-serif-headline text-lg font-bold text-[#f2ca50] mb-1">Related Sanatana Content</h3>
        <p className="text-xs text-[#d0c5af]/70">
          Link existing content from the Sanatana library. These reference IDs — no content is duplicated.
        </p>
      </div>

      {SECTIONS.map(({ key, label, icon, placeholder }) => (
        <RefSection
          key={key}
          label={label}
          icon={icon}
          placeholder={placeholder}
          items={(content[key] as RefItem[]) || []}
          onChange={val => set(key, val)}
        />
      ))}
    </div>
  );
};
