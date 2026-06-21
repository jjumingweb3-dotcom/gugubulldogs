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
      const strictlyNewVideos = newVideos.filter(v => !existingIds.has(v.source_video_id));
      
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
      let addedCount = 0;
      
      for (const nv of newVideos) {
        // Check duplicate
        if (!videos.some(v => v.source_video_id === nv.source_video_id)) {
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

