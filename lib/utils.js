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

  // If division is specified and team name is exactly '구구불독스', append division for clear distinction
  if (video.team_division && video.team_division !== '미분류') {
    if (homeTeam === '구구불독스') {
      homeTeam = `구구불독스 ${video.team_division}`;
    }
    if (awayTeam === '구구불독스') {
      awayTeam = `구구불독스 ${video.team_division}`;
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
 * Formats a date string to YYYY.MM.DD
 */
export function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  } catch (e) {
    return dateString;
  }
}

/**
 * Formats a date string to YYYY년 MM월 DD일
 */
export function formatDateFull(dateString) {
  try {
    const date = new Date(dateString);
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
  } catch (e) {
    return dateString;
  }
}
