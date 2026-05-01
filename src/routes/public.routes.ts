import { Router, Request, Response } from 'express';
import TenantConfig from '../master/models/TenantConfig.model';
import Theme from '../master/models/Theme.model';

const router = Router();

// GET /public/tenant/:clientId
// Endpoint público — sem X-Client-Id, sem JWT.
// Usado pelo frontend antes do login para validar o tenant e carregar o tema.
router.get('/tenant/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    const tenant = await TenantConfig.findOne({
      where: { clientId, isActive: true },
    });

    if (!tenant) {
      return res.status(404).json({ found: false });
    }

    // Tema específico do tenant (quando adicionarmos themeId ao TenantConfig)
    // ou fallback para o tema padrão do sistema
    const theme = await Theme.findOne({
      where: { active: true, isDefault: true },
    });

    return res.status(200).json({
      found: true,
      name: clientId,
      primaryColor:     theme?.primaryColor     ?? '#3B82F6',
      secondaryColor:   theme?.secondaryColor   ?? '#6c757d',
      accentColor:      theme?.accentColor      ?? '#F59E0B',
      backgroundColor:  theme?.backgroundColor  ?? '#ffffff',
      textColor:        theme?.textColor        ?? '#212529',
      logo:             theme?.logo             ?? null,
      favicon:          theme?.favicon          ?? null,
    });
  } catch (err: any) {
    console.error('[Public] Erro ao buscar tenant:', err);
    return res.status(500).json({ found: false });
  }
});

export default router;
