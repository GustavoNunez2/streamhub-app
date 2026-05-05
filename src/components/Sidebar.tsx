import React from 'react';
import { Home, Film, Tv, PlayCircle, type LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

interface MenuItem {
  id: string;
  icon: LucideIcon;
  label: string;
}

const menuItems: MenuItem[] = [
  { id: 'home', icon: Home, label: 'Inicio' },
  { id: 'movies', icon: Film, label: 'Cine' },
  { id: 'series', icon: Tv, label: 'Series' },
  { id: 'live', icon: PlayCircle, label: 'En Vivo' },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  return (
    <nav className="w-20 md:w-24 h-screen bg-[#0A0A0A] flex flex-col items-center py-8 gap-10 border-r border-white/5 transition-all duration-300">
      <div className="w-10 h-10 bg-[#FF4E00] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(255,78,0,0.3)]">
        <PlayCircle className="text-white" size={24} fill="currentColor" />
      </div>

      <div className="flex flex-col gap-8 flex-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex flex-col items-center gap-1 group transition-all duration-300",
                isActive 
                  ? "text-[#FF4E00] opacity-100" 
                  : "text-white opacity-40 hover:opacity-80"
              )}
            >
              <Icon 
                size={24} 
                className={cn(
                  "transition-transform group-hover:scale-110",
                  isActive && "stroke-[2.5px]"
                )} 
              />
              <span className="text-[10px] uppercase tracking-[0.1em] font-bold">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto flex flex-col gap-6 opacity-40">
        <div className="w-8 h-8 border border-white rounded-full flex items-center justify-center text-[10px] font-black tracking-tighter">
          GN
        </div>
      </div>
    </nav>
  );
};