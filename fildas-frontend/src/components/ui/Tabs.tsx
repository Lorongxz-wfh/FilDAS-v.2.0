import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Tab {
  key: string;
  label: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (key: string) => void;
  className?: string;
  /** Unique ID for framer-motion layoutId (essential for smooth transitions) */
  id: string;
}

/**
 * Animated Tab Indicator component.
 * Uses layoutId to slide the underline between tabs.
 */
export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className = "", id }) => {
  return (
    <div className={`shrink-0 flex items-center border-b border-slate-200 dark:border-surface-400 overflow-x-auto hide-scrollbar ${className}`}>
      {tabs.map((t) => {
        const isActive = activeTab === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={[
              "relative group flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap",
              isActive 
                ? "text-slate-900 dark:text-slate-50" 
                : "text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300"
            ].join(" ")}
          >
            {t.icon}
            <span>{t.label}</span>
            {t.badge}
            
            {isActive && (
              <motion.div
                layoutId={`tab-indicator-${id}`}
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-700 dark:bg-slate-200 z-10"
                transition={{ type: "spring", bounce: 0, duration: 0.18 }}
              />
            )}
            
            {/* Hover Indicator (Subtle) */}
            {!isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-200 dark:bg-surface-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </button>
        );
      })}
    </div>
  );
};

/**
 * Animated Tab Content wrapper.
 * Fades and slightly slides content when switching.
 */
export const TabContent: React.FC<{ activeKey: string; currentKey: string; children: React.ReactNode }> = ({ activeKey, currentKey, children }) => {
  return (
    <AnimatePresence mode="wait">
      {activeKey === currentKey && (
        <motion.div
          key={currentKey}
          initial={{ opacity: 0, x: 4 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -4 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
          className="w-full"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
