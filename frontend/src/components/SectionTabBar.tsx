import React, { useCallback, useEffect, useRef } from 'react';
import './SectionTabBar.css';

export type SectionTab = {
  id: string;
  label: string;
};

export type SectionTabBarProps = {
  tabs: SectionTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
  ariaLabel?: string;
};

export default function SectionTabBar({
  tabs,
  activeTab,
  onTabChange,
  className = '',
  ariaLabel = 'Seções',
}: SectionTabBarProps) {
  const tablistRef = useRef<HTMLDivElement>(null);
  const pendingFocusTabId = useRef<string | null>(null);

  const focusTab = useCallback((tabId: string) => {
    const root = tablistRef.current;
    if (!root) return;
    const el = root.querySelector<HTMLElement>(`[data-tab-id="${tabId}"]`);
    el?.focus();
  }, []);

  useEffect(() => {
    if (!pendingFocusTabId.current) return;
    const tabId = pendingFocusTabId.current;
    pendingFocusTabId.current = null;
    focusTab(tabId);
  }, [activeTab, focusTab]);

  const activateTab = useCallback(
    (tabId: string) => {
      if (tabId === activeTab) {
        focusTab(tabId);
        return;
      }
      pendingFocusTabId.current = tabId;
      onTabChange(tabId);
    },
    [activeTab, focusTab, onTabChange],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      if (!tabs.length) return;

      let nextIndex: number | null = null;
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          nextIndex = (currentIndex + 1) % tabs.length;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = tabs.length - 1;
          break;
        default:
          return;
      }

      event.preventDefault();
      activateTab(tabs[nextIndex].id);
    },
    [activateTab, tabs],
  );

  return (
    <div
      ref={tablistRef}
      role="tablist"
      aria-label={ariaLabel}
      aria-orientation="horizontal"
      className={`section-tabs${className ? ` ${className}` : ''}`}
    >
      {tabs.map((tab, index) => {
        const selected = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            data-tab-id={tab.id}
            aria-selected={selected}
            className={`section-tab${selected ? ' section-tab--active' : ''}`}
            onClick={() => onTabChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            tabIndex={selected ? 0 : -1}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
