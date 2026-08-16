'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Settings, Play, Youtube, Tv, Calendar, Info, Music, Trophy, BarChart2 } from 'lucide-react';
import Link from 'next/link';
import CategoryTabs from './CategoryTabs';
import FilterBar from './FilterBar';
import VideoCard from './VideoCard';
import VideoDetailModal from './VideoDetailModal';
import TournamentSummaryView from './TournamentSummaryView';

export default function PlaybookContainer({ initialVideos, initialTournaments = [] }) {
  // Log visit once per session
  useEffect(() => {
    try {
      const hasVisited = sessionStorage.getItem('gugu_visited');
      if (!hasVisited) {
        fetch('/api/visit', { method: 'POST' })
          .then(res => {
            if (res.ok) {
              sessionStorage.setItem('gugu_visited', 'true');
            }
          })
          .catch(e => console.error('Error logging visit:', e));
      }
    } catch (err) {
      console.error('SessionStorage error:', err);
    }
  }, []);

  // Client-side states for view mode, search and filtering
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'summary'
  const [activeTab, setActiveTab] = useState('전체');
  const [isTournamentExpanded, setIsTournamentExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTournament, setSelectedTournament] = useState('');
  const [selectedOpponent, setSelectedOpponent] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [selectedVideo, setSelectedVideo] = useState(null);

  // Combine managed tournaments and tournaments from videos, sorted by most recent video published date
  const { tournaments, opponents } = useMemo(() => {
    const opps = new Set();
    initialVideos.forEach(v => {
      if (v.opponent) opps.add(v.opponent);
    });

    // 1. Gather all tournaments that actually have videos, in order of their video published date (since initialVideos is sorted desc)
    const activeTournaments = [];
    const seenActive = new Set();
    initialVideos.forEach(v => {
      if (v.tournament && !seenActive.has(v.tournament)) {
        seenActive.add(v.tournament);
        activeTournaments.push(v.tournament);
      }
    });

    // 2. Gather all tournaments from initialTournaments that do NOT have any videos, sorted alphabetically
    const inactiveTournaments = [];
    initialTournaments.forEach(t => {
      if (t && !seenActive.has(t)) {
        inactiveTournaments.push(t);
      }
    });
    inactiveTournaments.sort();

    // 3. Combine active (recent first) and inactive (alphabetical)
    const combinedTournaments = [...activeTournaments, ...inactiveTournaments];

    return {
      tournaments: combinedTournaments,
      opponents: Array.from(opps).sort()
    };
  }, [initialVideos, initialTournaments]);

  // Video counts for tabs (based on the entire database)
  const videoCounts = useMemo(() => {
    const counts = { 전체: initialVideos.length, 새싹부: 0, 꿈나무부: 0, 유소년부: 0, 구구불독스: 0 };
    initialVideos.forEach(v => {
      if (v.team_division === '새싹부') {
        counts.새싹부++;
      } else if (v.team_division === '꿈나무부' || v.team_division === '꿈나무A' || v.team_division === '꿈나무B') {
        counts.꿈나무부++;
      } else if (v.team_division === '유소년부') {
        counts.유소년부++;
      } else if (v.team_division === '구구불독스') {
        counts.구구불독스++;
      }
    });
    return counts;
  }, [initialVideos]);

  // Apply filtering rules
  const filteredVideos = useMemo(() => {
    return initialVideos.filter(video => {
      // 1. Division Tab filter
      if (activeTab !== '전체') {
        if (activeTab === '꿈나무부') {
          if (video.team_division !== '꿈나무부' && video.team_division !== '꿈나무A' && video.team_division !== '꿈나무B') {
            return false;
          }
        } else if (video.team_division !== activeTab) {
          return false;
        }
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
      <header className="sticky top-0 z-30 w-full glass border-b border-gray-700 py-4 px-4 md:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-dark-bg font-black text-lg shadow-[0_0_12px_rgba(59,130,246,0.4)]">
              G
            </div>
            <div>
              <h1 className="text-sm md:text-base font-extrabold tracking-tight text-gray-100 flex items-center gap-1">
                구구불독스 <span className="text-primary">플레이북</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Cheer Songs shortcut button */}
            <a 
              href="https://youtu.be/Zhrza56Y-mQ?si=eYrzX3FpJIFgPHPB"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 text-xs md:text-sm font-semibold text-primary transition-all duration-300 active:scale-95 cursor-pointer"
              title="구구불독스 공식 응원가 모음 바로가기"
            >
              <Music className="w-3.5 h-3.5" />
              <span>응원가</span>
            </a>

            {/* Link to Admin Panel */}
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 hover:border-primary/30 hover:bg-gray-700 text-xs md:text-sm font-semibold text-gray-300 hover:text-primary transition-all duration-300"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">관리자</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Page Container */}
      <main className="max-w-6xl w-full mx-auto px-4 md:px-8 py-6 flex-grow space-y-6">

        {/* View Switcher Bar ( 경기 영상 목록 vs 대회별 모아보기 ) */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 gap-3">
          <div className="flex items-center p-1 bg-slate-100/80 border border-slate-200 rounded-2xl w-full sm:w-auto">
            <button
              onClick={() => setViewMode('list')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all duration-200 cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>경기 영상 목록</span>
            </button>

            <button
              onClick={() => setViewMode('summary')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all duration-200 cursor-pointer ${
                viewMode === 'summary'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-slate-600 hover:text-primary hover:bg-slate-200/60'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>대회별 모아보기</span>
            </button>
          </div>

          {viewMode === 'list' && (
            <button
              onClick={() => setViewMode('summary')}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>대회별 모아보기 ➔</span>
            </button>
          )}
        </div>

        {/* View Mode 1: Tournament Summary Aggregation View */}
        {viewMode === 'summary' ? (
          <TournamentSummaryView
            videos={initialVideos}
            tournaments={tournaments}
            selectedTournament={selectedTournament}
            onSelectTournament={(t) => setSelectedTournament(t)}
            onSelectVideo={(v) => setSelectedVideo(v)}
          />
        ) : (
          /* View Mode 2: Standard Video Card List View */
          <div className="space-y-6">
            {/* Categories Tab Bar */}
            <div className="space-y-4">
              <div className="flex flex-col gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">부서별 경기</span>
                <CategoryTabs 
                  activeTab={activeTab} 
                  onTabChange={setActiveTab} 
                  videoCounts={videoCounts}
                />
              </div>

              {/* Tournament Filter Chips (Always Expanded Wrapped Grid Layout) */}
              <div className="flex flex-col gap-3 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">대회별 경기 ({tournaments.length}개 대회)</span>
                    {selectedTournament && (
                      <button
                        onClick={() => setViewMode('summary')}
                        className="px-2.5 py-0.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold hover:bg-blue-100 transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Trophy className="w-3 h-3" />
                        <span>이 대회 모아보기</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Wrapped Grid view - All tournament chips visible & easily clickable */}
                <div className="flex flex-wrap gap-2 pb-1 animate-fadeIn">
                  <button
                    onClick={() => setSelectedTournament('')}
                    className={`px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold whitespace-nowrap border transition-all duration-200 cursor-pointer ${
                      !selectedTournament
                        ? 'bg-primary text-white border-primary shadow-xs'
                        : 'bg-slate-100/90 border-slate-200 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
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
                        className={`px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold border transition-all duration-200 cursor-pointer ${
                          selectedTournament === t
                            ? 'bg-primary text-white border-primary shadow-xs font-bold'
                            : 'bg-slate-100/90 border-slate-200 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
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
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
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
                <div className="w-full py-20 bg-gray-800 border border-gray-700 rounded-3xl flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <Info className="w-10 h-10 text-gray-500" />
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
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-300 rounded-xl transition-all duration-200"
                    >
                      필터 초기화
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full py-8 mt-12 bg-gray-900 border-t border-gray-700 px-4 text-center text-xs text-gray-400">
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

