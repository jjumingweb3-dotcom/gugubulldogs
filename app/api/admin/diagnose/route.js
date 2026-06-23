import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { password } = await request.json();
    const adminPassword = process.env.ADMIN_PASSWORD || '1234';

    if (password !== adminPassword) {
      return NextResponse.json({ success: false, error: '인증에 실패했습니다.' }, { status: 401 });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const envInfo = {
      SUPABASE_URL: supabaseUrl ? `Present (length: ${supabaseUrl.length})` : 'Missing',
      SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? `Present (length: ${process.env.SUPABASE_SERVICE_KEY.length})` : 'Missing',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? `Present (length: ${process.env.SUPABASE_ANON_KEY.length})` : 'Missing',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? `Present (length: ${process.env.NEXT_PUBLIC_SUPABASE_URL.length})` : 'Missing',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? `Present (length: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length})` : 'Missing',
      isSupabaseConfigured: !!(supabaseUrl && supabaseKey)
    };

    if (!envInfo.isSupabaseConfigured) {
      return NextResponse.json({
        success: true,
        mode: 'local-file',
        message: 'Supabase is not configured. Running in Local File Mode.',
        envInfo
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const diagnostics = {
      envInfo,
      videosTable: null,
      tournamentsTable: null,
      writeTest: null
    };

    // Test videos table
    try {
      const { data, error } = await supabase.from('videos').select('*').limit(1);
      if (error) {
        diagnostics.videosTable = { success: false, error: error.message, code: error.code };
      } else {
        diagnostics.videosTable = { success: true, count: data.length };
      }
    } catch (e) {
      diagnostics.videosTable = { success: false, error: e.message };
    }

    // Test tournaments table
    try {
      const { data, error } = await supabase.from('tournaments').select('*').limit(1);
      if (error) {
        diagnostics.tournamentsTable = { success: false, error: error.message, code: error.code };
      } else {
        diagnostics.tournamentsTable = { success: true, count: data.length, data };
      }
    } catch (e) {
      diagnostics.tournamentsTable = { success: false, error: e.message };
    }

    // Test deleted_videos table
    try {
      const { data, error } = await supabase.from('deleted_videos').select('*').limit(1);
      if (error) {
        diagnostics.deletedVideosTable = { success: false, error: error.message, code: error.code };
      } else {
        diagnostics.deletedVideosTable = { success: true, count: data.length };
      }
    } catch (e) {
      diagnostics.deletedVideosTable = { success: false, error: e.message };
    }

    // Test inserting to tournaments table
    if (diagnostics.tournamentsTable && diagnostics.tournamentsTable.success) {
      try {
        const testName = `__test_tourn_${Date.now()}`;
        const { data: insData, error: insError } = await supabase
          .from('tournaments')
          .insert([{ name: testName }])
          .select();

        if (insError) {
          diagnostics.writeTest = { success: false, phase: 'insert', error: insError.message, code: insError.code };
        } else {
          // Delete test tournament
          const { error: delError } = await supabase
            .from('tournaments')
            .delete()
            .eq('name', testName);

          if (delError) {
            diagnostics.writeTest = { success: true, phase: 'delete-failed', inserted: insData, error: delError.message, code: delError.code };
          } else {
            diagnostics.writeTest = { success: true, phase: 'complete' };
          }
        }
      } catch (e) {
        diagnostics.writeTest = { success: false, error: e.message };
      }
    }

    return NextResponse.json({
      success: true,
      mode: 'supabase',
      diagnostics
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
