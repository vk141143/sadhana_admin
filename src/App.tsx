import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { AudioPlayerBar } from './components/AudioPlayerBar';

import { NavigationTab, AudioTrack, UserSeeker, Album } from './types';
import {
  INITIAL_SEEKERS,
  INITIAL_ALBUMS,
  INITIAL_AUDIO_TRACKS,
} from './data/mockData';

import { DashboardView } from './views/DashboardView';
import { UserManagementView } from './views/UserManagementView';
import { AudioLibraryView } from './views/AudioLibraryView';
import { SubscriptionsView } from './views/SubscriptionsView';
import { LibraryView } from './views/LibraryView';
import { ContentView } from './views/ContentView';
import { AlbumsView } from './views/AlbumsView';
import { ScripturesView } from './views/ScripturesView';
import { FestivalsView } from './views/FestivalsView';
import { AnalyticsView } from './views/AnalyticsView';
import { ReportsView, SupportView, SettingsView } from './views/OtherViews';
import { AuthView } from './views/AuthView';
import { supabase } from './services/supabaseClient';

import { DailyContentView } from './views/DailyContentView';
import { BannerImagesView } from './views/BannerImagesView';
import { NotificationsView } from './views/NotificationsView';
import { EmotionsView } from './views/cms/EmotionsView';
import { HealingContentView } from './views/cms/HealingContentView';
import { UserJourneysView } from './views/cms/UserJourneysView';
import { SadhanaPracticesView } from './views/cms/SadhanaPracticesView';
import { AchievementsView } from './views/cms/AchievementsView';
import { BadgesView } from './views/cms/BadgesView';
import { StreakSystemView } from './views/cms/StreakSystemView';
import { DailyChallengesView } from './views/cms/DailyChallengesView';
import { GuidedSessionsView } from './views/cms/GuidedSessionsView';
import { MeditationLibraryView } from './views/cms/MeditationLibraryView';
import { RecommendationsView } from './views/cms/RecommendationsView';
import { SpiritualInsightsView } from './views/cms/SpiritualInsightsView';

export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpenMobileSidebar, setIsOpenMobileSidebar] = useState(false);

  // Global State
  const [seekers, setSeekers] = useState<UserSeeker[]>(INITIAL_SEEKERS);
  const [albums, setAlbums] = useState<Album[]>(INITIAL_ALBUMS);
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>(INITIAL_AUDIO_TRACKS);

  // Audio Player State
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(
    INITIAL_AUDIO_TRACKS[0] || null
  );
  const [isPlaying, setIsPlaying] = useState(false);

  if (!isAuthenticated) {
    return <AuthView onLoginSuccess={() => setIsAuthenticated(true)} />;  // AuthView handles Supabase auth internally
  }

  // Handlers
  const handlePlayTrack = (track: AudioTrack) => {
    if (currentTrack?.id === track.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentTrack(track);
      setIsPlaying(true);
    }
  };

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleNextTrack = () => {
    if (!currentTrack) return;
    const currentIndex = audioTracks.findIndex((t) => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % audioTracks.length;
    setCurrentTrack(audioTracks[nextIndex]);
    setIsPlaying(true);
  };

  const handlePrevTrack = () => {
    if (!currentTrack) return;
    const currentIndex = audioTracks.findIndex((t) => t.id === currentTrack.id);
    const prevIndex = (currentIndex - 1 + audioTracks.length) % audioTracks.length;
    setCurrentTrack(audioTracks[prevIndex]);
    setIsPlaying(true);
  };

  // User Actions
  const handleAddUser = (newUserData: Partial<UserSeeker>) => {
    const newUser: UserSeeker = {
      id: `usr-${Date.now()}`,
      name: newUserData.name || 'Anonymous Seeker',
      email: newUserData.email || 'seeker@dharma.com',
      avatarUrl:
        newUserData.avatarUrl ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
      country: newUserData.country || 'India',
      countryCode: newUserData.countryCode || 'IN',
      flag: newUserData.flag || '🇮🇳',
      joinedDate: 'Today',
      subscription: newUserData.subscription || 'Dharma Elite',
      status: newUserData.status || 'Active',
    };
    setSeekers([newUser, ...seekers]);
  };

  const handleUpdateUser = (id: string, updatedFields: Partial<UserSeeker>) => {
    setSeekers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...updatedFields } : u))
    );
  };

  const handleDeleteUsers = (ids: string[]) => {
    setSeekers((prev) => prev.filter((u) => !ids.includes(u.id)));
  };

  // Audio / Album Actions
  const handleToggleTrackPremium = (trackId: string, currentVal: boolean) => {
    setAudioTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, isPremium: !currentVal } : t))
    );
  };

  const handleAddAudioTrack = (newTrackData: Partial<AudioTrack>) => {
    const newTrack: AudioTrack = {
      id: `trk-${Date.now()}`,
      trackNumber: String(audioTracks.length + 1).padStart(2, '0'),
      title: newTrackData.title || 'Untitled Stotram',
      artist: newTrackData.artist || 'Unknown Chanter',
      albumId: newTrackData.albumId || 'alb-1',
      category: newTrackData.category || 'Chant',
      language: newTrackData.language || 'Sanskrit',
      duration: newTrackData.duration || '07:30',
      durationSeconds: newTrackData.durationSeconds || 450,
      isPremium: newTrackData.isPremium ?? true,
      status: newTrackData.status || 'Active',
      coverUrl: newTrackData.coverUrl || INITIAL_ALBUMS[0].coverUrl,
    };
    setAudioTracks([newTrack, ...audioTracks]);
    handlePlayTrack(newTrack);
  };

  const handleCreateAlbum = (newAlbumData: Partial<Album>) => {
    const newAlbum: Album = {
      id: `alb-${Date.now()}`,
      title: newAlbumData.title || 'Sacred Chant Collection',
      artist: newAlbumData.artist || 'Vedic Chanting Group',
      description: newAlbumData.description || 'Collection of sacred sound frequencies.',
      releaseYear: 2026,
      coverUrl:
        newAlbumData.coverUrl ||
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCaQYZkd6b0uA0xMqmiHFm6FREXQtBtj1Ri3fGVrr_74BczZpMUkqDNEAXpHrAlxR4bDc68KnqEvQLR2ngJQhI7-2Abhzt_38glWa8i1F-a2yx14c8Lg3WnAIq33qDVRkEGPe9HbHPoYPf9D7Nnfq65olSRkiXTCr-zLP_hEp4FBL-s5X7enXj5j3cBO2q6DWLqk6XurDE6b0966qtRKpzopHCylT_-Q6YUuzRlZnvxfRXHVN6_Dbw0SA',
      tag: newAlbumData.tag || 'New',
      trackCount: 0,
      totalDuration: '0h 0m',
      status: newAlbumData.status || 'Premium',
    };
    setAlbums([newAlbum, ...albums]);
  };

  // Render View Routing
  const renderCurrentView = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <DashboardView
            audioTracks={audioTracks}
            onPlayTrack={handlePlayTrack}
            onNavigateTab={(tab) => setCurrentTab(tab)}
            onAddAudioTrack={handleAddAudioTrack}
          />
        );
      case 'library':
        return <LibraryView />;
      case 'users':
        return <UserManagementView />;
      case 'audio':
        return <AudioLibraryView />;
      case 'subscriptions':
        return <SubscriptionsView />;
      case 'content':
        return <ContentView />;

      // 12 NEW CMS MODULE VIEWS
      case 'daily-content':
        return <DailyContentView />;
      case 'banners':
        return <BannerImagesView />;
      case 'notifications':
        return <NotificationsView />;
      case 'emotions':
        return <EmotionsView />;
      case 'healing-content':
        return <HealingContentView />;
      case 'user-journeys':
        return <UserJourneysView />;
      case 'sadhana-practices':
        return <SadhanaPracticesView />;
      case 'achievements':
        return <AchievementsView />;
      case 'streak-system':
        return <StreakSystemView />;
      case 'daily-challenges':
        return <DailyChallengesView />;
      case 'badges':
        return <BadgesView />;
      case 'guided-sessions':
        return <GuidedSessionsView />;
      case 'meditation-library':
        return <MeditationLibraryView />;
      case 'recommendation-engine':
        return <RecommendationsView />;
      case 'spiritual-insights':
        return <SpiritualInsightsView />;

      case 'albums':
        return <AlbumsView />;
      case 'scriptures':
        return <LibraryView />;
      case 'festivals':
        return <FestivalsView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'reports':
        return <ReportsView />;
      case 'support':
        return <SupportView />;
      case 'settings':
        return <SettingsView />;
      default:
        return (
          <DashboardView
            audioTracks={audioTracks}
            onPlayTrack={handlePlayTrack}
            onNavigateTab={(tab) => setCurrentTab(tab)}
            onAddAudioTrack={handleAddAudioTrack}
          />
        );
    }
  };

  const handleLogout = () => {
    void supabase.auth.signOut();
    setIsAuthenticated(false);
  };

  return (
    <div className="min-h-screen bg-[#0b1220] text-[#dce2f6] font-sans antialiased selection:bg-[#f2ca50] selection:text-[#3c2f00]">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        isOpenMobile={isOpenMobileSidebar}
        onCloseMobile={() => setIsOpenMobileSidebar(false)}
        onLogout={handleLogout}
      />

      {/* Header Topbar */}
      <TopHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenMobileSidebar={() => setIsOpenMobileSidebar(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="md:ml-[280px] min-h-[calc(100vh-4rem)]">
        {renderCurrentView()}
      </main>
    </div>
  );
};

export default App;
