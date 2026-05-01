import { Router } from 'express';
import { authenticateToken } from '../core/middleware/authenticateToken';
import { checkoutCard, checkoutCash } from '../core/checkout/controllers/Checkout.controller';
import { checkoutPix } from '../core/checkout/controllers/Pix.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Checkout
 *   description: Processamento de pagamentos e compra de créditos
 */

/**
 * @swagger
 * /checkout/card:
 *   post:
 *     summary: Checkout com cartão de crédito. Only Authenticated
 *     tags: [Checkout]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [studentId, products, payment]
 *             properties:
 *               studentId:
 *                 type: string
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId: { type: string }
 *                     quantity: { type: number }
 *               payment:
 *                 type: object
 *                 properties:
 *                   number: { type: string }
 *                   holder_name: { type: string }
 *                   exp_month: { type: string }
 *                   exp_year: { type: string }
 *                   cvv: { type: string }
 *                   installments: { type: number }
 *               billingAddress:
 *                 type: object
 *     responses:
 *       200:
 *         description: Pagamento processado com sucesso
 *       400:
 *         description: Dados inválidos
 *       500:
 *         description: Erro ao processar pagamento
 */
router.post('/card', authenticateToken, checkoutCard);

/**
 * @swagger
 * /checkout/cash:
 *   post:
 *     summary: Checkout em dinheiro. Only Authenticated
 *     tags: [Checkout]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [studentId, products]
 *             properties:
 *               studentId: { type: string }
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId: { type: string }
 *                     quantity: { type: number }
 *               cash:
 *                 type: object
 *                 properties:
 *                   description: { type: string }
 *                   confirm: { type: boolean }
 *     responses:
 *       200:
 *         description: Pagamento em dinheiro registrado com sucesso
 */
router.post('/cash', authenticateToken, checkoutCash);

/**
 * @swagger
 * /checkout/pix:
 *   post:
 *     summary: Checkout via PIX. Only Authenticated
 *     tags: [Checkout]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [studentId, products]
 *             properties:
 *               studentId: { type: string }
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId: { type: string }
 *                     quantity: { type: number }
 *               pix:
 *                 type: object
 *                 properties:
 *                   expires_in: { type: number }
 *     responses:
 *       200:
 *         description: QR Code PIX gerado. Aguardando pagamento.
 */
router.post('/pix', authenticateToken, checkoutPix);
// /pix/webhook is mounted as a public route in routes/index.ts (before resolveTenant)

export default router;