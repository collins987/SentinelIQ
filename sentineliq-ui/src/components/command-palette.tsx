import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores';
import {
  Search,
  LayoutDashboard,
  Activity,
  ListTodo,
  Users,
  Shield,
  Settings,
  BarChart3,
  History,
  Server,
  ArrowRight,
  Command,
} from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  action: () => void;
  category: string;
  keywords?: string[];
}

export function CommandPalette() {
  const { commandPaletteOpen, toggleCommandPalette } = useUIStore();
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  const commands: CommandItem[] = useMemo(() => [
    { id: 'dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, action: () => navigate('/'), category: 'Navigation', keywords: ['home', 'main'] },
    { id: 'activity', label: 'View Activity', icon: Activity, action: () => navigate('/activity'), category: 'Navigation', keywords: ['events', 'logs'] },
    { id: 'jobs', label: 'View Jobs', icon: ListTodo, action: () => navigate('/jobs'), category: 'Navigation', keywords: ['tasks', 'queue', 'background'] },
    { id: 'analytics', label: 'View Analytics', icon: BarChart3, action: () => navigate('/analytics'), category: 'Navigation', keywords: ['charts', 'metrics', 'stats'] },
    { id: 'health', label: 'System Health', icon: Server, action: () => navigate('/health'), category: 'Navigation', keywords: ['status', 'services'] },
    { id: 'users', label: 'Manage Users', icon: Users, action: () => navigate('/users'), category: 'Management', keywords: ['accounts', 'members'] },
    { id: 'roles', label: 'Roles & Permissions', icon: Shield, action: () => navigate('/roles'), category: 'Management', keywords: ['access', 'security'] },
    { id: 'audit', label: 'Audit Trail', icon: History, action: () => navigate('/audit'), category: 'Management', keywords: ['history', 'changes'] },
    { id: 'settings', label: 'Settings', icon: Settings, action: () => navigate('/settings'), category: 'System', keywords: ['config', 'preferences'] },
  ], [navigate]);

  const filteredCommands = useMemo(() => {
    if (!search) return commands;
    const lower = search.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(lower) ||
        cmd.category.toLowerCase().includes(lower) ||
        cmd.keywords?.some((k) => k.includes(lower))
    );
  }, [commands, search]);

  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    filteredCommands.forEach((cmd) => {
      if (!groups[cmd.category]) groups[cmd.category] = [];
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  const executeCommand = useCallback((cmd: CommandItem) => {
    cmd.action();
    toggleCommandPalette();
    setSearch('');
    setSelectedIndex(0);
  }, [toggleCommandPalette]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }
      if (!commandPaletteOpen) return;

      if (e.key === 'Escape') {
        toggleCommandPalette();
        setSearch('');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
        executeCommand(filteredCommands[selectedIndex]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, filteredCommands, selectedIndex, toggleCommandPalette, executeCommand]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  if (!commandPaletteOpen) return null;

  let flatIndex = -1;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={toggleCommandPalette} />
      <div className="fixed left-1/2 top-[20%] z-50 w-full max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 dark:border-gray-800">
          <Search className="h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent py-4 text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
            autoFocus
          />
          <kbd className="flex items-center gap-1 rounded border border-gray-300 bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-800">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">No commands found</div>
          ) : (
            Object.entries(groupedCommands).map(([category, items]) => (
              <div key={category} className="mb-2">
                <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {category}
                </p>
                {items.map((cmd) => {
                  flatIndex++;
                  const isSelected = flatIndex === selectedIndex;
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => executeCommand(cmd)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                        isSelected
                          ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                      )}
                    >
                      <cmd.icon className="h-4 w-4 flex-shrink-0" />
                      <span className="flex-1">{cmd.label}</span>
                      {isSelected && <ArrowRight className="h-4 w-4" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2 text-xs text-gray-400 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-gray-300 bg-gray-100 px-1 dark:border-gray-700 dark:bg-gray-800">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-gray-300 bg-gray-100 px-1 dark:border-gray-700 dark:bg-gray-800">↵</kbd>
              Select
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Command className="h-3 w-3" />K to toggle
          </span>
        </div>
      </div>
    </>
  );
}
