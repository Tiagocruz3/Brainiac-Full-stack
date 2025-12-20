/**
 * Keyboard Shortcuts Hook
 * Handles keyboard shortcuts for preview controls
 */

import { useEffect } from 'react';

export interface KeyboardShortcutHandlers {
  onRefresh?: () => void;
  onCycleDevice?: () => void;
  onToggleOrientation?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onToggleConsole?: () => void;
  onToggleNetwork?: () => void;
  onOpenInNewTab?: () => void;
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        return;
      }

      // Check for modifier keys (Cmd/Ctrl)
      const isMod = event.metaKey || event.ctrlKey;

      switch (event.key.toLowerCase()) {
        case 'r':
          // R: Refresh
          if (!isMod) {
            event.preventDefault();
            handlers.onRefresh?.();
            console.log('⌨️ Keyboard shortcut: Refresh (R)');
          }
          break;

        case 'd':
          // D: Cycle device
          if (!isMod) {
            event.preventDefault();
            handlers.onCycleDevice?.();
            console.log('⌨️ Keyboard shortcut: Cycle device (D)');
          }
          break;

        case 'o':
          // O: Toggle orientation
          if (!isMod) {
            event.preventDefault();
            handlers.onToggleOrientation?.();
            console.log('⌨️ Keyboard shortcut: Toggle orientation (O)');
          }
          break;

        case '=':
        case '+':
          // +/=: Zoom in
          if (!isMod) {
            event.preventDefault();
            handlers.onZoomIn?.();
            console.log('⌨️ Keyboard shortcut: Zoom in (+)');
          }
          break;

        case '-':
        case '_':
          // -/_: Zoom out
          if (!isMod) {
            event.preventDefault();
            handlers.onZoomOut?.();
            console.log('⌨️ Keyboard shortcut: Zoom out (-)');
          }
          break;

        case 'c':
          // C: Toggle console
          if (isMod && event.shiftKey) {
            event.preventDefault();
            handlers.onToggleConsole?.();
            console.log('⌨️ Keyboard shortcut: Toggle console (Cmd+Shift+C)');
          }
          break;

        case 'n':
          // N: Toggle network
          if (isMod && event.shiftKey) {
            event.preventDefault();
            handlers.onToggleNetwork?.();
            console.log('⌨️ Keyboard shortcut: Toggle network (Cmd+Shift+N)');
          }
          break;

        case 't':
          // T: Open in new tab
          if (isMod) {
            event.preventDefault();
            handlers.onOpenInNewTab?.();
            console.log('⌨️ Keyboard shortcut: Open in new tab (Cmd+T)');
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handlers, enabled]);
}

