# Analytics Configuration

Cofe includes optional, privacy-focused analytics powered by [Umami](https://umami.is). Analytics are completely configurable and disabled by default.

## Features

- **Privacy-focused**: No cookies, GDPR compliant
- **Self-hosted friendly**: Use Umami Cloud or your own instance
- **Configurable**: Enable/disable via environment variables
- **Open source friendly**: Optional for all users
- **Comprehensive tracking**: Page views and custom events
- **Development-friendly**: Detailed logging in development mode

## Quick Setup

### 1. Enable Analytics

Add to your `.env.local`:

```bash
# Enable analytics
NEXT_PUBLIC_ANALYTICS_ENABLED=true

# Your Umami website ID (required)
NEXT_PUBLIC_UMAMI_WEBSITE_ID=your-website-id

# Optional: Custom Umami instance (defaults to Umami Cloud)
NEXT_PUBLIC_UMAMI_SCRIPT_URL=https://your-umami-instance.com/script.js

# Optional: Restrict tracking to specific domains
NEXT_PUBLIC_UMAMI_DOMAINS=yourdomain.com,www.yourdomain.com
```

### 2. Get Umami Website ID

#### Option A: Umami Cloud (Recommended for beginners)
1. Sign up at [cloud.umami.is](https://cloud.umami.is)
2. Add your website
3. Copy the Website ID from your dashboard

#### Option B: Self-hosted Umami
1. Deploy Umami following [their documentation](https://umami.is/docs)
2. Add your website in the admin panel
3. Set `NEXT_PUBLIC_UMAMI_SCRIPT_URL` to your instance URL
4. Copy the Website ID

## Configuration Options

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_ANALYTICS_ENABLED` | No | `false` | Enable/disable analytics |
| `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | Yes* | - | Your Umami website ID |
| `NEXT_PUBLIC_UMAMI_SCRIPT_URL` | No | Umami Cloud | Custom Umami instance URL |
| `NEXT_PUBLIC_UMAMI_DOMAINS` | No | All domains | Comma-separated list of allowed domains |

*Required only when analytics is enabled

## Advanced Usage

### Custom Event Tracking

```typescript
import { useUmamiTracking } from '@/components/Analytics'

function MyComponent() {
  const trackEvent = useUmamiTracking()
  
  const handleClick = () => {
    trackEvent('button-click', { 
      button: 'header-cta',
      page: 'homepage' 
    })
  }
  
  return <button onClick={handleClick}>Click me</button>
}
```

### Manual Page View Tracking

```typescript
import { useUmamiPageView } from '@/components/Analytics'

function MyComponent() {
  const trackPageView = useUmamiPageView()
  
  useEffect(() => {
    trackPageView('/custom-page', 'Custom Page Title')
  }, [])
}
```

## Privacy & Compliance

- **No cookies**: Umami doesn't use cookies
- **No personal data**: Only anonymized metrics
- **GDPR compliant**: Respects user privacy
- **Configurable**: Users can disable completely

## Development

In development mode, analytics will:
- Log configuration on startup
- Log events to console instead of tracking
- Show helpful debug information
- Not send data to Umami (unless explicitly enabled)

## Disabling Analytics

Set `NEXT_PUBLIC_ANALYTICS_ENABLED=false` or remove the environment variable entirely. The analytics component will not render and no tracking scripts will be loaded.

## Migration from Google Analytics

If you're migrating from Google Analytics:

1. Remove Google Analytics environment variables
2. Follow the setup steps above
3. Update any custom tracking code to use Umami hooks

## Support

- [Umami Documentation](https://umami.is/docs)
- [Umami GitHub](https://github.com/umami-software/umami)
- [Privacy Policy Template](https://umami.is/privacy)