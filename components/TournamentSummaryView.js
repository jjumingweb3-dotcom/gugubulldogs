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

  // Filter videos for active tournament (or all if activeTournament is '전체')
  const tournamentVideos = useMemo(() => {
    if (!activeTournament || activeTournament === '전체') {
      return videos;
    }
    return videos.filter(v => v.tournament === activeTournament);
  }, [videos, activeTournament]);

  // Calculate Overall Gugubulldogs Stats for the active tournament
  const overallStats = useMemo(() => {
    let wins = 0;
    let losses = 0;
    let draws = 0;
    let unrecorded = 0;

    tournamentVideos.forEach(v => {
      const res = getBulldogsResult(v);
      if (res.outcome === 'win') wins++;
      else if (res.outcome === 'loss') losses++;
      else if (res.outcome === 'draw') draws++;
      else unrecorded++;
    });

    const totalRecorded = wins + losses + draws;
    const winRate = totalRecorded > 0 ? Math.round((wins / (wins + losses)) * 100) || 0 : 0;

    return {
      total: tournamentVideos.length,
      wins,
      losses,
      draws,
      unrecorded,
      winRate
    };
  }, [tournamentVideos]);

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

  const getDivisionBadgeColor = (division) => {
    if (division.includes('새싹')) return 'bg-lime-500/20 text-lime-300 border-lime-500/40';
    if (division.includes('꿈나무')) return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    if (division.includes('유소년')) return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Tournament Selection Header */}
      <div className="bg-gray-800/80 border border-gray-700 rounded-3xl p-5 md:p-6 space-y-4 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-black text-gray-100 flex items-center gap-2">
                대회별 승패 모아보기
              </h2>
              <p className="text-xs text-gray-400">
                대회를 선택하시면 각 세부팀(새싹부, 꿈나무부, 유소년부 등)의 전적과 경기 결과를 한눈에 확인하실 수 있습니다.
              </p>
            </div>
          </div>

          {/* Quick Dropdown Selector for Mobile & Desktop */}
          <div className="shrink-0 min-w-[200px]">
            <select
              value={activeTournament}
              onChange={(e) => onSelectTournament(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 hover:border-primary text-gray-100 rounded-xl px-3.5 py-2.5 text-xs md:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer"
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

        {/* Scrollable Tournament Chip Selector */}
        <div className="pt-2 border-t border-gray-700/60">
          <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-none">
            {tournaments.map((t) => {
              const count = videos.filter(v => v.tournament === t).length;
              const isSelected = activeTournament === t;
              return (
                <button
                  key={t}
                  onClick={() => onSelectTournament(t)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-amber-500 text-gray-950 border-amber-400 font-extrabold shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                      : 'bg-gray-900 border-gray-700 text-gray-300 hover:text-gray-100 hover:bg-gray-700'
                  }`}
                >
                  {t} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Tournament Overview Dashboard Card */}
      {activeTournament && (
        <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-gray-700 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-700 pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold mb-2">
                <Award className="w-3.5 h-3.5" />
                <span>선택된 대회</span>
              </div>
              <h3 className="text-lg md:text-2xl font-black text-gray-100 tracking-tight">
                {activeTournament}
              </h3>
            </div>

            {/* Overall Stat Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="bg-emerald-950/70 border border-emerald-500/50 px-4 py-2 rounded-2xl text-center shadow-inner">
                <div className="text-[10px] uppercase font-bold text-emerald-400">승리</div>
                <div className="text-xl md:text-2xl font-black text-emerald-300 font-mono">{overallStats.wins}승</div>
              </div>

              <div className="bg-rose-950/40 border border-rose-500/30 px-4 py-2 rounded-2xl text-center">
                <div className="text-[10px] uppercase font-bold text-rose-400">패배</div>
                <div className="text-xl md:text-2xl font-black text-rose-300 font-mono">{overallStats.losses}패</div>
              </div>

              {overallStats.draws > 0 && (
                <div className="bg-amber-950/40 border border-amber-500/30 px-4 py-2 rounded-2xl text-center">
                  <div className="text-[10px] uppercase font-bold text-amber-400">무승부</div>
                  <div className="text-xl md:text-2xl font-black text-amber-300 font-mono">{overallStats.draws}무</div>
                </div>
              )}

              <div className="bg-gray-800 border border-gray-700 px-4 py-2 rounded-2xl text-center">
                <div className="text-[10px] uppercase font-bold text-gray-400">총 경기</div>
                <div className="text-xl md:text-2xl font-black text-gray-100 font-mono">{overallStats.total}경기</div>
              </div>
            </div>
          </div>

          {/* Sub-Teams Breakdown Header */}
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-extrabold text-gray-200 uppercase tracking-wider flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary" />
              <span>세부팀별 승패 정리 ({subTeamGroups.length}개 부서 참가)</span>
            </h4>
          </div>

          {/* Sub-Team Group Cards */}
          {subTeamGroups.length > 0 ? (
            <div className="space-y-6">
              {subTeamGroups.map((group) => (
                <div 
                  key={group.division}
                  className="bg-gray-900/90 border border-gray-700/80 rounded-2xl overflow-hidden shadow-md space-y-0"
                >
                  {/* Sub-Team Header Banner */}
                  <div className="bg-gray-800/90 px-5 py-3.5 border-b border-gray-700 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{getDivisionIcon(group.division)}</span>
                      <span className={`px-3 py-1 rounded-xl text-xs font-black border ${getDivisionBadgeColor(group.division)}`}>
                        {group.division}
                      </span>
                      <span className="text-xs text-gray-400 font-semibold">
                        (총 {group.total}경기)
                      </span>
                    </div>

                    {/* Sub-Team Record Tally */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gray-900 border border-gray-700 text-xs font-mono font-bold">
                        <span className="text-emerald-400 font-black">{group.wins}승</span>
                        <span className="text-gray-500">•</span>
                        <span className="text-rose-400 font-black">{group.losses}패</span>
                        {group.draws > 0 && (
                          <>
                            <span className="text-gray-500">•</span>
                            <span className="text-amber-400 font-black">{group.draws}무</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Matches List for this Sub-Team */}
                  <div className="divide-y divide-gray-800">
                    {group.videos.map((video) => {
                      const res = getBulldogsResult(video);
                      const hasScores = video.home_score !== undefined && video.home_score !== null && video.away_score !== undefined && video.away_score !== null;

                      return (
                        <div
                          key={video.id}
                          onClick={() => onSelectVideo(video)}
                          className="p-4 hover:bg-gray-800/60 transition-colors duration-200 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                        >
                          {/* Match Main Info */}
                          <div className="flex items-start sm:items-center gap-3 min-w-0">
                            {/* Thumbnail preview */}
                            <div className="relative w-16 h-10 rounded-lg overflow-hidden shrink-0 bg-gray-800 border border-gray-700">
                              <img 
                                src={video.thumbnail_url} 
                                alt={video.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                              />
                              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Play className="w-3.5 h-3.5 text-white fill-current" />
                              </div>
                            </div>

                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                <span className="flex items-center gap-1 font-mono">
                                  <Calendar className="w-3 h-3 text-gray-500" />
                                  {formatDate(video.published_at)}
                                </span>
                                {video.opponent && (
                                  <span className="flex items-center gap-1">
                                    <Users className="w-3 h-3 text-gray-500" />
                                    <span>vs <strong className="text-gray-200">{video.opponent}</strong></span>
                                  </span>
                                )}
                              </div>
                              <h5 className="text-xs md:text-sm font-bold text-gray-100 truncate group-hover:text-primary transition-colors">
                                {getDisplayTitle(video)}
                              </h5>
                            </div>
                          </div>

                          {/* Outcome Badge & Quick Action */}
                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-800/80">
                            {res.outcome === 'win' ? (
                              <div className="flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-500/60 rounded-xl px-3 py-1.5 shadow-[0_0_10px_rgba(16,185,129,0.25)]">
                                <span className="text-xs font-black text-emerald-300 flex items-center gap-1">
                                  <span>🏆</span>
                                  <span>{res.label}</span>
                                  {hasScores && (
                                    <span className="bg-emerald-400 text-emerald-950 px-2 py-0.5 rounded text-[10px] font-black font-mono ml-1">
                                      {video.away_score} : {video.home_score}
                                    </span>
                                  )}
                                </span>
                              </div>
                            ) : res.outcome === 'loss' ? (
                              <div className="flex items-center gap-1.5 bg-rose-950/40 border border-rose-500/30 rounded-xl px-3 py-1">
                                <span className="text-xs font-bold text-rose-300 flex items-center gap-1">
                                  <span>{res.label || '패'}</span>
                                  {hasScores && (
                                    <span className="bg-rose-900/60 text-rose-200 px-2 py-0.5 rounded text-[10px] font-bold font-mono ml-1">
                                      {video.away_score} : {video.home_score}
                                    </span>
                                  )}
                                </span>
                              </div>
                            ) : res.outcome === 'draw' ? (
                              <div className="flex items-center gap-1.5 bg-amber-950/40 border border-amber-500/30 rounded-xl px-3 py-1">
                                <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                                  <span>🤝 {res.label || '무승부'}</span>
                                  {hasScores && (
                                    <span className="bg-amber-900/60 text-amber-200 px-2 py-0.5 rounded text-[10px] font-bold font-mono ml-1">
                                      {video.away_score} : {video.home_score}
                                    </span>
                                  )}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 bg-gray-800 border border-gray-700 rounded-xl px-3 py-1">
                                <span className="text-xs font-semibold text-gray-400">
                                  {video.win_team ? `🏆 ${video.win_team}` : '결과 미기록'}
                                </span>
                              </div>
                            )}

                            <div className="text-gray-500 group-hover:text-primary transition-colors">
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
            <div className="py-12 text-center space-y-2 bg-gray-900 border border-gray-700 rounded-2xl p-4">
              <ShieldAlert className="w-8 h-8 text-gray-500 mx-auto" />
              <p className="text-sm text-gray-400 font-semibold">이 대회에 등록된 세부팀 경기 결과가 없습니다.</p>
              <p className="text-xs text-gray-500">상단의 다른 대회를 선택해 보세요.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
