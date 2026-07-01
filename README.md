# mailingcore-js

[![npm version](https://img.shields.io/npm/v/mailingcore-js.svg)](https://www.npmjs.com/package/mailingcore-js)
[![license](https://img.shields.io/npm/l/mailingcore-js.svg)](./LICENSE)

> MailingCore SDK — send transactional emails from JavaScript/TypeScript.
> Browser-safe, &lt;1KB gzipped, zero runtime dependencies.

Official client for [MailingCore](https://mailingcore.com) — European transactional email for developers.

- **Dashboard**: [app.mailingcore.com](https://app.mailingcore.com)
- **npm**: [mailingcore-js](https://www.npmjs.com/package/mailingcore-js)
- **Changelog**: [CHANGELOG.md](./CHANGELOG.md)

## Install

```bash
npm install mailingcore-js
```

## Quick start

```ts
import { MailingCore } from 'mailingcore-js'

// 1. Initialize once
MailingCore.init({
  apiKey: 'mc_live_abc123...',  // from MailingCore dashboard → Settings → API Keys
})

// 2. Send an email
const result = await MailingCore.send({
  to: 'user@example.com',
  subject: 'Welcome to MailingCore!',
  htmlBody: '<h1>Hello world</h1>',
  tags: ['welcome', 'onboarding'],
})

console.log(result.id)      // "clx9k..."
console.log(result.status)  // "QUEUED"
```

### Send using a stored template

```ts
// Renders the PUBLISHED version of the template (by slug) with `data`.
const result = await MailingCore.sendTemplate({
  slug: 'welcome-email',              // set in dashboard → Templates → editor
  to: 'user@example.com',
  data: { userName: 'Ariel' },        // fills {{userName}} placeholders
})
```

## API

### `MailingCore.init(config)`

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `apiKey` | `string` | required | Your MailingCore API key (`mc_live_...` or `mc_test_...`) |
| `baseUrl` | `string` | `https://api.mailingcore.com` | API base URL |
| `timeout` | `number` | `30000` | Request timeout in ms |

### `MailingCore.send(params)`

Returns `Promise<SendEmailResponse>`.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | `string` | ✅ | Recipient email |
| `subject` | `string` | ✅ | Email subject (max 998 chars) |
| `htmlBody` | `string` | ✅ | HTML body |
| `textBody` | `string` | ❌ | Plain text fallback |
| `fromEmail` | `string` | ❌ | Verified sender email |
| `fromName` | `string` | ❌ | Sender display name |
| `replyTo` | `string` | ❌ | Reply-To address |
| `tags` | `string[]` | ❌ | Tags for dashboard filtering |
| `metadata` | `object` | ❌ | Arbitrary metadata |
| `idempotencyKey` | `string` | ❌ | Duplicate sends with same key return cached response |
| `templateVersionId` | `string` | ❌ | Use a stored template version |
| `projectId` | `string` | ❌ | For multi-project tenants |

### `MailingCore.sendTemplate(params)`

Returns `Promise<SendEmailResponse>`. Resolves the template's PUBLISHED version by `slug` and renders it with `data`.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `slug` | `string` | ✅ | Template slug (unique per tenant) |
| `to` | `string` | ✅ | Recipient email |
| `data` | `object` | ❌ | Variables for `{{var}}` placeholders |
| `fromEmail` | `string` | ❌ | Verified sender email |
| `fromName` | `string` | ❌ | Sender display name |
| `replyTo` | `string` | ❌ | Reply-To address |
| `projectId` | `string` | ❌ | For multi-project tenants |
| `idempotencyKey` | `string` | ❌ | Duplicate sends with same key return cached response |
| `tags` | `string[]` | ❌ | Tags for dashboard filtering |
| `metadata` | `object` | ❌ | Arbitrary metadata |

### `MailingCore.getLogs(opts?)`

Returns `Promise<PaginatedResponse<EmailLog>>`.

| Param | Type | Default |
|-------|------|---------|
| `page` | `number` | `1` |
| `limit` | `number` | `20` |

## Error handling

```ts
import { MailingCoreError } from 'mailingcore-js'

try {
  await MailingCore.send({ ... })
} catch (err) {
  if (err instanceof MailingCoreError) {
    console.error(err.status)   // 429
    console.error(err.detail)   // "Monthly email quota exceeded"
  }
}
```

## Framework examples

### React

```tsx
import { MailingCore } from 'mailingcore-js'

MailingCore.init({ apiKey: import.meta.env.VITE_MAILINGCORE_KEY })

function ContactForm() {
  const handleSubmit = async (data) => {
    await MailingCore.send({
      to: data.email,
      subject: 'Thanks for contacting us!',
      htmlBody: `<p>Hi ${data.name}, we received your message.</p>`,
    })
  }
}
```

### Node.js

```ts
import { MailingCore } from 'mailingcore-js'

MailingCore.init({ apiKey: process.env.MAILINGCORE_KEY })

await MailingCore.send({
  to: 'admin@example.com',
  subject: 'Nightly report',
  htmlBody: '<p>Report attached.</p>',
})
```

## Bundle size

- ESM: ~2.3 KB gzipped ~1 KB
- CJS: ~3.4 KB
- Zero npm dependencies

## Security

Never expose a **live** API key (`mc_live_...`) in client-side code shipped to browsers.
Use a backend proxy or scoped test keys (`mc_test_...`) during development.
Rotate keys from **Dashboard → Settings → API Keys** if a key is leaked.

## Contributing

This repository is synced from the MailingCore monorepo on each SDK release (`sdk-v*` tag).
For bugs or feature requests, open an [issue](https://github.com/ariferndz/mailingcore-sdk/issues).

## License

MIT — [FastCore Solutions](https://fastcore.es)
