import React, { useState, useEffect } from 'react';
import { Sun, Moon, Palette } from 'lucide-react';

const ThemeSwitcher = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('theme') || 'default';
  });

  const themes = [
    { name: 'default', color: '#0084ff', label: 'Default', icon: <Palette /> },
    { name: 'ocean', color: '#00b4d8', label: 'Ocean', icon: <Palette /> },
    { name: 'forest', color: '#2ecc71', label: 'Forest', icon: <Palette /> },
    { name: 'sunset', color: '#ff7043', label: 'Sunset', icon: <Palette /> },
    { name: 'dark', color: '#1e293b', label: 'Dark', icon: <Moon /> }
  ];

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('theme', currentTheme);
  }, [currentTheme]);

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-3 rounded-full bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all"
        aria-label="Toggle theme"
      >
        {currentTheme === 'dark' ? <Moon size={20} /> : <Palette size={20} />}
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 w-56">
          <div className="grid grid-cols-2 gap-2">
            {themes.map((theme) => (
              <button
                key={theme.name}
                onClick={() => {
                  setCurrentTheme(theme.name);
                  setIsOpen(false);
                }}
                className={`flex flex-col items-center p-2 rounded-lg transition-all
                  ${currentTheme === theme.name 
                    ? 'bg-gray-100 dark:bg-gray-700' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                <div
                  className="w-8 h-8 rounded-full mb-1"
                  style={{ backgroundColor: theme.color }}
                />
                <span className="text-xs">{theme.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeSwitcher;