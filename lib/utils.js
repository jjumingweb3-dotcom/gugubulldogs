/**
 * Formats a video's display title based on structured fields.
 * Format (Baseball Visitor vs Home concept):
 * - With scores: [대회명] 어웨이팀 이름 어웨이점수 : 홈점수 홈팀 이름
 * - Without scores: [대회명] 어웨이팀 이름 vs 홈팀 이름
 */
export function getDisplayTitle(video) {
  if (!video) return '';

  let homeTeam = video.home_team?.trim() || '구구불독스';
  let awayTeam = video.away_team?.trim() || video.opponent?.trim() || '상대팀';

  // If division is specified and team name is exactly '구구불독스', use just division for clean presentation
  if (video.team_division && video.team_division !== '미분류') {
    if (homeTeam === '구구불독스') {
      homeTeam = video.team_division;
    }
    if (awayTeam === '구구불독스') {
      awayTeam = video.team_division;
    }
  }
  
  const hasHomeScore = video.home_score !== null && video.home_score !== undefined && String(video.home_score).trim() !== '';
  const hasAwayScore = video.away_score !== null && video.away_score !== undefined && String(video.away_score).trim() !== '';
  
  if (hasHomeScore && hasAwayScore) {
    return `${awayTeam} ${video.away_score} : ${video.home_score} ${homeTeam}`;
  } else {
    return `${awayTeam} vs ${homeTeam}`;
  }
}

/**
 * Helper to extract KST (Korea Standard Time) components.
 * Prioritizes timezone-neutral literal date prefix matching (YYYY-MM-DD) to guarantee
 * that the edited/saved date in the admin panel matches the external list exactly.
 */
export function getKstComponents(dateString) {
  if (!dateString) return { year: '', month: '', day: '' };
  try {
    const trimmed = String(dateString).trim();
    // Prioritize matching standard prefix YYYY-MM-DD or YYYY.MM.DD (timezone neutral)
    const literalMatch = trimmed.match(/^(\d{4})[-.](\d{2})[-.](\d{2})/);
    if (literalMatch) {
      return {
        year: literalMatch[1],
        month: literalMatch[2],
        day: literalMatch[3]
      };
    }

    const date = new Date(trimmed);
    if (isNaN(date.getTime())) return { year: '', month: '', day: '' };

    // Format in Asia/Seoul timezone (Korea)
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = formatter.formatToParts(date);
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;

    return { year, month, day };
  } catch (e) {
    console.error('Error parsing date:', e);
    return { year: '', month: '', day: '' };
  }
}

/**
 * Formats a date string to YYYY.MM.DD (KST)
 */
export function formatDate(dateString) {
  const { year, month, day } = getKstComponents(dateString);
  if (!year) return dateString;
  return `${year}.${month}.${day}`;
}

/**
 * Formats a date string to YYYY년 MM월 DD일 (KST)
 */
export function formatDateFull(dateString) {
  const { year, month, day } = getKstComponents(dateString);
  if (!year) return dateString;
  return `${Number(year)}년 ${Number(month)}월 ${Number(day)}일`;
}

/**
 * Formats a date string to YYYY-MM-DD for date inputs (KST)
 */
export function formatDateInput(dateString) {
  const { year, month, day } = getKstComponents(dateString);
  if (!year) return '';
  return `${year}-${month}-${day}`;
}

/**
 * Determines whether a match video was a win, loss, draw, or unknown for Gugubulldogs.
 * Returns: { outcome: 'win' | 'loss' | 'draw' | 'unknown', label: string }
 */
export function getBulldogsResult(video) {
  if (!video) return { outcome: 'unknown', label: '' };

  const winTeam = video.win_team?.trim();
  const opponent = video.opponent?.trim();
  const division = video.team_division?.trim();

  // 1. Explicit win_team field check
  if (winTeam) {
    if (winTeam === '무승부' || winTeam.includes('무승부')) {
      return { outcome: 'draw', label: winTeam };
    }

    // Check if win_team is explicitly the opponent
    if (opponent && winTeam.toLowerCase() === opponent.toLowerCase()) {
      return { outcome: 'loss', label: `${winTeam} 승` };
    }

    // Known bulldogs names or division match
    const bulldogsNames = ['구구불독스', '불독스', '새싹부', '꿈나무부', '꿈나무A', '꿈나무B', '유소년부'];
    if (
      bulldogsNames.includes(winTeam) ||
      (division && winTeam === division) ||
      (!opponent || winTeam !== opponent)
    ) {
      const displayLabel = winTeam.includes('승') ? winTeam : `${winTeam} 승`;
      return { outcome: 'win', label: displayLabel };
    }
  }

  // 2. Score check if home_score and away_score exist
  const hasHomeScore = video.home_score !== null && video.home_score !== undefined && String(video.home_score).trim() !== '';
  const hasAwayScore = video.away_score !== null && video.away_score !== undefined && String(video.away_score).trim() !== '';

  if (hasHomeScore && hasAwayScore) {
    const homeScore = Number(video.home_score);
    const awayScore = Number(video.away_score);

    if (isNaN(homeScore) || isNaN(awayScore)) {
      return { outcome: 'unknown', label: '' };
    }

    if (homeScore === awayScore) {
      return { outcome: 'draw', label: '무승부' };
    }

    // Determine home / away Bulldogs vs Opponent position
    const homeTeam = video.home_team?.trim() || '구구불독스';
    const isHomeBulldogs = homeTeam !== opponent;

    if (isHomeBulldogs) {
      if (homeScore > awayScore) {
        return { outcome: 'win', label: `${division && division !== '미분류' ? division : '구구불독스'} 승` };
      } else {
        return { outcome: 'loss', label: `${opponent || '상대팀'} 승` };
      }
    } else {
      // Away is Bulldogs
      if (awayScore > homeScore) {
        return { outcome: 'win', label: `${division && division !== '미분류' ? division : '구구불독스'} 승` };
      } else {
        return { outcome: 'loss', label: `${opponent || '상대팀'} 승` };
      }
    }
  }

  // 3. Fallback check for score_win / score_lose
  if (video.score_win !== undefined && video.score_win !== null && video.score_lose !== undefined && video.score_lose !== null) {
    if (video.lose_team && video.lose_team.toLowerCase() === opponent?.toLowerCase()) {
      return { outcome: 'win', label: `${video.win_team || '구구불독스'} 승` };
    }
    if (winTeam && winTeam.toLowerCase() === opponent?.toLowerCase()) {
      return { outcome: 'loss', label: `${winTeam} 승` };
    }
  }

  return { outcome: 'unknown', label: '' };
}

