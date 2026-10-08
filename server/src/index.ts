import cors from 'cors';
import express from 'express';
import { createServer, type Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from 'checkmate-shared';
import { InMemoryGameRepository } from './rooms/repository.js';
import { RoomService } from './rooms/service.js';
import { RateLimiter } from './rooms/rateLimit.js';
import { createRoomRouter } from './http/routes.js';
import { attachSockets } from './sockets/handler.js';

export const PORT = Number(process.env.PORT ?? 3001);
export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

export function parseOrigins(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface AppContext {
  app: express.Express;
  httpServer: HttpServer;
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
  service: RoomService;
  limiter: RateLimiter;
}

export function createApp(opts?: { clientOrigin?: string }): AppContext {
  const origins = parseOrigins(opts?.clientOrigin ?? CLIENT_ORIGIN);
  if (origins.includes('*')) {
    throw new Error('Refusing to start with wildcard CLIENT_ORIGIN');
  }
  const corsOrigin = origins.length === 1 ? origins[0] : origins;

  const app = express();
  app.use(cors({ origin: corsOrigin as string | string[], maxAge: 600 }));
  app.use(express.json({ limit: '10kb', strict: true }));
  // Minimal hardening headers without a new dependency.
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });

  const repo = new InMemoryGameRepository();
  const service = new RoomService(repo);
  const limiter = new RateLimiter();

  const health = (_req: express.Request, res: express.Response) => {
    res.json({ ok: true, service: 'checkmate-server', time: new Date().toISOString() });
  };
  app.get('/health', health);
  app.get('/api/health', health);
  const httpServer = createServer(app);
  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
    httpServer,
    {
      cors: { origin: corsOrigin as string | string[], methods: ['GET', 'POST'] },
    }
  );
  app.use(
    '/api',
    createRoomRouter(service, origins[0] ?? 'http://localhost:5173', {
      onRoomDeleted: (roomId) => {
        io.to(roomId).emit('room_closed', { reason: 'cancelled' });
      },
    })
  );
  attachSockets(io, service, limiter);

  return { app, httpServer, io, service, limiter };
}

// Sweep expired rooms every minute. Unref so it never holds the process open.
function startCleanup(service: RoomService): void {
  const timer = setInterval(() => {
    try {
      service.cleanup();
    } catch {
      // never crash the server from cleanup
    }
  }, 60_000);
  timer.unref?.();
}

const runningUnderTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
if (!runningUnderTest) {
  const ctx = createApp();
  startCleanup(ctx.service);
  ctx.httpServer.listen(PORT, () => {
    console.log(`checkmate-server listening on http://localhost:${PORT}`);
  });
}
