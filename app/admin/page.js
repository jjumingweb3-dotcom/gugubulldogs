'use client';
 
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Home, LogOut, ShieldAlert, CheckCircle, AlertTriangle, Save, Loader2, Plus, X, RefreshCw, BarChart3, Radio, Trash2, Copy, ExternalLink } from 'lucide-react';
import { formatDateInput } from '@/lib/utils';
 
export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState([]);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'targets'
  const [savingId, setSavingId] = useState(null);
  const [message, setMessage] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
 
  // Visitor stats states
  const [stats, setStats] = useState(null);
  const [statsTab, setStatsTab] = useState('daily'); // 'daily' | 'weekly' | 'monthly'
  const [loadingStats, setLoadingStats] = useState(false);
 
  // Tournament list states
  const [tournaments, setTournaments] = useState([]);
  const [newTournamentName, setNewTournamentName] = useState('');
  const [isAddingTournament, setIsAddingTournament] = useState(false);
  const [showTournamentForm, setShowTournamentForm] = useState(false);
  const [diagnostics, setDiagnostics] = useState(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [syncYear, setSyncYear] = useState('2026');
  const [syncMonth, setSyncMonth] = useState('7'); // Set default sync to July
 
  // Manual video registration state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVideoBulldogsPos, setNewVideoBulldogsPos] = useState('away'); // 'away' or 'home'
  const [newVideo, setNewVideo] = useState({
    source: 'youtube',
    url: '',
    title: '',
    team_division: '미분류',
    tournament: '',
    opponent: '',
    published_at: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().substring(0, 10), // YYYY-MM-DD KST
    home_team: '',
    away_team: '구구불독스',
    home_score: '',
    away_score: '',
    win_team: ''
  });

  // Crawl targets management states
  const [crawlTargets, setCrawlTargets] = useState([]);
  const [loadingCrawlTargets, setLoadingCrawlTargets] = useState(false);
  const [isTableMissing, setIsTableMissing] = useState(false);
  const [newTarget, setNewTarget] = useState({
    platform: 'youtube',
    target_id: '',
    team_division: '꿈나무부',
    memo: ''
  });
  const [isAddingTarget, setIsAddingTarget] = useState(false);
 
  const fetchStats = async (pw) => {
    const pwToUse = pw || localStorage.getItem('gugu_admin_pw');
    if (!pwToUse) return;
 
    setLoadingStats(true);
    try {
      const res = await fetch('/api/admin/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwToUse })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStats(data.stats);
      } else {
        console.error('Failed to fetch visitor stats:', data.error);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (e) {
      console.error('Failed to fetch visitor stats:', e);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchCrawlTargets = async (pw) => {
    const pwToUse = pw || localStorage.getItem('gugu_admin_pw');
    if (!pwToUse) return;

    setLoadingCrawlTargets(true);
    try {
      const res = await fetch('/api/admin/crawl-targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwToUse, action: 'list' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCrawlTargets(data.targets || []);
        setIsTableMissing(!!data.isTableMissing);
      } else {
        console.error('Failed to fetch crawl targets:', data.error);
      }
    } catch (e) {
      console.error('Failed to fetch crawl targets:', e);
    } finally {
      setLoadingCrawlTargets(false);
    }
  };
 
  const handleLogin = async (pwToTry) => {
    const pw = pwToTry || password;
    if (!pw) return;
 
    setLoading(true);
    setError('');
 
    try {
      const res = await fetch('/api/admin/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw })
      });
 
      const data = await res.json();
 
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        setVideos(data.videos);
        setTournaments(data.tournaments || []);
        localStorage.setItem('gugu_admin_pw', pw);
        setPassword('');
        fetchStats(pw); // Load visitor statistics
        fetchCrawlTargets(pw); // Load crawl targets
      } else {
        setError(data.error || '인증에 실패했습니다.');
        localStorage.removeItem('gugu_admin_pw');
      }
    } catch (e) {
      setError('서버와 통신하는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };
 
  // Check localStorage for saved credentials
  useEffect(() => {
    const savedPassword = localStorage.getItem('gugu_admin_pw');
    if (savedPassword) {
      // eslint-disable-next-line
      handleLogin(savedPassword);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
 
  const handleLogout = () => {
    localStorage.removeItem('gugu_admin_pw');
    setIsAuthenticated(false);
    setVideos([]);
    setCrawlTargets([]);
    setMessage('');
  };

  const handleAddCrawlTarget = async (e) => {
    e.preventDefault();
    if (!newTarget.target_id.trim()) {
      setError('수집 대상 ID 또는 핸들을 입력해 주세요.');
      return;
    }
    setIsAddingTarget(true);
    setError('');
    setMessage('');

    const savedPassword = localStorage.getItem('gugu_admin_pw');

    try {
      const res = await fetch('/api/admin/crawl-targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: savedPassword,
          action: 'add',
          ...newTarget
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage('수집 채널이 정상적으로 추가되었습니다.');
        setNewTarget({
          platform: 'youtube',
          target_id: '',
          team_division: '꿈나무부',
          memo: ''
        });
        fetchCrawlTargets(savedPassword);
      } else {
        setError(data.error || '수집 채널 추가에 실패했습니다.');
      }
    } catch (err) {
      setError('서버 통신 중 오류가 발생했습니다.');
    } finally {
      setIsAddingTarget(false);
    }
  };

  const handleDeleteCrawlTarget = async (id, name) => {
    if (!confirm("'" + name + "' 채널 수집 주소를 삭제하시겠습니까?")) return;
    setError('');
    setMessage('');

    const savedPassword = localStorage.getItem('gugu_admin_pw');

    try {
      const res = await fetch('/api/admin/crawl-targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: savedPassword,
          action: 'delete',
          id
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage('수집 채널이 정상적으로 삭제되었습니다.');
        fetchCrawlTargets(savedPassword);
      } else {
        setError(data.error || '수집 채널 삭제에 실패했습니다.');
      }
    } catch (err) {
      setError('서버 통신 중 오류가 발생했습니다.');
    }
  };;

  const handleSyncVideos = async () => {
    setIsRefreshing(true);
    setMessage('');
    setError('');
    const savedPassword = localStorage.getItem('gugu_admin_pw');
    
    try {
      const res = await fetch(`/api/cron?year=${syncYear}&month=${syncMonth}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage(data.message || '업데이트가 완료되었습니다.');
        if (savedPassword) {
          handleLogin(savedPassword);
        }
      } else {
        setError(data.message || '동기화 중 오류가 발생했습니다.');
      }
    } catch (e) {
      console.error(e);
      setError('비디오 수집에 실패했습니다.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddTournament = async (e) => {
    e.preventDefault();
    if (!newTournamentName.trim()) return;

    setIsAddingTournament(true);
    setMessage('');
    setError('');
    const savedPassword = localStorage.getItem('gugu_admin_pw');

    try {
      const res = await fetch('/api/admin/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: savedPassword,
          name: newTournamentName
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMessage('새로운 대회가 목록에 추가되었습니다.');
        setNewTournamentName('');
        if (savedPassword) {
          handleLogin(savedPassword);
        }
      } else {
        setError(data.error || '대회 추가에 실패했습니다.');
      }
    } catch (e) {
      console.error(e);
      setError('서버 통신 오류');
    } finally {
      setIsAddingTournament(false);
    }
  };

  const handleDeleteTournament = async (name) => {
    if (!confirm(`'${name}' 대회를 목록에서 삭제하시겠습니까?`)) return;

    setMessage('');
    setError('');
    const savedPassword = localStorage.getItem('gugu_admin_pw');

    try {
      const res = await fetch('/api/admin/tournaments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: savedPassword,
          name: name
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMessage('대회가 성공적으로 제거되었습니다.');
        if (savedPassword) {
          handleLogin(savedPassword);
        }
      } else {
        setError(data.error || '대회 삭제에 실패했습니다.');
      }
    } catch (e) {
      console.error(e);
      setError('서버 통신 오류');
    }
  };

  const handleDiagnoseDB = async () => {
    setIsDiagnosing(true);
    setDiagnostics(null);
    setError('');
    const savedPassword = localStorage.getItem('gugu_admin_pw');
    try {
      const res = await fetch('/api/admin/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: savedPassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDiagnostics(data);
      } else {
        setError(data.error || '진단에 실패했습니다.');
      }
    } catch (e) {
      console.error(e);
      setError('서버 통신 중 오류가 발생했습니다.');
    } finally {
      setIsDiagnosing(false);
    }
  };

  // Submit manual registration
  const handleCreateVideo = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const savedPassword = localStorage.getItem('gugu_admin_pw');

    try {
      const res = await fetch('/api/admin/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: savedPassword,
          ...newVideo
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMessage('새로운 경기 영상이 수기 등록되었습니다!');
        setShowAddForm(false);
        setNewVideo({
          source: 'youtube',
          url: '',
          title: '',
          team_division: '미분류',
          tournament: '',
          opponent: '',
          published_at: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().substring(0, 10), // YYYY-MM-DD KST
          home_team: '',
          away_team: '구구불독스',
          home_score: '',
          away_score: '',
          win_team: ''
        });
        setNewVideoBulldogsPos('away');
        // Refresh videos list
        handleLogin(savedPassword);
      } else {
        setError(data.error || '영상 추가에 실패했습니다.');
      }
    } catch (e) {
      setError('서버 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Update existing video details
  const handleUpdateVideo = async (video) => {
    setSavingId(video.id);
    setMessage('');
    setError('');

    const savedPassword = localStorage.getItem('gugu_admin_pw');

    try {
      const res = await fetch('/api/admin/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: savedPassword,
          id: video.id,
          title: video.title,
          team_division: video.team_division,
          tournament: video.tournament,
          opponent: video.opponent,
          home_team: video.home_team,
          away_team: video.away_team,
          home_score: video.home_score === '' || video.home_score === null || video.home_score === undefined ? null : Number(video.home_score),
          away_score: video.away_score === '' || video.away_score === null || video.away_score === undefined ? null : Number(video.away_score),
          win_team: video.win_team,
          published_at: video.published_at
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMessage('경기가 성공적으로 저장되었습니다!');
        // Refresh videos list
        handleLogin(savedPassword);
      } else {
        setError(data.error || '저장에 실패했습니다.');
      }
    } catch (e) {
      setError('서버 통신 실패');
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteVideo = async (id, title) => {
    if (!confirm(`'${title}' 영상을 정말로 삭제하시겠습니까?\n삭제된 영상은 복구할 수 없습니다.`)) return;

    setSavingId(id);
    setMessage('');
    setError('');
    const savedPassword = localStorage.getItem('gugu_admin_pw');

    try {
      const res = await fetch('/api/admin/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: savedPassword,
          id: id
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMessage('경기가 성공적으로 삭제되었습니다.');
        // Refresh videos list
        handleLogin(savedPassword);
      } else {
        setError(data.error || '삭제에 실패했습니다.');
      }
    } catch (e) {
      console.error(e);
      setError('서버 통신 실패');
    } finally {
      setSavingId(null);
    }
  };

  const handleInputChange = (id, field, value) => {
    setVideos(prev =>
      prev.map(v => {
        if (v.id !== id) return v;
        let updated = { ...v, [field]: value };
        
        // If division changes, automatically update win_team if bulldogs won
        if (field === 'team_division') {
          const isBulldogsHome = v.home_team === '구구불독스';
          const bulldogsScore = isBulldogsHome ? v.home_score : v.away_score;
          const opponentScore = isBulldogsHome ? v.away_score : v.home_score;
          
          if (bulldogsScore !== null && opponentScore !== null && bulldogsScore > opponentScore) {
            const bulldogsTeamName = (value && value !== '미분류') ? value : '구구불독스';
            updated.win_team = bulldogsTeamName;
          }
        }
        
        return updated;
      })
    );
  };

  const handleNewVideoInputChange = (field, value) => {
    setNewVideo(prev => {
      let updated = { ...prev, [field]: value };
      
      // If division changes, automatically update win_team if bulldogs won
      if (field === 'team_division') {
        const isBulldogsHome = newVideoBulldogsPos === 'home';
        const bulldogsScore = isBulldogsHome ? prev.home_score : prev.away_score;
        const opponentScore = isBulldogsHome ? prev.away_score : prev.home_score;
        
        if (bulldogsScore !== '' && opponentScore !== '' && bulldogsScore !== null && opponentScore !== null && Number(bulldogsScore) > Number(opponentScore)) {
          const bulldogsTeamName = (value && value !== '미분류') ? value : '구구불독스';
          updated.win_team = bulldogsTeamName;
        }
      }
      
      return updated;
    });
  };

  const handleNewVideoGameResultChange = (field, value) => {
    setNewVideo(prev => {
      let opponent = field === 'opponent' ? value : prev.opponent;
      let position = field === 'position' ? value : newVideoBulldogsPos;
      
      let bulldogsScore = position === 'home' ? prev.home_score : prev.away_score;
      let opponentScore = position === 'home' ? prev.away_score : prev.home_score;
      let winTeam = prev.win_team || '';

      if (field === 'opponent') {
        opponent = value;
      } else if (field === 'position') {
        position = value;
        setNewVideoBulldogsPos(value);
        const tempB = bulldogsScore;
        bulldogsScore = opponentScore;
        opponentScore = tempB;
      } else if (field === 'bulldogs_score') {
        bulldogsScore = value === '' ? '' : Number(value);
      } else if (field === 'opponent_score') {
        opponentScore = value === '' ? '' : Number(value);
      } else if (field === 'win_team') {
        winTeam = value;
      }

      let home_team = '';
      let away_team = '';
      let home_score = '';
      let away_score = '';

      if (position === 'home') {
        home_team = '구구불독스';
        away_team = opponent;
        home_score = bulldogsScore;
        away_score = opponentScore;
      } else {
        away_team = '구구불독스';
        home_team = opponent;
        away_score = bulldogsScore;
        home_score = opponentScore;
      }

      if (field !== 'win_team') {
        if (bulldogsScore !== '' && opponentScore !== '' && bulldogsScore !== null && opponentScore !== null) {
          const bulldogsTeamName = (prev.team_division && prev.team_division !== '미분류') ? prev.team_division : '구구불독스';
          if (Number(bulldogsScore) > Number(opponentScore)) {
            winTeam = bulldogsTeamName;
          } else if (Number(opponentScore) > Number(bulldogsScore)) {
            winTeam = opponent;
          } else {
            winTeam = '무승부';
          }
        } else {
          winTeam = '';
        }
      }

      return {
        ...prev,
        opponent,
        home_team,
        away_team,
        home_score,
        away_score,
        win_team: winTeam
      };
    });
  };

  const handleGameResultChange = (id, field, value, currentVideo) => {
    let opponent = currentVideo.opponent || '';
    let isBulldogsHome = currentVideo.home_team === '구구불독스';
    let bulldogsPos = isBulldogsHome ? 'home' : 'away';
    let bulldogsScore = isBulldogsHome ? currentVideo.home_score : currentVideo.away_score;
    let opponentScore = isBulldogsHome ? currentVideo.away_score : currentVideo.home_score;
    let winTeam = currentVideo.win_team || '';

    if (field === 'opponent') {
      opponent = value;
    } else if (field === 'position') {
      bulldogsPos = value;
    } else if (field === 'bulldogs_score') {
      bulldogsScore = value === '' ? null : Number(value);
    } else if (field === 'opponent_score') {
      opponentScore = value === '' ? null : Number(value);
    } else if (field === 'win_team') {
      winTeam = value;
    }

    let home_team = '';
    let away_team = '';
    let home_score = null;
    let away_score = null;

    if (bulldogsPos === 'home') {
      home_team = '구구불독스';
      away_team = opponent;
      home_score = bulldogsScore;
      away_score = opponentScore;
    } else {
      away_team = '구구불독스';
      home_team = opponent;
      away_score = bulldogsScore;
      home_score = opponentScore;
    }

    if (field !== 'win_team') {
      if (bulldogsScore !== null && opponentScore !== null) {
        const bulldogsTeamName = (currentVideo.team_division && currentVideo.team_division !== '미분류') ? currentVideo.team_division : '구구불독스';
        if (bulldogsScore > opponentScore) {
          winTeam = bulldogsTeamName;
        } else if (opponentScore > bulldogsScore) {
          winTeam = opponent;
        } else {
          winTeam = '무승부';
        }
      } else {
        winTeam = '';
      }
    }

    setVideos(prev =>
      prev.map(v =>
        v.id === id
          ? {
              ...v,
              opponent,
              home_team,
              away_team,
              home_score,
              away_score,
              win_team: winTeam
            }
          : v
      )
    );
  };

  const filteredVideos = videos;

  // Get unique opponent teams from all videos for autocomplete
  const existingOpponents = Array.from(
    new Set(
      videos
        .map(v => v.opponent?.trim())
        .filter(op => op && op !== '')
    )
  ).sort();

  const renderCrawlTargetsWorkspace = () => {
    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Supabase table missing warning */}
        {isTableMissing && (
          <div className="bg-red-955/20 p-5 rounded-3xl border border-red-500/15 text-red-300 space-y-3 leading-relaxed">
            <div className="flex items-center gap-2 font-extrabold text-sm text-red-400">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <span>[데이터베이스 경고] crawl_targets 테이블이 누락되었습니다.</span>
            </div>
            <p className="text-xs">
              현재 Supabase 연동 모드이지만 수집 타겟 관리 테이블이 데이터베이스에 생성되지 않았습니다.<br />
              아래 SQL 쿼리를 복사하여 Supabase 대시보드의 <strong>SQL Editor</strong>에서 실행하신 후에 이 페이지를 새로고침(F5) 해주세요.
            </p>
            <div className="relative">
              <pre className="p-3 bg-black/50 rounded-2xl text-[10px] font-mono text-gray-400 overflow-x-auto select-all">
{`CREATE TABLE IF NOT EXISTS crawl_targets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform VARCHAR(50) NOT NULL,
  target_id VARCHAR(255) NOT NULL,
  team_division VARCHAR(100) NOT NULL,
  memo VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS 및 권한 설정
ALTER TABLE crawl_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to crawl_targets" ON crawl_targets FOR SELECT USING (true);`}
              </pre>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText("CREATE TABLE IF NOT EXISTS crawl_targets (\n  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n  platform VARCHAR(50) NOT NULL,\n  target_id VARCHAR(255) NOT NULL,\n  team_division VARCHAR(100) NOT NULL,\n  memo VARCHAR(255),\n  created_at TIMESTAMPTZ DEFAULT now()\n);\n\nALTER TABLE crawl_targets ENABLE ROW LEVEL SECURITY;\nCREATE POLICY \"Allow public read access to crawl_targets\" ON crawl_targets FOR SELECT USING (true);");
                  alert('SQL 쿼리가 클립보드에 복사되었습니다.');
                }}
                className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-[10px] font-bold text-gray-300 hover:text-gray-100 rounded-lg border border-gray-700 transition-colors cursor-pointer"
              >
                <Copy className="w-3 h-3" /> 복사하기
              </button>
            </div>
          </div>
        )}

        {/* Target input Form */}
        <div className="glass-card p-6 rounded-3xl border border-gray-700/50 space-y-4">
          <h3 className="text-sm md:text-base font-extrabold text-gray-100 flex items-center gap-2">
            <Radio className="w-4 h-4 text-primary animate-pulse" />
            <span>새로운 경기 수집 채널/주소 추가</span>
          </h3>
          
          <form onSubmit={handleAddCrawlTarget} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">수집 플랫폼</label>
              <select
                value={newTarget.platform}
                onChange={(e) => setNewTarget(prev => ({ ...prev, platform: e.target.value }))}
                className="w-full px-3 py-2.5 bg-gray-955 border border-gray-750 rounded-xl text-xs md:text-sm text-gray-300 outline-none focus:border-primary/20"
              >
                <option value="youtube">YouTube (유튜브)</option>
                <option value="soop">SOOP (아프리카TV)</option>
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                {newTarget.platform === 'youtube' ? '채널 ID 또는 핸들 (예: @username)' : 'BJ ID (예: pik7688)'}
              </label>
              <input
                type="text"
                required
                placeholder={newTarget.platform === 'youtube' ? 'UC... 또는 @핸들' : 'soop 아이디'}
                value={newTarget.target_id}
                onChange={(e) => setNewTarget(prev => ({ ...prev, target_id: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-gray-955 border border-gray-750 rounded-xl text-xs md:text-sm text-gray-200 outline-none focus:border-primary/20"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">분류할 부서</label>
              <select
                value={newTarget.team_division}
                onChange={(e) => setNewTarget(prev => ({ ...prev, team_division: e.target.value }))}
                className="w-full px-3 py-2.5 bg-gray-955 border border-gray-750 rounded-xl text-xs md:text-sm text-gray-300 outline-none focus:border-primary/20"
              >
                <option value="새싹부">새싹부</option>
                <option value="꿈나무부">꿈나무부</option>
                <option value="유소년부">유소년부</option>
                <option value="구구불독스">구구불독스</option>
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">관리자 메모</label>
              <input
                type="text"
                placeholder="예: 꿈나무부 공식채널"
                value={newTarget.memo}
                onChange={(e) => setNewTarget(prev => ({ ...prev, memo: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-gray-955 border border-gray-750 rounded-xl text-xs md:text-sm text-gray-202 outline-none focus:border-primary/20"
              />
            </div>
            
            <div className="sm:col-span-4 flex justify-end">
              <button
                type="submit"
                disabled={isAddingTarget}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary-hover text-dark-bg font-bold text-xs md:text-sm rounded-xl transition-all duration-300 shadow-md disabled:opacity-50 active:scale-95 cursor-pointer"
              >
                {isAddingTarget ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 text-dark-bg" />}
                수집 대상 등록
              </button>
            </div>
          </form>
        </div>

        {/* Target List Grid/Table */}
        <div className="glass-card p-6 rounded-3xl border border-gray-700/50 space-y-4">
          <h3 className="text-sm md:text-base font-extrabold text-gray-100">
            수집 채널 및 BJ 목록 ({crawlTargets.length}개)
          </h3>
          
          {loadingCrawlTargets ? (
            <div className="py-12 flex justify-center items-center text-gray-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span>수집 목록을 불러오는 중...</span>
            </div>
          ) : crawlTargets.length > 0 ? (
            <div className="overflow-x-auto border border-gray-800 rounded-2xl">
              <table className="w-full border-collapse text-left text-xs md:text-sm">
                <thead>
                  <tr className="bg-gray-955/80 border-b border-gray-800 text-gray-400 font-extrabold">
                    <th className="p-4">플랫폼</th>
                    <th className="p-4">수집 주소/ID</th>
                    <th className="p-4">매핑 부서</th>
                    <th className="p-4">메모</th>
                    <th className="p-4 text-center w-20">삭제</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 bg-gray-900/10">
                  {crawlTargets.map((target) => (
                    <tr key={target.id} className="hover:bg-gray-800/20 text-gray-300">
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] uppercase border ${
                          target.platform === 'youtube'
                            ? 'bg-red-955/20 border-red-500/30 text-red-400'
                            : 'bg-emerald-955/20 border-emerald-500/30 text-emerald-400'
                        }`}>
                          {target.platform}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-bold text-gray-200">
                        {target.platform === 'youtube' ? (
                          <a
                            href={target.target_id.startsWith('UC') 
                              ? `https://youtube.com/channel/${target.target_id}` 
                              : `https://youtube.com/${target.target_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline hover:text-primary transition-all flex items-center gap-1.5"
                          >
                            {target.target_id} ↗
                          </a>
                        ) : (
                          <a
                            href={`https://vod.sooplive.co.kr/channel/${target.target_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline hover:text-primary transition-all flex items-center gap-1.5"
                          >
                            {target.target_id} ↗
                          </a>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-gray-100">{target.team_division}</span>
                      </td>
                      <td className="p-4 text-gray-400">
                        {target.memo || '-'}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteCrawlTarget(target.id, target.target_id)}
                          className="p-2 bg-red-955/20 border border-red-500/20 hover:bg-red-955/40 text-red-400 hover:text-red-300 rounded-lg transition-all cursor-pointer"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-500">
              등록된 수집 채널/주소가 없습니다.
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderVideoEditorWorkspace = () => {
    return filteredVideos.length > 0 ? (
      <div className="space-y-4">
        {filteredVideos.map((video) => {
          const isSaving = savingId === video.id;

          return (
            <div 
              key={video.id} 
              className="glass-card p-5 rounded-3xl border border-gray-700/50 flex flex-col md:flex-row gap-5 items-start"
            >
              {/* Aspect ratio video thumbnail */}
              <a 
                href={video.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="relative aspect-video w-full md:w-56 rounded-2xl overflow-hidden shrink-0 bg-gray-900 group block cursor-pointer"
                title="원본 영상 보기 (새 창)"
              >
                <img 
                  src={video.thumbnail_url} 
                  alt="" 
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-305"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-black/60 border border-gray-700 uppercase">
                  {video.source}
                </div>
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-dark-bg shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
                    <ExternalLink className="w-5 h-5" />
                  </div>
                </div>
              </a>

              {/* Form fields for metadata editing */}
              <div className="flex-grow w-full space-y-4">
                {/* Title input */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">영상 제목</label>
                    <a 
                      href={video.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:text-primary-hover flex items-center gap-1 font-semibold transition-colors duration-200 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> 영상 바로가기
                    </a>
                  </div>
                  <input
                    type="text"
                    value={video.title || ''}
                    onChange={(e) => handleInputChange(video.id, 'title', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-955 border border-gray-750 rounded-xl text-sm text-gray-200 outline-none focus:border-primary/20 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Team select dropdown */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">부서 분류</label>
                    <select
                      value={video.team_division || '미분류'}
                      onChange={(e) => handleInputChange(video.id, 'team_division', e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-955 border border-gray-750 text-gray-300 focus:border-primary/20 rounded-xl text-xs md:text-sm outline-none"
                    >
                      <option value="미분류">미분류 (대기)</option>
                      <option value="새싹부">새싹부</option>
                      <option value="꿈나무부">꿈나무부</option>
                      <option value="꿈나무A">꿈나무A</option>
                      <option value="꿈나무B">꿈나무B</option>
                      <option value="유소년부">유소년부</option>
                      <option value="구구불독스">구구불독스</option>
                    </select>
                  </div>

                  {/* Tournament field */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">대회명</label>
                    <select
                      value={video.tournament || ''}
                      onChange={(e) => handleInputChange(video.id, 'tournament', e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-955 border border-gray-750 rounded-xl text-xs md:text-sm text-gray-105 outline-none focus:border-primary/20"
                    >
                      <option value="">대회 없음 (친선/기타)</option>
                      {tournaments.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                      {video.tournament && !tournaments.includes(video.tournament) && (
                        <option value={video.tournament}>{video.tournament} (직접 입력됨)</option>
                      )}
                    </select>
                  </div>

                  {/* Game Date field */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">경기 일자</label>
                    <input
                      type="date"
                      value={formatDateInput(video.published_at)}
                      onChange={(e) => handleInputChange(video.id, 'published_at', e.target.value)}
                      style={{ colorScheme: 'light' }}
                      className="w-full px-3 py-2.5 bg-gray-955 border border-gray-750 rounded-xl text-xs md:text-sm text-gray-100 outline-none focus:border-primary/20"
                    />
                  </div>
                </div>

                {/* Score results row */}
                <div className="bg-gray-900 p-4 rounded-2xl border border-gray-800 space-y-3">
                  <h5 className="text-xs font-bold text-gray-400">📊 경기 결과 입력 (상대팀 및 스코어)</h5>
                  
                  {(() => {
                    const isBulldogsHome = video.home_team === '구구불독스';
                    const bulldogsPos = isBulldogsHome ? 'home' : 'away';
                    const bulldogsScore = isBulldogsHome ? (video.home_score !== null ? video.home_score : '') : (video.away_score !== null ? video.away_score : '');
                    const opponentScore = isBulldogsHome ? (video.away_score !== null ? video.away_score : '') : (video.home_score !== null ? video.home_score : '');
                    const opponentName = video.opponent || '';

                    return (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* 1. Opponent Team Name */}
                          <div className="space-y-1 sm:col-span-1">
                            <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">상대팀 이름</label>
                             <input
                               type="text"
                               list="opponents-list"
                               placeholder="예: 마포자이언츠"
                               value={opponentName}
                               onChange={(e) => handleGameResultChange(video.id, 'opponent', e.target.value, video)}
                               className="w-full px-3 py-2 bg-gray-955 border border-gray-750 rounded-xl text-xs text-gray-100 outline-none focus:border-primary/20"
                             />
                          </div>

                          {/* 2. Bulldogs position (Home/Away) */}
                          <div className="space-y-1 sm:col-span-1">
                            <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">구구불독스 위치</label>
                            <select
                              value={bulldogsPos}
                              onChange={(e) => handleGameResultChange(video.id, 'position', e.target.value, video)}
                              className="w-full px-3 py-2.5 bg-gray-955 border border-gray-750 rounded-xl text-xs text-gray-100 outline-none focus:border-primary/20"
                            >
                              <option value="away">원정 (선공)</option>
                              <option value="home">홈 (후공)</option>
                            </select>
                          </div>

                          {/* 3. Scores */}
                          <div className="grid grid-cols-2 gap-3 sm:col-span-1">
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">불독스 점수</label>
                              <input
                                type="number"
                                placeholder="예: 8"
                                value={bulldogsScore}
                                onChange={(e) => handleGameResultChange(video.id, 'bulldogs_score', e.target.value, video)}
                                className="w-full px-3 py-2 bg-gray-955 border border-gray-750 rounded-xl text-xs text-gray-100 outline-none focus:border-primary/20"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">상대팀 점수</label>
                              <input
                                type="number"
                                placeholder="예: 5"
                                value={opponentScore}
                                onChange={(e) => handleGameResultChange(video.id, 'opponent_score', e.target.value, video)}
                                className="w-full px-3 py-2 bg-gray-955 border border-gray-750 rounded-xl text-xs text-gray-105 outline-none focus:border-primary/20"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-gray-800">
                          <div className="space-y-1 max-w-md">
                            <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">승리 팀 이름 (점수 입력 시 자동 계산)</label>
                            <input
                              type="text"
                              placeholder="예: 구구불독스 (점수 입력 시 자동 입력되며, 변경 가능)"
                              value={video.win_team || ''}
                              onChange={(e) => handleGameResultChange(video.id, 'win_team', e.target.value, video)}
                              className="w-full px-3 py-2 bg-gray-955 border border-gray-750 rounded-xl text-xs text-gray-100 outline-none focus:border-primary/20"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Action buttons */}
                <div className="flex justify-between items-center pt-2 border-t border-gray-800">
                  <span className="text-[10px] text-gray-400 flex flex-col gap-0.5">
                    <span>원본 영상 ID: <code className="text-gray-400 font-mono">{video.source_video_id}</code></span>
                    <span>등록 일시: <span className="text-gray-400 font-mono">{new Date(video.published_at).toLocaleString('ko-KR')}</span></span>
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleDeleteVideo(video.id, video.title)}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-3 py-2 bg-red-955/20 border border-red-500/20 hover:bg-red-955/40 text-red-400 font-bold text-xs md:text-sm rounded-xl transition-all duration-300 disabled:opacity-50 active:scale-95 cursor-pointer"
                    >
                      삭제하기
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateVideo(video)}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-dark-bg font-bold text-xs md:text-sm rounded-xl transition-all duration-300 disabled:opacity-50 shadow-md active:scale-95 cursor-pointer"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          저장 중...
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          저장하기
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    ) : (
      <div className="w-full py-20 bg-gray-900 border border-gray-800 rounded-3xl flex flex-col items-center justify-center text-center p-6 space-y-2">
        <CheckCircle className="w-10 h-10 text-primary opacity-50" />
        <h4 className="text-sm font-bold text-gray-400">경기 영상이 없습니다</h4>
        <p className="text-xs text-gray-400">등록된 영상이 존재하지 않습니다.</p>
      </div>
    );
  };

  // Login Form render
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-dark-bg">
        <div className="w-full max-w-md glass p-8 rounded-3xl space-y-6 border border-gray-700">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-primary text-dark-bg rounded-2xl mx-auto flex items-center justify-center font-black text-2xl shadow-[0_0_15px_rgba(59,130,246,0.3)]">
              G
            </div>
            <h1 className="text-xl font-extrabold text-gray-100">플레이북 관리자 로그인</h1>
            <p className="text-xs text-gray-500">영상 분류 및 매핑 정보를 관리합니다.</p>
          </div>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">비밀번호 입력</label>
              <input
                type="password"
                placeholder="비밀번호(로컬 기본값: 1234)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 focus:border-primary/20 focus:bg-gray-950 rounded-2xl outline-none text-sm placeholder-gray-600 text-gray-200 transition-all duration-300"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-950/40 border border-red-500/20 rounded-2xl flex items-center gap-2 text-xs text-red-400">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-primary hover:bg-primary-hover text-dark-bg font-bold text-sm transition-all duration-300 flex items-center justify-center gap-1.5 shadow-[0_4px_16px_rgba(59,130,246,0.2)] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  인증하는 중...
                </>
              ) : (
                '로그인'
              )}
            </button>
          </form>

          <div className="pt-2 text-center">
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">
              <Home className="w-3.5 h-3.5" />
              학부모 홈으로 가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard render
  return (
    <div className="min-h-screen flex flex-col bg-dark-bg">
      {/* Admin Header */}
      <header className="sticky top-0 z-30 w-full glass border-b border-gray-700 py-4 px-4 md:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-dark-bg font-extrabold text-sm shadow-[0_0_10px_rgba(59,130,246,0.3)]">
              ADM
            </div>
            <div>
              <h1 className="text-sm md:text-base font-extrabold tracking-tight text-gray-100">
                플레이북 <span className="text-primary">관리자 패널</span>
              </h1>
              <p className="text-[10px] text-gray-500">영상 분류 상태 관리</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-xl px-2.5 py-1.5 text-xs text-gray-300">
              <select
                value={syncYear}
                onChange={(e) => setSyncYear(e.target.value)}
                className="bg-gray-950 border border-gray-700 text-gray-100 font-semibold outline-none cursor-pointer rounded-lg px-2 py-0.5 text-[11px] hover:bg-gray-800 transition-colors"
              >
                <option value="2024" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>2024년</option>
                <option value="2025" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>2025년</option>
                <option value="2026" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>2026년</option>
              </select>
              <select
                value={syncMonth}
                onChange={(e) => setSyncMonth(e.target.value)}
                className="bg-gray-950 border border-gray-700 text-gray-100 font-semibold outline-none cursor-pointer rounded-lg px-2 py-0.5 text-[11px] hover:bg-gray-800 transition-colors"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m} style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>{m}월</option>
                ))}
              </select>
              <span className="text-[10px] text-gray-400 font-medium hidden xs:inline">이후</span>
            </div>
            <button
              onClick={handleSyncVideos}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 border border-primary/25 hover:bg-primary/20 text-xs font-semibold text-primary transition-all duration-300 disabled:opacity-50"
              title="경기 영상 동기화 (YouTube/SOOP)"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">경기 동기화</span>
            </button>
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-900 border border-gray-700 hover:bg-gray-800 text-xs font-semibold text-gray-400 hover:text-gray-200 transition-all duration-300"
            >
              <Home className="w-3.5 h-3.5" />
              <span>홈으로</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-950/20 border border-red-500/20 hover:bg-red-950/40 text-xs font-semibold text-red-400 transition-all duration-300"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>로그아웃</span>
            </button>
          </div>
        </div>
      </header>

      {/* Admin Main Workspace */}
      <main className="max-w-6xl w-full mx-auto px-4 md:px-8 py-6 flex-grow space-y-6">
        {/* Status Message Alerts */}
        {(message || error) && (
          <div className="fixed bottom-4 right-4 z-40 space-y-2 max-w-sm">
            {message && (
              <div className="p-4 bg-emerald-950/90 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-sm text-emerald-400 shadow-2xl backdrop-blur-md animate-fadeIn">
                <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400" />
                <span>{message}</span>
              </div>
            )}
            {error && (
              <div className="p-4 bg-red-950/90 border border-red-500/20 rounded-2xl flex items-center gap-3 text-sm text-red-400 shadow-2xl backdrop-blur-md animate-fadeIn">
                <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {/* Visitor Stats Dashboard Card */}
        {isAuthenticated && stats && (
          <div className="glass p-6 rounded-3xl border border-gray-700 space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="text-sm md:text-base font-extrabold text-gray-100">📊 방문자 통계</h3>
                  <p className="text-[10px] text-gray-500">일별, 주별, 월별 방문 분석</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {loadingStats && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
                <button
                  onClick={() => fetchStats()}
                  disabled={loadingStats}
                  className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
                  title="통계 새로고침"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Error Message for missing table / DB issue */}
            {stats.error && (
              <div className="p-4 bg-amber-950/40 border border-amber-500/20 rounded-2xl space-y-2 text-xs text-amber-400">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Supabase visitor_log 테이블을 찾을 수 없습니다.</span>
                </div>
                <p className="text-gray-400">
                  Supabase를 연동하여 사용 중인 경우, 방문자 통계 수집을 위해 아래 SQL 쿼리를 Supabase SQL Editor에서 실행해 주세요:
                </p>
                <pre className="p-3 bg-black/60 rounded-xl overflow-x-auto text-[10px] text-gray-300 font-mono">
{`CREATE TABLE IF NOT EXISTS visitor_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now()
);`}
                </pre>
              </div>
            )}

            {/* Metrics Grid */}
            {!stats.error && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(() => {
                    const activeData = stats[statsTab] || [];
                    const total = activeData.reduce((sum, item) => sum + item.count, 0);
                    const avg = activeData.length > 0 ? (total / activeData.length).toFixed(1) : '0';
                    const max = activeData.length > 0 ? Math.max(...activeData.map(item => item.count)) : 0;
                    
                    let periodLabel = '선택 범위';
                    if (statsTab === 'daily') periodLabel = '최근 30일';
                    else if (statsTab === 'weekly') periodLabel = '최근 12주';
                    else if (statsTab === 'monthly') periodLabel = '최근 12개월';

                    let todayCount = null;
                    if (statsTab === 'daily' && activeData.length > 0) {
                      todayCount = activeData[activeData.length - 1].count;
                    }

                    return (
                      <>
                        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 flex flex-col justify-between">
                          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">누적 방문수 ({periodLabel})</span>
                          <span className="text-xl font-black text-gray-100 mt-1">{total.toLocaleString()}회</span>
                        </div>
                        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 flex flex-col justify-between">
                          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">평균 방문수</span>
                          <span className="text-xl font-black text-primary mt-1">{avg}회</span>
                        </div>
                        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 flex flex-col justify-between">
                          {todayCount !== null ? (
                            <>
                              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">오늘 방문수</span>
                              <span className="text-xl font-black text-emerald-400 mt-1">{todayCount}회</span>
                            </>
                          ) : (
                            <>
                              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">최다 방문수</span>
                              <span className="text-xl font-black text-amber-400 mt-1">{max}회</span>
                            </>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Tab Control */}
                <div className="flex gap-2 border-b border-gray-700 pb-2">
                  <button
                    onClick={() => setStatsTab('daily')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      statsTab === 'daily'
                        ? 'bg-primary text-dark-bg border-primary shadow-[0_0_10px_rgba(59,130,246,0.2)]'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-100 hover:bg-gray-700'
                    }`}
                  >
                    일별 (최근 30일)
                  </button>
                  <button
                    onClick={() => setStatsTab('weekly')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      statsTab === 'weekly'
                        ? 'bg-primary text-dark-bg border-primary shadow-[0_0_10px_rgba(59,130,246,0.2)]'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-100 hover:bg-gray-700'
                    }`}
                  >
                    주별 (최근 12주)
                  </button>
                  <button
                    onClick={() => setStatsTab('monthly')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      statsTab === 'monthly'
                        ? 'bg-primary text-dark-bg border-primary shadow-[0_0_10px_rgba(59,130,246,0.2)]'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-100 hover:bg-gray-700'
                    }`}
                  >
                    월별 (최근 12개월)
                  </button>
                </div>

                {/* Chart List (Horizontal Bar Chart) */}
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 scrollbar-thin">
                  {(() => {
                    const activeData = stats[statsTab] || [];
                    const maxCount = activeData.length > 0 ? Math.max(...activeData.map(item => item.count)) : 0;

                    if (activeData.length === 0) {
                      return <p className="text-xs text-gray-500 py-4 text-center">기록된 방문 데이터가 없습니다.</p>;
                    }

                    return activeData.slice().reverse().map((item) => {
                      const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                      
                      let displayLabel = item.date;
                      if (statsTab === 'daily') {
                        const parts = item.date.split('-');
                        if (parts.length === 3) displayLabel = `${parts[1]}.${parts[2]}`;
                      } else if (statsTab === 'weekly') {
                        const parts = item.date.split('-');
                        if (parts.length === 3) displayLabel = `${parts[1]}.${parts[2]}주`;
                      } else if (statsTab === 'monthly') {
                        const parts = item.date.split('-');
                        if (parts.length === 2) displayLabel = `${parts[1]}월`;
                      }

                      return (
                        <div key={item.date} className="flex items-center gap-3 hover:bg-gray-900 px-2 py-1.5 rounded-xl transition-colors group">
                          <span className="w-14 text-xs font-semibold text-gray-400 group-hover:text-gray-200 transition-colors shrink-0">
                            {displayLabel}
                          </span>
                          <div className="flex-grow h-3 bg-gray-900 rounded-full overflow-hidden relative">
                            <div
                              style={{ width: `${percentage}%` }}
                              className="bg-gradient-to-r from-primary/70 to-primary h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(59,130,246,0.2)]"
                            />
                          </div>
                          <span className="w-12 text-right text-xs font-bold text-gray-100 shrink-0">
                            {item.count}회
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </>
            )}
          </div>
        )}

        {/* Action Controls (Manual Add Toggle) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-900 border border-gray-700 p-4 rounded-3xl">
          <div className="space-y-1">
            <h3 className="text-sm md:text-base font-extrabold text-gray-100">경기 영상 데이터 관리</h3>
            <p className="text-xs text-gray-500">영상을 추가 수기 등록하거나 대회명 관리, 분류 메타데이터를 편집합니다.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            {/* Tournament List Management Button */}
            <button
              onClick={() => {
                setShowTournamentForm(!showTournamentForm);
                setShowAddForm(false);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all duration-300 shadow-md active:scale-95 border ${
                showTournamentForm
                  ? 'bg-amber-950/40 border-amber-500/25 text-amber-400'
                  : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`}
            >
              🏆 대회 목록 관리
            </button>
            {/* New Video Registration Button */}
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                setShowTournamentForm(false);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all duration-300 shadow-md active:scale-95 border ${
                showAddForm
                  ? 'bg-red-950/40 border-red-500/25 text-red-400'
                  : 'bg-primary border-primary text-dark-bg hover:bg-primary-hover shadow-primary/10'
              }`}
            >
              {showAddForm ? (
                <>
                  <X className="w-4 h-4" />
                  닫기
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  새 영상 수기 등록
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tournament Management Form */}
        {showTournamentForm && (
          <div className="glass-card p-6 rounded-3xl border border-amber-500/20 space-y-4 animate-fadeIn">
            <h4 className="text-sm font-extrabold text-amber-400 flex items-center gap-1.5">
              <span>🏆 대회 목록 관리</span>
            </h4>
            
            {/* Create Tournament Form */}
            <form onSubmit={handleAddTournament} className="flex gap-2 max-w-md">
              <input
                type="text"
                placeholder="새로운 대회명 입력 (예: 봉황대기 전국대회)"
                value={newTournamentName}
                onChange={(e) => setNewTournamentName(e.target.value)}
                className="flex-grow px-3 py-2 bg-gray-950 border border-gray-700 rounded-xl text-xs md:text-sm text-gray-300 outline-none focus:border-primary/20"
                required
              />
              <button
                type="submit"
                disabled={isAddingTournament}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-dark-bg font-bold text-xs md:text-sm rounded-xl transition-all duration-200"
              >
                {isAddingTournament ? '추가 중...' : '대회 추가'}
              </button>
            </form>

            {/* Tournaments List Grid */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">현재 등록된 대회 목록 ({tournaments.length}건)</span>
              {tournaments.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {tournaments.map((t) => (
                    <div key={t} className="flex items-center justify-between px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-xs md:text-sm text-gray-300">
                      <span className="truncate pr-2">{t}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteTournament(t)}
                        className="text-gray-500 hover:text-red-400 p-1 rounded-lg transition-colors"
                        title="대회명 삭제"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">등록된 대회명이 없습니다. 대회를 추가해 주세요.</p>
              )}
            </div>

            {/* Database Diagnosis Button & Output */}
            <div className="pt-4 border-t border-gray-700 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[11px] text-gray-400">데이터베이스 연동이 불안정하거나 대회 추가/삭제가 안 되나요?</span>
                <button
                  type="button"
                  onClick={handleDiagnoseDB}
                  disabled={isDiagnosing}
                  className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-400 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer"
                >
                  {isDiagnosing ? '진단 중...' : 'DB 연결 및 권한 진단'}
                </button>
              </div>

              {diagnostics && (
                <div className="p-4 bg-gray-900 border border-gray-700 rounded-2xl text-xs space-y-3 animate-fadeIn text-gray-300">
                  <h5 className="font-extrabold text-amber-400">🔍 진단 리포트</h5>
                  
                  <div className="space-y-1">
                    <div>실행 모드: <strong className="text-gray-100">{diagnostics.mode === 'supabase' ? 'Supabase 연동 모드' : '로컬 파일 모드'}</strong></div>
                    {diagnostics.mode === 'local-file' && (
                      <div className="text-amber-500 bg-amber-950/20 p-2.5 rounded-lg border border-amber-500/15 leading-relaxed">
                        ⚠️ 현재 로컬 파일 데이터베이스 모드입니다. Vercel 배포 환경에서는 서버리스 파일 쓰기가 불가능하므로, Vercel 환경 변수설정에 <strong>SUPABASE_URL</strong>과 <strong>SUPABASE_ANON_KEY</strong>(또는 <strong>SUPABASE_SERVICE_KEY</strong>)를 올바르게 입력하셔야 대회 추가/삭제가 작동합니다.
                      </div>
                    )}
                  </div>

                  {diagnostics.mode === 'supabase' && diagnostics.diagnostics && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <span>영상(videos) 테이블 상태:</span>
                        {diagnostics.diagnostics.videosTable?.success ? (
                          <span className="text-emerald-400 font-bold">정상 (데이터 {diagnostics.diagnostics.videosTable.count}건)</span>
                        ) : (
                          <span className="text-red-400 font-bold">오류 ({diagnostics.diagnostics.videosTable?.error})</span>
                        )}
                      </div>

                       <div className="flex items-center gap-1.5">
                        <span>대회(tournaments) 테이블 상태:</span>
                        {diagnostics.diagnostics.tournamentsTable?.success ? (
                          <span className="text-emerald-400 font-bold">정상</span>
                        ) : (
                          <span className="text-red-400 font-bold">오류 ({diagnostics.diagnostics.tournamentsTable?.error})</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span>삭제 추적(deleted_videos) 테이블 상태:</span>
                        {diagnostics.diagnostics.deletedVideosTable?.success ? (
                          <span className="text-emerald-400 font-bold">정상</span>
                        ) : (
                          <span className="text-red-400 font-bold">오류 ({diagnostics.diagnostics.deletedVideosTable?.error})</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span>방문 통계(visitor_log) 테이블 상태:</span>
                        {diagnostics.diagnostics.visitorLogTable?.success ? (
                          <span className="text-emerald-400 font-bold">정상</span>
                        ) : (
                          <span className="text-red-400 font-bold">오류 ({diagnostics.diagnostics.visitorLogTable?.error})</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span>수집 주소(crawl_targets) 테이블 상태:</span>
                        {diagnostics.diagnostics.crawlTargetsTable?.success ? (
                          <span className="text-emerald-400 font-bold">정상</span>
                        ) : (
                          <span className="text-red-400 font-bold">오류 ({diagnostics.diagnostics.crawlTargetsTable?.error})</span>
                        )}
                      </div>

                      {diagnostics.diagnostics.deletedVideosTable?.code === '42P01' && (
                        <div className="bg-red-955/20 p-3 rounded-lg border border-red-500/15 text-red-300 space-y-1.5 leading-relaxed">
                          <div><strong>해결 방법 (삭제 추적 테이블 미생성):</strong> Supabase SQL Editor에서 아래 SQL을 실행하여 deleted_videos 테이블을 생성해 주세요.</div>
                          <pre className="p-2 bg-black/40 rounded text-[10px] font-mono text-gray-400 overflow-x-auto select-all">
{`CREATE TABLE IF NOT EXISTS deleted_videos (
  source_video_id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now()
);`}
                          </pre>
                        </div>
                      )}

                      {diagnostics.diagnostics.visitorLogTable?.code === '42P01' && (
                        <div className="bg-red-955/20 p-3 rounded-lg border border-red-500/15 text-red-300 space-y-1.5 leading-relaxed">
                          <div><strong>해결 방법 (방문자 통계 테이블 미생성):</strong> Supabase SQL Editor에서 아래 SQL을 실행하여 visitor_log 테이블을 생성해 주세요.</div>
                          <pre className="p-2 bg-black/40 rounded text-[10px] font-mono text-gray-400 overflow-x-auto select-all">
{`CREATE TABLE IF NOT EXISTS visitor_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now()
);`}
                          </pre>
                        </div>
                      )}

                      {diagnostics.diagnostics.crawlTargetsTable?.code === '42P01' && (
                        <div className="bg-red-955/20 p-3 rounded-lg border border-red-500/15 text-red-300 space-y-1.5 leading-relaxed">
                          <div><strong>해결 방법 (수집 주소 테이블 미생성):</strong> Supabase SQL Editor에서 아래 SQL을 실행하여 crawl_targets 테이블을 생성해 주세요.</div>
                          <pre className="p-2 bg-black/40 rounded text-[10px] font-mono text-gray-400 overflow-x-auto select-all">
{`CREATE TABLE IF NOT EXISTS crawl_targets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform VARCHAR(50) NOT NULL,
  target_id VARCHAR(255) NOT NULL,
  team_division VARCHAR(100) NOT NULL,
  memo VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS 활성화 및 조회 권한 추가
ALTER TABLE crawl_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to crawl_targets" ON crawl_targets FOR SELECT USING (true);`}
                          </pre>
                        </div>
                      )}

                      {diagnostics.diagnostics.tournamentsTable?.code === '42P01' && (
                        <div className="bg-red-955/20 p-3 rounded-lg border border-red-500/15 text-red-300 space-y-1.5 leading-relaxed">
                          <div><strong>해결 방법 (테이블 미생성):</strong> Supabase SQL Editor에서 아래 SQL을 실행하여 tournaments 테이블을 생성해 주세요.</div>
                          <pre className="p-2 bg-black/40 rounded text-[10px] font-mono text-gray-400 overflow-x-auto select-all">
{`CREATE TABLE IF NOT EXISTS tournaments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO tournaments (name) VALUES 
('남양주시장기 리그'),
('백호기 전국대회'),
('U13 주말리그'),
('꿈나무 리그'),
('U15 전국선수권대회'),
('친선경기')
ON CONFLICT (name) DO NOTHING;`}
                          </pre>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5">
                        <span>대회 쓰기/삭제 테스트:</span>
                        {diagnostics.diagnostics.writeTest?.success ? (
                          <span className="text-emerald-400 font-bold">성공 (권한 확인됨)</span>
                        ) : diagnostics.diagnostics.writeTest ? (
                          <span className="text-red-400 font-bold">실패 ({diagnostics.diagnostics.writeTest.error})</span>
                        ) : (
                          <span className="text-gray-500">테스트할 수 없음 (테이블 오류)</span>
                        )}
                      </div>

                      {diagnostics.diagnostics.writeTest && !diagnostics.diagnostics.writeTest.success && (
                        <div className="bg-red-955/20 p-3 rounded-lg border border-red-500/15 text-red-300 space-y-1.5 leading-relaxed">
                          <div><strong>해결 방법 (권한/RLS 오류):</strong> 테이블은 존재하나 Row Level Security(RLS) 정책에 의해 쓰기/삭제가 제한되었습니다. Supabase SQL Editor에서 아래 SQL을 실행하여 RLS를 끄거나 정책을 허용해 주세요.</div>
                          <pre className="p-2 bg-black/40 rounded text-[10px] font-mono text-gray-400 overflow-x-auto select-all">
{`-- tournaments 테이블의 Row Level Security 해제
ALTER TABLE tournaments DISABLE ROW LEVEL SECURITY;`}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Manual Video Registration Form */}
        {showAddForm && (
          <form 
            onSubmit={handleCreateVideo}
            className="glass-card p-6 rounded-3xl border border-primary/20 space-y-4 animate-fadeIn"
          >
            <h4 className="text-sm font-extrabold text-primary flex items-center gap-1.5">
              <span>➕ 신규 경기 영상 수기 등록</span>
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">송출 플랫폼</label>
                <select
                  value={newVideo.source}
                  onChange={(e) => handleNewVideoInputChange('source', e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-950 border border-gray-700 rounded-xl text-xs md:text-sm text-gray-300 outline-none focus:border-primary/20"
                >
                  <option value="youtube">YouTube</option>
                  <option value="soop">SOOP (아프리카TV)</option>
                </select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">영상 주소 (URL)</label>
                <input
                  type="text"
                  placeholder="예: https://www.youtube.com/watch?v=... 또는 https://vod.sooplive.co.kr/player/..."
                  value={newVideo.url}
                  onChange={(e) => handleNewVideoInputChange('url', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-xl text-xs md:text-sm text-gray-300 outline-none focus:border-primary/20"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">영상 제목</label>
                <input
                  type="text"
                  placeholder="예: U11 꿈나무부 vs 동작리틀 백호기 본선"
                  value={newVideo.title}
                  onChange={(e) => handleNewVideoInputChange('title', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-xl text-xs md:text-sm text-gray-300 outline-none focus:border-primary/20"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">경기 일자</label>
                <input
                  type="date"
                  value={newVideo.published_at}
                  onChange={(e) => handleNewVideoInputChange('published_at', e.target.value)}
                  style={{ colorScheme: 'light' }}
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-xl text-xs md:text-sm text-gray-300 outline-none focus:border-primary/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">부서 분류</label>
                <select
                  value={newVideo.team_division}
                  onChange={(e) => handleNewVideoInputChange('team_division', e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-950 border border-gray-700 rounded-xl text-xs md:text-sm text-gray-300 outline-none focus:border-primary/20"
                >
                  <option value="미분류">미분류 (대기)</option>
                  <option value="새싹부">새싹부</option>
                  <option value="꿈나무부">꿈나무부</option>
                  <option value="꿈나무A">꿈나무A</option>
                  <option value="꿈나무B">꿈나무B</option>
                  <option value="유소년부">유소년부</option>
                  <option value="구구불독스">구구불독스</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">대회명</label>
                <select
                  value={newVideo.tournament || ''}
                  onChange={(e) => handleNewVideoInputChange('tournament', e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-950 border border-gray-700 rounded-xl text-xs md:text-sm text-gray-350 outline-none focus:border-primary/20"
                >
                  <option value="">대회 없음 (친선/기타)</option>
                  {tournaments.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Score and Opponent inputs for new video */}
            <div className="p-4 bg-gray-900 rounded-2xl border border-gray-700 space-y-3">
              <h5 className="text-xs font-bold text-gray-400">📊 경기 결과 입력 (상대팀 및 스코어)</h5>
              
              {(() => {
                const isBulldogsHome = newVideoBulldogsPos === 'home';
                const bulldogsScore = isBulldogsHome ? newVideo.home_score : newVideo.away_score;
                const opponentScore = isBulldogsHome ? newVideo.away_score : newVideo.home_score;
                const opponentName = newVideo.opponent || '';

                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* 1. Opponent Team Name */}
                      <div className="space-y-1 sm:col-span-1">
                        <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">상대팀 이름</label>
                        <input
                          type="text"
                          list="opponents-list"
                          placeholder="예: 동작리틀"
                          value={opponentName}
                          onChange={(e) => handleNewVideoGameResultChange('opponent', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-xl text-xs text-gray-300 outline-none focus:border-primary/20"
                          required={newVideo.team_division !== '미분류'}
                        />
                      </div>

                      {/* 2. Bulldogs position (Home/Away) */}
                      <div className="space-y-1 sm:col-span-1">
                        <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">구구불독스 위치</label>
                        <select
                          value={newVideoBulldogsPos}
                          onChange={(e) => handleNewVideoGameResultChange('position', e.target.value)}
                          className="w-full px-3 py-2.5 bg-gray-950 border border-gray-700 rounded-xl text-xs text-gray-300 outline-none focus:border-primary/20"
                        >
                          <option value="away">원정 (선공)</option>
                          <option value="home">홈 (후공)</option>
                        </select>
                      </div>

                      {/* 3. Scores */}
                      <div className="grid grid-cols-2 gap-3 sm:col-span-1">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">불독스 점수</label>
                          <input
                            type="number"
                            placeholder="예: 8"
                            value={bulldogsScore}
                            onChange={(e) => handleNewVideoGameResultChange('bulldogs_score', e.target.value)}
                            className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-xl text-xs text-gray-300 outline-none focus:border-primary/20"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">상대팀 점수</label>
                          <input
                            type="number"
                            placeholder="예: 5"
                            value={opponentScore}
                            onChange={(e) => handleNewVideoGameResultChange('opponent_score', e.target.value)}
                            className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-xl text-xs text-gray-300 outline-none focus:border-primary/20"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-700">
                      <div className="space-y-1 max-w-md">
                        <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">승리 팀 이름 (점수 입력 시 자동 계산)</label>
                        <input
                          type="text"
                          placeholder="예: 구구불독스 (점수 입력 시 자동 입력되며, 변경 가능)"
                          value={newVideo.win_team || ''}
                          onChange={(e) => handleNewVideoGameResultChange('win_team', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-xl text-xs text-gray-300 outline-none focus:border-primary/20"
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-gray-200 font-bold text-xs md:text-sm rounded-xl transition-colors duration-200"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-1 px-5 py-2.5 bg-primary hover:bg-primary-hover text-dark-bg font-bold text-xs md:text-sm rounded-xl transition-all duration-300 shadow-md disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                등록하기
              </button>
            </div>
          </form>
        )}

        {/* Filters and Counters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-2 p-1 bg-gray-900 border border-gray-700 rounded-2xl w-fit">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 ${
                filterType === 'all'
                  ? 'bg-primary text-dark-bg shadow-md'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              경기 영상 편집/목록 ({videos.length})
            </button>
            <button
              onClick={() => setFilterType('targets')}
              className={`px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 ${
                filterType === 'targets'
                  ? 'bg-primary text-dark-bg shadow-md'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              수집 채널/주소 관리 ({crawlTargets.length})
            </button>
          </div>

          <div className="text-xs text-gray-400">
            {filterType === 'targets' ? (
              <span>총 <strong className="text-gray-300 font-bold">{crawlTargets.length}개</strong>의 수집 채널이 등록되어 있습니다.</span>
            ) : (
              <span>총 <strong className="text-gray-300 font-bold">{filteredVideos.length}건</strong>의 비디오가 목록에 표시됩니다.</span>
            )}
          </div>
        </div>

        {/* Dynamic Workspace Render */}
        {filterType === 'targets' ? renderCrawlTargetsWorkspace() : renderVideoEditorWorkspace()}

        {/* Datalist for autocomplete */}
        <datalist id="opponents-list">
          {existingOpponents.map((op) => (
            <option key={op} value={op} />
          ))}
        </datalist>
      </main>

      <footer className="w-full py-8 mt-12 bg-black/40 border-t border-gray-700 px-4 text-center text-xs text-gray-600">
        <p>© 2026 구구불독스 플레이북 관리 시스템</p>
      </footer>
    </div>
  );
}
