import { Router } from 'express';

import { CatalystService, listCatalystModules } from '../catalyst';
import { hasDatabaseConnection } from '../utils/db';

export function createCatalystRouter(service: CatalystService): Router {
  const router = Router();

  router.get('/health', async (_req, res) => {
    res.status(200).json({
      ok: true,
      service: 'catalyst',
      mode: 'hosted-discord-season-service',
      persistence: hasDatabaseConnection() ? 'postgres' : 'json',
      timestamp: new Date().toISOString(),
    });
  });

  router.get('/guilds/:guildId', async (req, res) => {
    const overview = await service.getGuildOverview(req.params.guildId);
    if (!overview) {
      res.status(404).json({ error: 'Guild not configured' });
      return;
    }

    res.status(200).json({ overview });
  });

  router.get('/guilds/:guildId/leaderboard', async (req, res) => {
    const overview = await service.getGuildOverview(req.params.guildId);
    if (!overview?.activeSeason) {
      res.status(404).json({ error: 'No active season' });
      return;
    }

    const leaderboard = await service.getLeaderboard(req.params.guildId);
    const events = await service.getRecentEvents(req.params.guildId);
    res.status(200).json({
      season: overview.activeSeason,
      leaderboard,
      events,
    });
  });

  router.get('/modules', async (_req, res) => {
    res.status(200).json({
      modules: listCatalystModules(),
      pluginReady: true,
    });
  });

  return router;
}
