import React, { useState } from 'react';
import { FESTIVAL_EVENTS } from '../data/mockData';
import { FestivalEvent } from '../types';

export const FestivalsView: React.FC = () => {
  const [festivals, setFestivals] = useState<FestivalEvent[]>(FESTIVAL_EVENTS);

  return (
    <div className="p-4 md:p-10 space-y-6 pb-28">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-serif-headline text-3xl md:text-5xl text-[#dce2f6] font-bold">
            Vedic Festival Calendar
          </h2>
          <p className="text-sm md:text-base text-[#d0c5af]/80 mt-1">
            Coordinate temple pujas, celestial muhurtas, and broadcast notifications to seekers.
          </p>
        </div>
        <button
          onClick={() => alert('New Vedic festival event scheduled on temple calendar.')}
          className="px-5 py-2.5 rounded-xl bg-[#f2ca50] text-[#3c2f00] font-bold text-sm shadow-md"
        >
          Add Event
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {festivals.map((fest) => (
          <div
            key={fest.id}
            className="glass-card rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between border-t-2 border-[#f2ca50]/40"
          >
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="px-3 py-1 bg-[#f2ca50]/10 text-[#f2ca50] border border-[#f2ca50]/20 rounded-full font-mono text-xs font-bold">
                  {fest.date}
                </span>
                <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  {fest.status}
                </span>
              </div>

              <h3 className="font-serif-headline text-2xl font-bold text-[#dce2f6] mb-1">
                {fest.title}
              </h3>
              <p className="text-sm font-serif text-[#f2ca50] mb-2">{fest.sanskritName}</p>
              <p className="text-xs text-[#d0c5af]/80 leading-relaxed mb-4">
                {fest.significance}
              </p>

              <div className="p-3 bg-[#19202e] rounded-xl border border-white/5 space-y-1 text-xs">
                <p className="text-[#f2ca50] font-semibold">Devotees Expected:</p>
                <p className="text-[#d0c5af]">{fest.devoteesExpected.toLocaleString()} Seeker Sadhanas</p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-[#d0c5af]/60">Auto-Broadcast Push Active</span>

              <button
                onClick={() => alert(`Broadcasting reminder for ${fest.title}...`)}
                className="px-3.5 py-1.5 bg-[#f2ca50] text-[#3c2f00] text-xs font-bold rounded-lg hover:brightness-110 shadow-md"
              >
                Send Festival Alert
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

