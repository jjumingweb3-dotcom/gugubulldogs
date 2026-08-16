import React from 'react';
import { X, Calendar, Trophy, Users, ExternalLink, Play } from 'lucide-react';
import { getDisplayTitle, formatDateFull, getBulldogsResult } from '@/lib/utils';

export default function VideoDetailModal({ video, onClose }) {
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    // Push dummy state to browser history when modal opens
    window.history.pushState({ modal: 'video-detail' }, '');

    const handlePopState = () => {
      onClose();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      
      // If unmounted manually (clicking X or overlay), clear the dummy state
      if (window.history.state?.modal === 'video-detail') {
        window.history.back();
      }
    };
  }, [onClose]);

  if (!video) return null;

  const bulldogsResult = getBulldogsResult(video);

  const getDivisionBadgeColor = (division) => {
    switch (division) {
      case '새싹부':
        return 'bg-lime-50 text-lime-700 border-lime-200';
      case '꿈나무부':
      case '꿈나무A':
      case '꿈나무B':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case '유소년부':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case '구구불독스':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // Derive home and away display names
  let homeTeamName = video.home_team?.trim() || '구구불독스';
  let awayTeamName = video.away_team?.trim() || video.opponent?.trim() || '상대팀';

  if (video.team_division && video.team_division !== '미분류') {
    if (homeTeamName === '구구불독스') {
      homeTeamName = video.team_division;
    }
    if (awayTeamName === '구구불독스') {
      awayTeamName = video.team_division;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300"
      />

      {/* Modal Content */}
      <div className="relative w-full sm:max-w-lg bg-dark-bg border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl z-10 sm:animate-scaleIn animate-slideUp mt-auto sm:mt-0 max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-black/60 border border-white/10 text-gray-400 hover:text-gray-200 transition-all duration-200 hover:scale-105 z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Big Video Thumbnail with Play Overlay */}
        <div className="relative aspect-video w-full bg-gray-900">
          <img 
            src={video.thumbnail_url} 
            alt={video.title}
            className="object-cover w-full h-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-dark-bg via-transparent to-transparent" />
          
          <div className="absolute inset-0 flex items-center justify-center">
            <a 
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-primary hover:bg-primary-hover text-dark-bg p-4 rounded-full shadow-2xl transition-transform duration-300 hover:scale-110 flex items-center justify-center"
            >
              <Play className="w-8 h-8 fill-current ml-1" />
            </a>
          </div>
        </div>

        {/* Metadata and Details */}
        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${getDivisionBadgeColor(video.team_division)}`}>
              {video.team_division}
            </span>
            <h2 className="text-lg md:text-xl font-extrabold text-gray-100 leading-snug">
              {getDisplayTitle(video)}
            </h2>
          </div>

          {/* Match Result Scoreboard (Baseball Visitor vs Home concept) */}
          {video.home_score !== undefined && video.home_score !== null && video.away_score !== undefined && video.away_score !== null && (
            <div className={`border rounded-2xl p-4 flex items-center justify-around text-center transition-all ${
              bulldogsResult.outcome === 'win'
                ? 'bg-emerald-950/40 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                : bulldogsResult.outcome === 'loss'
                ? 'bg-rose-950/20 border-rose-500/30'
                : bulldogsResult.outcome === 'draw'
                ? 'bg-amber-950/20 border-amber-500/30'
                : 'bg-primary/5 border-primary/30'
            }`}>
              {/* Away (Visitor, Left) */}
              <div className="space-y-1 w-1/3">
                <div className="text-[10px] text-gray-400 font-bold">원정팀 (초)</div>
                <div className="text-sm font-bold text-gray-100 truncate" title={awayTeamName}>
                  {awayTeamName}
                </div>
              </div>
              
              {/* SCORE (Center) */}
              <div className="flex flex-col items-center w-1/3 shrink-0">
                <div className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">SCORE</div>
                <div className="text-2xl font-black text-gray-100 tracking-wider font-mono">
                  {video.away_score} : {video.home_score}
                </div>
                {bulldogsResult.outcome === 'win' ? (
                  <span className="text-[10px] bg-emerald-500 text-emerald-950 px-2 py-0.5 rounded-lg font-black mt-1 shadow-sm flex items-center gap-1">
                    🏆 {bulldogsResult.label || '승리'}
                  </span>
                ) : bulldogsResult.outcome === 'loss' ? (
                  <span className="text-[9px] bg-rose-950/80 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded font-extrabold mt-1">
                    {bulldogsResult.label || '패'}
                  </span>
                ) : bulldogsResult.outcome === 'draw' ? (
                  <span className="text-[9px] bg-amber-950/80 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-extrabold mt-1">
                    🤝 무승부
                  </span>
                ) : (
                  <span className="text-[9px] bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded font-extrabold mt-1">
                    {video.win_team || '경기 결과'}
                  </span>
                )}
              </div>

              {/* Home (Right) */}
              <div className="space-y-1 w-1/3">
                <div className="text-[10px] text-gray-400 font-bold">홈팀 (말)</div>
                <div className="text-sm font-extrabold text-primary truncate" title={homeTeamName}>
                  {homeTeamName}
                </div>
              </div>
            </div>
          )}


          {/* Details Table */}
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 space-y-3.5 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-gray-400">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>경기 일자</span>
              </div>
              <span className="font-semibold text-gray-200">{formatDateFull(video.published_at)}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-gray-400">
                <Users className="w-4 h-4 text-gray-400" />
                <span>상대 팀</span>
              </div>
              <span className="font-semibold text-gray-200">
                {video.opponent ? video.opponent : '미등록 (분류 필요)'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-gray-400">
                <Trophy className="w-4 h-4 text-gray-400" />
                <span>참가 대회</span>
              </div>
              <span className="font-semibold text-gray-200">
                {video.tournament ? video.tournament : '일반 친선/연습경기'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-gray-400">
                <span className="w-4 h-4 rounded-full bg-gray-400 flex items-center justify-center text-[10px] text-dark-bg font-bold">P</span>
                <span>송출 플랫폼</span>
              </div>
              <span className={`font-bold ${video.source === 'youtube' ? 'text-red-500' : 'text-blue-400'}`}>
                {video.source === 'youtube' ? 'YouTube' : 'SOOP (아프리카TV)'}
              </span>
            </div>
          </div>

          {/* CTA Link Button */}
          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all duration-300 transform active:scale-[0.98] ${
              video.source === 'youtube'
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-950/20'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-950/20'
            }`}
          >
            <span>{video.source === 'youtube' ? 'YouTube 앱에서 열기' : 'SOOP 앱에서 열기'}</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
