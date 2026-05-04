import React from 'react';
import { ContentItem } from '../types';
import { Play } from 'lucide-react';
import { motion } from 'motion/react';

interface ContentCardProps {
  item: ContentItem;
  onClick: (item: ContentItem) => void;
}

export const ContentCard: React.FC<ContentCardProps> = ({ item, onClick }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -4 }}
      whileTap={{ scale: 0.98 }}
      className="group flex flex-col gap-3 cursor-pointer"
      onClick={() => onClick(item)}
    >
      <div className="relative aspect-[2/3] rounded-2xl overflow-hidden bg-surface border border-white/5 shadow-xl transition-all group-hover:border-white/20 group-hover:shadow-brand/20">
        <img
          src={item.poster}
          alt={item.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
          <div className="w-12 h-12 bg-brand rounded-full flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform duration-300">
             <Play size={20} fill="currentColor" className="text-white ml-1" />
          </div>
        </div>
        
        {item.type === 'live' && (
          <div className="absolute top-3 left-3 bg-brand text-[8px] font-black px-2 py-1 rounded-sm text-white tracking-[0.2em] flex items-center gap-1.5 shadow-2xl border border-white/10 uppercase">
             <span className="w-1 h-1 bg-white rounded-full animate-pulse" /> Live
          </div>
        )}
      </div>
      <div className="px-1">
        <h3 className="text-sm font-semibold tracking-tight text-white group-hover:text-brand transition-colors line-clamp-1">{item.title}</h3>
        <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mt-1">
          {item.type === 'movie' ? 'Película' : item.type === 'series' ? 'Serie' : item.category}
        </p>
      </div>
    </motion.div>
  );
};
