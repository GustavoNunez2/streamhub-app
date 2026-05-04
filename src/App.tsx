/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { ContentCard } from './components/ContentCard';
import { VideoPlayer } from './components/VideoPlayer';
import { ContentItem, PlaybackState, Episode } from './types';
import { Search, X, ChevronRight, ChevronLeft, Volume2, Globe, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- CONSTANTS ---
const TMDB_KEY = '52af2cbc87520bad5c7dba6977c33866';
const TMDB_AUTH = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI1MmFmMmNiYzg3NTIwYmFkNWM3ZGJhNjk3N2MzMzg2NiIsIm5iZiI6MTc3NzkxNzM4Mi4wNCwic3ViIjoiNjlmOGRkYzY2YWQ1ZTA5OTQ1OWRkZDM5Iiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9.wH9oxS6VAXfii5MdZRutZvEsP6OXQabLMFRjVk5NJQw';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IPTV_URL = 'https://iptv-org.github.io/api/streams.json';
const CHANNELS_URL = 'https://iptv-org.github.io/api/channels.json';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [trending, setTrending] = useState<ContentItem[]>([]);
  const [searchResults, setSearchResults] = useState<ContentItem[]>([]);
  const [liveChannels, setLiveChannels] = useState<ContentItem[]>([]);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [playingEpisode, setPlayingEpisode] = useState<{ season: number; number: number } | null>(null);
  const [showEpisodeSelector, setShowEpisodeSelector] = useState(false);
  const [continueWatching, setContinueWatching] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch Trending and Live Channels on mount
  useEffect(() => {
    fetchTrending();
    fetchLiveChannels();
    
    const saved = localStorage.getItem('streamhub_history_v2');
    if (saved) setContinueWatching(JSON.parse(saved));
  }, []);

  // Fetch Trending from TMDB
  const fetchTrending = async () => {
    try {
      const res = await fetch(`${TMDB_BASE_URL}/trending/all/week?api_key=${TMDB_KEY}`);
      const data = await res.json();
      const mapped = data.results.map((item: any) => ({
        id: item.id.toString(),
        tmdbId: item.id.toString(),
        title: item.title || item.name,
        type: item.media_type === 'tv' ? 'series' : 'movie',
        poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'https://images.unsplash.com/photo-1594908900066-3f47337549d8?q=80&w=2070&auto=format&fit=crop',
        description: item.overview,
        category: item.media_type === 'tv' ? 'Serie' : 'Película',
        year: new Date(item.release_date || item.first_air_date).getFullYear(),
        streamUrl: '',
      }));
      setTrending(mapped);
    } catch (err) {
      console.error('Error fetching trending:', err);
    }
  };

  // Fetch Live TV from IPTV-org
  const fetchLiveChannels = async () => {
    setIsLoading(true);
    try {
      const [streamsRes, channelsRes] = await Promise.all([
        fetch(IPTV_URL),
        fetch(CHANNELS_URL)
      ]);
      const streams = await streamsRes.json();
      const channels = await channelsRes.json();

      const onlineStreams = streams.filter((s: any) => s.status === 'online');
      const channelMap = new Map();
      channels.forEach((c: any) => channelMap.set(c.id, c));

      const mapped: ContentItem[] = onlineStreams
        .map((s: any) => {
          const chan = channelMap.get(s.channel);
          if (!chan) return null;
          
          const isAr = chan.country === 'ar' || chan.languages?.includes('spa');
          const hasCategory = chan.categories?.length > 0;
          
          if (isAr || hasCategory) {
            return {
              id: s.url,
              title: chan.name || s.channel.replace(/-/g, ' '),
              type: 'live',
              poster: chan.logo || 'https://images.unsplash.com/photo-1594908900066-3f47337549d8?q=80&w=2070&auto=format&fit=crop',
              description: `En vivo: ${chan.name || s.channel}`,
              category: isAr ? 'Argentina / Latam' : (chan.categories?.[0] || 'Varios'),
              streamUrl: s.url
            };
          }
          return null;
        })
        .filter((i: any): i is ContentItem => i !== null)
        .slice(0, 200);

      setLiveChannels(mapped);
    } catch (err) {
      console.error('Error fetching live channels:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.length < 2) return;
    try {
      const res = await fetch(`${TMDB_BASE_URL}/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      const mapped = data.results.map((item: any) => ({
        id: item.id.toString(),
        tmdbId: item.id.toString(),
        title: item.title || item.name,
        type: item.media_type === 'tv' ? 'series' : 'movie',
        poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'https://images.unsplash.com/photo-1594908900066-3f47337549d8?q=80&w=2070&auto=format&fit=crop',
        description: item.overview,
        category: item.media_type === 'tv' ? 'Serie' : 'Película',
        streamUrl: '',
      })).filter((i: any) => i.poster);
      setSearchResults(mapped);
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(handleSearch, 600);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const savePlayback = (item: ContentItem) => {
    setContinueWatching(prev => {
      const updated = [item, ...prev.filter(i => i.id !== item.id)].slice(0, 15);
      localStorage.setItem('streamhub_history_v2', JSON.stringify(updated));
      return updated;
    });
  };

  const handlePlay = (item: ContentItem) => {
    if (item.type === 'series') {
      setSelectedContent(item);
      setShowEpisodeSelector(true);
    } else {
      setSelectedContent(item);
      setPlayingEpisode(null);
      setShowEpisodeSelector(false);
    }
    savePlayback(item);
  };

  const getEmbedUrl = () => {
    if (!selectedContent) return '';
    if (selectedContent.type === 'live') return selectedContent.streamUrl;
    if (selectedContent.type === 'movie') return `https://vidsrc.me/embed/movie/${selectedContent.tmdbId}`;
    if (selectedContent.type === 'series') {
      return `https://vidsrc.me/embed/tv/${selectedContent.tmdbId}/${playingEpisode?.season || 1}/${playingEpisode?.number || 1}`;
    }
    return '';
  };

  const handleLiveNav = (direction: 'next' | 'prev') => {
    if (!selectedContent || selectedContent.type !== 'live') return;
    const currentIndex = liveChannels.findIndex(c => c.id === selectedContent.id);
    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= liveChannels.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = liveChannels.length - 1;
    setSelectedContent(liveChannels[nextIndex]);
  };

  const displayItems = useMemo(() => {
    if (searchQuery.length > 2) return searchResults;
    if (activeTab === 'movies') return trending.filter(i => i.type === 'movie');
    if (activeTab === 'series') return trending.filter(i => i.type === 'series');
    if (activeTab === 'live') return liveChannels;
    return trending;
  }, [activeTab, searchQuery, trending, searchResults, liveChannels]);

  const liveCategories = useMemo(() => {
    const grouped: Record<string, ContentItem[]> = {};
    liveChannels.forEach(ch => {
      const cat = ch.category || 'Varios';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(ch);
    });
    return grouped;
  }, [liveChannels]);

  return (
    <div className="flex h-screen bg-background text-white font-sans overflow-hidden select-none">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col">
        {/* Atmosphere Gradients */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-brand/10 to-transparent blur-[120px] pointer-events-none" />
        
        {/* Header / Search */}
        <header className="h-24 px-10 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md bg-background/40">
          <div className="flex items-center bg-white/5 rounded-full px-5 py-2.5 w-[420px] border border-white/10 group focus-within:border-brand/40 focus-within:bg-white/10 transition-all">
            <Search className="text-white/20 group-focus-within:text-brand transition-colors mr-3" size={18} />
            <input
              type="text"
              placeholder={`🔍 Buscar en ${activeTab === 'home' ? 'todo' : activeTab === 'live' ? 'canales' : activeTab}...`}
              className="bg-transparent outline-none text-sm w-full placeholder:text-white/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-8 text-[11px] uppercase tracking-[0.2em] font-black opacity-60">
            <button className="text-brand opacity-100">Novedades</button>
            <button className="">Tendencias</button>
            <button className="">Mi Lista</button>
          </div>
        </header>

        <div className="flex-1 px-10 pb-12 flex flex-col gap-10">
          {activeTab === 'home' && searchQuery === '' && (
            <section className="relative h-[420px] rounded-[32px] overflow-hidden group shadow-2xl ring-1 ring-white/5">
              <img 
                src="https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=2070&auto=format&fit=crop" 
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                alt="Feature"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black via-black/20 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
              <div className="absolute bottom-10 left-10 max-w-xl">
                <div className="flex items-center gap-3 mb-4">
                  <span className="bg-brand text-[9px] font-black px-2.5 py-1 rounded-sm tracking-[0.1em] shadow-xl">TMDB TRENDING</span>
                  <span className="text-white/60 text-xs font-bold tracking-wide">MULTIMEDIA HUB • ULTRA HD</span>
                </div>
                <h1 className="text-7xl font-black mb-6 tracking-tighter leading-none">EXPLORA EL CINE</h1>
                <div className="flex items-center gap-4">
                  <button className="bg-white text-black px-8 py-3 rounded-full font-black text-sm flex items-center gap-3 hover:bg-brand hover:text-white transition-all shadow-xl">
                    <Play size={18} fill="currentColor" /> COMENZAR
                  </button>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'home' && continueWatching.length > 0 && searchQuery === '' && (
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-medium tracking-tight">Continuar Viendo</h2>
                <button 
                  onClick={() => { localStorage.removeItem('streamhub_history_v2'); setContinueWatching([]); }}
                  className="text-[10px] text-brand uppercase tracking-[0.2em] font-black hover:opacity-80 transition-opacity"
                >
                  Limpiar historial
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8">
                {continueWatching.map(item => (
                  <ContentCard key={item.id} item={item} onClick={handlePlay} />
                ))}
              </div>
            </section>
          )}

          {/* GRID RENDERER */}
          {activeTab !== 'live' ? (
            <section>
              <div className="flex items-center justify-between mb-6">
                 <h2 className="text-xl font-medium tracking-tight">
                  {searchQuery ? `Resultados para "${searchQuery}"` : activeTab === 'home' ? 'Tendencias de la semana' : activeTab === 'movies' ? 'Cine' : 'Series'}
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8">
                {displayItems.map(item => (
                  <ContentCard key={item.id} item={item} onClick={handlePlay} />
                ))}
              </div>
            </section>
          ) : (
            isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-brand/20 border-t-brand rounded-full animate-spin"></div>
              </div>
            ) : (
              (Object.entries(liveCategories) as [string, ContentItem[]][]).map(([cat, channels]) => (
                <section key={cat}>
                  <h2 className="text-xl font-medium mb-6 flex items-center gap-2">
                    <span className="w-1 h-5 bg-brand rounded-full" /> {cat}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8">
                    {channels.map(item => (
                      <ContentCard key={item.id} item={item} onClick={handlePlay} />
                    ))}
                  </div>
                </section>
              ))
            )
          )}
        </div>
      </main>

      {/* BOTTOM CONTROL BAR */}
      <div className="fixed bottom-0 left-0 right-0 h-14 bg-black/60 backdrop-blur-2xl border-t border-white/5 px-8 flex items-center justify-between z-30">
        <div className="flex items-center gap-4">
          <div className="w-10 h-6 bg-brand/20 rounded flex items-center justify-center border border-brand/30">
            <span className="text-[9px] font-black text-brand tracking-tighter">LIVE</span>
          </div>
          <span className="text-[11px] font-medium tracking-wide">
            {selectedContent ? `Viviendo: ${selectedContent.title}` : 'StreamHub Ready'}
          </span>
        </div>
        
        <div className="flex items-center gap-8 opacity-60">
           {selectedContent?.type === 'live' && (
             <>
               <button onClick={() => handleLiveNav('prev')} className="hover:text-brand transition-colors"><ChevronLeft size={20}/></button>
               <button onClick={() => handleLiveNav('next')} className="hover:text-brand transition-colors"><ChevronRight size={20}/></button>
             </>
           )}
           <span className="text-xs font-black tracking-[0.2em] hover:text-brand cursor-pointer">4K</span>
           <span className="text-xs font-black tracking-[0.2em] hover:text-brand cursor-pointer">AUDIO</span>
        </div>
      </div>

      {/* PLAYER MODAL */}
      <AnimatePresence>
        {selectedContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex flex-col"
          >
            {/* Episode Selector Overlay */}
            {showEpisodeSelector && (
              <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-3xl flex flex-col items-center justify-center p-12">
                <button 
                  onClick={() => { setSelectedContent(null); setShowEpisodeSelector(false); }}
                  className="absolute top-8 right-8 text-white/40 hover:text-white"
                >
                  <X size={32} />
                </button>
                <div className="max-w-4xl w-full">
                  <h2 className="text-4xl font-black mb-2 tracking-tighter">{selectedContent.title}</h2>
                  <p className="text-zinc-500 mb-12">Selecciona un episodio para comenzar</p>
                  
                  <div className="flex gap-4 mb-8">
                     <button className="px-6 py-2 bg-brand rounded-full text-xs font-bold uppercase tracking-widest">Temporada 1</button>
                     <button className="px-6 py-2 bg-white/5 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-white/10 opacity-40">T2</button>
                     <button className="px-6 py-2 bg-white/5 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-white/10 opacity-40">T3</button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(ep => (
                      <button
                        key={ep}
                        onClick={() => { setPlayingEpisode({ season: 1, number: ep }); setShowEpisodeSelector(false); }}
                        className="bg-white/5 border border-white/10 aspect-video rounded-xl flex items-center justify-center hover:bg-brand transition-all hover:scale-105 group"
                      >
                         <span className="text-xl font-black text-white/20 group-hover:text-white">EP {ep}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="absolute top-0 left-0 right-0 p-8 z-10 flex items-center justify-between pointer-events-none">
              <div className="pointer-events-auto">
                 <button 
                  onClick={() => { setSelectedContent(null); setPlayingEpisode(null); setShowEpisodeSelector(false); }}
                  className="w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center transition-all border border-white/5"
                 >
                   <ChevronLeft size={24} />
                 </button>
              </div>
              <div className="text-center pointer-events-auto bg-black/40 px-6 py-2 rounded-full backdrop-blur-md">
                <h3 className="text-lg font-bold">{selectedContent.title}</h3>
                {playingEpisode && <p className="text-sm text-zinc-400">Temporada {playingEpisode.season} - Capítulo {playingEpisode.number}</p>}
              </div>
              <div className="flex gap-4 pointer-events-auto">
                {selectedContent.type === 'series' && !showEpisodeSelector && (
                   <button 
                    onClick={() => setShowEpisodeSelector(true)}
                    className="bg-white/10 px-4 py-2 rounded-full backdrop-blur-xl border border-white/5 text-xs font-bold hover:bg-white/20"
                   >
                     Episodios
                   </button>
                )}
              </div>
            </div>

            <div className="flex-1 w-full bg-black">
              <VideoPlayer 
                embedUrl={getEmbedUrl()}
                title={selectedContent.title}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
