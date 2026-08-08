import { Router } from 'express';
import { authenticate, authorize } from './auth.middleware.js';
import {
  changePasswordSchema,
  createAccountSchema,
  linkMemberSchema,
  profileListQuerySchema,
  updateOwnProfileSchema,
  updateRoleSchema,
  updateStatusSchema,
  userIdSchema,
} from './auth.schema.js';
import type { AuthServicePort, ProfileServicePort } from './auth.types.js';

export function createAuthRouter(authService: AuthServicePort): Router {
  const router = Router();
  router.use(authenticate(authService));

  router.get('/me', (req, res) => {
    res.status(200).json({ data: publicContext(req.auth!) });
  });

  router.post('/logout', async (req, res) => {
    await authService.logout(req.auth!.accessToken);
    res.status(204).send();
  });

  router.patch('/password', async (req, res) => {
    const { password } = changePasswordSchema.parse(req.body);
    if (!authService.changePassword) {
      throw new Error('Auth service belum mendukung perubahan kata sandi.');
    }
    await authService.changePassword(req.auth!, password);
    res.status(204).send();
  });

  return router;
}

export function createProfileRouter(
  authService: AuthServicePort,
  profileService: ProfileServicePort,
): Router {
  const router = Router();
  router.use(authenticate(authService));

  router.get('/', authorize('master_admin'), async (req, res) => {
    const filters = profileListQuerySchema.parse(req.query);
    const result = profileService.listManagedProfiles
      ? await profileService.listManagedProfiles(req.auth!, filters)
      : await profileService.listProfiles(req.auth!, filters.page, filters.limit);
    res.status(200).json({
      data: result.items,
      pagination: { page: result.page, limit: result.limit, total: result.total },
    });
  });

  router.post('/', authorize('master_admin'), async (req, res) => {
    if (!profileService.createAccount) throw new Error('Account service belum tersedia.');
    const account = await profileService.createAccount(req.auth!, createAccountSchema.parse(req.body));
    res.status(201).json({ data: account });
  });

  router.get('/me', async (req, res) => {
    const context = await profileService.getOwnContext(req.auth!);
    res.status(200).json({ data: publicContext(context) });
  });

  router.patch('/me', async (req, res) => {
    const input = updateOwnProfileSchema.parse(req.body);
    const profile = await profileService.updateOwnProfile(req.auth!, input);
    res.status(200).json({ data: profile });
  });

  router.patch('/:userId/role', authorize('master_admin'), async (req, res) => {
    const userId = userIdSchema.parse(req.params['userId']);
    const { role } = updateRoleSchema.parse(req.body);
    await profileService.setRole(req.auth!, userId, role);
    res.status(200).json({ data: { userId, role } });
  });

  router.patch('/:userId/status', authorize('master_admin'), async (req, res) => {
    const userId = userIdSchema.parse(req.params['userId']);
    const { isActive } = updateStatusSchema.parse(req.body);
    const profile = await profileService.setActive(req.auth!, userId, isActive);
    res.status(200).json({ data: profile });
  });

  router.post(
    '/:userId/link-member',
    authorize('master_admin', 'librarian'),
    async (req, res) => {
      const userId = userIdSchema.parse(req.params['userId']);
      const { memberId } = linkMemberSchema.parse(req.body);
      await profileService.linkMember(req.auth!, userId, memberId);
      res.status(200).json({ data: { userId, memberId } });
    },
  );

  router.post('/:userId/invitations', authorize('master_admin'), async (req, res) => {
    if (!profileService.sendInvitation) throw new Error('Invitation service belum tersedia.');
    await profileService.sendInvitation(req.auth!, userIdSchema.parse(req.params['userId']));
    res.status(204).send();
  });

  router.post('/:userId/recovery-emails', authorize('master_admin'), async (req, res) => {
    if (!profileService.sendRecoveryEmail) throw new Error('Recovery service belum tersedia.');
    await profileService.sendRecoveryEmail(req.auth!, userIdSchema.parse(req.params['userId']));
    res.status(204).send();
  });

  return router;
}

function publicContext(context: NonNullable<Express.Request['auth']>) {
  return {
    user: context.user,
    profile: context.profile,
    member: context.member,
  };
}
