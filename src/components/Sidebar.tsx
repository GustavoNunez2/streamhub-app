import React from 'react';
import { Home, Film, Tv, PlayCircle, Settings, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'home', icon: Home, label: 'Inicio' },
    { id: 'movies', icon: Film, label: 'Cine' },
    { id: 'series', icon: Tv, label: 'Series' },
    { id: 'live', icon: PlayCircle, label: 'En Vivo' },
  ];

  return (
    <nav className="w-20 md:w-24 h-screen bg-surface flex flex-col items-center py-8 gap-10 border-r border-white/5 transition-all duration-300">
      <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(255,78,0,0.3)]">
        <PlayCircle className="text-white" size={24} fill="currentColor" />
      </div>

      <div className="flex flex-col gap-8 flex-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 group transition-all duration-300",
              activeTab === item.id 
                ? "text-brand opacity-100" 
                : "text-white opacity-40 hover:opacity-80"
            )}
          >
            <item.icon 
              size={24} 
              className={cn(
                "transition-transform group-hover:scale-110",
                activeTab === item.id && "stroke-[2.5px]"
              )} 
            />
            <span className="text-[10px] uppercase tracking-[0.1em] font-bold">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-6 opacity-40">
        <button className="hover:text-white transition-colors">
          <Settings size={22} strokeWidth={1.5} />
        </button>
        <div className="w-8 h-8 border border-white rounded-full flex items-center justify-center text-[10px] font-black tracking-tighter">
          JD
        </div>
      </div>
    </nav>
  );
};
