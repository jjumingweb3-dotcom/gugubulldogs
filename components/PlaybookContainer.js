'use client';

import React, { useState, useMemo } from 'react';
import { Settings, Play, Youtube, Tv, Calendar, Info } from 'lucide-react';
import Link from 'next/link';
import CategoryTabs from './CategoryTabs';
import FilterBar from './FilterBar';
import VideoCard from './VideoCard';
import VideoDetailModal from './VideoDetailModal';

export default function PlaybookContainer({ initialVideos, initialTournaments = [] }) {
  // Client-side states for search and filtering
  const [activeTab, setActiveTab] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTournament, setSelectedTournament] = useState('');
  const [selectedOpponent, setSelectedOpponent] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [selectedVideo, setSelectedVideo] = useState(null);

  // Combine managed tournaments and tournaments from videos
  const { tournaments, opponents } = useMemo(() => {
    const tourns = new Set(initialTournaments);
    const opps = new Set();
    initialVideos.forEach(v => {
      if (v.tournament) tourns.add(v.tournament);
      if (v.opponent) opps.add(v.opponent);
    });
    return {
      tournaments: Array.from(tourns).sort(),
      opponents: Array.from(opps).sort()
    };
  }, [initialVideos, initialTournaments]);

  // Video counts for tabs (based on the entire database)
  const videoCounts = useMemo(() => {
    const counts = { 전체: initialVideos.length, 새싹부: 0, 꿈나무부: 0, 유소년부: 0 };
    initialVideos.forEach(v => {
      if (counts[v.team_division] !== undefined) {
        counts[v.team_division]++;
      }
    });
    return counts;
  }, [initialVideos]);

  // Apply filtering rules
  const filteredVideos = useMemo(() => {
    return initialVideos.filter(video => {
      // 1. Division Tab filter
      if (activeTab !== '전체' && video.team_division !== activeTab) {
        return false;
      }
      
      // 2. Search Query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = video.title?.toLowerCase().includes(query);
        const opponentMatch = video.opponent?.toLowerCase().includes(query);
        const tournamentMatch = video.tournament?.toLowerCase().includes(query);
        if (!titleMatch && !opponentMatch && !tournamentMatch) {
          return false;
        }
      }

      // 3. Tournament select filter
      if (selectedTournament && video.tournament !== selectedTournament) {
        return false;
      }

      // 4. Opponent select filter
      if (selectedOpponent && video.opponent !== selectedOpponent) {
        return false;
      }

      // 5. Platform select filter
      if (selectedPlatform && video.source !== selectedPlatform) {
        return false;
      }

      return true;
    });
  }, [initialVideos, activeTab, searchQuery, selectedTournament, selectedOpponent, selectedPlatform]);

  // Reset all select filters
  const handleResetFilters = () => {
    setSelectedTournament('');
    setSelectedOpponent('');
    setSelectedPlatform('');
  };

  return (
    <div className="flex-grow flex flex-col">
      {/* App Header */}
      <header className="sticky top-0 z-30 w-full glass border-b border-white/5 py-4 px-4 md:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-dark-bg font-black text-lg shadow-[0_0_12px_rgba(197,255,26,0.4)]">
              G
            </div>
            <div>
              <h1 className="text-sm md:text-base font-extrabold tracking-tight text-white flex items-center gap-1">
                구구불독스 <span className="text-primary">플레이북</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Link to Admin Panel */}
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/5 hover:border-primary/20 hover:bg-white/10 text-xs md:text-sm font-semibold text-gray-400 hover:text-primary transition-all duration-300"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">관리자</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Page Container */}
      <main className="max-w-6xl w-full mx-auto px-4 md:px-8 py-6 flex-grow space-y-6">
        {/* Categories Tab Bar */}
        <div className="space-y-4">
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">부서별 경기</span>
            <CategoryTabs 
              activeTab={activeTab} 
              onTabChange={setActiveTab} 
              videoCounts={videoCounts}
            />
          </div>

          {/* Tournament Filter Chips */}
          <div className="flex flex-col gap-3 pt-1">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">대회별 경기</span>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1.5 -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth">
              <button
                onClick={() => setSelectedTournament('')}
                className={`px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold whitespace-nowrap border transition-all duration-200 ${
                  !selectedTournament
                    ? 'bg-primary text-dark-bg border-primary shadow-[0_0_10px_rgba(197,255,26,0.2)]'
                    : 'bg-white/5 border-white/5 text-gray-400 hover:text-gray-200 hover:bg-white/10'
                }`}
              >
                전체 대회 ({initialVideos.length})
              </button>
              {tournaments.map((t) => {
                const count = initialVideos.filter(v => v.tournament === t).length;
                return (
                  <button
                    key={t}
                    onClick={() => setSelectedTournament(selectedTournament === t ? '' : t)}
                    className={`px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold whitespace-nowrap border transition-all duration-200 ${
                      selectedTournament === t
                        ? 'bg-primary text-dark-bg border-primary shadow-[0_0_10px_rgba(197,255,26,0.2)]'
                        : 'bg-white/5 border-white/5 text-gray-400 hover:text-gray-200 hover:bg-white/10'
                    }`}
                  >
                    {t} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filtering Bar */}
          <FilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedTournament={selectedTournament}
            onTournamentChange={setSelectedTournament}
            selectedOpponent={selectedOpponent}
            onOpponentChange={setSelectedOpponent}
            selectedPlatform={selectedPlatform}
            onPlatformChange={setSelectedPlatform}
            tournaments={tournaments}
            opponents={opponents}
            onReset={handleResetFilters}
          />
        </div>

        {/* Video Grid */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              조회 결과 ({filteredVideos.length}건)
            </span>
          </div>

          {filteredVideos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredVideos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  onClick={setSelectedVideo}
                />
              ))}
            </div>
          ) : (
            <div className="w-full py-20 bg-white/5 border border-white/5 rounded-3xl flex flex-col items-center justify-center text-center p-6 space-y-3">
              <Info className="w-10 h-10 text-gray-600" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-gray-400">조건에 맞는 경기가 없습니다</h4>
                <p className="text-xs text-gray-500">검색어나 필터 값을 확인해 주시거나 다른 탭을 선택해 보세요.</p>
              </div>
              {(searchQuery || selectedTournament || selectedOpponent || selectedPlatform) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    handleResetFilters();
                  }}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 text-xs font-semibold text-gray-300 rounded-xl transition-all duration-200"
                >
                  필터 초기화
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 mt-12 bg-black/40 border-t border-white/5 px-4 text-center text-xs text-gray-600">
        <div className="max-w-6xl mx-auto space-y-1">
          <p>© 2026 구구불독스 유소년 야구단 플레이북. All rights reserved.</p>
          <p className="text-[10px]">본 플랫폼은 유튜브/SOOP의 공식 링크 공유(앱 딥링크) 규칙을 준수하며 영상을 직접 저장하거나 재배포하지 않습니다.</p>
        </div>
      </footer>

      {/* Video Detail Popup Inspector */}
      {selectedVideo && (
        <VideoDetailModal
          video={selectedVideo}
          onClose={() => setSelectedVideo(null)}
        />
      )}
    </div>
  );
}
