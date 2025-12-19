# PreviewManager Component Documentation

Complete guide to using the `PreviewManager` component for managing preview lifecycle in Brainiac.

## Overview

The `PreviewManager` component handles the complete lifecycle of preview instances:

- ✅ Creates preview server via backend API
- ✅ Writes files incrementally as they're generated
- ✅ Tracks progress with detailed status updates
- ✅ Manages server lifecycle automatically
- ✅ Handles cleanup on unmount
- ✅ Provides preview URL for iframe embedding
- ✅ Error handling with retry capability

## Architecture

```
┌─────────────────────────────────────────┐
│    PreviewManager Component (React)     │
│  - Manages state & lifecycle            │
│  - Tracks progress                      │
│  - Handles errors                       │
└──────────────┬──────────────────────────┘
               │ HTTP API
┌──────────────▼──────────────────────────┐
│    Preview Server API (Node.js)         │
│  - Creates Vite servers                 │
│  - Writes files to temp directories     │
│  - Manages multiple instances           │
└─────────────────────────────────────────┘
```

## Installation

The PreviewManager is already included in your Brainiac project:

```typescript
import { PreviewManager, PreviewManagerWithIframe } from '@/components/PreviewManager';
```

## Basic Usage

### Simple Preview

```tsx
import { PreviewManagerWithIframe } from '@/components/PreviewManager';

function MyApp() {
  const files = {
    'src/App.tsx': 'export default function App() { return <div>Hello</div> }',
    'src/main.tsx': '...',
    'index.html': '...',
  };

  return (
    <PreviewManagerWithIframe
      projectId="my-app"
      files={files}
      autoStart={true}
      onPreviewReady={(url) => console.log('Ready:', url)}
      onError={(error) => console.error('Error:', error)}
    />
  );
}
```

### Custom Render Props

```tsx
import { PreviewManager } from '@/components/PreviewManager';

function MyApp() {
  return (
    <PreviewManager projectId="custom" files={files}>
      {({ previewUrl, status, progress, refresh, restart }) => (
        <div>
          <p>Status: {status}</p>
          <p>Progress: {progress.percentage}%</p>
          <iframe src={previewUrl} />
          <button onClick={refresh}>Refresh</button>
          <button onClick={restart}>Restart</button>
        </div>
      )}
    </PreviewManager>
  );
}
```

## Props

### PreviewManagerProps

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `projectId` | `string` | ✅ | - | Unique identifier for the project |
| `files` | `Record<string, string>` | ✅ | - | Files to preview (path → content) |
| `onPreviewReady` | `(url: string) => void` | ❌ | - | Callback when preview is ready |
| `onError` | `(error: Error) => void` | ❌ | - | Callback on error |
| `onStatusChange` | `(status: PreviewStatus) => void` | ❌ | - | Callback on status change |
| `autoStart` | `boolean` | ❌ | `true` | Auto-start preview on mount |
| `showProgress` | `boolean` | ❌ | `true` | Show progress UI |
| `className` | `string` | ❌ | - | Custom CSS class |
| `children` | `(props) => ReactNode` | ❌ | - | Render props function |

### PreviewStatus

```typescript
type PreviewStatus = 
  | 'idle'              // Not started
  | 'initializing'      // Creating server
  | 'writing-files'     // Writing files
  | 'starting-server'   // Starting Vite
  | 'ready'             // Preview ready
  | 'error'             // Error occurred
  | 'stopped';          // Manually stopped
```

### PreviewProgress

```typescript
interface PreviewProgress {
  current: number;      // Current step
  total: number;        // Total steps
  percentage: number;   // Progress percentage (0-100)
  currentFile?: string; // Current file being written
  message: string;      // Status message
}
```

## Component Variants

### 1. PreviewManager (Base)

Full control with render props:

```tsx
<PreviewManager projectId="app" files={files}>
  {({ previewUrl, status, progress, refresh, restart }) => (
    // Your custom UI
  )}
</PreviewManager>
```

### 2. PreviewManagerWithIframe

Includes iframe and controls:

```tsx
<PreviewManagerWithIframe
  projectId="app"
  files={files}
  showControls={true}
  iframeClassName="custom-class"
/>
```

## Usage Examples

### Example 1: Incremental File Writing

Perfect for AI agents that generate files one by one:

```tsx
function IncrementalPreview() {
  const [files, setFiles] = useState<Record<string, string>>({});

  useEffect(() => {
    // Simulate AI generating files
    const generateFiles = async () => {
      // Add files incrementally
      setFiles(prev => ({ ...prev, 'src/App.tsx': '...' }));
      await delay(500);
      setFiles(prev => ({ ...prev, 'src/main.tsx': '...' }));
      await delay(500);
      setFiles(prev => ({ ...prev, 'index.html': '...' }));
    };
    
    generateFiles();
  }, []);

  return (
    <PreviewManagerWithIframe
      projectId="incremental"
      files={files}
      autoStart={true}
    />
  );
}
```

### Example 2: Manual Control

Control when preview starts:

```tsx
function ManualPreview() {
  const [active, setActive] = useState(false);

  return (
    <>
      <button onClick={() => setActive(true)}>
        Start Preview
      </button>
      
      {active && (
        <PreviewManagerWithIframe
          projectId="manual"
          files={files}
          autoStart={true}
        />
      )}
    </>
  );
}
```

### Example 3: Progress Tracking

Track detailed progress:

```tsx
function ProgressTracking() {
  const [progress, setProgress] = useState<PreviewProgress>();

  return (
    <PreviewManager
      projectId="progress"
      files={files}
      showProgress={false}
      onStatusChange={(status) => console.log('Status:', status)}
    >
      {({ progress: p }) => {
        setProgress(p);
        return (
          <div>
            <p>{p.message}</p>
            <progress value={p.percentage} max={100} />
            {p.currentFile && <p>Writing: {p.currentFile}</p>}
          </div>
        );
      }}
    </PreviewManager>
  );
}
```

### Example 4: AI Agent Integration

Full integration with AI code generation:

```tsx
function AIPreview() {
  const [generatedFiles, setGeneratedFiles] = useState(null);

  const generateWithAI = async () => {
    // Call AI agent
    const result = await runAgent(prompt, apiKeys);
    
    // Extract generated files
    const files = extractFilesFromResponse(result);
    setGeneratedFiles(files);
  };

  return (
    <>
      <button onClick={generateWithAI}>Generate App</button>
      
      {generatedFiles && (
        <PreviewManagerWithIframe
          projectId="ai-generated"
          files={generatedFiles}
          onPreviewReady={(url) => {
            console.log('Preview ready:', url);
            // Optionally notify user
          }}
          onError={(error) => {
            console.error('Preview failed:', error);
            // Show error toast
          }}
        />
      )}
    </>
  );
}
```

## Lifecycle Management

### Auto-Start (Default)

Preview starts automatically on mount:

```tsx
<PreviewManager
  projectId="auto"
  files={files}
  autoStart={true} // Default
/>
```

### Manual Start

Control when to start:

```tsx
<PreviewManager
  projectId="manual"
  files={files}
  autoStart={false}
>
  {({ status }) => (
    // Preview won't start until you trigger it
    // You'll need to implement manual start logic
  )}
</PreviewManager>
```

### Cleanup

Automatic cleanup on unmount:

```tsx
// Preview server is destroyed when component unmounts
// No manual cleanup needed!
```

## Error Handling

### Built-in Error UI

```tsx
<PreviewManagerWithIframe
  projectId="app"
  files={files}
  onError={(error) => {
    // Log error
    console.error(error);
    
    // Show notification
    toast.error(error.message);
    
    // Send to error tracking
    Sentry.captureException(error);
  }}
/>
```

### Custom Error Handling

```tsx
<PreviewManager projectId="app" files={files} showProgress={false}>
  {({ status, refresh }) => {
    if (status === 'error') {
      return (
        <div>
          <p>Preview failed!</p>
          <button onClick={refresh}>Retry</button>
        </div>
      );
    }
    
    return <iframe src={previewUrl} />;
  }}
</PreviewManager>
```

## Status Lifecycle

```
idle → initializing → writing-files → starting-server → ready
                ↓                  ↓              ↓
              error ← ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

1. **idle**: Component mounted, waiting to start
2. **initializing**: Creating preview server via API
3. **writing-files**: Writing files incrementally
4. **starting-server**: Vite server starting
5. **ready**: Preview is live and accessible
6. **error**: Something went wrong (can retry)
7. **stopped**: Manually stopped or cancelled

## Progress Tracking

### Progress Object

```typescript
{
  current: 3,           // 3 files written
  total: 5,             // 5 files total
  percentage: 60,       // 60% complete
  currentFile: 'src/App.tsx',
  message: 'Writing src/App.tsx...'
}
```

### Progress Events

```tsx
<PreviewManager
  files={files}
  onStatusChange={(status) => {
    // Track status changes
    analytics.track('preview_status_change', { status });
  }}
>
  {({ progress }) => (
    <div>
      {/* Real-time progress */}
      <span>{progress.percentage}%</span>
      <span>{progress.message}</span>
      
      {/* File-by-file progress */}
      {progress.currentFile && (
        <p>Writing: {progress.currentFile}</p>
      )}
    </div>
  )}
</PreviewManager>
```

## Styling

### Custom Styles

```tsx
<PreviewManagerWithIframe
  projectId="styled"
  files={files}
  className="custom-preview"
  iframeClassName="custom-iframe"
/>
```

### CSS Classes

```css
/* Custom preview container */
.custom-preview {
  border-radius: 12px;
  overflow: hidden;
}

/* Custom iframe */
.custom-iframe {
  border: 2px solid purple;
}
```

## Performance

### Optimization Tips

1. **Debounce file updates** when editing code:
```tsx
const debouncedFiles = useDebounce(files, 300);

<PreviewManager files={debouncedFiles} />
```

2. **Memoize file object**:
```tsx
const files = useMemo(() => ({
  'src/App.tsx': code,
  'src/main.tsx': mainCode,
}), [code, mainCode]);
```

3. **Limit concurrent previews**:
```tsx
// Only keep one preview active at a time
useEffect(() => {
  return () => {
    // Cleanup happens automatically
  };
}, []);
```

## Troubleshooting

### Preview not starting

1. Check if preview server is running
2. Verify `VITE_PREVIEW_API_URL` env variable
3. Check browser console for errors
4. Try manual start instead of auto-start

### Files not updating

1. Ensure file object reference changes
2. Check file paths are correct (use `/` not `\`)
3. Verify file content is string, not object
4. Check network tab for API errors

### Preview shows blank page

1. Check if `index.html` is included
2. Verify `src/main.tsx` entry point exists
3. Look for JavaScript errors in preview iframe
4. Ensure all dependencies are in `package.json`

### Memory issues

1. Destroy unused previews
2. Limit concurrent previews to 2-3
3. Use smaller file sizes
4. Clean up on unmount (automatic)

## API Reference

See also:
- `src/types/preview.ts` - TypeScript types
- `src/lib/preview-server.ts` - Server implementation
- `src/hooks/usePreviewServer.ts` - React hooks
- `PREVIEW_SERVER_GUIDE.md` - Server deployment guide

## Best Practices

1. ✅ **Use unique projectIds** - Avoid conflicts
2. ✅ **Handle errors gracefully** - Show user-friendly messages
3. ✅ **Track progress** - Keep users informed
4. ✅ **Cleanup properly** - Let component handle it
5. ✅ **Debounce updates** - Don't update too frequently
6. ✅ **Memoize files** - Prevent unnecessary re-renders
7. ✅ **Test error cases** - Simulate failures
8. ✅ **Monitor performance** - Track preview creation time

## Integration Checklist

- [ ] Deploy preview server (Railway/Render)
- [ ] Set `VITE_PREVIEW_API_URL` environment variable
- [ ] Import `PreviewManager` component
- [ ] Prepare files object with all needed files
- [ ] Add error handling
- [ ] Test with sample files
- [ ] Test incremental file updates
- [ ] Test cleanup on unmount
- [ ] Monitor for errors in production

## Examples

Complete examples in:
- `src/examples/PreviewManagerExample.tsx`

## Support

For issues or questions:
- See `PREVIEW_SERVER_GUIDE.md` for server setup
- Check browser console for errors
- Verify API endpoint is accessible
- Test with minimal file set first

---

Built with ❤️ by Brainiac 🧠

