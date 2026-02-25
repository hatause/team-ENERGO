import type { FastifyPluginAsync } from 'fastify';
import {
  roomFinderHealth,
  findFreeRooms,
  getAuditories,
  getJournal,
  type FindRoomRequest
} from '../services/room-finder-service.js';

const roomsRoutes: FastifyPluginAsync = async (fastify) => {
  /* ── Health ── */
  fastify.get('/rooms/health', async (_req, reply) => {
    try {
      const data = await roomFinderHealth();
      return reply.send(data);
    } catch (err: any) {
      return reply.status(502).send({ error: 'Java server unavailable', details: err.message });
    }
  });

  /* ── All auditories ── */
  fastify.get('/rooms/auditories', async (_req, reply) => {
    try {
      const data = await getAuditories();
      return reply.send(data);
    } catch (err: any) {
      return reply.status(502).send({ error: 'Failed to fetch auditories', details: err.message });
    }
  });

  /* ── Occupancy journal ── */
  fastify.get<{ Querystring: { audId?: string } }>('/rooms/journal', async (req, reply) => {
    try {
      const audId = req.query.audId ? Number(req.query.audId) : undefined;
      const data = await getJournal(audId);
      return reply.send(data);
    } catch (err: any) {
      return reply.status(502).send({ error: 'Failed to fetch journal', details: err.message });
    }
  });

  /* ── Find free rooms (bridge to C++/YOLO) ── */
  fastify.post<{ Body: FindRoomRequest }>('/rooms/find-free', async (req, reply) => {
    const body = req.body;

    if (!body.location_id || !body.start_at || !body.duration_minutes) {
      return reply.status(400).send({ error: 'location_id, start_at and duration_minutes are required' });
    }

    try {
      const data = await findFreeRooms({
        ...body,
        requested_by: { telegram_user_id: 0, user_id: (req as any).userId ?? 'web' }
      });
      return reply.send(data);
    } catch (err: any) {
      return reply.status(502).send({ error: 'Failed to find rooms', details: err.message });
    }
  });
};

export default roomsRoutes;
