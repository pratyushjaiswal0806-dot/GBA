import { Router } from 'express';

export function createAuthRouter({ requireAuth }) {
  const router = Router();

  router.get('/auth/me', requireAuth, (request, response) => {
    const { id, name, role, wardId, wardName } = request.user;
    response.json({ id, name, role, wardId, wardName });
  });

  return router;
}
