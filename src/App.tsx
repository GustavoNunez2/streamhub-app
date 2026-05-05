/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { ContentCard } from './components/ContentCard';
import { VideoPlayer } from './components/VideoPlayer';
import { ContentItem, Episode } from './types';
import { Search, X, ChevronRight, ChevronLeft, Play, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// --- CONSTANTS ---
const TMDB_KEY = '52af2cbc87520bad5c7dba6977c33866';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IPTV_URL = 'https://iptv-org.github.io/api/streams.json';
const CHANNELS_URL = 'https://iptv-org.github.io/api/channels.json';

// Componente inteligente para manejar logos rotos sin violar CSP
const ChannelLogo = ({ poster, title }: { poster: string, title: string }) => {
  const [hasError, setHasError] = useState(false);

  // Si no hay poster o la imagen tiró error, renderizamos HTML puro
  if (!poster || hasError) {
    return (
      <div className="w-full h-full flex items-center justify-center px-1">
        <span className="text-[10px] font-black text-white/30 uppercase text-center leading-none tracking-widest break-words line-clamp-2">
          {title.substring(0, 12)}
        </span>
      </div>
    );
  }

  // Si todo está bien, intentamos cargar la imagen
  return (
    <img
      src={poster}
      alt={title}
      className="max-w-full max-h-full object-contain drop-shadow-lg"
      onError={() => setHasError(true)}
    />
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos'); // <--- NUEVO: Estado para categorías

  const [trending, setTrending] = useState<ContentItem[]>([]);
  const [searchResults, setSearchResults] = useState<ContentItem[]>([]);
  const [liveChannels, setLiveChannels] = useState<ContentItem[]>([]);

  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [playingEpisode, setPlayingEpisode] = useState<{ season: number; number: number } | null>(null);
  const [showEpisodeSelector, setShowEpisodeSelector] = useState(false);
  const [totalSeasons, setTotalSeasons] = useState(1);
  const [continueWatching, setContinueWatching] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [favorites, setFavorites] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem('streamhub_favs') || '[]')
  );

  useEffect(() => {
    fetchTrending();
    fetchLiveChannels();
    const saved = localStorage.getItem('streamhub_history_v2');
    if (saved) setContinueWatching(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (selectedContent?.type === 'series' && selectedContent.tmdbId) {
      fetchEpisodes(selectedContent.tmdbId, selectedSeason);
    }
  }, [selectedContent, selectedSeason]);

  useEffect(() => {
    if (selectedContent?.type === 'series' && selectedContent.tmdbId) {
      fetch(`${TMDB_BASE_URL}/tv/${selectedContent.tmdbId}?api_key=${TMDB_KEY}&language=es-MX`)
        .then(res => res.json())
        .then(data => {
          if (data.number_of_seasons) setTotalSeasons(data.number_of_seasons);
        })
        .catch(err => console.error('Error al obtener detalles de la serie:', err));
    }
  }, [selectedContent]);

  const fetchEpisodes = async (tmdbId: string, season: number) => {
    setEpisodes([]);
    try {
      const res = await fetch(`${TMDB_BASE_URL}/tv/${tmdbId}/season/${season}?api_key=${TMDB_KEY}&language=es-MX`);
      const data = await res.json();
      if (data.episodes) setEpisodes(data.episodes);
    } catch (err) {
      console.error('Error fetching episodes:', err);
      setEpisodes([]);
    }
  };

  const fetchTrending = async () => {
    try {
      const res = await fetch(`${TMDB_BASE_URL}/trending/all/week?api_key=${TMDB_KEY}&language=es-MX`);
      const data = await res.json();
      const mapped = data.results.map((item: any) => ({
        id: item.id.toString(),
        tmdbId: item.id.toString(),
        title: item.title || item.name,
        type: item.media_type === 'tv' ? 'series' : 'movie',
        poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'https://images.unsplash.com/photo-1594908900066-3f47337549d8?q=80&w=2070&auto=format&fit=crop',
        description: item.overview,
        category: item.media_type === 'tv' ? 'Serie' : 'Película',
        year: (item.release_date || item.first_air_date) ? parseInt((item.release_date || item.first_air_date).split('-')[0]) : 0,
        streamUrl: '',
      }));
      setTrending(mapped);
    } catch (err) {
      console.error('Error fetching trending:', err);
    }
  };

  const fetchLiveChannels = async () => {
    setIsLoading(true);
    try {
      const [streamsRes, channelsRes] = await Promise.all([
        fetch(IPTV_URL),
        fetch(CHANNELS_URL)
      ]);

      const streams = await streamsRes.json();
      const channels = await channelsRes.json();

      const channelMap = new Map();
      if (Array.isArray(channels)) {
        channels.forEach((c: any) => channelMap.set(c.id, c));
      }

      const mapped: ContentItem[] = streams
        .map((s: any) => {
          const chan = channelMap.get(s.channel);
          if (!chan) return null;

          let categoryName = 'Variados';
          if (Array.isArray(chan.categories) && chan.categories.length > 0) {
            const rawCat = chan.categories[0];
            const catString = typeof rawCat === 'string' ? rawCat : rawCat.name;
            if (catString) {
              categoryName = catString.charAt(0).toUpperCase() + catString.slice(1);
            }
          }

          return {
            id: s.url,
            title: chan.name || s.channel.replace(/-/g, ' '),
            type: 'live',
            poster: chan.logo || '', // Se manejará el error en el onError del img
            description: `Categoría: ${categoryName}`,
            category: categoryName,
            streamUrl: s.url
          };
        })
        .filter((i: any): i is ContentItem => i !== null)
        .slice(0, 1500);

      setLiveChannels(mapped);
    } catch (err) {
      console.error('🔴 Error cargando canales:', err);
      setLiveChannels([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    // Si estamos en VIVO, no buscamos en TMDB
    if (activeTab === 'live' || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const res = await fetch(`${TMDB_BASE_URL}/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(searchQuery)}&language=es-MX`);
      const data = await res.json();
      const mapped = data.results.map((item: any) => ({
        id: item.id.toString(),
        tmdbId: item.id.toString(),
        title: item.title || item.name,
        type: item.media_type === 'tv' ? 'series' : 'movie',
        poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'https://images.unsplash.com/photo-1594908900066-3f47337549d8?q=80&w=2070&auto=format&fit=crop',
        description: item.overview,
        category: item.media_type === 'tv' ? 'Serie' : 'Película',
        year: (item.release_date || item.first_air_date) ? parseInt((item.release_date || item.first_air_date).split('-')[0]) : 0,
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
  }, [searchQuery, activeTab]);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const newFavs = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id];
      localStorage.setItem('streamhub_favs', JSON.stringify(newFavs));
      return newFavs;
    });
  };

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
      setSelectedSeason(1);
      setTotalSeasons(1);
      setShowEpisodeSelector(true);
    } else {
      setSelectedContent(item);
      setEpisodes([]);
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
    // Buscamos el canal actual dentro de LOS QUE SE ESTÁN MOSTRANDO (para respetar filtros)
    const currentList = displayLiveChannels;
    const currentIndex = currentList.findIndex(c => c.id === selectedContent.id);
    if (currentIndex === -1) return;

    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= currentList.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = currentList.length - 1;

    setSelectedContent(currentList[nextIndex]);
  };

  // --- LÓGICA DE FILTRADO PARA TV EN VIVO ---
  const displayLiveChannels = useMemo(() => {
    let filtered = liveChannels;

    // 1. Filtrar por búsqueda
    if (searchQuery) {
      filtered = filtered.filter(c =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // 2. Filtrar por categoría seleccionada
    if (selectedCategory !== 'Todos') {
      filtered = filtered.filter(c => c.category === selectedCategory);
    }

    return filtered;
  }, [liveChannels, searchQuery, selectedCategory]);

  const liveCategories = useMemo(() => {
    const grouped: Record<string, ContentItem[]> = {};
    displayLiveChannels.forEach(ch => {
      const cat = ch.category || 'Variados';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(ch);
    });
    return grouped;
  }, [displayLiveChannels]);

  // Lista de categorías únicas para renderizar los botones
  const availableCategories = useMemo(() => {
    const cats = new Set(liveChannels.map(c => c.category || 'Variados'));
    return ['Todos', ...Array.from(cats).sort()];
  }, [liveChannels]);

  const displayItems = useMemo(() => {
    if (activeTab === 'live') return displayLiveChannels;
    if (searchQuery.length > 2) return searchResults;
    if (activeTab === 'movies') return trending.filter(i => i.type === 'movie');
    if (activeTab === 'series') return trending.filter(i => i.type === 'series');
    return trending;
  }, [activeTab, searchQuery, trending, searchResults, displayLiveChannels]);

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

          {/* RENDERIZADO CONDICIONAL (CINE/SERIES VS LIVE) */}
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
              <div className="max-w-4xl mx-auto w-full">

                {/* BARRA DE CATEGORÍAS */}
                <div className="flex gap-3 overflow-x-auto custom-scrollbar mb-8 pb-4">
                  {availableCategories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        "px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border border-white/5",
                        selectedCategory === cat
                          ? "bg-brand text-white shadow-lg shadow-brand/20 border-brand/50"
                          : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {(Object.entries(liveCategories) as [string, ContentItem[]][]).map(([cat, channels]) => (
                  <section key={cat} className="mb-10">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-4 px-2 flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand"></span> {cat}
                    </h2>
                    <div className="flex flex-col gap-1.5">
                      {channels.map(item => {
                        const isFav = favorites.includes(item.id);
                        return (
                          <div
                            key={item.id}
                            onClick={() => handlePlay(item)}
                            className="flex items-center justify-between p-3.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group border border-transparent hover:border-white/5"
                          >
                            <div className="flex items-center gap-5">
                              {/* LOGO MEJORADO CON COMPONENTE REACT */}
                              <div className="w-[72px] h-[52px] bg-black/40 rounded-lg p-1 flex items-center justify-center border border-white/5 group-hover:border-white/20 transition-colors shrink-0 shadow-inner overflow-hidden">
                                <ChannelLogo poster={item.poster} title={item.title} />
                              </div>
                              <div>
                                <h3 className="font-bold text-base line-clamp-1">{item.title}</h3>
                                <p className="text-xs text-brand font-medium mt-0.5">{item.category}</p>
                              </div>
                            </div>

                            <button
                              onClick={(e) => toggleFavorite(item.id, e)}
                              className={cn(
                                "p-3 rounded-full transition-all",
                                isFav ? "text-brand opacity-100 drop-shadow-[0_0_8px_rgba(255,78,0,0.5)]" : "text-white/20 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100"
                              )}
                            >
                              <Heart size={20} fill={isFav ? 'currentColor' : 'none'} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )
          )}
        </div>
      </main>

      {/* PLAYER MODAL */}
      <AnimatePresence>
        {selectedContent && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black flex flex-col"
          >
            {/* Overlay Selector de Episodios */}
            {showEpisodeSelector && (
              // ... Tu código de selección de episodios intacto ...
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

                  <div className="flex flex-wrap gap-4 mb-8 max-h-32 overflow-y-auto custom-scrollbar">
                    {selectedContent.type === 'series' &&
                      Array.from({ length: totalSeasons }, (_, i) => i + 1).map(s => (
                        <button
                          key={s}
                          onClick={() => setSelectedSeason(s)}
                          className={cn(
                            "px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all",
                            selectedSeason === s
                              ? 'bg-brand text-white shadow-lg shadow-brand/20'
                              : 'bg-white/5 text-white/60 hover:bg-white/10 opacity-40'
                          )}
                        >
                          Temporada {s}
                        </button>
                      ))}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {episodes.length > 0 ? (
                      episodes.map((ep: any) => (
                        <button
                          key={ep.id}
                          onClick={() => { setPlayingEpisode({ season: selectedSeason, number: ep.episode_number }); setShowEpisodeSelector(false); }}
                          className="bg-white/5 border border-white/10 aspect-video rounded-xl flex items-center justify-center hover:bg-brand transition-all hover:scale-105 group"
                        >
                          <span className="text-xl font-black text-white/20 group-hover:text-white">EP {ep.episode_number}</span>
                        </button>
                      ))
                    ) : (
                      <div className="col-span-full py-20 text-center text-white/20 font-bold uppercase tracking-widest">
                        Cargando episodios...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* BARRA SUPERIOR DEL REPRODUCTOR (Aquí metimos el Next/Prev) */}
            <div className="absolute top-0 left-0 right-0 p-8 z-10 flex items-center justify-between pointer-events-none bg-gradient-to-b from-black/80 to-transparent">
              <div className="pointer-events-auto">
                <button
                  onClick={() => { setSelectedContent(null); setPlayingEpisode(null); setShowEpisodeSelector(false); }}
                  className="w-12 h-12 bg-white/10 hover:bg-brand backdrop-blur-xl rounded-full flex items-center justify-center transition-all border border-white/5 shadow-xl group"
                >
                  <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                </button>
              </div>

              {/* Información y controles del Canal */}
              <div className="text-center pointer-events-auto bg-black/60 px-8 py-3 rounded-full backdrop-blur-xl border border-white/10 shadow-2xl flex items-center gap-6">
                <div>
                  <h3 className="text-lg font-bold">{selectedContent.title}</h3>
                  {playingEpisode && <p className="text-sm text-zinc-400">Temporada {playingEpisode.season} - Capítulo {playingEpisode.number}</p>}
                </div>

                {/* BOTONES NEXT/PREV (Solo visibles en modo Live) */}
                {selectedContent.type === 'live' && (
                  <div className="flex items-center gap-2 border-l border-white/20 pl-6 ml-2">
                    <button onClick={() => handleLiveNav('prev')} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                      <ChevronLeft size={24} />
                    </button>
                    <button onClick={() => handleLiveNav('next')} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                      <ChevronRight size={24} />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-4 pointer-events-auto">
                {selectedContent.type === 'series' && !showEpisodeSelector && (
                  <button
                    onClick={() => setShowEpisodeSelector(true)}
                    className="bg-white/10 px-6 py-3 rounded-full backdrop-blur-xl border border-white/5 text-sm font-bold hover:bg-brand transition-colors shadow-xl"
                  >
                    Elegir Episodio
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