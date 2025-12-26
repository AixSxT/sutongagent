import React, { useState } from 'react';
import {
  Plus,
  Search,
  MessageSquare,
  Trash2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useI18n } from './I18nContext';

export const Sidebar = ({
  history = [],
  activeId,
  onNew,
  onSelect,
  onDelete,
}) => {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const searchValue = search.trim().toLowerCase();

  const normalizeDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };

  const today = normalizeDate(new Date());
  const yesterday = today ? new Date(today.getTime() - 86400000) : null;
  const filteredHistory = history.filter((item) =>
    item.title.toLowerCase().includes(searchValue),
  );

  const groups = [
    {
      label: t('sidebar.today'),
      items: filteredHistory.filter((item) => {
        const createdAt = normalizeDate(item.createdAt);
        return today && createdAt && createdAt.getTime() === today.getTime();
      }),
    },
    {
      label: t('sidebar.yesterday'),
      items: filteredHistory.filter((item) => {
        const createdAt = normalizeDate(item.createdAt);
        return (
          yesterday &&
          createdAt &&
          createdAt.getTime() === yesterday.getTime()
        );
      }),
    },
    {
      label: t('sidebar.earlier'),
      items: filteredHistory.filter((item) => {
        const createdAt = normalizeDate(item.createdAt);
        if (!createdAt || !today || !yesterday) return true;
        return createdAt < yesterday;
      }),
    },
  ];

  return (
    <aside className="df-sidebar w-[280px] h-full flex flex-col">
      <div className="p-4">
        <button 
          onClick={onNew}
          className="df-sidebar-new w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold"
        >
          <Plus size={16} /> {t('sidebar.newResearch')}
        </button>
        
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input 
            className="df-sidebar-search w-full rounded-lg py-2 pl-9 pr-4 text-xs outline-none"
            placeholder={t('sidebar.searchHistory')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 custom-scrollbar">
        {groups.map((group, idx) => group.items.length > 0 && (
          <div key={idx} className="df-sidebar-group mb-6">
            <div className="df-sidebar-group-label px-3 mb-2 text-[10px] font-bold text-slate-400 tracking-widest uppercase">
              {group.label}
            </div>
            {group.items.map(item => (
              <div 
                key={item.id}
                onClick={() => onSelect?.(item.id)}
                className={cn(
                  "df-sidebar-item group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all mb-1",
                  activeId === item.id
                    ? "bg-white shadow-sm text-blue-600 ring-1 ring-slate-200"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                <MessageSquare size={14} className={activeId === item.id ? "text-blue-500" : "text-slate-400"} />
                <span className="flex-1 text-sm font-medium truncate">{item.title}</span>
                <button
                  type="button"
                  className="df-sidebar-item-delete opacity-0 group-hover:opacity-100 transition-all"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete?.(item.id);
                  }}
                  title={t('common.delete')}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
};
