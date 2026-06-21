import { getVideos, getTournaments } from '@/lib/db';
import PlaybookContainer from '@/components/PlaybookContainer';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // Fetch videos and tournaments from local JSON / Supabase (runs on server)
  const [videos, tournaments] = await Promise.all([
    getVideos(),
    getTournaments()
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-dark-bg">
      <PlaybookContainer initialVideos={videos} initialTournaments={tournaments} />
    </div>
  );
}
