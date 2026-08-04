import React, { useState } from 'react';
import { ADMIN_PROFILE, INITIAL_ACTIVITIES } from '../data/mockData';

interface TopHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenMobileSidebar?: () => void;
  titleRight?: string;
  customAction?: React.ReactNode;
  onLogout?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenMobileSidebar,
  titleRight = 'Sadhana Admin',
  customAction,
  onLogout,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="md:ml-[280px] h-16 sticky top-0 z-40 bg-[#0c1321]/70 backdrop-blur-3xl border-b-2 border-[#f2ca50]/20 flex justify-between items-center px-4 md:px-8 shadow-sm">
      {/* Left: Mobile Toggle & Search Bar */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <button
          onClick={onOpenMobileSidebar}
          className="md:hidden p-2 text-[#d0c5af] hover:text-[#f2ca50] rounded-lg hover:bg-white/5"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>

        <div className="relative w-full group">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#d0c5af]/60 group-focus-within:text-[#f2ca50] transition-colors text-xl">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search seekers, records, or audio..."
            className="w-full bg-[#070e1c]/60 border border-white/10 rounded-full py-1.5 pl-10 pr-4 text-sm text-[#dce2f6] placeholder-[#d0c5af]/40 focus:outline-none focus:ring-1 focus:ring-[#f2ca50] focus:border-[#f2ca50] transition-all"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Notifications Popup */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 text-[#d0c5af] hover:text-[#f2ca50] transition-colors"
            title="Notifications"
          >
            <span className="material-symbols-outlined text-2xl">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-[#f2ca50] rounded-full shadow-[0_0_8px_#f2ca50]" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 glass-card rounded-2xl p-4 shadow-2xl z-50 border-t-2 border-[#f2ca50]">
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                <h4 className="font-serif-headline text-sm font-semibold text-[#f2ca50]">
                  Temple Activity Logs
                </h4>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-xs text-[#d0c5af] hover:text-white"
                >
                  Close
                </button>
              </div>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {INITIAL_ACTIVITIES.slice(0, 4).map((act) => (
                  <div key={act.id} className="text-xs space-y-0.5 border-b border-white/5 pb-2">
                    <p className="font-semibold text-[#dce2f6]">{act.title}</p>
                    <p className="text-[#d0c5af]/70">{act.description}</p>
                    <span className="text-[10px] text-[#f2ca50]/80">{act.timeAgo}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Contrast Toggle */}
        <button
          onClick={() => alert('Dark theme is optimized for Sadhana Admin sacred environment.')}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 text-[#d0c5af] hover:text-[#f2ca50] transition-colors"
          title="Contrast Mode"
        >
          <span className="material-symbols-outlined text-2xl">contrast</span>
        </button>

        <div className="h-6 w-[1px] bg-white/10 mx-1 hidden sm:block" />

        {/* Custom Action or Title / Profile Dropdown */}
        {customAction ? (
          customAction
        ) : (
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-1.5 rounded-full hover:bg-white/5 transition-all text-left focus:outline-none border border-transparent hover:border-[#f2ca50]/30"
              title="Profile & Options"
            >
              <span className="font-serif-headline text-base md:text-lg text-[#f2ca50] font-semibold hidden sm:inline pl-1">
                {titleRight}
              </span>
              <img
                src={ADMIN_PROFILE.avatarUrl}
                alt="Admin"
                className="w-8 h-8 rounded-full border border-[#f2ca50]/40 object-cover"
              />
              <span className="material-symbols-outlined text-[#d0c5af] text-sm hidden sm:inline">
                expand_more
              </span>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-3 w-64 bg-[#19202e] rounded-2xl p-3 shadow-2xl z-50 border border-[#f2ca50]/30 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#0c1321] border border-white/5 mb-2">
                  <img
                    src={ADMIN_PROFILE.avatarUrl}
                    alt="Admin"
                    className="w-10 h-10 rounded-full border border-[#f2ca50]/40 object-cover"
                  />
                  <div className="overflow-hidden">
                    <p className="font-semibold text-[#dce2f6] truncate">{ADMIN_PROFILE.name}</p>
                    <p className="text-[11px] font-medium text-[#f2ca50] truncate">{ADMIN_PROFILE.role}</p>
                    <p className="text-[10px] text-[#d0c5af]/60 truncate">admin@sadhana.app</p>
                  </div>
                </div>

                <div className="border-t border-white/10 my-2" />

                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    if (onLogout) onLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 transition-colors font-semibold"
                >
                  <span className="material-symbols-outlined text-lg">logout</span>
                  <span>Log Out of Sadhana</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
