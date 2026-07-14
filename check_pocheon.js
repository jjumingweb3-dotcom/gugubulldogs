const fs = require('fs');
const path = require('path');

const envLocalPath = path.join(process.cwd(), '.env.local');
const envPath = path.join(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
  require('dotenv').config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Supabase env not configured.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

supabase.from('videos').select('*').or('title.ilike.%포천시%,title.ilike.%고성금강%')
  .then(({ data, error }) => {
    if (error) {
      console.error('Error:', error);
    } else {
      console.log('Matches found:', data.length);
      data.forEach(v => {
        console.log(`ID: ${v.id}\nTitle: ${v.title}\nPublished At (DB): ${v.published_at}\nTournament: ${v.tournament}\nOpponent: ${v.opponent}\n`);
      });
    }
  });
