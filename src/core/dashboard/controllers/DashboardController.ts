import { Request, Response } from 'express';
import { Op, fn, col } from 'sequelize';

const PT_MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const DAY_LABELS = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];

function monthRange(year: number, month: number) {
  const from = new Date(year, month, 1);
  const to   = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { from, to };
}

export async function getDashboardData(req: Request, res: Response): Promise<Response> {
  try {
    const { Class, ClassStudent, ClientUser, Transaction, Item, Modality, Staff } = req.tenantDb;

    const now   = new Date();
    const today = now.toISOString().slice(0, 10);

    // Build last-6-months metadata
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { label: PT_MONTHS[d.getMonth()], ...monthRange(d.getFullYear(), d.getMonth()) };
    });

    const curMonthFrom = months[5].from.toISOString().slice(0, 10);
    const curMonthTo   = months[5].to.toISOString().slice(0, 10);

    // ─── 1. Receita mensal (last 6 months) ───────────────────────────────────
    const receita_mensal = await Promise.all(
      months.map(async ({ label, from, to }) => {
        const row = await Transaction.findOne({
          attributes: [[fn('SUM', col('amount')), 'total']],
          where: { closed: true, createdAt: { [Op.between]: [from, to] } },
          raw: true,
        }) as { total: string | null } | null;
        return { month: label, receita: row?.total ? Number(row.total) : 0 };
      })
    );

    // ─── 2. Modalidades (classes this month, % of total) ─────────────────────
    const classesMes = await Class.findAll({
      where: { date: { [Op.between]: [curMonthFrom, curMonthTo] } },
      attributes: ['modality_id'],
      include: [{ model: Modality, as: 'modality', attributes: ['name', 'color'] }],
      raw: true,
      nest: true,
    }) as any[];

    const modalMap: Record<number, { name: string; color: string; count: number }> = {};
    for (const c of classesMes) {
      const mid = c.modality_id;
      if (!mid) continue;
      if (!modalMap[mid]) modalMap[mid] = { name: c.modality?.name ?? 'Outros', color: c.modality?.color ?? '#999', count: 0 };
      modalMap[mid].count++;
    }
    const totalClassesMes = classesMes.length || 1;
    const modalidades = Object.values(modalMap)
      .sort((a, b) => b.count - a.count)
      .map((m) => ({ name: m.name, value: Math.round((m.count / totalClassesMes) * 100), color: m.color }));

    // ─── 3. Frequência semanal (Mon → Sun of current week) ───────────────────
    const weekStart = new Date(now);
    const dow = weekStart.getDay();
    weekStart.setDate(weekStart.getDate() - (dow === 0 ? 6 : dow - 1));
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    const weekFromStr = weekStart.toISOString().slice(0, 10);
    const weekToStr   = weekEnd.toISOString().slice(0, 10);

    const weekClasses = await Class.findAll({
      where: { date: { [Op.between]: [weekFromStr, weekToStr] } },
      attributes: ['id', 'date'],
      raw: true,
    }) as any[];

    const classDateMap: Record<number, string> = {};
    for (const c of weekClasses) classDateMap[c.id] = c.date;

    const weekEnrollments = weekClasses.length
      ? await ClassStudent.findAll({
          where: { class_id: weekClasses.map((c) => c.id), status: { [Op.in]: ['attended', 'missed'] } },
          attributes: ['class_id', 'status'],
          raw: true,
        }) as any[]
      : [];

    const dayBuckets: Record<string, { label: string; presentes: number; ausentes: number }> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      dayBuckets[key] = { label: DAY_LABELS[i], presentes: 0, ausentes: 0 };
    }
    for (const e of weekEnrollments) {
      const date = classDateMap[e.class_id];
      if (!date || !dayBuckets[date]) continue;
      if (e.status === 'attended') dayBuckets[date].presentes++;
      else if (e.status === 'missed') dayBuckets[date].ausentes++;
    }
    const frequencia_semanal = Object.entries(dayBuckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({ day: v.label, presentes: v.presentes, ausentes: v.ausentes }));

    // ─── 4. Novos alunos (last 6 months) ─────────────────────────────────────
    const novos_alunos = await Promise.all(
      months.map(async ({ label, from, to }) => {
        const alunos = await ClientUser.count({ where: { createdAt: { [Op.between]: [from, to] } } });
        return { month: label, alunos };
      })
    );

    // ─── 5. Atividades Recentes ───────────────────────────────────────────────
    const [recentCheckins, recentUsers, recentTx] = await Promise.all([
      ClassStudent.findAll({
        where: { checkin: true, checkin_at: { [Op.ne]: null } },
        order: [['checkin_at', 'DESC']],
        limit: 5,
        attributes: ['class_id', 'user_id', 'checkin_at'],
        raw: true,
      }),
      ClientUser.findAll({
        order: [['createdAt', 'DESC']],
        limit: 4,
        attributes: ['name', 'createdAt'],
        raw: true,
      }),
      Transaction.findAll({
        where: { closed: true },
        order: [['closedAt', 'DESC']],
        limit: 4,
        attributes: ['customerName', 'amount', 'closedAt'],
        raw: true,
      }),
    ]) as [any[], any[], any[]];

    // Enrich checkin entries with student name + modality
    const checkinClassIds  = [...new Set(recentCheckins.map((c) => c.class_id))];
    const checkinUserIds   = [...new Set(recentCheckins.map((c) => c.user_id))];
    const [checkinClasses, checkinUsers] = await Promise.all([
      checkinClassIds.length
        ? Class.findAll({
            where: { id: checkinClassIds },
            attributes: ['id'],
            include: [{ model: Modality, as: 'modality', attributes: ['name'] }],
          })
        : [],
      checkinUserIds.length
        ? ClientUser.findAll({ where: { id: checkinUserIds }, attributes: ['id', 'name'], raw: true })
        : [],
    ]) as [any[], any[]];

    const classModalMap: Record<number, string> = {};
    for (const c of checkinClasses as any[]) classModalMap[c.id] = c.modality?.name ?? 'aula';
    const userNameMap: Record<number, string> = {};
    for (const u of checkinUsers) userNameMap[u.id] = u.name;

    const activities: { text: string; time: string; type: string }[] = [];
    for (const ch of recentCheckins) {
      const name = userNameMap[ch.user_id] ?? 'Aluno';
      const mod  = classModalMap[ch.class_id] ?? 'aula';
      activities.push({ text: `${name} fez check-in na aula de ${mod}`, time: ch.checkin_at, type: 'checkin' });
    }
    for (const u of recentUsers) {
      activities.push({ text: `Novo aluno cadastrado: ${u.name}`, time: u.createdAt, type: 'user' });
    }
    for (const t of recentTx) {
      const val = (Number(t.amount) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      activities.push({ text: `Pagamento recebido — R$ ${val}`, time: t.closedAt, type: 'payment' });
    }
    activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    const atividades_recentes = activities.slice(0, 8);

    // ─── 6. Próximas Aulas ────────────────────────────────────────────────────
    const proxClasses = await Class.findAll({
      where: { date: { [Op.gte]: today }, active: true },
      include: [
        { model: Staff, as: 'teacher', attributes: ['name'] },
        { model: Modality, as: 'modality', attributes: ['name', 'color'] },
      ],
      order: [['date', 'ASC'], ['time', 'ASC']],
      limit: 3,
    }) as any[];

    const proximas_aulas = proxClasses.map((c) => ({
      id:        c.id,
      turma:     c.modality?.name ?? 'Aula',
      hora:      String(c.time).slice(0, 5),
      professor: c.teacher?.name ?? '',
      alunos:    `${c.spots_taken}/${c.limit}`,
      cor:       c.modality?.color ?? null,
    }));

    // ─── 7. Planos Populares (current month) ──────────────────────────────────
    const closedTxIds = (await Transaction.findAll({
      where: { closed: true, createdAt: { [Op.between]: [months[5].from, months[5].to] } },
      attributes: ['transactionId'],
      raw: true,
    }) as any[]).map((t) => t.transactionId);

    let planos_populares: { name: string; vendas: number; porcentagem: number }[] = [];
    if (closedTxIds.length > 0) {
      const planoItems = await Item.findAll({
        attributes: ['description', [fn('SUM', col('quantity')), 'vendas']],
        where: { transactionId: { [Op.in]: closedTxIds } },
        group: ['description'],
        order: [[fn('SUM', col('quantity')), 'DESC']],
        limit: 5,
        raw: true,
      }) as any[];

      const maxVendas = Math.max(...planoItems.map((p) => Number(p.vendas) || 0), 1);
      planos_populares = planoItems.map((p) => ({
        name:        p.description,
        vendas:      Number(p.vendas) || 0,
        porcentagem: Math.round((Number(p.vendas) / maxVendas) * 100),
      }));
    }

    return res.json({
      success: true,
      data: { receita_mensal, modalidades, frequencia_semanal, novos_alunos, atividades_recentes, proximas_aulas, planos_populares },
    });
  } catch (err: unknown) {
    console.error('[Dashboard] Erro:', err);
    const msg = err instanceof Error ? err.message : 'Erro ao carregar dashboard';
    return res.status(500).json({ success: false, message: msg });
  }
}
