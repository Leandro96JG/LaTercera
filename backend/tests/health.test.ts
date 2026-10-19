import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Server } from 'http';
import { app } from '../src/index';

describe('Health Check Routes (/health y /api/health)', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          baseUrl = `http://localhost:${addr.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('debe responder 200 OK en /health con la información de la marca', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);

    const data = await res.json() as { status: string; brand: string; author: string; timestamp: string };
    expect(data.status).toBe('ok');
    expect(data.brand).toBe('LA TERCERA');
    expect(data.author).toBe('Jenifer "Yuyo" Espeche');
    expect(data.timestamp).toBeDefined();
  });

  it('debe responder 200 OK en /api/health para el orquestador de Railway', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);

    const data = await res.json() as { status: string; brand: string; author: string; timestamp: string };
    expect(data.status).toBe('ok');
    expect(data.brand).toBe('LA TERCERA');
    expect(data.author).toBe('Jenifer "Yuyo" Espeche');
    expect(data.timestamp).toBeDefined();
  });
});
