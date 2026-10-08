import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiBase, deleteRoom, getRoomInfo } from './api';
import { loadJoin } from './storage';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiBase', () => {
  it('falls back to same-origin when VITE_SERVER_URL is unset', () => {
    expect(apiBase()).toBe('');
  });
});

describe('getRoomInfo', () => {
  it('maps 404 to not-found', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 404 }))
    );
    expect(await getRoomInfo('xxxxxxxx')).toEqual({ kind: 'not-found' });
  });

  it('maps network failure to unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('down');
      })
    );
    const result = await getRoomInfo('xxxxxxxx');
    expect(result.kind).toBe('unreachable');
  });

  it('returns public info on 200', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ id: 'abcdefgh', status: 'waiting' }))
    );
    const result = await getRoomInfo('abcdefgh');
    expect(result.kind).toBe('ready');
  });
});

describe('deleteRoom', () => {
  it('reports ok on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ ok: true }))
    );
    expect(await deleteRoom('abcdefgh', 'token')).toEqual({ ok: true });
  });

  it('passes through forbidden with message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ message: 'nope' }, { status: 403 }))
    );
    const result = await deleteRoom('abcdefgh', 'wrong');
    expect(result).toMatchObject({ ok: false, status: 403 });
  });
});

describe('storage without DOM', () => {
  it('loadJoin returns null when storage is unavailable', () => {
    expect(loadJoin('xxxxxxxx')).toBe(null);
  });
});
