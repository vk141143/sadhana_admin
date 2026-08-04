import React, { useState } from 'react';
import { SCRIPTURE_ITEMS } from '../data/mockData';
import { ScriptureItem } from '../types';

export const ScripturesView: React.FC = () => {
  const [scriptures] = useState<ScriptureItem[]>(SCRIPTURE_ITEMS);
  const [filterType, setFilterType] = useState('All');
  const [selectedScripture, setSelectedScripture] = useState<ScriptureItem | null>(null);

  const filtered = scriptures.filter(
    (s) => filterType === 'All' || s.category === filterType
  );

  return (
    <div className="p-4 md:p-10 space-y-6 pb-28">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-serif-headline text-3xl md:text-5xl text-[#dce2f6] font-bold">
            Sacred Scriptures Library
          </h2>
          <p className="text-sm md:text-base text-[#d0c5af]/80 mt-1">
            Canonical Vedic manuscripts, sloka commentaries, and multilingual translations.
          </p>
        </div>
        <button
          onClick={() => alert('New scripture manuscript uploaded to sacred archive.')}
          className="px-5 py-2.5 rounded-xl bg-[#f2ca50] text-[#3c2f00] font-bold text-sm shadow-md"
        >
          Add Manuscript
        </button>
      </div>

      <div className="glass-card rounded-2xl p-4 flex flex-wrap gap-3">
        {['All', 'Veda', 'Smriti', 'Sutra', 'Upanishad'].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterType(cat)}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterType === cat
                ? 'bg-[#f2ca50] text-[#3c2f00]'
                : 'bg-[#19202e] text-[#d0c5af] hover:bg-white/10'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((scrip) => (
          <div
            key={scrip.id}
            className="glass-card rounded-2xl p-6 flex flex-col justify-between border-l-4 border-[#f2ca50] hover:shadow-2xl transition-all"
          >
            <div>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-serif-headline text-2xl font-bold text-[#dce2f6]">
                    {scrip.title}
                  </h3>
                  <p className="text-sm text-[#f2ca50] font-serif tracking-widest mt-0.5">
                    {scrip.sanskritTitle}
                  </p>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 bg-white/5 rounded-md text-[#d0c5af]">
                  {scrip.category}
                </span>
              </div>
              <p className="text-xs text-[#d0c5af]/80 mt-3 leading-relaxed">
                {scrip.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#d0c5af]/70">
                <span className="px-2.5 py-1 bg-[#19202e] rounded-md border border-white/5">
                  {scrip.chaptersCount} Chapters
                </span>
                <span className="px-2.5 py-1 bg-[#19202e] rounded-md border border-white/5">
                  {scrip.versesCount} Verses
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center text-xs">
              <span className="text-[#d0c5af]/50">Canonical Manuscript</span>
              <button
                onClick={() => setSelectedScripture(scrip)}
                className="px-4 py-2 bg-[#f2ca50]/10 text-[#f2ca50] font-bold rounded-lg hover:bg-[#f2ca50] hover:text-[#3c2f00] transition-colors"
              >
                Inspect Chapters
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Reader Modal */}
      {selectedScripture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="glass-card w-full max-w-2xl rounded-2xl p-6 md:p-8 relative shadow-2xl border-t-2 border-[#f2ca50]">
            <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
              <div>
                <h3 className="font-serif-headline text-2xl text-[#f2ca50] font-bold">
                  {selectedScripture.title}
                </h3>
                <p className="text-xs text-[#d0c5af]">{selectedScripture.sanskritTitle}</p>
              </div>
              <button
                onClick={() => setSelectedScripture(null)}
                className="text-[#d0c5af] hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4 max-h-80 overflow-y-auto pr-2 text-xs md:text-sm text-[#dce2f6] leading-relaxed">
              <p className="p-4 bg-[#19202e] rounded-xl border border-white/10 font-serif text-sm">
                ॐ अग्निमीळे पुरोहितं यज्ञस्य देवमृत्विजम् । होतारं रत्नधातमम् ॥
              </p>
              <p className="text-[#d0c5af]">
                <strong>English Translation:</strong> I magnify Agni, the divine Purohita, the priest of the sacrifice, the deity who performs the rite, the invoker who bestows highest treasures.
              </p>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-white/10 mt-4">
              <button
                onClick={() => setSelectedScripture(null)}
                className="px-5 py-2 rounded-lg bg-[#f2ca50] text-[#3c2f00] font-bold"
              >
                Close Reader
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
