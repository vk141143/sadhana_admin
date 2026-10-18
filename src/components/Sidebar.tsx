import React from 'react';
import { NavigationTab } from '../types';
import { ADMIN_PROFILE } from '../data/mockData';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenMobile = false,
  onCloseMobile,
  onLogout,
}) => {
  const navItems: { id: NavigationTab; label: string; icon: string; section?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'library', label: 'Library', icon: 'menu_book', section: 'User Library' },
    { id: 'users', label: 'Users', icon: 'group' },
    { id: 'content', label: 'Content', icon: 'library_books', section: 'Content' },
    { id: 'daily-content', label: 'Daily Content', icon: 'auto_awesome' },
    { id: 'banners', label: 'Banner Images', icon: 'add_photo_alternate' },
    { id: 'notifications', label: 'Notifications', icon: 'notifications', section: 'Engagement' },
    { id: 'emotions', label: 'Emotions', icon: 'psychology' },
    { id: 'healing-content', label: 'Healing Content', icon: 'healing' },
    { id: 'user-journeys', label: 'User Journeys', icon: 'auto_stories' },
    { id: 'sadhana-practices', label: 'Sadhana Practices', icon: 'self_improvement' },
    { id: 'achievements', label: 'Achievements', icon: 'military_tech' },
    { id: 'streak-system', label: 'Streak System', icon: 'local_fire_department' },
    { id: 'daily-challenges', label: 'Daily Challenges', icon: 'today' },
    { id: 'badges', label: 'Badges', icon: 'verified' },
    { id: 'guided-sessions', label: 'Guided Sessions', icon: 'spatial_audio' },
    { id: 'meditation-library', label: 'Meditation Library', icon: 'library_music' },
    { id: 'recommendation-engine', label: 'Recommendation Engine', icon: 'auto_fix_high' },
    { id: 'spiritual-insights', label: 'Spiritual Insights', icon: 'auto_awesome' },
    { id: 'audio', label: 'Audio', icon: 'audiotrack' },
    { id: 'albums', label: 'Albums', icon: 'album' },
    { id: 'scriptures', label: 'Scriptures', icon: 'menu_book' },
    { id: 'festivals', label: 'Festivals', icon: 'temple_hindu' },
    { id: 'analytics', label: 'Analytics', icon: 'analytics', section: 'Insights' },
    { id: 'reports', label: 'Reports', icon: 'description' },
    { id: 'support', label: 'Support', icon: 'support_agent' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`w-[280px] h-full fixed left-0 top-0 border-r border-white/10 bg-[#19202e] flex flex-col py-6 z-50 shadow-[40px_0_40px_-10px_rgba(0,0,0,0.5)] transition-transform duration-300 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="px-6 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#d4af37] flex items-center justify-center sacred-glow shadow-md">
              <span
                className="material-symbols-outlined text-[#3c2f00] font-bold text-2xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                temple_hindu
              </span>
            </div>
            <div>
              <h1 className="font-serif-headline text-2xl text-[#f2ca50] font-bold leading-none tracking-tight">
                Sadhana
              </h1>
              <p className="text-[11px] font-semibold text-[#d0c5af]/60 uppercase tracking-[0.2em] mt-1">
                Vedic Steward
              </p>
            </div>
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="md:hidden text-[#d0c5af] hover:text-[#f2ca50] p-1"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item, idx) => {
            const isActive = currentTab === item.id;
            const showSection = item.section;

            return (
              <React.Fragment key={item.id}>
                {showSection && (
                  <div className="pt-5 pb-2 px-4">
                    <span className="text-[11px] font-semibold text-[#d0c5af]/40 uppercase tracking-[0.2em]">
                      {item.section}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => {
                    onSelectTab(item.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 text-left ${
                    isActive
                      ? 'text-[#f2ca50] font-bold border-l-4 border-[#f2ca50] bg-[#f2ca50]/10 shadow-[inset_0_0_20px_rgba(242,202,80,0.05)]'
                      : 'text-[#d0c5af] font-medium hover:bg-white/5 hover:text-[#f2ca50]'
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-[22px]"
                    style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {item.icon}
                  </span>
                  <span className="text-[15px]">{item.label}</span>
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        {/* Footer Admin Avatar */}
        <div className="mt-6 px-4 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-[#232a39]/70 border border-white/5 shadow-inner">
            <div className="flex items-center gap-3 overflow-hidden">
              <img
                className="w-10 h-10 rounded-full object-cover border-2 border-[#f2ca50]/30 shadow-md shrink-0"
                src={ADMIN_PROFILE.avatarUrl}
                alt={ADMIN_PROFILE.name}
              />
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-[#dce2f6] truncate">
                  {ADMIN_PROFILE.name}
                </p>
                <p className="text-[11px] font-semibold text-[#f2ca50]/80 uppercase tracking-wider truncate">
                  {ADMIN_PROFILE.role}
                </p>
              </div>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                className="p-2 text-rose-400 hover:text-rose-200 hover:bg-rose-500/20 rounded-xl transition-colors shrink-0"
                title="Log Out"
              >
                <span className="material-symbols-outlined text-xl">logout</span>
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
