import React from 'react';
import { Album, AudioTrack } from '../types';

interface AlbumsViewProps {
  albums: Album[];
  onSelectAlbum: (albumId: string) => void;
  onPlayTrack: (track: AudioTrack) => void;
}

export const AlbumsView: React.FC<AlbumsViewProps> = ({ albums, onSelectAlbum }) => {
  return (
    <div className="p-4 md:p-10 space-y-6 pb-28">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-serif-headline text-3xl md:text-5xl text-[#dce2f6] font-bold">
            Sacred Collections & Albums
          </h2>
          <p className="text-sm md:text-base text-[#d0c5af]/80 mt-1">
            Browse full devotional compilations, stotrams, and meditative albums.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {albums.map((alb) => (
          <div
            key={alb.id}
            onClick={() => onSelectAlbum(alb.id)}
            className="glass-card rounded-2xl p-5 flex flex-col group cursor-pointer border border-white/10 hover:border-[#f2ca50] transition-all shadow-xl"
          >
            <div className="aspect-video rounded-xl mb-4 overflow-hidden relative">
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                style={{ backgroundImage: `url('${alb.coverUrl}')` }}
              />
              <div className="absolute top-3 right-3 bg-[#d4af37] text-[#3c2f00] text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
                {alb.status}
              </div>
            </div>
            <h3 className="font-serif-headline text-xl text-[#dce2f6] group-hover:text-[#f2ca50] transition-colors font-bold mb-1">
              {alb.title}
            </h3>
            <p className="text-xs text-[#d0c5af]/80 mb-3">
              {alb.artist} • Released {alb.releaseYear}
            </p>
            <p className="text-xs text-[#d0c5af]/70 line-clamp-2 mb-4 leading-relaxed">
              {alb.description}
            </p>
            <div className="mt-auto pt-3 border-t border-white/10 flex justify-between items-center text-xs text-[#f2ca50] font-semibold">
              <span>{alb.trackCount} Tracks</span>
              <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Explore Tracks <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
