# PreviewManager Quick Start

Quick reference for using the PreviewManager component.

## Installation

```bash
# Already included in Brainiac!
# Just import and use
```

## Simplest Usage

```tsx
import { PreviewManagerWithIframe } from '@/components/PreviewManager';

function App() {
  const files = {
    'index.html': '<!DOCTYPE html>...',
    'src/App.tsx': 'export default function App() {...}',
    'src/main.tsx': '...',
  };

  return (
    <PreviewManagerWithIframe
      projectId="my-app"
      files={files}
    />
  );
}
```

That's it! The preview will:
- ✅ Create a server automatically
- ✅ Write all files
- ✅ Show progress
- ✅ Display the preview
- ✅ Clean up on unmount

## With Callbacks

```tsx
<PreviewManagerWithIframe
  projectId="my-app"
  files={files}
  onPreviewReady={(url) => {
    console.log('Preview ready at:', url);
  }}
  onError={(error) => {
    console.error('Preview failed:', error.message);
  }}
/>
```

## Custom UI with Render Props

```tsx
import { PreviewManager } from '@/components/PreviewManager';

<PreviewManager projectId="custom" files={files}>
  {({ previewUrl, status, progress, refresh }) => (
    <div>
      <div>Status: {status}</div>
      <div>Progress: {progress.percentage}%</div>
      <button onClick={refresh}>Refresh</button>
      <iframe src={previewUrl} />
    </div>
  )}
</PreviewManager>
```

## Incremental Files (AI Generation)

```tsx
function AIGeneration() {
  const [files, setFiles] = useState({});

  // Add files as AI generates them
  useEffect(() => {
    // AI generates App.tsx
    setFiles(prev => ({ ...prev, 'src/App.tsx': '...' }));
    
    // AI generates Button.tsx
    setFiles(prev => ({ ...prev, 'src/Button.tsx': '...' }));
  }, []);

  return <PreviewManagerWithIframe projectId="ai" files={files} />;
}
```

## Props

| Prop | Required | Default | Description |
|------|----------|---------|-------------|
| `projectId` | ✅ | - | Unique ID for project |
| `files` | ✅ | - | Files to preview |
| `autoStart` | ❌ | `true` | Auto-start on mount |
| `showProgress` | ❌ | `true` | Show progress UI |
| `showControls` | ❌ | `true` | Show preview controls |
| `onPreviewReady` | ❌ | - | Callback when ready |
| `onError` | ❌ | - | Callback on error |

## File Format

```tsx
const files = {
  // Key = file path, Value = file content
  'index.html': '<!DOCTYPE html>...',
  'package.json': '{"name": "app"}...',
  'src/App.tsx': 'export default...',
  'src/components/Button.tsx': 'export const...',
  'src/styles/globals.css': '@tailwind...',
};
```

## Status Values

- `idle` - Not started
- `initializing` - Creating server
- `writing-files` - Writing files
- `ready` - Preview ready
- `error` - Something failed

## Common Patterns

### Pattern 1: Show Preview After Generation

```tsx
const [files, setFiles] = useState(null);

// Generate files
const generate = async () => {
  const result = await generateCode();
  setFiles(result);
};

return (
  <>
    <button onClick={generate}>Generate</button>
    {files && <PreviewManagerWithIframe projectId="app" files={files} />}
  </>
);
```

### Pattern 2: Multiple Previews

```tsx
const [previews, setPreviews] = useState([]);

return previews.map(preview => (
  <PreviewManagerWithIframe
    key={preview.id}
    projectId={preview.id}
    files={preview.files}
  />
));
```

### Pattern 3: Progress Tracking

```tsx
<PreviewManager files={files}>
  {({ progress }) => (
    <div>
      <p>{progress.message}</p>
      <progress value={progress.percentage} max={100} />
    </div>
  )}
</PreviewManager>
```

## Environment Setup

1. Deploy preview server (see `PREVIEW_SERVER_GUIDE.md`)
2. Set environment variable:

```bash
# .env
VITE_PREVIEW_API_URL=https://your-preview-server.railway.app/api/preview
```

## Troubleshooting

**Preview not starting?**
- Check if preview server is running
- Verify `VITE_PREVIEW_API_URL` is set
- Check browser console for errors

**Files not showing?**
- Ensure `index.html` exists
- Include `src/main.tsx` entry point
- Check file paths use `/` not `\`

**Blank preview?**
- Open browser DevTools in iframe
- Check for JavaScript errors
- Verify all imports are correct

## Complete Examples

See `src/examples/PreviewManagerExample.tsx` for:
- Basic usage
- Incremental file writing
- Custom UI
- Manual control
- AI agent integration

## Documentation

- Full docs: `PREVIEW_MANAGER.md`
- Server guide: `PREVIEW_SERVER_GUIDE.md`
- API reference: `src/types/preview.ts`

---

That's all you need! 🎉

For advanced usage, see the full documentation.

