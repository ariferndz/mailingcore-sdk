// ─── Types ─────────────────────────────────────────────────────────

export interface MailingCoreConfig {
  /** Your MailingCore API key (mc_live_xxx or mc_test_xxx) */
  apiKey: string;
  /** API base URL. Defaults to https://api.mailingcore.com */
  baseUrl?: string;
  /** Request timeout in ms. Defaults to 30000 */
  timeout?: number;
}

export interface SendEmailParams {
  /** Recipient email address */
  to: string;
  /** Email subject line (max 998 chars) */
  subject: string;
  /** HTML body */
  htmlBody: string;
  /** Plain text fallback (auto-generated from HTML if omitted) */
  textBody?: string;
  /** Verified sender email */
  fromEmail?: string;
  /** Sender display name */
  fromName?: string;
  /** Reply-To address */
  replyTo?: string;
  /** Tags for filtering in dashboard */
  tags?: string[];
  /** Arbitrary metadata */
  metadata?: Record<string, unknown>;
  /** Idempotency key — duplicate sends with same key return cached result */
  idempotencyKey?: string;
  /** Template version ID (if using stored templates) */
  templateVersionId?: string;
  /** Project ID for multi-project tenants */
  projectId?: string;
}

export interface SendTemplateParams {
  /** Template slug (unique per tenant; set in the dashboard template editor) */
  slug: string;
  /** Recipient email address */
  to: string;
  /** Variables interpolated into the template's `{{var}}` placeholders */
  data?: Record<string, string>;
  /** Verified sender email (overrides the template/project default) */
  fromEmail?: string;
  /** Sender display name */
  fromName?: string;
  /** Reply-To address */
  replyTo?: string;
  /** Project ID for multi-project tenants */
  projectId?: string;
  /** Idempotency key — duplicate sends with same key return cached result */
  idempotencyKey?: string;
  /** Tags for filtering in dashboard */
  tags?: string[];
  /** Arbitrary metadata */
  metadata?: Record<string, unknown>;
}

export interface SendEmailResponse {
  /** Email log ID (use to query delivery status) */
  id: string;
  /** Current status: QUEUED, SENT, FAILED */
  status: 'QUEUED' | 'SENT' | 'FAILED';
  /** Whether this was enqueued (async) vs sent synchronously */
  queued: boolean;
  /** Provider message ID (available after delivery) */
  messageId?: string;
  /** Queue position (only when queued=true) */
  position?: number;
  /** Provider used: ses or smtp */
  provider?: 'ses' | 'smtp';
}

export interface EmailLog {
  id: string;
  toEmail: string;
  subject: string;
  status: string;
  provider: string | null;
  messageId: string | null;
  createdAt: string;
  tags: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MailingCoreErrorResponse {
  type?: string;
  title?: string;
  detail?: string;
  status?: number;
  message?: string;
}

// ─── Error class ───────────────────────────────────────────────────

export class MailingCoreError extends Error {
  /** HTTP status code */
  status: number;
  /** Machine-readable error type (RFC 7807) */
  type?: string;
  /** Human-readable detail */
  detail?: string;

  constructor(response: MailingCoreErrorResponse, status: number) {
    super(response.detail ?? response.title ?? response.message ?? `API error: ${status}`);
    this.name = 'MailingCoreError';
    this.status = status;
    this.type = response.type;
    this.detail = response.detail;
  }
}

// ─── Internal state ────────────────────────────────────────────────

let config: Required<MailingCoreConfig> | null = null;

function getConfig(): Required<MailingCoreConfig> {
  if (!config) {
    throw new Error(
      'MailingCore not initialized. Call MailingCore.init({ apiKey: "mc_live_xxx" }) first.',
    );
  }
  return config;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const cfg = getConfig();
  const url = `${cfg.baseUrl}${path}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeout);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
        ...options.headers,
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: res.statusText }));
      throw new MailingCoreError(body, res.status);
    }

    return res.json();
  } catch (err) {
    if (err instanceof MailingCoreError) throw err;
    if ((err as Error).name === 'AbortError') {
      throw new Error(`Request to ${url} timed out after ${cfg.timeout}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Public API ────────────────────────────────────────────────────

/**
 * Initialize the MailingCore SDK.
 *
 * @example
 * ```ts
 * import { MailingCore } from '@mailingcore/sdk'
 *
 * MailingCore.init({
 *   apiKey: 'mc_live_abc123...',
 * })
 * ```
 */
function init(cfg: MailingCoreConfig): void {
  config = {
    apiKey: cfg.apiKey,
    baseUrl: cfg.baseUrl ?? 'https://api.mailingcore.com',
    timeout: cfg.timeout ?? 30_000,
  };
}

/**
 * Send a transactional email.
 *
 * By default, emails are enqueued for asynchronous delivery.
 * Use `?sync=true` on the baseUrl for synchronous delivery (development).
 *
 * @example
 * ```ts
 * const result = await MailingCore.send({
 *   to: 'user@example.com',
 *   subject: 'Welcome!',
 *   htmlBody: '<h1>Hello!</h1>',
 * })
 * console.log(result.id)        // "clx..."
 * console.log(result.status)    // "QUEUED"
 * console.log(result.position)  // 3 (queue position)
 * ```
 */
async function send(params: SendEmailParams): Promise<SendEmailResponse> {
  return request<SendEmailResponse>('/emails/send', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/**
 * Send an email using a published template, resolved by `slug` and rendered
 * with `data` (interpolated into `{{var}}` placeholders). The template must
 * have a PUBLISHED version. Enqueued for asynchronous delivery by default.
 *
 * @example
 * ```ts
 * const result = await MailingCore.sendTemplate({
 *   slug: 'welcome-email',
 *   to: 'user@example.com',
 *   data: { userName: 'Ariel' },
 * })
 * console.log(result.id)      // "clx..."
 * console.log(result.status)  // "QUEUED"
 * ```
 */
async function sendTemplate(
  params: SendTemplateParams,
): Promise<SendEmailResponse> {
  return request<SendEmailResponse>('/emails/send-template', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/**
 * Retrieve email send logs for the authenticated tenant.
 *
 * @example
 * ```ts
 * const logs = await MailingCore.getLogs({ page: 1, limit: 20 })
 * console.log(logs.data.length)    // 20
 * console.log(logs.meta.total)     // 1523
 * ```
 */
async function getLogs(
  opts: { page?: number; limit?: number } = {},
): Promise<PaginatedResponse<EmailLog>> {
  const params = new URLSearchParams();
  if (opts.page) params.set('page', String(opts.page));
  if (opts.limit) params.set('limit', String(opts.limit));

  const qs = params.toString();
  return request<PaginatedResponse<EmailLog>>(`/emails/logs${qs ? `?${qs}` : ''}`);
}

// ─── Export ────────────────────────────────────────────────────────

export const MailingCore = {
  init,
  send,
  sendTemplate,
  getLogs,
  /** Current config (null if not initialized) */
  get config() {
    return config;
  },
};

export default MailingCore;
