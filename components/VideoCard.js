import React from 'react';
import { Calendar, Trophy, Users, Play } from 'lucide-react';
import { getDisplayTitle, formatDate } from '@/lib/utils';

export default function VideoCard({ video, onClick }) {
  // Get color styles for team divisions
  const getDivisionBadgeStyle = (division) => {
    switch (division) {
      case '새싹부':
        return 'bg-lime-950/40 text-lime-400 border-lime-500/30';
      case '꿈나무부':
      case '꿈나무A':
      case '꿈나무B':
        return 'bg-amber-950/40 text-amber-400 border-amber-500/30';
      case '유소년부':
        return 'bg-blue-950/40 text-blue-400 border-blue-500/30';
      default:
        return 'bg-gray-850/40 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <div 
      onClick={() => onClick(video)}
      className="glass-card rounded-2xl overflow-hidden cursor-pointer group flex flex-col h-full"
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-video w-full overflow-hidden bg-gray-900">
        <img 
          src={video.thumbnail_url || '/placeholder-baseball.jpg'} 
          alt={video.title}
          className="object-cover w-full h-full transform transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        
        {/* Dark overlay on hover */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="bg-primary/95 text-dark-bg p-3 rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-6 h-6 fill-current" />
          </div>
        </div>

        {/* Source Logo Overlay */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shadow-md backdrop-blur-md border">
          {video.source === 'youtube' ? (
            <div className="flex items-center gap-1 text-red-500 bg-red-950/70 border-red-500/30 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
              YouTube
            </div>
          ) : (
            <div className="flex items-center gap-1 text-blue-400 bg-blue-950/70 border-blue-500/30 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
              SOOP
            </div>
          )}
        </div>

        {/* Team Division tag */}
        <div className="absolute top-3 left-3">
          <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${getDivisionBadgeStyle(video.team_division)}`}>
            {video.team_division}
          </span>
        </div>
      </div>

      {/* Content Container */}
      <div className="p-4 flex flex-col flex-grow justify-between">
        <div className="space-y-2">
          {/* Match Title */}
          <h3 className="text-sm md:text-base font-bold text-gray-100 line-clamp-2 leading-snug group-hover:text-primary transition-colors duration-200">
            {getDisplayTitle(video)}
          </h3>

          {/* Score Info */}
          {(video.win_team || (video.home_score !== undefined && video.home_score !== null && video.away_score !== undefined && video.away_score !== null)) ? (
            <div className="flex items-center gap-1.5 mt-2 bg-primary/10 border border-primary/20 rounded-xl px-2.5 py-1 w-fit">
              <span className="text-[11px] font-bold text-primary flex items-center gap-1 font-sans">
                {video.win_team ? (
                  video.win_team === '무승부' || video.win_team.includes('무승부') ? (
                    <>🤝 {video.win_team}</>
                  ) : (
                    <>🏆 {video.win_team.includes('승') ? video.win_team : `${video.win_team} 승`}</>
                  )
                ) : (
                  Number(video.home_score) === Number(video.away_score) ? (
                    <>🤝 무승부</>
                  ) : (
                    <>🏆 {Number(video.home_score) > Number(video.away_score) ? `${video.home_team || '홈팀'} 승` : `${video.away_team || '원정팀'} 승`}</>
                  )
                )}
                {video.home_score !== undefined && video.home_score !== null && video.away_score !== undefined && video.away_score !== null && (
                  <span className="text-white bg-black/45 px-1.5 py-0.5 rounded text-[10px] ml-1 font-extrabold font-mono">
                    {video.away_score} : {video.home_score}
                  </span>
                )}
              </span>
            </div>
          ) : null}
        </div>

        <div className="mt-4 pt-3 border-t border-white/5 space-y-1.5 text-xs text-gray-400">
          {/* Match Info Badges */}
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-gray-500" />
            <span>{formatDate(video.published_at)}</span>
          </div>

          {video.opponent && (
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-gray-500" />
              <span>상대: <strong className="text-gray-300 font-medium">{video.opponent}</strong></span>
            </div>
          )}

          {video.tournament ? (
            <div className="flex items-center gap-2">
              <Trophy className="w-3.5 h-3.5 text-gray-500" />
              <span className="truncate">대회: <span className="text-gray-300 font-medium">{video.tournament}</span></span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-600">
              <Trophy className="w-3.5 h-3.5 text-gray-700" />
              <span>대회명 없음</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
