# Recursive redirect resolver

A TypeScript utility that handles URL redirects with support for wildcards, match groups, and recursive redirect resolution.

## Features

- 🔄 Recursive redirect resolution with loop detection
- 🌐 Support for both relative and absolute URLs
- 🎯 Wildcard pattern matching (`*`)
- 📝 Named capture groups (`[name]`)
- 🔢 Configurable redirect status codes (301, 302, 307, 308)
- 🛡️ TypeScript support with full type definitions

## Installation

```bash
npm install recursive-redirect
```

## Usage

```typescript
import { getRedirect, RedirectDefinition } from 'recursive-redirect';

// Define your redirect rules
const redirects: RedirectDefinition[] = [
  {
    from: '/old-path',
    to: '/new-path',
    code: 301
  },
  {
    from: '/blog/*',
    to: '/articles/*',
    code: 302
  },
  {
    from: '/users/[id]',
    to: '/profiles/[id]',
    code: 307
  }
];

// Create a URL object
const url = new URL('https://example.com/old-path');

// Get the redirect target
const redirect = getRedirect(url, redirects);

if (redirect) {
  console.log(redirect.url);    // 'https://example.com/new-path'
  console.log(redirect.code);   // 301
}
```

## Redirect Rules

### Basic Redirects
```typescript
{
  from: '/old-path',
  to: '/new-path',
  code: 301  // Optional, defaults to 301
}
```

### Wildcard Redirects
```typescript
{
  from: '/blog/*',
  to: '/articles/*'
}
```

### Named Capture Groups
```typescript
{
  from: '/users/[id]',
  to: '/profiles/[id]'
}
```

### External Redirects
```typescript
{
  from: '/external',
  to: 'https://other-site.com'
}
```

## API Reference

### `getRedirect(url: URL, redirects: RedirectDefinition[]): Redirect | null`

Resolves the final redirect target for a given URL based on the provided redirect rules.

#### Parameters
- `url`: The URL to check for redirects
- `redirects`: Array of redirect definitions

#### Returns
- `Redirect` object with `url` and `code` properties if a redirect is found
- `null` if no redirect matches
- Throws `RedirectLoopError` if redirect chain exceeds maximum length (10)

### Types

```typescript
interface Redirect {
  url: string;
  code: 301 | 302 | 307 | 308;
}

interface RedirectDefinition {
  from: string;
  to: string;
  code?: 301 | 302 | 307 | 308;
}
```

## Testing

The project uses [Vitest](https://vitest.dev/) for testing. To run the tests:

```bash
npm test
```
