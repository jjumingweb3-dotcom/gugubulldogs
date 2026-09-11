'use client';

import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  Calendar, 
  Users, 
  Play, 
  Award, 
  ChevronRight, 
  Search, 
  Check, 
  ShieldAlert, 
  X 
} from 'lucide-react';
import { formatDate, getBulldogsResult, getDisplayTitle, getKstComponents } from '@/lib/utils';

export default function TournamentSummaryView({
  videos = [],
  tournaments = [],
  selectedTournament = '',
  onSelectTournament,
  onSelectVideo
}) {
  // Client state for month filter tab and search query
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Calculate detailed metadata for every tournament (dates, match count, record)
  const tournamentDetails = useMemo(() => {
    return tournaments.map((tName) => {
      const tVideos = videos.filter((v) => v.tournament === tName);
      const matchCount = tVideos.length;

      let wins = 0;
      let losses = 0;
      let draws = 0;

      let latestTimestamp = 0;
      let earliestTimestamp = Infinity;
      let latestDateStr = '';
      let earliestDateStr = '';

      tVideos.forEach((v) => {
        const res = getBulldogsResult(v);
        if (res.outcome === 'win') wins++;
        else if (res.outcome === 'loss') losses++;
        else if (res.outcome === 'draw') draws++;

        if (v.published_at) {
          const dt = new Date(v.published_at).getTime();
          if (!isNaN(dt)) {
            if (dt > latestTimestamp) {
              latestTimestamp = dt;
              latestDateStr = v.published_at;
            }
            if (dt < earliestTimestamp) {
              earliestTimestamp = dt;
              earliestDateStr = v.published_at;
            }
          }
        }
      });

      let yearMonthKey = 'unscheduled';
      let yearMonthLabel = '일정 미등록';
      let dateRangeLabel = '경기 일정 없음';

      if (matchCount > 0 && latestTimestamp > 0) {
        const { year, month } = getKstComponents(latestDateStr);
        if (year && month) {
          yearMonthKey = `${year}-${month}`;
          yearMonthLabel = `${Number(year)}년 ${Number(month)}월`;
        }

        const startFmt = formatDate(earliestDateStr);
        const endFmt = formatDate(latestDateStr);
        if (startFmt === endFmt) {
          dateRangeLabel = startFmt;
        } else {
          dateRangeLabel = `${startFmt} ~ ${endFmt}`;
        }
      }

      return {
        name: tName,
        matchCount,
        wins,
        losses,
        draws,
        latestTimestamp,
        latestDateStr,
        earliestDateStr,
        yearMonthKey,
        yearMonthLabel,
        dateRangeLabel
      };
    });
  }, [tournaments, videos]);

  // Identify active tournament (default to first active tournament with matches, or first overall)
  const activeTournament = useMemo(() => {
    if (selectedTournament) return selectedTournament;
    const tWithMatches = tournamentDetails.find((t) => t.matchCount > 0);
    return tWithMatches?.name || tournamentDetails[0]?.name || '';
  }, [selectedTournament, tournamentDetails]);

  // Find detail of active tournament
  const activeTournamentDetail = useMemo(() => {
    return tournamentDetails.find((t) => t.name === activeTournament);
  }, [tournamentDetails, activeTournament]);

  // 2. Group tournaments by Year-Month, sorted chronologically (newest month first)
  const monthGroups = useMemo(() => {
    const groupsMap = new Map();

    tournamentDetails.forEach((item) => {
      // Filter by search query if present
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.name.toLowerCase().includes(q);
        const matchMonth = item.yearMonthLabel.toLowerCase().includes(q);
        const matchDate = item.dateRangeLabel.toLowerCase().includes(q);
        if (!matchName && !matchMonth && !matchDate) {
          return;
        }
      }

      if (!groupsMap.has(item.yearMonthKey)) {
        groupsMap.set(item.yearMonthKey, {
          key: item.yearMonthKey,
          label: item.yearMonthLabel,
          tournaments: [],
          latestTimestamp: 0,
          totalMatches: 0,
          totalWins: 0,
          totalLosses: 0,
          totalDraws: 0
        });
      }

      const grp = groupsMap.get(item.yearMonthKey);
      grp.tournaments.push(item);
      grp.totalMatches += item.matchCount;
      grp.totalWins += item.wins;
      grp.totalLosses += item.losses;
      grp.totalDraws += item.draws;
      if (item.latestTimestamp > grp.latestTimestamp) {
        grp.latestTimestamp = item.latestTimestamp;
      }
    });

    const groups = Array.from(groupsMap.values());
    groups.sort((a, b) => {
      if (a.key === 'unscheduled') return 1;
      if (b.key === 'unscheduled') return -1;
      return b.key.localeCompare(a.key);
    });

    groups.forEach((g) => {
      g.tournaments.sort((a, b) => {
        if (a.matchCount > 0 && b.matchCount > 0) {
          return b.latestTimestamp - a.latestTimestamp;
        }
        if (a.matchCount > 0) return -1;
        if (b.matchCount > 0) return 1;
        return a.name.localeCompare(b.name, 'ko');
      });
    });

    return groups;
  }, [tournamentDetails, searchQuery]);

  // Filtered month groups based on selectedMonth tab
  const displayedGroups = useMemo(() => {
    if (selectedMonth === 'all') {
      return monthGroups;
    }
    return monthGroups.filter((g) => g.key === selectedMonth);
  }, [monthGroups, selectedMonth]);

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
      {/* Tournament Selection Header (Time & Month Grouped View) */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 md:p-6 space-y-5 shadow-xs">
        {/* Header Title & Quick Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-primary shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-extrabold text-slate-800 flex items-center gap-2">
                대회별 세부팀 결과 모아보기
              </h2>
              <p className="text-xs text-slate-500">
                시간 월별순으로 정리된 대회 목록에서 원하는 대회를 선택해 세부팀별 경기 결과를 확인하세요.
              </p>
            </div>
          </div>

          {/* Quick Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="대회명 또는 월 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-primary focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Month Filter Tabs Bar */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>월별 바로보기</span>
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              총 {tournaments.length}개 대회
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {/* 'All Months' button */}
            <button
              onClick={() => setSelectedMonth('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all duration-200 cursor-pointer ${
                selectedMonth === 'all'
                  ? 'bg-primary text-white border-primary shadow-xs'
                  : 'bg-slate-100/90 border-slate-200 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              전체 월
            </button>

            {/* Individual month tabs */}
            {monthGroups.map((grp) => {
              const isTabSelected = selectedMonth === grp.key;
              return (
                <button
                  key={grp.key}
                  onClick={() => setSelectedMonth(grp.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                    isTabSelected
                      ? 'bg-primary text-white border-primary shadow-xs'
                      : 'bg-slate-100/90 border-slate-200 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  <span>{grp.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-semibold ${
                    isTabSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {grp.tournaments.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Month-Grouped Tournament Cards Grid */}
        <div className="space-y-6 pt-2">
          {displayedGroups.length > 0 ? (
            displayedGroups.map((grp) => (
              <div key={grp.key} className="space-y-3">
                {/* Month Section Header */}
                <div className="flex items-center justify-between bg-slate-50/80 px-3.5 py-2 rounded-xl border border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    <h4 className="text-xs md:text-sm font-extrabold text-slate-800">
                      {grp.label}
                    </h4>
                    <span className="text-[11px] text-slate-500 font-medium">
                      ({grp.tournaments.length}개 대회)
                    </span>
                  </div>

                  {grp.totalMatches > 0 && (
                    <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-2">
                      <span>총 {grp.totalMatches}경기</span>
                      <span className="text-blue-600 font-bold">{grp.totalWins}승</span>
                      <span className="text-slate-600">{grp.totalLosses}패</span>
                      {grp.totalDraws > 0 && <span className="text-slate-400">{grp.totalDraws}무</span>}
                    </div>
                  )}
                </div>

                {/* Tournaments in this Month */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {grp.tournaments.map((t) => {
                    const isSelected = activeTournament === t.name;
                    return (
                      <div
                        key={t.name}
                        onClick={() => onSelectTournament(t.name)}
                        className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2.5 text-left relative group ${
                          isSelected
                            ? 'bg-blue-50/80 border-primary ring-2 ring-primary/20 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 shadow-2xs'
                        }`}
                      >
                        {/* Top: Tournament Name & Selected Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <h5 className={`text-xs md:text-sm font-bold tracking-tight line-clamp-2 transition-colors ${
                            isSelected ? 'text-primary' : 'text-slate-800 group-hover:text-primary'
                          }`}>
                            {t.name}
                          </h5>
                          {isSelected && (
                            <span className="shrink-0 flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-primary text-white text-[10px] font-bold shadow-2xs">
                              <Check className="w-3 h-3" />
                              <span>선택됨</span>
                            </span>
                          )}
                        </div>

                        {/* Middle: Date Range */}
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{t.dateRangeLabel}</span>
                        </div>

                        {/* Bottom: Match Count & Record Badge */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                          <span className="font-semibold text-slate-600">
                            {t.matchCount > 0 ? `${t.matchCount}경기` : '등록 경기 없음'}
                          </span>

                          {t.matchCount > 0 ? (
                            <div className="flex items-center gap-1.5 font-bold">
                              {t.wins > 0 && (
                                <span className="px-1.5 py-0.5 rounded-md bg-blue-100/80 text-blue-700 text-[10px]">
                                  {t.wins}승
                                </span>
                              )}
                              {t.losses > 0 && (
                                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px]">
                                  {t.losses}패
                                </span>
                              )}
                              {t.draws > 0 && (
                                <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px]">
                                  {t.draws}무
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400">대기 중</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="py-10 text-center space-y-2 bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <ShieldAlert className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm text-slate-600 font-semibold">검색 조건에 맞는 대회가 없습니다.</p>
              <p className="text-xs text-slate-400">검색어를 지우거나 다른 월을 선택해 보세요.</p>
            </div>
          )}
        </div>
      </div>

      {/* Active Tournament Container */}
      {activeTournament && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 md:p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">
                <Award className="w-3.5 h-3.5" />
                <span>선택된 대회</span>
              </div>
              <h3 className="text-lg md:text-2xl font-extrabold text-slate-800 tracking-tight">
                {activeTournament}
              </h3>
            </div>

            {activeTournamentDetail && activeTournamentDetail.matchCount > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono text-slate-600">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{activeTournamentDetail.dateRangeLabel}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700">
                  <span>총 {activeTournamentDetail.matchCount}경기</span>
                  <span>·</span>
                  <span>{activeTournamentDetail.wins}승 {activeTournamentDetail.losses}패</span>
                  {activeTournamentDetail.draws > 0 && <span> {activeTournamentDetail.draws}무</span>}
                </div>
              </div>
            )}
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

                    <div className="flex items-center gap-2 text-xs font-bold">
                      <span className="text-blue-600">{group.wins}승</span>
                      <span className="text-slate-500">{group.losses}패</span>
                      {group.draws > 0 && <span className="text-slate-400">{group.draws}무</span>}
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
