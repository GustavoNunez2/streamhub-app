export interface ContentItem {
  id: string; // Internal or TMDB ID
  tmdbId?: string;
  title: string;
  type: 'movie' | 'series' | 'live';
  poster: string;
  backdrop?: string;
  description: string;
  category: string;
  year?: number;
  duration?: string;
  rating?: string;
  episodes?: Episode[];
  streamUrl: string;
  country?: string;
  isSpanish?: boolean;
}

export interface Episode {
  id: string;
  title: string;
  season: number;
  number: number;
  duration: string;
  streamUrl: string;
}

export interface Track {
  label: string;
  kind: string;
  src: string;
  srclang?: string;
}

export interface PlaybackState {
  contentId: string;
  episodeId?: string;
  currentTime: number;
  completed: boolean;
}
