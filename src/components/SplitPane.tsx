/**
 * SplitPane Component
 * Responsive layout that switches between tabs on mobile and split panes on desktop
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo, useAnimation } from 'framer-motion';
import { MessageSquare, Code2, Monitor, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type TabId = 'chat' | 'code' | 'preview';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { id: 'chat', label: 'Chat', icon: <MessageSquare className="h-4 w-4" /> },
  { id: 'code', label: 'Code', icon: <Code2 className="h-4 w-4" /> },
  { id: 'preview', label: 'Preview', icon: <Monitor className="h-4 w-4" /> },
];

interface SplitPaneProps {
  chatContent: React.ReactNode;
  codeContent: React.ReactNode | null;
  previewContent: React.ReactNode | null;
  className?: string;
}

export const SplitPane: React.FC<SplitPaneProps> = ({
  chatContent,
  codeContent,
  previewContent,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('chat');
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();

  // Detect mobile/tablet/desktop
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-switch to code/preview tab when content becomes available
  useEffect(() => {
    if (isMobile) {
      if (!codeContent && !previewContent) {
        setActiveTab('chat');
      } else if (previewContent && activeTab === 'chat') {
        // Auto-switch to preview when deployment completes
        setActiveTab('preview');
      } else if (codeContent && !previewContent && activeTab === 'chat') {
        // Auto-switch to code when files are generated
        setActiveTab('code');
      }
    }
  }, [codeContent, previewContent, isMobile, activeTab]);

  // Swipe gesture handling
  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = 50;
    const swipeVelocity = 500;

    if (Math.abs(info.offset.x) > swipeThreshold || Math.abs(info.velocity.x) > swipeVelocity) {
      if (info.offset.x > 0) {
        // Swipe right - previous tab
        handlePreviousTab();
      } else {
        // Swipe left - next tab
        handleNextTab();
      }
    }
  };

  const handleNextTab = () => {
    const availableTabs = getAvailableTabs();
    const currentIndex = availableTabs.findIndex(t => t.id === activeTab);
    const nextIndex = (currentIndex + 1) % availableTabs.length;
    setActiveTab(availableTabs[nextIndex].id);
  };

  const handlePreviousTab = () => {
    const availableTabs = getAvailableTabs();
    const currentIndex = availableTabs.findIndex(t => t.id === activeTab);
    const prevIndex = currentIndex === 0 ? availableTabs.length - 1 : currentIndex - 1;
    setActiveTab(availableTabs[prevIndex].id);
  };

  const getAvailableTabs = (): Tab[] => {
    return TABS.filter(tab => {
      if (tab.id === 'chat') return true;
      if (tab.id === 'code') return codeContent !== null;
      if (tab.id === 'preview') return previewContent !== null;
      return false;
    });
  };

  const getTabContent = (tabId: TabId) => {
    switch (tabId) {
      case 'chat':
        return chatContent;
      case 'code':
        return codeContent;
      case 'preview':
        return previewContent;
      default:
        return null;
    }
  };

  const availableTabs = getAvailableTabs();

  // Mobile view with tabs
  if (isMobile) {
    return (
      <div className={cn('flex flex-col h-full', className)}>
        {/* Tab Bar */}
        <div className="flex items-center bg-zinc-950 border-b border-zinc-800 overflow-x-auto">
          {availableTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 min-w-[100px] flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative',
                'active:scale-95 transition-transform',
                activeTab === tab.id
                  ? 'text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              )}
              style={{ minHeight: '44px' }} // Touch target
            >
              {tab.icon}
              <span>{tab.label}</span>
              
              {/* Active indicator */}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 to-pink-500"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content with Swipe */}
        <div className="flex-1 relative overflow-hidden">
          <motion.div
            ref={containerRef}
            className="h-full"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            animate={controls}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeTab}
                initial={{ x: 300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -300, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="h-full"
              >
                {getTabContent(activeTab)}
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Swipe Navigation Hints (show briefly on first load) */}
          {availableTabs.length > 1 && (
            <>
              {availableTabs.findIndex(t => t.id === activeTab) > 0 && (
                <button
                  onClick={handlePreviousTab}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-zinc-900/80 backdrop-blur-sm rounded-full flex items-center justify-center border border-zinc-700 shadow-lg active:scale-95 transition-transform"
                  aria-label="Previous tab"
                >
                  <ChevronLeft className="h-5 w-5 text-white" />
                </button>
              )}
              
              {availableTabs.findIndex(t => t.id === activeTab) < availableTabs.length - 1 && (
                <button
                  onClick={handleNextTab}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-zinc-900/80 backdrop-blur-sm rounded-full flex items-center justify-center border border-zinc-700 shadow-lg active:scale-95 transition-transform"
                  aria-label="Next tab"
                >
                  <ChevronRight className="h-5 w-5 text-white" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Swipe Indicator Dots */}
        {availableTabs.length > 1 && (
          <div className="flex items-center justify-center gap-2 py-2 bg-zinc-950 border-t border-zinc-800">
            {availableTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-2 h-2 rounded-full transition-all',
                  activeTab === tab.id
                    ? 'bg-red-500 w-6'
                    : 'bg-zinc-700'
                )}
                aria-label={`Switch to ${tab.label}`}
                style={{ minWidth: '44px', minHeight: '44px', padding: '21px 16px' }} // Touch target
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Desktop view with split panes
  return (
    <div className={cn('flex gap-4 h-full p-4', className)}>
      {/* Chat Column */}
      <div className={cn(
        'flex flex-col transition-all duration-300 h-full overflow-hidden',
        (codeContent || previewContent) ? 'w-1/2' : 'w-full'
      )}>
        {chatContent}
      </div>

      {/* Code/Preview Column */}
      {(codeContent || previewContent) && (
        <motion.div
          className="flex flex-col w-1/2 gap-4 h-full overflow-hidden"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Code Viewer */}
          {codeContent && (
            <div className={cn(
              'overflow-hidden rounded-lg',
              previewContent ? 'h-1/2' : 'h-full'
            )}>
              {codeContent}
            </div>
          )}
          
          {/* Live Preview */}
          {previewContent && (
            <div className={cn(
              'overflow-hidden rounded-lg',
              codeContent ? 'h-1/2' : 'h-full'
            )}>
              {previewContent}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

