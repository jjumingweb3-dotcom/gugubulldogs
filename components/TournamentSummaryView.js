'use client';

import React, { useMemo } from 'react';
import { Trophy, Calendar, Users, Play, BarChart2, ShieldAlert, Award, ChevronRight } from 'lucide-react';
import { formatDate, getBulldogsResult, getDisplayTitle } from '@/lib/utils';

export default function TournamentSummaryView({
  videos = [],
  tournaments = [],
  selectedTournament = '',
  onSelectTournament,
  onSelectVideo
}) {
  // Identify active tournament (default to first active tournament if empty)
  const activeTournament = useMemo(() => {
    if (selectedTournament) return selectedTournament;
    // Find first tournament that has matches
    const tWithMatches = tournaments.find(t => videos.some(v => v.tournament === t));
    return tWithMatches || tournaments[0] || '';
  }, [selectedTournament, tournaments, videos]);

  // Filter videos for active tournament
  const tournamentVideos = useMemo(() => {
    if (!activeTournament || activeTournament === '전체') {
      return videos;
    }
    return videos.filter(v => v.tournament === activeTournament);
  }, [videos, activeTournament]);

  // Group videos by sub-team division (새싹부, 꿈나무A, 꿈나무B, 꿈나무부, 유소년부, 구구불독스 등)
  const subTeamGroups = useMemo(() => {
    const groups = {};

    // Standard order of sub-teams
    const standardDivisions = ['새싹부', '꿈나무A', '꿈나무B', '꿈나무부', '유소년부', '구구불독스'];
    standardDivisions.forEach(div => {
      groups[div] = [];
    });

    tournamentVideos.forEach(v => {
      const div = v.team_division || '기타';
      if (!groups[div]) {
        groups[div] = [];
      }
      groups[div].push(v);
    });

    // Remove empty groups and format into array
    return Object.entries(groups)
      .filter(([_, list]) => list.length > 0)
      .map(([division, list]) => {
        let wins = 0;
        let losses = 0;
        let draws = 0;

        list.forEach(v => {
          const res = getBulldogsResult(v);
          if (res.outcome === 'win') wins++;
          else if (res.outcome === 'loss') losses++;
          else if (res.outcome === 'draw') draws++;
        });

        return {
          division,
          videos: list,
          wins,
          losses,
          draws,
          total: list.length
        };
      });
  }, [tournamentVideos]);

  const getDivisionIcon = (division) => {
    if (division.includes('새싹')) return '🌱';
    if (division.includes('꿈나무')) return '🌳';
    if (division.includes('유소년')) return '⚡';
    return '🐾';
  };

  const getDivisionBadgeStyle = (division) => {
    if (division.includes('새싹')) return 'bg-lime-50 text-lime-700 border-lime-200';
    if (division.includes('꿈나무')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (division.includes('유소년')) return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-purple-50 text-purple-700 border-purple-200';
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Tournament Selection Header (Light Theme Optimized) */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 md:p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-primary">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-extrabold text-slate-800 flex items-center gap-2">
                대회별 세부팀 결과 모아보기
              </h2>
              <p className="text-xs text-slate-500">
                대회를 선택하시면 각 세부팀(새싹부, 꿈나무부, 유소년부 등)의 경기 결과를 확인하실 수 있습니다.
              </p>
            </div>
          </div>

          {/* Quick Dropdown Selector for Mobile */}
          <div className="shrink-0 min-w-[220px]">
            <select
              value={activeTournament}
              onChange={(e) => onSelectTournament(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 hover:border-primary text-slate-800 rounded-xl px-3.5 py-2.5 text-xs md:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer"
            >
              {tournaments.map((t) => {
                const count = videos.filter(v => v.tournament === t).length;
                return (
                  <option key={t} value={t}>
                    {t} ({count}경기)
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Scrollable Tournament Chip Selector with Smooth Scroll Touch Bar */}
        <div className="pt-2 border-t border-slate-100">
          <div className="w-full overflow-x-auto py-1 no-scrollbar scroll-smooth">
            <div className="flex items-center gap-2 min-w-max">
              {tournaments.map((t) => {
                const count = videos.filter(v => v.tournament === t).length;
                const isSelected = activeTournament === t;
                return (
                  <button
                    key={t}
                    onClick={() => onSelectTournament(t)}
                    className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold whitespace-nowrap border transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-white border-primary shadow-xs'
                        : 'bg-slate-100/80 border-slate-200 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                  >
                    {t} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Active Tournament Container */}
      {activeTournament && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 md:p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold mb-2">
              <Award className="w-3.5 h-3.5" />
              <span>선택된 대회</span>
            </div>
            <h3 className="text-lg md:text-2xl font-extrabold text-slate-800 tracking-tight">
              {activeTournament}
            </h3>
          </div>

          {/* Sub-Team Group Cards */}
          {subTeamGroups.length > 0 ? (
            <div className="space-y-5">
              {subTeamGroups.map((group) => (
                <div 
                  key={group.division}
                  className="bg-slate-50/70 border border-slate-200 rounded-2xl overflow-hidden space-y-0"
                >
                  {/* Sub-Team Header Banner */}
                  <div className="bg-slate-100/90 px-5 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{getDivisionIcon(group.division)}</span>
                      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${getDivisionBadgeStyle(group.division)}`}>
                        {group.division}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        ({group.total}경기)
                      </span>
                    </div>
                  </div>

                  {/* Matches List for this Sub-Team */}
                  <div className="divide-y divide-slate-200/60 bg-white">
                    {group.videos.map((video) => {
                      const res = getBulldogsResult(video);
                      const hasScores = video.home_score !== undefined && video.home_score !== null && video.away_score !== undefined && video.away_score !== null;

                      return (
                        <div
                          key={video.id}
                          onClick={() => onSelectVideo(video)}
                          className="p-4 hover:bg-slate-50 transition-colors duration-200 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                        >
                          {/* Match Main Info */}
                          <div className="flex items-start sm:items-center gap-3 min-w-0">
                            {/* Thumbnail preview */}
                            <div className="relative w-16 h-10 rounded-lg overflow-hidden shrink-0 bg-slate-200 border border-slate-200">
                              <img 
                                src={video.thumbnail_url} 
                                alt={video.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                              />
                              <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Play className="w-3.5 h-3.5 text-white fill-current" />
                              </div>
                            </div>

                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 text-xs text-slate-400">
                                <span className="flex items-center gap-1 font-mono">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  {formatDate(video.published_at)}
                                </span>
                                {video.opponent && (
                                  <span className="flex items-center gap-1">
                                    <Users className="w-3 h-3 text-slate-400" />
                                    <span>vs <strong className="text-slate-700 font-semibold">{video.opponent}</strong></span>
                                  </span>
                                )}
                              </div>
                              <h5 className="text-xs md:text-sm font-bold text-slate-800 truncate group-hover:text-primary transition-colors">
                                {getDisplayTitle(video)}
                              </h5>
                            </div>
                          </div>

                          {/* Outcome Badge (Unified Color Palette for Light Background) */}
                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                            {res.outcome === 'win' ? (
                              <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-xl px-2.5 py-1">
                                <span className="text-xs font-bold text-blue-700 flex items-center gap-1">
                                  <span className="bg-blue-600 text-white px-1.5 py-0.5 rounded text-[10px] font-black">
                                    🏆 승
                                  </span>
                                  <span>{res.label}</span>
                                  {hasScores && (
                                    <span className="text-[10px] font-extrabold text-blue-600 font-mono ml-1">
                                      {video.away_score} : {video.home_score}
                                    </span>
                                  )}
                                </span>
                              </div>
                            ) : res.outcome === 'loss' ? (
                              <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1">
                                <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                                  <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                    패
                                  </span>
                                  <span>{res.label || '패'}</span>
                                  {hasScores && (
                                    <span className="text-[10px] font-bold text-slate-500 font-mono ml-1">
                                      {video.away_score} : {video.home_score}
                                    </span>
                                  )}
                                </span>
                              </div>
                            ) : res.outcome === 'draw' ? (
                              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                                  <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                    무
                                  </span>
                                  <span>무승부</span>
                                  {hasScores && (
                                    <span className="text-[10px] font-bold text-slate-500 font-mono ml-1">
                                      {video.away_score} : {video.home_score}
                                    </span>
                                  )}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                                <span className="text-xs font-semibold text-slate-500">
                                  {video.win_team ? `🏆 ${video.win_team}` : '결과 미기록'}
                                </span>
                              </div>
                            )}

                            <div className="text-slate-400 group-hover:text-primary transition-colors">
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center space-y-2 bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <ShieldAlert className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm text-slate-600 font-semibold">이 대회에 등록된 세부팀 경기 결과가 없습니다.</p>
              <p className="text-xs text-slate-400">상단의 다른 대회를 선택해 보세요.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
