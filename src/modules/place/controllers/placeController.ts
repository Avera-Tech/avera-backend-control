import { Request, Response } from 'express';

export async function createPlace(req: Request, res: Response): Promise<Response> {
  try {
    const { Place } = req.tenantDb;
    const { name, address } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'name é obrigatório' });
    }

    const data = await Place.create({
      name: String(name).trim(),
      address: address ? String(address).trim() : undefined,
    });

    return res.status(201).json({ success: true, data, message: 'Local criado com sucesso' });
  } catch (err: unknown) {
    console.error('createPlace error:', err);
    const message = err instanceof Error ? err.message : undefined;
    return res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? message : 'Erro ao criar local',
    });
  }
}

export async function listPlaces(req: Request, res: Response): Promise<Response> {
  try {
    const { Place } = req.tenantDb;
    const where: Record<string, unknown> = {};
    if (req.query.active !== undefined) where.active = req.query.active === 'true';

    const data = await Place.findAll({ where, order: [['name', 'ASC']] });

    return res.json({ success: true, data });
  } catch (err: unknown) {
    console.error('listPlaces error:', err);
    return res.status(500).json({ success: false, message: 'Erro ao listar locais' });
  }
}

export async function updatePlace(req: Request, res: Response): Promise<Response> {
  try {
    const { Place } = req.tenantDb;
    const place = await Place.findByPk(Number(req.params.id));
    if (!place) return res.status(404).json({ success: false, message: 'Local não encontrado' });

    const { name, address, active } = req.body;
    const updates: Record<string, unknown> = {};

    if (name !== undefined) updates.name = String(name).trim();
    if (address !== undefined) updates.address = address ? String(address).trim() : null;
    if (active !== undefined) updates.active = active;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'Informe ao menos um campo para atualizar' });
    }

    await place.update(updates);

    return res.json({ success: true, data: place, message: 'Local atualizado com sucesso' });
  } catch (err: unknown) {
    console.error('updatePlace error:', err);
    return res.status(500).json({ success: false, message: 'Erro ao atualizar local' });
  }
}
