import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type FetchMock = ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('MailingCore SDK', () => {
  let fetchMock: FetchMock;

  beforeEach(() => {
    vi.resetModules();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function loadSdk() {
    return import('./index');
  }

  describe('init', () => {
    it('stores apiKey with default baseUrl and timeout', async () => {
      const { MailingCore } = await loadSdk();

      MailingCore.init({ apiKey: 'mc_test_abc123' });

      expect(MailingCore.config).toEqual({
        apiKey: 'mc_test_abc123',
        baseUrl: 'https://api.mailingcore.com',
        timeout: 30_000,
      });
    });

    it('accepts custom baseUrl and timeout', async () => {
      const { MailingCore } = await loadSdk();

      MailingCore.init({
        apiKey: 'mc_live_xyz',
        baseUrl: 'https://custom.example.com',
        timeout: 5_000,
      });

      expect(MailingCore.config).toEqual({
        apiKey: 'mc_live_xyz',
        baseUrl: 'https://custom.example.com',
        timeout: 5_000,
      });
    });
  });

  describe('send', () => {
    it('throws when not initialized', async () => {
      const { MailingCore } = await loadSdk();

      await expect(
        MailingCore.send({
          to: 'user@example.com',
          subject: 'Hello',
          htmlBody: '<p>Hi</p>',
        }),
      ).rejects.toThrow(/not initialized/i);
    });

    it('POSTs to /emails/send with auth and body', async () => {
      const { MailingCore } = await loadSdk();
      const payload = {
        to: 'user@example.com',
        subject: 'Welcome',
        htmlBody: '<h1>Hello</h1>',
        tags: ['onboarding'],
      };
      const apiResponse = {
        id: 'log_123',
        status: 'QUEUED' as const,
        queued: true,
        position: 2,
      };

      fetchMock.mockResolvedValueOnce(jsonResponse(apiResponse));

      MailingCore.init({
        apiKey: 'mc_test_send',
        baseUrl: 'https://api.example.test',
      });

      const result = await MailingCore.send(payload);

      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://api.example.test/emails/send');
      expect(init.method).toBe('POST');
      expect(init.headers).toMatchObject({
        'Content-Type': 'application/json',
        Authorization: 'Bearer mc_test_send',
      });
      expect(JSON.parse(init.body as string)).toEqual(payload);
      expect(result).toEqual(apiResponse);
    });

    it('throws MailingCoreError on non-OK responses', async () => {
      const { MailingCore, MailingCoreError } = await loadSdk();

      fetchMock.mockResolvedValueOnce(
        jsonResponse(
          { type: 'quota_exceeded', detail: 'Monthly quota reached' },
          429,
        ),
      );

      MailingCore.init({ apiKey: 'mc_test_err' });

      await expect(
        MailingCore.send({
          to: 'user@example.com',
          subject: 'Hello',
          htmlBody: '<p>Hi</p>',
        }),
      ).rejects.toMatchObject({
        name: 'MailingCoreError',
        status: 429,
        type: 'quota_exceeded',
        detail: 'Monthly quota reached',
      });

      expect(MailingCoreError).toBeDefined();
    });
  });

  describe('sendTemplate', () => {
    it('throws when not initialized', async () => {
      const { MailingCore } = await loadSdk();

      await expect(
        MailingCore.sendTemplate({ slug: 'welcome', to: 'user@example.com' }),
      ).rejects.toThrow(/not initialized/i);
    });

    it('POSTs to /emails/send-template with slug and data', async () => {
      const { MailingCore } = await loadSdk();
      const payload = {
        slug: 'welcome-email',
        to: 'user@example.com',
        data: { userName: 'Ariel' },
      };
      const apiResponse = {
        id: 'log_tpl',
        status: 'QUEUED' as const,
        queued: true,
        position: 0,
      };

      fetchMock.mockResolvedValueOnce(jsonResponse(apiResponse));

      MailingCore.init({
        apiKey: 'mc_test_tpl',
        baseUrl: 'https://api.example.test',
      });

      const result = await MailingCore.sendTemplate(payload);

      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://api.example.test/emails/send-template');
      expect(init.method).toBe('POST');
      expect(init.headers).toMatchObject({
        'Content-Type': 'application/json',
        Authorization: 'Bearer mc_test_tpl',
      });
      expect(JSON.parse(init.body as string)).toEqual(payload);
      expect(result).toEqual(apiResponse);
    });

    it('surfaces MailingCoreError when the slug is not found', async () => {
      const { MailingCore } = await loadSdk();

      fetchMock.mockResolvedValueOnce(
        jsonResponse({ detail: 'No existe plantilla con slug "nope"' }, 404),
      );

      MailingCore.init({ apiKey: 'mc_test_tpl' });

      await expect(
        MailingCore.sendTemplate({ slug: 'nope', to: 'user@example.com' }),
      ).rejects.toMatchObject({ name: 'MailingCoreError', status: 404 });
    });
  });

  describe('getLogs', () => {
    it('throws when not initialized', async () => {
      const { MailingCore } = await loadSdk();

      await expect(MailingCore.getLogs()).rejects.toThrow(/not initialized/i);
    });

    it('GETs /emails/logs without query string by default', async () => {
      const { MailingCore } = await loadSdk();
      const apiResponse = {
        data: [
          {
            id: 'log_1',
            toEmail: 'a@example.com',
            subject: 'Test',
            status: 'SENT',
            provider: 'ses',
            messageId: 'msg-1',
            createdAt: '2026-06-18T10:00:00.000Z',
            tags: [],
          },
        ],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };

      fetchMock.mockResolvedValueOnce(jsonResponse(apiResponse));

      MailingCore.init({
        apiKey: 'mc_test_logs',
        baseUrl: 'https://api.example.test',
      });

      const result = await MailingCore.getLogs();

      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://api.example.test/emails/logs');
      expect(init.method).toBeUndefined();
      expect(init.headers).toMatchObject({
        Authorization: 'Bearer mc_test_logs',
      });
      expect(result).toEqual(apiResponse);
    });

    it('passes page and limit as query params', async () => {
      const { MailingCore } = await loadSdk();

      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          data: [],
          meta: { page: 2, limit: 50, total: 0, totalPages: 0 },
        }),
      );

      MailingCore.init({ apiKey: 'mc_test_logs' });

      await MailingCore.getLogs({ page: 2, limit: 50 });

      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://api.mailingcore.com/emails/logs?page=2&limit=50');
    });
  });
});
