import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import type { Server } from 'http';
import { resolve } from 'path';
import type { Request, Response } from 'express';
import { CatalystService } from './catalyst';
import { listCatalystModules } from './catalyst/modules';
import { appConfig } from './config/appConfig';
import { buildDiscordInstallUrl } from './discord/install';
import { startCatalystDiscord } from './discord/runtime';
import pointsRouter from './routes/points';
import leaderboardRouter from './routes/leaderboard';
import { createCatalystRouter } from './routes/catalyst';
import { Logger } from './utils/logger';
import { closeDatabase, hasDatabaseConnection } from './utils/db';
import { renderLandingPage } from './web/landing';

const app = express();
const logger = new Logger('CatalystRuntime');
const catalystService = new CatalystService();
let server: Server | null = null;
let discordClient: Awaited<ReturnType<typeof startCatalystDiscord>> = null;
let shuttingDown = false;

app.use(cors());
app.use(express.json());
app.use('/assets', (express as any).static(resolve(process.cwd(), 'assets')));

app.get('/', async (req: any, res: any) => {
  const forwardedProto = typeof req.headers['x-forwarded-proto'] === 'string'
    ? req.headers['x-forwarded-proto'].split(',')[0].trim()
    : undefined;
  const protocol = forwardedProto || req.protocol || 'http';
  const host = req.headers.host || `localhost:${appConfig.port}`;
  const baseUrl = appConfig.publicBaseUrl || `${protocol}://${host}`;

  res.contentType('text/html; charset=utf-8');
  res.status(200).send(
    renderLandingPage({
      host,
      baseUrl,
      discordStatus: discordClient?.isReady() ? 'ready' : 'disabled-or-starting',
      persistence: hasDatabaseConnection() ? 'postgres' : 'json',
      timestamp: new Date().toISOString(),
      installReady: Boolean(appConfig.discordApplicationId),
      modules: listCatalystModules(),
    }),
  );
});

app.get('/invite', async (_req: Request, res: any) => {
  if (!appConfig.discordApplicationId) {
    res.status(503).json({
      ok: false,
      error: 'DISCORD_APPLICATION_ID is not configured yet.',
    });
    return;
  }

  res.status(302);
  res.setHeader('Location', buildDiscordInstallUrl(appConfig.discordApplicationId));
  res.end();
});

app.get('/health', async (_req: Request, res: Response) => {
  res.status(200).json({
    ok: true,
    service: 'catalyst',
    discord: discordClient?.isReady() ? 'ready' : 'disabled-or-starting',
    persistence: hasDatabaseConnection() ? 'postgres' : 'json',
    timestamp: new Date().toISOString(),
  });
});

app.use('/points', pointsRouter);
app.use('/leaderboard', leaderboardRouter);
app.use('/catalyst', createCatalystRouter(catalystService));

server = app.listen(appConfig.port, async () => {
  logger.info(`HTTP service running on port ${appConfig.port}`);
  try {
    discordClient = await startCatalystDiscord(catalystService);
  } catch (error) {
    logger.error('Discord runtime failed to boot. HTTP service is still available.', error);
  }
});

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  logger.info(`Received ${signal}. Shutting down Catalyst cleanly.`);

  if (server) {
    await new Promise<void>((resolve, reject) => {
      server?.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    }).catch((error) => {
      logger.error('HTTP shutdown failed.', error);
    });
  }

  if (discordClient) {
    discordClient.destroy();
  }

  await closeDatabase().catch((error) => {
    logger.error('Database shutdown failed.', error);
  });
}

process.on('SIGTERM', async () => {
  await shutdown('SIGTERM');
  process.exit(0);
});

process.on('SIGINT', async () => {
  await shutdown('SIGINT');
  process.exit(0);
});
