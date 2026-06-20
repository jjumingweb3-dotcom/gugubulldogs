'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Home, LogOut, ShieldAlert, CheckCircle, AlertTriangle, Save, Loader2, Plus, X, RefreshCw } from 'lucide-react';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState([]);
  const [filterType, setFilterType] = useState('pending'); // 'all' | 'pending'
  const [savingId, setSavingId] = useState(null);
  const [message, setMessage] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Manual video registration state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVideo, setNewVideo] = useState({
    source: 'youtube',
    url: '',
    title: '',
    team_division: '미분류',
    tournament: '',
    opponent: '',
    published_at: new Date().toISOString().substring(0, 16), // YYYY-MM-DDTHH:mm
    home_team: '',
    away_team: '',
    home_score: '',
    away_score: ''
  });

  // Check localStorage for saved credentials
  useEffect(() => {
    const savedPassword = localStorage.getItem('gugu_admin_pw');
    if (savedPassword) {
      handleLogin(savedPassword);
    }
  }, []);

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
        localStorage.setItem('gugu_admin_pw', pw);
        setPassword('');
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

  const handleLogout = () => {
    localStorage.removeItem('gugu_admin_pw');
    setIsAuthenticated(false);
    setVideos([]);
    setMessage('');
  };

  const handleSyncVideos = async () => {
    setIsRefreshing(true);
    setMessage('');
    setError('');
    const savedPassword = localStorage.getItem('gugu_admin_pw');
    
    try {
      const res = await fetch('/api/cron');
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
          published_at: new Date().toISOString().substring(0, 16),
          home_team: '',
          away_team: '',
          home_score: '',
          away_score: ''
        });
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
          away_score: video.away_score === '' || video.away_score === null || video.away_score === undefined ? null : Number(video.away_score)
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

  const handleInputChange = (id, field, value) => {
    setVideos(prev =>
      prev.map(v => (v.id === id ? { ...v, [field]: value } : v))
    );
  };

  const handleNewVideoInputChange = (field, value) => {
    setNewVideo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const filteredVideos = videos.filter(v => {
    if (filterType === 'pending') {
      return v.team_division === '미분류' || v.parsed_status === 'pending';
    }
    return true;
  });

  // Login Form render
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-dark-bg">
        <div className="w-full max-w-md glass p-8 rounded-3xl space-y-6 border border-white/10">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-primary text-dark-bg rounded-2xl mx-auto flex items-center justify-center font-black text-2xl shadow-[0_0_15px_rgba(197,255,26,0.3)]">
              G
            </div>
            <h1 className="text-xl font-extrabold text-white">플레이북 관리자 로그인</h1>
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
                className="w-full px-4 py-3 bg-white/5 border border-white/5 focus:border-primary/20 focus:bg-white/10 rounded-2xl outline-none text-sm placeholder-gray-600 text-gray-200 transition-all duration-300"
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
              className="w-full py-3.5 rounded-2xl bg-primary hover:bg-primary-hover text-dark-bg font-bold text-sm transition-all duration-300 flex items-center justify-center gap-1.5 shadow-[0_4px_16px_rgba(197,255,26,0.2)] disabled:opacity-50"
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
      <header className="sticky top-0 z-30 w-full glass border-b border-white/5 py-4 px-4 md:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-dark-bg font-extrabold text-sm shadow-[0_0_10px_rgba(197,255,26,0.3)]">
              ADM
            </div>
            <div>
              <h1 className="text-sm md:text-base font-extrabold tracking-tight text-white">
                플레이북 <span className="text-primary">관리자 패널</span>
              </h1>
              <p className="text-[10px] text-gray-500">영상 분류 상태 관리</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 text-xs font-semibold text-gray-400 hover:text-gray-200 transition-all duration-300"
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

        {/* Action Controls (Manual Add Toggle) */}
        <div className="flex justify-between items-center bg-white/5 border border-white/5 p-4 rounded-3xl">
          <div className="space-y-1">
            <h3 className="text-sm md:text-base font-extrabold text-white">경기 영상 데이터 관리</h3>
            <p className="text-xs text-gray-500">영상을 추가 수기 등록하거나 분류 메타데이터를 편집합니다.</p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all duration-300 shadow-md active:scale-95 ${
              showAddForm
                ? 'bg-red-950/40 border border-red-500/25 text-red-400'
                : 'bg-primary text-dark-bg hover:bg-primary-hover shadow-primary/10'
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
                  className="w-full px-3 py-2.5 bg-dark-bg border border-white/5 rounded-xl text-xs md:text-sm text-gray-300 outline-none focus:border-primary/20"
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
                  className="w-full px-3 py-2 bg-dark-bg border border-white/5 rounded-xl text-xs md:text-sm text-gray-300 outline-none focus:border-primary/20"
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
                  className="w-full px-3 py-2 bg-dark-bg border border-white/5 rounded-xl text-xs md:text-sm text-gray-300 outline-none focus:border-primary/20"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">경기 시간대</label>
                <input
                  type="datetime-local"
                  value={newVideo.published_at}
                  onChange={(e) => handleNewVideoInputChange('published_at', e.target.value)}
                  className="w-full px-3 py-2 bg-dark-bg border border-white/5 rounded-xl text-xs md:text-sm text-gray-300 outline-none focus:border-primary/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">부서 분류</label>
                <select
                  value={newVideo.team_division}
                  onChange={(e) => handleNewVideoInputChange('team_division', e.target.value)}
                  className="w-full px-3 py-2.5 bg-dark-bg border border-white/5 rounded-xl text-xs md:text-sm text-gray-300 outline-none focus:border-primary/20"
                >
                  <option value="미분류">미분류 (대기)</option>
                  <option value="새싹부">새싹부</option>
                  <option value="꿈나무부">꿈나무부</option>
                  <option value="유소년부">유소년부</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">대회명</label>
                <input
                  type="text"
                  placeholder="예: 백호기 전국대회"
                  value={newVideo.tournament}
                  onChange={(e) => handleNewVideoInputChange('tournament', e.target.value)}
                  className="w-full px-3 py-2 bg-dark-bg border border-white/5 rounded-xl text-xs md:text-sm text-gray-300 outline-none focus:border-primary/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">상대팀</label>
                <input
                  type="text"
                  placeholder="예: 마포자이언츠"
                  value={newVideo.opponent}
                  onChange={(e) => handleNewVideoInputChange('opponent', e.target.value)}
                  className="w-full px-3 py-2 bg-dark-bg border border-white/5 rounded-xl text-xs md:text-sm text-gray-300 outline-none focus:border-primary/20"
                />
              </div>
            </div>

            {/* Score inputs for new video */}
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3">
              <h5 className="text-xs font-bold text-gray-400">📊 경기 스코어 기록 (선택 사항)</h5>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">홈팀 이름</label>
                  <input
                    type="text"
                    placeholder="예: 구구불독스"
                    value={newVideo.home_team}
                    onChange={(e) => handleNewVideoInputChange('home_team', e.target.value)}
                    className="w-full px-3 py-2 bg-dark-bg border border-white/5 rounded-xl text-xs text-gray-300 outline-none focus:border-primary/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">원정팀 이름</label>
                  <input
                    type="text"
                    placeholder="예: 마포자이언츠"
                    value={newVideo.away_team}
                    onChange={(e) => handleNewVideoInputChange('away_team', e.target.value)}
                    className="w-full px-3 py-2 bg-dark-bg border border-white/5 rounded-xl text-xs text-gray-300 outline-none focus:border-primary/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">홈팀 스코어</label>
                  <input
                    type="number"
                    placeholder="예: 8"
                    value={newVideo.home_score}
                    onChange={(e) => handleNewVideoInputChange('home_score', e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-dark-bg border border-white/5 rounded-xl text-xs text-gray-300 outline-none focus:border-primary/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">원정팀 스코어</label>
                  <input
                    type="number"
                    placeholder="예: 5"
                    value={newVideo.away_score}
                    onChange={(e) => handleNewVideoInputChange('away_score', e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-dark-bg border border-white/5 rounded-xl text-xs text-gray-300 outline-none focus:border-primary/20"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-200 font-bold text-xs md:text-sm rounded-xl transition-colors duration-200"
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
          <div className="flex gap-2 p-1 bg-white/5 border border-white/5 rounded-2xl w-fit">
            <button
              onClick={() => setFilterType('pending')}
              className={`px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 ${
                filterType === 'pending'
                  ? 'bg-primary text-dark-bg shadow-md'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              대기중 / 미분류 ({videos.filter(v => v.team_division === '미분류' || v.parsed_status === 'pending').length})
            </button>
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 ${
                filterType === 'all'
                  ? 'bg-primary text-dark-bg shadow-md'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              전체 영상 ({videos.length})
            </button>
          </div>

          <div className="text-xs text-gray-500">
            총 <strong className="text-gray-300 font-bold">{filteredVideos.length}건</strong>의 비디오가 필터링되었습니다.
          </div>
        </div>

        {/* Video Editor Cards Grid */}
        {filteredVideos.length > 0 ? (
          <div className="space-y-4">
            {filteredVideos.map((video) => {
              const isSaving = savingId === video.id;
              const isPending = video.team_division === '미분류';

              return (
                <div 
                  key={video.id} 
                  className={`glass-card p-5 rounded-3xl border flex flex-col md:flex-row gap-5 items-start ${
                    isPending ? 'border-amber-500/20 bg-amber-950/5' : ''
                  }`}
                >
                  {/* Aspect ratio video thumbnail */}
                  <div className="relative aspect-video w-full md:w-56 rounded-2xl overflow-hidden shrink-0 bg-gray-900">
                    <img 
                      src={video.thumbnail_url} 
                      alt="" 
                      className="object-cover w-full h-full"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-black/60 border border-white/10 uppercase">
                      {video.source}
                    </div>
                  </div>

                  {/* Form fields for metadata editing */}
                  <div className="flex-grow w-full space-y-4">
                    {/* Title input */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">영상 제목</label>
                      <input
                        type="text"
                        value={video.title || ''}
                        onChange={(e) => handleInputChange(video.id, 'title', e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-dark-bg border border-white/5 rounded-xl text-sm text-gray-200 outline-none focus:border-primary/20 transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Team select dropdown */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">부서 분류</label>
                          {isPending && (
                            <span className="text-[9px] font-extrabold text-amber-500 flex items-center gap-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" /> 미분류
                            </span>
                          )}
                        </div>
                        <select
                          value={video.team_division || '미분류'}
                          onChange={(e) => handleInputChange(video.id, 'team_division', e.target.value)}
                          className={`w-full px-3 py-2.5 bg-dark-bg border rounded-xl text-xs md:text-sm outline-none ${
                            isPending 
                              ? 'border-amber-500/30 text-amber-400' 
                              : 'border-white/5 text-gray-300 focus:border-primary/20'
                          }`}
                        >
                          <option value="미분류">미분류 (대기)</option>
                          <option value="새싹부">새싹부</option>
                          <option value="꿈나무부">꿈나무부</option>
                          <option value="유소년부">유소년부</option>
                        </select>
                      </div>

                      {/* Tournament field */}
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">대회명</label>
                        <input
                          type="text"
                          placeholder="예: 남양주시장기 리그"
                          value={video.tournament || ''}
                          onChange={(e) => handleInputChange(video.id, 'tournament', e.target.value)}
                          className="w-full px-3 py-2.5 bg-dark-bg border border-white/5 rounded-xl text-xs md:text-sm text-gray-300 outline-none focus:border-primary/20 transition-colors"
                        />
                      </div>

                      {/* Opponent field */}
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">상대팀</label>
                        <input
                          type="text"
                          placeholder="예: 마포자이언츠"
                          value={video.opponent || ''}
                          onChange={(e) => handleInputChange(video.id, 'opponent', e.target.value)}
                          className="w-full px-3 py-2.5 bg-dark-bg border border-white/5 rounded-xl text-xs md:text-sm text-gray-300 outline-none focus:border-primary/20 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Score results row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                      <div className="space-y-1 col-span-1">
                        <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">홈팀 이름</label>
                        <input
                          type="text"
                          placeholder="예: 구구불독스"
                          value={video.home_team || ''}
                          onChange={(e) => handleInputChange(video.id, 'home_team', e.target.value)}
                          className="w-full px-3 py-2 bg-dark-bg border border-white/5 rounded-xl text-xs text-gray-300 outline-none focus:border-primary/20"
                        />
                      </div>
                      <div className="space-y-1 col-span-1">
                        <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">원정팀 이름</label>
                        <input
                          type="text"
                          placeholder="예: 마포자이언츠"
                          value={video.away_team || ''}
                          onChange={(e) => handleInputChange(video.id, 'away_team', e.target.value)}
                          className="w-full px-3 py-2 bg-dark-bg border border-white/5 rounded-xl text-xs text-gray-300 outline-none focus:border-primary/20"
                        />
                      </div>
                      <div className="space-y-1 col-span-1">
                        <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">홈팀 스코어</label>
                        <input
                          type="number"
                          placeholder="예: 8"
                          value={video.home_score !== null && video.home_score !== undefined ? video.home_score : ''}
                          onChange={(e) => handleInputChange(video.id, 'home_score', e.target.value === '' ? null : Number(e.target.value))}
                          className="w-full px-3 py-2 bg-dark-bg border border-white/5 rounded-xl text-xs text-gray-300 outline-none focus:border-primary/20"
                        />
                      </div>
                      <div className="space-y-1 col-span-1">
                        <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">원정팀 스코어</label>
                        <input
                          type="number"
                          placeholder="예: 5"
                          value={video.away_score !== null && video.away_score !== undefined ? video.away_score : ''}
                          onChange={(e) => handleInputChange(video.id, 'away_score', e.target.value === '' ? null : Number(e.target.value))}
                          className="w-full px-3 py-2 bg-dark-bg border border-white/5 rounded-xl text-xs text-gray-300 outline-none focus:border-primary/20"
                        />
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex justify-between items-center pt-2 border-t border-white/5">
                      <span className="text-[10px] text-gray-500 flex flex-col gap-0.5">
                        <span>원본 영상 ID: <code className="text-gray-400 font-mono">{video.source_video_id}</code></span>
                        <span>등록 일시: <span className="text-gray-400 font-mono">{new Date(video.published_at).toLocaleString('ko-KR')}</span></span>
                      </span>
                      <button
                        onClick={() => handleUpdateVideo(video)}
                        disabled={isSaving}
                        className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-dark-bg font-bold text-xs md:text-sm rounded-xl transition-all duration-300 disabled:opacity-50 shadow-md active:scale-95"
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
              );
            })}
          </div>
        ) : (
          <div className="w-full py-20 bg-white/5 border border-white/5 rounded-3xl flex flex-col items-center justify-center text-center p-6 space-y-2">
            <CheckCircle className="w-10 h-10 text-primary opacity-50" />
            <h4 className="text-sm font-bold text-gray-400">대기 중이거나 해당하는 영상이 없습니다</h4>
            <p className="text-xs text-gray-500">모든 경기가 정상적으로 분류되었습니다.</p>
          </div>
        )}
      </main>

      <footer className="w-full py-8 mt-12 bg-black/40 border-t border-white/5 px-4 text-center text-xs text-gray-600">
        <p>© 2026 구구불독스 플레이북 관리 시스템</p>
      </footer>
    </div>
  );
}
