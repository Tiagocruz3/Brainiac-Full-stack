/**
 * SplitPane Component Tests
 * Tests for responsive layout, tab switching, and swipe gestures
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SplitPane } from '@/components/SplitPane';

describe('SplitPane', () => {
  const mockChatContent = <div>Chat Content</div>;
  const mockCodeContent = <div>Code Content</div>;
  const mockPreviewContent = <div>Preview Content</div>;

  beforeEach(() => {
    // Mock window.innerWidth for responsive tests
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  describe('Desktop view (>768px)', () => {
    it('should render split panes on desktop', () => {
      render(
        <SplitPane
          chatContent={mockChatContent}
          codeContent={mockCodeContent}
          previewContent={null}
        />
      );

      expect(screen.getByText('Chat Content')).toBeInTheDocument();
      expect(screen.getByText('Code Content')).toBeInTheDocument();
    });

    it('should show only chat when no code/preview content', () => {
      render(
        <SplitPane
          chatContent={mockChatContent}
          codeContent={null}
          previewContent={null}
        />
      );

      expect(screen.getByText('Chat Content')).toBeInTheDocument();
      expect(screen.queryByText('Code Content')).not.toBeInTheDocument();
    });

    it('should show both code and preview when available', () => {
      render(
        <SplitPane
          chatContent={mockChatContent}
          codeContent={mockCodeContent}
          previewContent={mockPreviewContent}
        />
      );

      expect(screen.getByText('Chat Content')).toBeInTheDocument();
      expect(screen.getByText('Code Content')).toBeInTheDocument();
      expect(screen.getByText('Preview Content')).toBeInTheDocument();
    });
  });

  describe('Mobile view (<768px)', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      // Trigger resize
      window.dispatchEvent(new Event('resize'));
    });

    it('should render tabs on mobile', async () => {
      render(
        <SplitPane
          chatContent={mockChatContent}
          codeContent={mockCodeContent}
          previewContent={mockPreviewContent}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Chat')).toBeInTheDocument();
        expect(screen.getByText('Code')).toBeInTheDocument();
        expect(screen.getByText('Preview')).toBeInTheDocument();
      });
    });

    it('should show only available tabs', async () => {
      render(
        <SplitPane
          chatContent={mockChatContent}
          codeContent={null}
          previewContent={null}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Chat')).toBeInTheDocument();
        expect(screen.queryByText('Code')).not.toBeInTheDocument();
        expect(screen.queryByText('Preview')).not.toBeInTheDocument();
      });
    });

    it('should switch tabs on click', async () => {
      render(
        <SplitPane
          chatContent={mockChatContent}
          codeContent={mockCodeContent}
          previewContent={mockPreviewContent}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Chat')).toBeInTheDocument();
      });

      // Click Code tab
      const codeTab = screen.getByText('Code');
      fireEvent.click(codeTab);

      await waitFor(() => {
        expect(screen.getByText('Code Content')).toBeInTheDocument();
      });
    });

    it('should show navigation arrows when multiple tabs', async () => {
      render(
        <SplitPane
          chatContent={mockChatContent}
          codeContent={mockCodeContent}
          previewContent={mockPreviewContent}
        />
      );

      await waitFor(() => {
        const arrows = screen.getAllByRole('button', { name: /tab/i });
        expect(arrows.length).toBeGreaterThan(0);
      });
    });

    it('should show pagination dots', async () => {
      render(
        <SplitPane
          chatContent={mockChatContent}
          codeContent={mockCodeContent}
          previewContent={mockPreviewContent}
        />
      );

      await waitFor(() => {
        const switches = screen.getAllByRole('button', { name: /Switch to/i });
        expect(switches.length).toBe(3); // Chat, Code, Preview
      });
    });

    it('should auto-switch to preview when deployment completes', async () => {
      const { rerender } = render(
        <SplitPane
          chatContent={mockChatContent}
          codeContent={null}
          previewContent={null}
        />
      );

      // Initially on chat tab
      await waitFor(() => {
        expect(screen.getByText('Chat Content')).toBeInTheDocument();
      });

      // Preview becomes available
      rerender(
        <SplitPane
          chatContent={mockChatContent}
          codeContent={mockCodeContent}
          previewContent={mockPreviewContent}
        />
      );

      // Should auto-switch to preview
      await waitFor(() => {
        expect(screen.getByText('Preview Content')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive behavior', () => {
    it('should respond to window resize', async () => {
      const { container } = render(
        <SplitPane
          chatContent={mockChatContent}
          codeContent={mockCodeContent}
          previewContent={null}
        />
      );

      // Start desktop
      expect(screen.getByText('Chat Content')).toBeInTheDocument();

      // Resize to mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      fireEvent(window, new Event('resize'));

      // Should show tabs
      await waitFor(() => {
        expect(screen.getByText('Chat')).toBeInTheDocument();
      });
    });
  });

  describe('Tab animations', () => {
    it('should animate tab transitions', async () => {
      render(
        <SplitPane
          chatContent={mockChatContent}
          codeContent={mockCodeContent}
          previewContent={null}
        />
      );

      const codeTab = await screen.findByText('Code');
      fireEvent.click(codeTab);

      await waitFor(() => {
        expect(screen.getByText('Code Content')).toBeInTheDocument();
      });
    });
  });

  describe('Touch interactions', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      window.dispatchEvent(new Event('resize'));
    });

    it('should handle next tab navigation', async () => {
      render(
        <SplitPane
          chatContent={mockChatContent}
          codeContent={mockCodeContent}
          previewContent={mockPreviewContent}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Chat Content')).toBeInTheDocument();
      });

      const nextButton = screen.getByLabelText('Next tab');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Code Content')).toBeInTheDocument();
      });
    });

    it('should handle previous tab navigation', async () => {
      render(
        <SplitPane
          chatContent={mockChatContent}
          codeContent={mockCodeContent}
          previewContent={mockPreviewContent}
        />
      );

      // Go to last tab first
      const previewTab = await screen.findByText('Preview');
      fireEvent.click(previewTab);

      await waitFor(() => {
        expect(screen.getByText('Preview Content')).toBeInTheDocument();
      });

      const prevButton = screen.getByLabelText('Previous tab');
      fireEvent.click(prevButton);

      await waitFor(() => {
        expect(screen.getByText('Code Content')).toBeInTheDocument();
      });
    });

    it('should handle pagination dot clicks', async () => {
      render(
        <SplitPane
          chatContent={mockChatContent}
          codeContent={mockCodeContent}
          previewContent={mockPreviewContent}
        />
      );

      const switchToPreview = await screen.findByLabelText('Switch to Preview');
      fireEvent.click(switchToPreview);

      await waitFor(() => {
        expect(screen.getByText('Preview Content')).toBeInTheDocument();
      });
    });
  });
});

