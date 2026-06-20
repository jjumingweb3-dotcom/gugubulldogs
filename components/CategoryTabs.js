import React from 'react';

export default function CategoryTabs({ activeTab, onTabChange, videoCounts }) {
  const tabs = [
    { id: '전체', label: '전체' },
    { id: '새싹부', label: '새싹부' },
    { id: '꿈나무부', label: '꿈나무부' },
    { id: '유소년부', label: '유소년부' },
  ];

  return (
    <div className="w-full overflow-x-auto no-scrollbar py-1">
      <div className="flex gap-2 min-w-max p-1 bg-white/5 border border-white/5 rounded-2xl backdrop-blur-md">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = videoCounts[tab.id] || 0;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative px-5 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all duration-300 ${
                isActive
                  ? 'bg-primary text-dark-bg shadow-[0_4px_16px_rgba(197,255,26,0.25)]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span>{tab.label}</span>
                <span 
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                    isActive 
                      ? 'bg-dark-bg/10 text-dark-bg' 
                      : 'bg-white/10 text-gray-400'
                  }`}
                >
                  {count}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
