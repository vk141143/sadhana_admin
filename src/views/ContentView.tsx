import React, { useState } from 'react';

export const ContentView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const contentItems = [
    {
      id: 'c1',
      title: 'Bhagavad Gita As It Is - Audio Commentary',
      type: 'Audio Series',
      category: 'Scripture Study',
      size: '1.2 GB',
      itemsCount: '18 Chapters',
      updated: '2 days ago',
    },
    {
      id: 'c2',
      title: 'Vedic Chanting Guide (PDF)',
      type: 'Document',
      category: 'Tutorial',
      size: '14.5 MB',
      itemsCount: '42 Pages',
      updated: '1 week ago',
    },
    {
      id: 'c3',
      title: 'Maha Shivaratri Midnight Satsang (4K Stream)',
      type: 'Video',
      category: 'Festival Video',
      size: '4.8 GB',
      itemsCount: '3h 15m',
      updated: '3 weeks ago',
    },
    {
      id: 'c4',
      title: 'Daily Sloka Reflection Cards',
      type: 'Image Asset',
      category: 'Social Graphics',
      size: '120 MB',
      itemsCount: '30 Cards',
      updated: 'Yesterday',
    },
  ];

  return (
    <div className="p-4 md:p-10 space-y-6 pb-28">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-serif-headline text-3xl md:text-5xl text-[#dce2f6] font-bold">
            Content Manager
          </h2>
          <p className="text-sm md:text-base text-[#d0c5af]/80 mt-1">
            Organize digital manuscripts, audio recordings, and sacred broadcast media.
          </p>
        </div>
        <button
          onClick={() => alert('New media folder created.')}
          className="px-5 py-2.5 rounded-xl bg-[#f2ca50] text-[#3c2f00] font-bold text-sm shadow-md flex items-center gap-2"
        >
          <span className="material-symbols-outlined">create_new_folder</span>
          New Folder
        </button>
      </div>

      <div className="glass-card rounded-2xl p-4 flex items-center justify-between gap-4">
        <input
          type="text"
          placeholder="Search media files, documents, or video streams..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-[#19202e] border border-white/10 rounded-xl px-4 py-2 text-sm text-[#dce2f6] w-full max-w-md outline-none focus:border-[#f2ca50]"
        />
        <span className="text-xs text-[#d0c5af]">4 Items Total</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {contentItems.map((item) => (
          <div
            key={item.id}
            className="glass-card rounded-2xl p-5 flex flex-col justify-between hover:border-[#f2ca50]/50 transition-all group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="w-10 h-10 rounded-xl bg-[#f2ca50]/10 text-[#f2ca50] flex items-center justify-center">
                  <span className="material-symbols-outlined">
                    {item.type === 'Document'
                      ? 'description'
                      : item.type === 'Video'
                      ? 'video_library'
                      : 'folder'}
                  </span>
                </span>
                <span className="text-[10px] px-2.5 py-1 bg-white/5 rounded-md text-[#d0c5af] font-semibold">
                  {item.type}
                </span>
              </div>
              <h4 className="font-serif-headline text-base font-bold text-[#dce2f6] group-hover:text-[#f2ca50] transition-colors mb-1">
                {item.title}
              </h4>
              <p className="text-xs text-[#d0c5af]/70">{item.category}</p>
            </div>

            <div className="pt-4 border-t border-white/5 mt-4 flex items-center justify-between text-xs text-[#d0c5af]/60">
              <span>{item.itemsCount}</span>
              <span>{item.size}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
