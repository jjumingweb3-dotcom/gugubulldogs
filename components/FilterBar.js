import React, { useState } from 'react';
import { Search, SlidersHorizontal, X, RotateCcw } from 'lucide-react';

export default function FilterBar({
  searchQuery,
  onSearchChange,
  selectedTournament,
  onTournamentChange,
  selectedOpponent,
  onOpponentChange,
  selectedPlatform,
  onPlatformChange,
  tournaments,
  opponents,
  onReset
}) {
  const [isOpen, setIsOpen] = useState(false);

  const hasActiveFilters = selectedTournament || selectedOpponent || selectedPlatform;

  return (
    <div className="w-full space-y-3">
      {/* Search Input and Filter Toggle */}
      <div className="flex gap-2">
        <div className="relative flex-grow">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            placeholder="대회명, 상대팀, 제목 검색..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-gray-900 border border-gray-700 focus:border-primary/50 focus:bg-gray-950 rounded-2xl outline-none text-sm placeholder-gray-500 text-gray-100 transition-all duration-300"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Collapsible Filter Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl border text-sm font-semibold transition-all duration-300 ${
            isOpen || hasActiveFilters
              ? 'bg-primary/10 border-primary/20 text-primary'
              : 'bg-gray-850 border-gray-700 text-gray-400 hover:text-gray-100 hover:bg-gray-700'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">필터</span>
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          )}
        </button>
      </div>

      {/* Expanded Filters Panel */}
      {isOpen && (
        <div className="p-4 bg-gray-800 border border-gray-700 rounded-2xl space-y-4 animate-fadeIn">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Tournament Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">대회별 필터</label>
              <select
                value={selectedTournament}
                onChange={(e) => onTournamentChange(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-950 border border-gray-700 rounded-xl text-xs md:text-sm text-gray-100 focus:outline-none focus:border-primary/20"
              >
                <option value="">전체 대회</option>
                {tournaments.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Opponent Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">상대팀별 필터</label>
              <select
                value={selectedOpponent}
                onChange={(e) => onOpponentChange(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-950 border border-gray-700 rounded-xl text-xs md:text-sm text-gray-100 focus:outline-none focus:border-primary/20"
              >
                <option value="">전체 상대팀</option>
                {opponents.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>

            {/* Platform Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">플랫폼</label>
              <select
                value={selectedPlatform}
                onChange={(e) => onPlatformChange(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-950 border border-gray-700 rounded-xl text-xs md:text-sm text-gray-100 focus:outline-none focus:border-primary/20"
              >
                <option value="">모든 플랫폼</option>
                <option value="youtube">YouTube</option>
                <option value="soop">SOOP (아프리카TV)</option>
              </select>
            </div>
          </div>

          {/* Reset Action */}
          {hasActiveFilters && (
            <div className="flex justify-end pt-1">
              <button
                onClick={onReset}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-hover font-semibold transition-colors duration-200"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                필터 초기화
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
