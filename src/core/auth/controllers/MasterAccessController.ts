import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AuthService } from '../services/AuthService';

export class MasterAccessController {
  static async exchange(req: Request, res: Response): Promise<Response> {
    try {
      const { master_token, clientId } = req.body;

      if (!master_token || !clientId) {
        return res.status(400).json({ success: false, error: 'master_token e clientId são obrigatórios' });
      }

      const secret = process.env.MASTER_ACCESS_SECRET;
      if (!secret) {
        return res.status(500).json({ success: false, error: 'MASTER_ACCESS_SECRET não configurado' });
      }

      let payload: any;
      try {
        payload = jwt.verify(master_token, secret);
      } catch {
        return res.status(401).json({ success: false, error: 'Token de acesso master inválido ou expirado' });
      }

      if (payload.type !== 'master_access' || payload.clientId !== clientId) {
        return res.status(403).json({ success: false, error: 'Token não autorizado para este tenant' });
      }

      const token = AuthService.generateAuthToken({
        staffId: 0,
        email: payload.email ?? 'master@avera.tech',
        isMaster: true,
      });

      return res.status(200).json({ success: true, token, isMaster: true });
    } catch (err: any) {
      console.error('[MasterAccess] Erro:', err);
      return res.status(500).json({ success: false, error: 'Erro interno' });
    }
  }
}
