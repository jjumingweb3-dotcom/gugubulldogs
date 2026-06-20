import { getVideos } from '@/lib/db';
import PlaybookContainer from '@/components/PlaybookContainer';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // Fetch videos from local JSON / Supabase (runs on server)
  const videos = await getVideos();

  return (
    <div className="min-h-screen flex flex-col bg-dark-bg">
      <PlaybookContainer initialVideos={videos} />
    </div>
  );
}
