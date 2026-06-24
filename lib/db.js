import fs from 'fs';
import path from 'path';
import { initialVideos } from './mock_data';
import { createClient } from '@supabase/supabase-js';

// Setup Supabase Client if env variables are available
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const isSupabaseConfigured = !!(supabaseUrl && supabaseKey);
const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseKey) : null;

const dbFilePath = path.join(process.cwd(), 'data', 'db.json');

// Helper to ensure local database exists
function initLocalDb() {
  if (isSupabaseConfigured) return;
  const dir = path.dirname(dbFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(dbFilePath)) {
    fs.writeFileSync(dbFilePath, JSON.stringify(initialVideos, null, 2), 'utf-8');
  }
}

export async function getVideos() {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('published_at', { ascending: false });
      if (error) {
        console.error('Error fetching videos from Supabase:', error);
        return [];
      }
      return data;
    } catch (e) {
      console.error('Error communicating with Supabase:', e);
      return [];
    }
  } else {
    try {
      initLocalDb();
      if (!fs.existsSync(dbFilePath)) {
        return initialVideos.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
      }
      const content = fs.readFileSync(dbFilePath, 'utf-8');
      const videos = JSON.parse(content);
      // Sort desc by published_at
      return videos.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
    } catch (e) {
      console.error('Error reading local JSON db:', e);
      return initialVideos.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
    }
  }
}

export async function updateVideo(id, updates) {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('videos')
        .update(updates)
        .eq('id', id)
        .select();
      if (error) {
        console.error('Error updating video in Supabase:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Error communicating with Supabase during update:', e);
      return false;
    }
  } else {
    try {
      initLocalDb();
      const content = fs.readFileSync(dbFilePath, 'utf-8');
      const videos = JSON.parse(content);
      const index = videos.findIndex(v => v.id === id);
      if (index !== -1) {
        videos[index] = { ...videos[index], ...updates };
        fs.writeFileSync(dbFilePath, JSON.stringify(videos, null, 2), 'utf-8');
        return true;
      }
      return false;
    } catch (e) {
      console.error('Error updating local JSON db:', e);
      return false;
    }
  }
}

export async function deleteVideo(id) {
  if (isSupabaseConfigured) {
    try {
      // 1. Fetch the video first to get its source_video_id
      const { data: videoToDel, error: fetchErr } = await supabase
        .from('videos')
        .select('source_video_id')
        .eq('id', id)
        .single();
      
      if (!fetchErr && videoToDel?.source_video_id) {
        // 2. Insert into deleted_videos (fail silently/defensively if table doesn't exist yet)
        try {
          await supabase
            .from('deleted_videos')
            .insert([{ source_video_id: videoToDel.source_video_id }]);
        } catch (e) {
          console.warn('Failed to insert into deleted_videos table:', e);
        }
      }

      // 3. Perform delete
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', id);
      if (error) {
        console.error('Error deleting video from Supabase:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Error communicating with Supabase during delete:', e);
      return false;
    }
  } else {
    try {
      initLocalDb();
      const content = fs.readFileSync(dbFilePath, 'utf-8');
      const videos = JSON.parse(content);
      const videoToDel = videos.find(v => v.id === id);

      if (videoToDel) {
        // Save to deleted_videos.json
        const deletedDbPath = path.join(process.cwd(), 'data', 'deleted_videos.json');
        let deletedIds = [];
        try {
          if (fs.existsSync(deletedDbPath)) {
            deletedIds = JSON.parse(fs.readFileSync(deletedDbPath, 'utf-8'));
          }
        } catch (e) {
          console.error('Error reading local deleted videos db:', e);
        }

        if (videoToDel.source_video_id && !deletedIds.includes(videoToDel.source_video_id)) {
          deletedIds.push(videoToDel.source_video_id);
          try {
            const dir = path.dirname(deletedDbPath);
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(deletedDbPath, JSON.stringify(deletedIds, null, 2), 'utf-8');
          } catch (e) {
            console.error('Error writing local deleted videos db:', e);
          }
        }

        const filtered = videos.filter(v => v.id !== id);
        fs.writeFileSync(dbFilePath, JSON.stringify(filtered, null, 2), 'utf-8');
        return true;
      }
      return false;
    } catch (e) {
      console.error('Error deleting local video:', e);
      return false;
    }
  }
}

export async function addVideos(newVideos) {
  if (isSupabaseConfigured) {
    try {
      if (!newVideos || newVideos.length === 0) return 0;
      
      const sourceVideoIds = newVideos.map(v => v.source_video_id);
      const { data: existing, error: fetchError } = await supabase
        .from('videos')
        .select('source_video_id')
        .in('source_video_id', sourceVideoIds);
        
      if (fetchError) {
        console.error('Error fetching existing videos from Supabase:', fetchError);
        return 0;
      }
      
      const existingIds = new Set(existing ? existing.map(v => v.source_video_id) : []);

      // Query deleted_videos to prevent re-importing
      const deletedIds = new Set();
      try {
        const { data: delVids, error: delError } = await supabase
          .from('deleted_videos')
          .select('source_video_id')
          .in('source_video_id', sourceVideoIds);
        if (!delError && delVids) {
          delVids.forEach(v => deletedIds.add(v.source_video_id));
        }
      } catch (e) {
        console.warn('Failed to query deleted_videos table:', e);
      }
      
      const strictlyNewVideos = newVideos.filter(v => 
        !existingIds.has(v.source_video_id) && !deletedIds.has(v.source_video_id)
      );
      
      if (strictlyNewVideos.length === 0) {
        return 0;
      }
      
      const { data, error } = await supabase
        .from('videos')
        .insert(strictlyNewVideos)
        .select();
        
      if (error) {
        console.error('Error adding videos to Supabase:', error);
        return 0;
      }
      return data ? data.length : 0;
    } catch (e) {
      console.error('Error communicating with Supabase during insert:', e);
      return 0;
    }
  } else {
    try {
      initLocalDb();
      const content = fs.readFileSync(dbFilePath, 'utf-8');
      const videos = JSON.parse(content);

      // Read local deleted IDs
      const deletedDbPath = path.join(process.cwd(), 'data', 'deleted_videos.json');
      let deletedIds = [];
      try {
        if (fs.existsSync(deletedDbPath)) {
          deletedIds = JSON.parse(fs.readFileSync(deletedDbPath, 'utf-8'));
        }
      } catch (e) {
        console.error('Error reading local deleted videos db:', e);
      }

      let addedCount = 0;
      for (const nv of newVideos) {
        const isDuplicate = videos.some(v => v.source_video_id === nv.source_video_id);
        const isDeleted = deletedIds.includes(nv.source_video_id);

        if (!isDuplicate && !isDeleted) {
          videos.push({
            id: nv.id || `v-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            ...nv
          });
          addedCount++;
        }
      }
      if (addedCount > 0) {
        fs.writeFileSync(dbFilePath, JSON.stringify(videos, null, 2), 'utf-8');
      }
      return addedCount;
    } catch (e) {
      console.error('Error adding videos to local JSON db:', e);
      return 0;
    }
  }
}

const tournamentsFilePath = path.join(process.cwd(), 'data', 'tournaments.json');

const defaultTournaments = [
  '남양주시장기 리그',
  '백호기 전국대회',
  'U13 주말리그',
  '꿈나무 리그',
  'U15 전국선수권대회',
  '친선경기'
];

function initLocalTournaments() {
  if (isSupabaseConfigured) return;
  const dir = path.dirname(tournamentsFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(tournamentsFilePath)) {
    fs.writeFileSync(tournamentsFilePath, JSON.stringify(defaultTournaments, null, 2), 'utf-8');
  }
}

export async function getTournaments() {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('name')
        .order('name', { ascending: true });
      if (error) {
        console.error('Error fetching tournaments from Supabase:', error);
        return defaultTournaments;
      }
      return data.map(item => item.name);
    } catch (e) {
      console.error('Error communicating with Supabase for tournaments:', e);
      return defaultTournaments;
    }
  } else {
    try {
      initLocalTournaments();
      if (!fs.existsSync(tournamentsFilePath)) {
        return defaultTournaments;
      }
      const content = fs.readFileSync(tournamentsFilePath, 'utf-8');
      return JSON.parse(content);
    } catch (e) {
      console.error('Error reading local tournaments:', e);
      return defaultTournaments;
    }
  }
}

export async function addTournament(name) {
  if (!name || !name.trim()) return false;
  const trimmedName = name.trim();

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .insert([{ name: trimmedName }])
        .select();
      if (error) {
        console.error('Error adding tournament to Supabase:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Error communicating with Supabase to add tournament:', e);
      return false;
    }
  } else {
    try {
      initLocalTournaments();
      const content = fs.readFileSync(tournamentsFilePath, 'utf-8');
      const list = JSON.parse(content);
      if (!list.includes(trimmedName)) {
        list.push(trimmedName);
        fs.writeFileSync(tournamentsFilePath, JSON.stringify(list, null, 2), 'utf-8');
        return true;
      }
      return false;
    } catch (e) {
      console.error('Error adding local tournament:', e);
      return false;
    }
  }
}

export async function deleteTournament(name) {
  if (!name) return false;
  const trimmedName = name.trim();

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('name', trimmedName);
      if (error) {
        console.error('Error deleting tournament from Supabase:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Error communicating with Supabase to delete tournament:', e);
      return false;
    }
  } else {
    try {
      initLocalTournaments();
      const content = fs.readFileSync(tournamentsFilePath, 'utf-8');
      const list = JSON.parse(content);
      const filtered = list.filter(t => t !== trimmedName);
      if (filtered.length !== list.length) {
        fs.writeFileSync(tournamentsFilePath, JSON.stringify(filtered, null, 2), 'utf-8');
        return true;
      }
      return false;
    } catch (e) {
      console.error('Error deleting local tournament:', e);
      return false;
    }
  }
}

export async function logVisit() {
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from('visitor_log')
        .insert([{}]);
      if (error) {
        console.error('Error logging visit in Supabase:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Error communicating with Supabase during visit log:', e);
      return false;
    }
  } else {
    try {
      const visitorLogFilePath = path.join(process.cwd(), 'data', 'visitor_log.json');
      const dir = path.dirname(visitorLogFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      let logs = [];
      if (fs.existsSync(visitorLogFilePath)) {
        const content = fs.readFileSync(visitorLogFilePath, 'utf-8');
        try {
          logs = JSON.parse(content);
        } catch (pe) {
          logs = [];
        }
      }
      logs.push(new Date().toISOString());
      fs.writeFileSync(visitorLogFilePath, JSON.stringify(logs, null, 2), 'utf-8');
      return true;
    } catch (e) {
      console.error('Error logging local visit:', e);
      return false;
    }
  }
}

export async function getVisitorStats() {
  const stats = {
    daily: [],
    weekly: [],
    monthly: []
  };

  try {
    let logs = [];
    const oneYearAgo = new Date(Date.now() - 370 * 24 * 60 * 60 * 1000).toISOString();

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('visitor_log')
        .select('created_at')
        .gte('created_at', oneYearAgo);
      
      if (error) {
        console.error('Error fetching visitor stats from Supabase:', error);
        stats.error = error.message;
        return stats;
      }
      logs = (data || []).map(item => item.created_at);
    } else {
      const visitorLogFilePath = path.join(process.cwd(), 'data', 'visitor_log.json');
      if (fs.existsSync(visitorLogFilePath)) {
        const content = fs.readFileSync(visitorLogFilePath, 'utf-8');
        try {
          const rawLogs = JSON.parse(content);
          logs = rawLogs.filter(logTime => logTime >= oneYearAgo);
        } catch (pe) {
          logs = [];
        }
      }
    }

    // Helper functions for KST grouping
    function getKstDateParts(dateOrStr) {
      const date = new Date(dateOrStr);
      const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
      const iso = kst.toISOString();
      const ymd = iso.split('T')[0];
      const ym = ymd.substring(0, 7);
      return { ymd, ym, kst };
    }

    function getMondayOfKst(kstDate) {
      const d = new Date(kstDate.getTime());
      const day = d.getUTCDay();
      const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
      d.setUTCDate(diff);
      return d.toISOString().split('T')[0];
    }

    // 1. Generate map keys with 0 count
    const todayKst = new Date(Date.now() + 9 * 60 * 60 * 1000);
    
    // Daily (last 30 days)
    const dailyMap = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(todayKst.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      dailyMap[dateStr] = 0;
    }

    // Weekly (last 12 weeks)
    const weeklyMap = {};
    const currentMondayStr = getMondayOfKst(todayKst);
    const currentMondayDate = new Date(currentMondayStr + 'T12:00:00.000Z');
    for (let i = 11; i >= 0; i--) {
      const d = new Date(currentMondayDate.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      weeklyMap[dateStr] = 0;
    }

    // Monthly (last 12 months)
    const monthlyMap = {};
    const currentYear = todayKst.getUTCFullYear();
    const currentMonth = todayKst.getUTCMonth();
    for (let i = 11; i >= 0; i--) {
      let y = currentYear;
      let m = currentMonth - i;
      if (m < 0) {
        y -= 1;
        m += 12;
      }
      const monthStr = `${y}-${String(m + 1).padStart(2, '0')}`;
      monthlyMap[monthStr] = 0;
    }

    // 2. Count logs
    logs.forEach(logTime => {
      try {
        const { ymd, ym, kst } = getKstDateParts(logTime);
        
        if (dailyMap[ymd] !== undefined) {
          dailyMap[ymd]++;
        }
        
        const monday = getMondayOfKst(kst);
        if (weeklyMap[monday] !== undefined) {
          weeklyMap[monday]++;
        }
        
        if (monthlyMap[ym] !== undefined) {
          monthlyMap[ym]++;
        }
      } catch (e) {
        console.error('Error parsing log entry:', logTime, e);
      }
    });

    // 3. Convert to arrays sorted by date
    stats.daily = Object.keys(dailyMap).sort().map(date => ({ date, count: dailyMap[date] }));
    stats.weekly = Object.keys(weeklyMap).sort().map(date => ({ date, count: weeklyMap[date] }));
    stats.monthly = Object.keys(monthlyMap).sort().map(date => ({ date, count: monthlyMap[date] }));

  } catch (e) {
    console.error('Error computing visitor stats:', e);
    stats.error = e.message;
  }

  return stats;
}


