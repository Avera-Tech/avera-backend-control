import { Router } from 'express';
import { authenticateToken } from '../core/middleware/authenticateToken';
import { checkPermissions } from '../core/middleware/checkPermissions';
import { UserController } from '../core/users/controllers/UserController';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Gerenciamento de usuários do CT (empregados e professores)
 */

/**
 * GET /users
 * Lista usuários com filtros opcionais: ?role=employee|teacher|admin &active=true|false &search=nome
 */
router.get(
  '/',
  authenticateToken,
  checkPermissions(['users:list']),
  UserController.list
);

/**
 * GET /users/:id
 * Busca usuário por ID
 */
router.get(
  '/:id',
  authenticateToken,
  checkPermissions(['users:read']),
  UserController.getById
);

/**
 * POST /users
 * Cria um novo usuário (empregado ou professor)
 * Body: { name, email, password, role: 'employee'|'teacher'|'admin', active? }
 */
router.post(
  '/',
  authenticateToken,
  checkPermissions(['users:create']),
  UserController.create
);

/**
 * PUT /users/:id
 * Atualiza dados de um usuário
 * Body: { name?, email?, role?, active? }
 */
router.put(
  '/:id',
  authenticateToken,
  checkPermissions(['users:update']),
  UserController.update
);

/**
 * DELETE /users/:id
 * Desativa um usuário (soft delete)
 */
router.delete(
  '/:id',
  authenticateToken,
  checkPermissions(['users:delete']),
  UserController.remove
);

/**
 * PATCH /users/:id/activate
 * Reativa um usuário desativado
 */
router.patch(
  '/:id/activate',
  authenticateToken,
  checkPermissions(['users:update']),
  UserController.activate
);

/**
 * PATCH /users/me/password
 * Usuário logado altera a própria senha
 */
router.patch(
  '/me/password',
  authenticateToken,
  UserController.changePassword
);

/**
 * PATCH /users/:id/reset-password
 * Admin redefine a senha de qualquer usuário
 */
router.patch(
  '/:id/reset-password',
  authenticateToken,
  checkPermissions(['users:update']),
  UserController.resetPassword
);

export default router;