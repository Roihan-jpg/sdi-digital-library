import { Router } from 'express';
import { authenticate, authorize } from './auth.middleware.js';
import {
  changePasswordSchema,
  createAccountSchema,
  linkMemberSchema,
  localLoginSchema,
  profileListQuerySchema,
  updatePasswordSchema,
  updateAccountSchema,
  updateOwnProfileSchema,
  updateRoleSchema,
  updateStatusSchema,
  userIdSchema,
} from './auth.schema.js';
import type { AuthServicePort, ProfileServicePort } from './auth.types.js';

export function createAuthRouter(authService: AuthServicePort): Router {
  const router = Router();

  router.post('/local-login', async (req, res) => {
    if (!authService.loginLocal) throw new Error('Login akun lokal belum tersedia.');
    const { identifier, password } = localLoginSchema.parse(req.body);
    const result = await authService.loginLocal(identifier, password);
    res.status(200).json({ data: result });
  });

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
    const account = await profileService.createAccount(
      req.auth!,
      createAccountSchema.parse(req.body),
    );
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

  router.patch('/:userId', authorize('master_admin'), async (req, res) => {
    if (!profileService.updateAccount) throw new Error('Pengubahan akun belum tersedia.');
    const userId = userIdSchema.parse(req.params['userId']);
    const profile = await profileService.updateAccount(
      req.auth!,
      userId,
      updateAccountSchema.parse(req.body),
    );
    res.status(200).json({ data: profile });
  });

  router.delete('/:userId', authorize('master_admin'), async (req, res) => {
    if (!profileService.deleteAccount) throw new Error('Penghapusan akun belum tersedia.');
    await profileService.deleteAccount(req.auth!, userIdSchema.parse(req.params['userId']));
    res.status(204).send();
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

  router.patch('/:userId/password', authorize('master_admin'), async (req, res) => {
    if (!profileService.updatePassword) throw new Error('Pengaturan kata sandi akun belum tersedia.');
    await profileService.updatePassword(
      req.auth!,
      userIdSchema.parse(req.params['userId']),
      updatePasswordSchema.parse(req.body).password,
    );
    res.status(204).send();
  });

  router.post('/:userId/link-member', authorize('master_admin', 'librarian'), async (req, res) => {
    const userId = userIdSchema.parse(req.params['userId']);
    const { memberId } = linkMemberSchema.parse(req.body);
    await profileService.linkMember(req.auth!, userId, memberId);
    res.status(200).json({ data: { userId, memberId } });
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
