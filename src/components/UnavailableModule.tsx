import React from 'react';
export function UnavailableModule({ title, reason }: { title: string; reason: string }) {
  return <section className="p-6 md:p-10 max-w-3xl"><p className="text-sm text-slate-400 mb-3">Sanatana / {title}</p><h1 className="text-3xl text-[#f2ca50] mb-6">{title}</h1><div role="status" className="border border-white/10 rounded-xl bg-[#19202e] p-6"><h2 className="text-lg mb-2">Integration pending</h2><p className="text-slate-300">{reason}</p><p className="text-slate-400 mt-4">This module is not ready for production use. No simulated records or save actions are available here.</p></div></section>;
}
