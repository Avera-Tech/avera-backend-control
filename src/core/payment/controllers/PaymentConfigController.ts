import { Request, Response } from 'express';
import { encrypt, decrypt } from '../../../utils/crypto';

function maskKey(value: string): string {
  if (value.length <= 8) return '••••••••';
  return value.slice(0, 6) + '••••••••' + value.slice(-4);
}

export async function getPaymentConfig(req: Request, res: Response): Promise<Response> {
  try {
    const { PaymentConfig } = req.tenantDb;
    const config = await PaymentConfig.findOne({ where: { gateway: 'pagarme' } });

    if (!config) {
      return res.json({ success: true, data: null });
    }

    return res.json({
      success: true,
      data: {
        gateway:              config.gateway,
        mode:                 config.mode,
        active:               config.active,
        apiKeyMasked:         maskKey(decrypt(config.apiKey)),
        webhookSecretMasked:  config.webhookSecret ? maskKey(decrypt(config.webhookSecret)) : null,
        configured:           true,
      },
    });
  } catch (err) {
    console.error('getPaymentConfig error:', err);
    return res.status(500).json({ success: false, message: 'Erro ao buscar configuração de pagamento' });
  }
}

export async function upsertPaymentConfig(req: Request, res: Response): Promise<Response> {
  try {
    const { PaymentConfig } = req.tenantDb;
    const { gateway = 'pagarme', mode, apiKey, webhookSecret } = req.body;

    if (!mode || !['sandbox', 'production'].includes(mode)) {
      return res.status(400).json({ success: false, message: 'mode deve ser "sandbox" ou "production"' });
    }

    const existing = await PaymentConfig.findOne({ where: { gateway } });

    if (existing) {
      const updates: Record<string, unknown> = { mode };
      if (apiKey)         updates.apiKey         = encrypt(apiKey);
      if (webhookSecret)  updates.webhookSecret  = encrypt(webhookSecret);
      await existing.update(updates);
    } else {
      if (!apiKey) {
        return res.status(400).json({ success: false, message: 'apiKey é obrigatória na primeira configuração' });
      }
      await PaymentConfig.create({
        gateway,
        mode,
        apiKey:        encrypt(apiKey),
        webhookSecret: webhookSecret ? encrypt(webhookSecret) : null,
      });
    }

    return res.json({ success: true, message: 'Configuração de pagamento salva com sucesso' });
  } catch (err) {
    console.error('upsertPaymentConfig error:', err);
    return res.status(500).json({ success: false, message: 'Erro ao salvar configuração de pagamento' });
  }
}
