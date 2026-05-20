/**
 * src/core/student/controllers/StudentClassController.ts
 *
 * GET  /app/v1/classes?date=YYYY-MM-DD&modalityId=1   → aulas disponíveis
 * POST /app/v1/classes/:id/enroll                     → matricular aluno
 * POST /app/v1/classes/:id/cancel                     → cancelar matrícula
 */

import { Request, Response } from 'express';
import { Op } from 'sequelize';

function todayString(): string {
    return new Date().toISOString().split('T')[0];
}

export class StudentClassController {
    /**
     * GET /app/v1/classes?date=YYYY-MM-DD&modalityId=1
     *
     * Retorna aulas ativas para a data (default: hoje).
     * Inclui o status de matrícula do aluno logado em cada aula.
     */
    static async list(req: Request, res: Response): Promise<Response> {
        try {
            if (!req.student) {
                return res.status(401).json({ success: false, error: 'Não autenticado' });
            }

            const studentId = req.student.studentId;
            const date = String(req.query.date || todayString());
            const modalityId = req.query.modalityId ? Number(req.query.modalityId) : undefined;

            const { Class, Staff, Place, Modality, ClassStudent } = req.tenantDb;

            const where: Record<string, unknown> = { date, active: true };
            if (modalityId) where.modality_id = modalityId;

            const classes = await Class.findAll({
                where,
                include: [
                    { model: Staff, as: 'teacher', attributes: ['id', 'name'] },
                    { model: Place, as: 'place', attributes: ['id', 'name'] },
                    { model: Modality, as: 'modality', attributes: ['id', 'name', 'color'] },
                ],
                order: [['time', 'ASC']],
            });

            // Busca matrículas do aluno nessas aulas de uma vez só
            const classIds = classes.map((c: any) => c.id);
            const enrollments = classIds.length > 0
                ? await ClassStudent.findAll({
                    where: { class_id: classIds, user_id: studentId },
                    attributes: ['class_id', 'status', 'id'],
                    raw: true,
                })
                : [];

            const enrollmentMap: Record<number, { status: string; enrollmentId: number }> = {};
            for (const e of enrollments as any[]) {
                enrollmentMap[e.class_id] = { status: e.status, enrollmentId: e.id };
            }

            const data = classes.map((c: any) => ({
                id: c.id,
                date: c.date,
                time: c.time,
                limit: c.limit,
                spots_taken: c.spots_taken,
                spots_available: c.limit - c.spots_taken,
                teacher: c.teacher,
                place: c.place,
                modality: c.modality,
                // Status do aluno logado nessa aula
                enrollment: enrollmentMap[c.id] ?? null,
            }));

            return res.json({ success: true, data });
        } catch (error: any) {
            console.error('[StudentClassController.list]', error);
            return res.status(500).json({
                success: false,
                error: 'Erro ao listar aulas',
                message: process.env.NODE_ENV === 'development' ? error.message : undefined,
            });
        }
    }

    /**
     * POST /app/v1/classes/:id/enroll
     *
     * Matricula o aluno logado na aula.
     * Consome 1 crédito ativo do aluno.
     */
    static async enroll(req: Request, res: Response): Promise<Response> {
        try {
            if (!req.student) {
                return res.status(401).json({ success: false, error: 'Não autenticado' });
            }

            const studentId = req.student.studentId;
            const classId = Number(req.params.id);

            const { Class, ClassStudent, StudentCredit, CreditTransaction, sequelize } = req.tenantDb;

            const result = await sequelize.transaction(async (t) => {
                // 1. Verifica a aula
                const cls = await Class.findByPk(classId, {
                    attributes: ['id', 'active', 'limit', 'spots_taken', 'date', 'time'],
                    lock: t.LOCK.UPDATE,
                    transaction: t,
                });

                if (!cls) throw Object.assign(new Error('Aula não encontrada'), { code: 404 });
                if (!cls.active) throw Object.assign(new Error('Aula inativa'), { code: 400 });
                if (cls.spots_taken >= cls.limit) throw Object.assign(new Error('Aula lotada'), { code: 400 });

                // Data da aula não pode ser no passado
                const classDate = new Date(`${cls.date}T${cls.time}`);
                if (classDate < new Date()) throw Object.assign(new Error('Aula já ocorreu'), { code: 400 });

                // 2. Verifica duplicidade
                const existing = await ClassStudent.findOne({
                    where: { class_id: classId, user_id: studentId, status: { [Op.ne]: 'cancelled' } },
                    transaction: t,
                });
                if (existing) throw Object.assign(new Error('Você já está matriculado nesta aula'), { code: 409 });

                // 3. Verifica crédito disponível
                const credit = await StudentCredit.findOne({
                    where: {
                        userId: studentId,
                        status: 'active',
                        availableCredits: { [Op.gt]: 0 },
                        expiresAt: { [Op.gte]: new Date() },
                    },
                    order: [['expiresAt', 'ASC']], // usa o que expira primeiro
                    lock: t.LOCK.UPDATE,
                    transaction: t,
                });

                if (!credit) throw Object.assign(new Error('Sem créditos disponíveis'), { code: 402 });

                // 4. Cria a matrícula
                const enrollment = await ClassStudent.create(
                    { class_id: classId, user_id: studentId, status: 'enrolled', walk_in: false },
                    { transaction: t },
                );

                // 5. Debita 1 crédito
                credit.usedCredits += 1;
                credit.availableCredits -= 1;
                if (credit.availableCredits === 0) credit.status = 'exhausted';
                await credit.save({ transaction: t });

                // 6. Registra a transação de crédito
                await CreditTransaction.create({
                    userId: studentId,
                    studentCreditId: credit.id,
                    delta: -1,
                    reason: 'consume',
                    note: `Matrícula na aula #${classId}`,
                }, { transaction: t });

                // 7. Incrementa vagas ocupadas
                await Class.increment('spots_taken', { by: 1, where: { id: classId }, transaction: t });

                return enrollment;
            });

            return res.status(201).json({
                success: true,
                message: 'Matrícula realizada com sucesso',
                enrollmentId: (result as any).id,
            });
        } catch (error: any) {
            console.error('[StudentClassController.enroll]', error);
            const status = error.code ?? 500;
            return res.status(status).json({
                success: false,
                error: error.message ?? 'Erro ao matricular',
                message: process.env.NODE_ENV === 'development' ? error.message : undefined,
            });
        }
    }

    /**
     * POST /app/v1/classes/:id/cancel
     *
     * Cancela a matrícula do aluno e devolve 1 crédito.
     * Só é possível cancelar aulas futuras.
     */
    static async cancel(req: Request, res: Response): Promise<Response> {
        try {
            if (!req.student) {
                return res.status(401).json({ success: false, error: 'Não autenticado' });
            }

            const studentId = req.student.studentId;
            const classId = Number(req.params.id);

            const { Class, ClassStudent, StudentCredit, CreditTransaction, sequelize } = req.tenantDb;

            await sequelize.transaction(async (t) => {
                const cls = await Class.findByPk(classId, {
                    attributes: ['id', 'date', 'time'],
                    transaction: t,
                });
                if (!cls) throw Object.assign(new Error('Aula não encontrada'), { code: 404 });

                // Só pode cancelar aulas futuras
                const classDate = new Date(`${cls.date}T${cls.time}`);
                if (classDate < new Date()) throw Object.assign(new Error('Não é possível cancelar uma aula que já ocorreu'), { code: 400 });

                const enrollment = await ClassStudent.findOne({
                    where: { class_id: classId, user_id: studentId, status: 'enrolled' },
                    lock: t.LOCK.UPDATE,
                    transaction: t,
                });
                if (!enrollment) throw Object.assign(new Error('Matrícula não encontrada'), { code: 404 });

                // Cancela
                await enrollment.update({ status: 'cancelled' }, { transaction: t });
                await Class.decrement('spots_taken', { by: 1, where: { id: classId }, transaction: t });

                // Devolve o crédito no lote mais recente ainda ativo
                const credit = await StudentCredit.findOne({
                    where: { userId: studentId, status: { [Op.in]: ['active', 'exhausted'] } },
                    order: [['createdAt', 'DESC']],
                    lock: t.LOCK.UPDATE,
                    transaction: t,
                });

                if (credit) {
                    credit.usedCredits = Math.max(0, credit.usedCredits - 1);
                    credit.availableCredits += 1;
                    if (credit.status === 'exhausted') credit.status = 'active';
                    await credit.save({ transaction: t });

                    await CreditTransaction.create({
                        userId: studentId,
                        studentCreditId: credit.id,
                        delta: +1,
                        reason: 'refund',
                        note: `Cancelamento da aula #${classId}`,
                    }, { transaction: t });
                }
            });

            return res.json({ success: true, message: 'Matrícula cancelada e crédito devolvido' });
        } catch (error: any) {
            console.error('[StudentClassController.cancel]', error);
            const status = error.code ?? 500;
            return res.status(status).json({ success: false, error: error.message ?? 'Erro ao cancelar' });
        }
    }

    /**
     * GET /app/v1/student/enrollments?status=enrolled|attended|all
     *
     * Retorna as matrículas do aluno logado com dados completos da aula.
     * status=enrolled  → próximas aulas (padrão)
     * status=attended  → aulas realizadas
     * status=all       → todas
     */
    static async myEnrollments(req: Request, res: Response): Promise<Response> {
        try {
            if (!req.student) {
                return res.status(401).json({ success: false, error: 'Não autenticado' });
            }

            const studentId = req.student.studentId;
            const statusParam = String(req.query.status || 'enrolled');

            const { ClassStudent, Class, Staff, Place, Modality } = req.tenantDb;

            const where: Record<string, unknown> = { user_id: studentId };

            if (statusParam !== 'all') {
                where.status = statusParam;
            }

            const enrollments = await ClassStudent.findAll({
                where,
                include: [
                    {
                        model: Class,
                        as: 'class',
                        include: [
                            { model: Staff, as: 'teacher', attributes: ['id', 'name'] },
                            { model: Place, as: 'place', attributes: ['id', 'name'] },
                            { model: Modality, as: 'modality', attributes: ['id', 'name', 'color'] },
                        ],
                    },
                ],
                order: [
                    [{ model: Class, as: 'class' }, 'date', statusParam === 'attended' ? 'DESC' : 'ASC'],
                    [{ model: Class, as: 'class' }, 'time', 'ASC'],
                ],
            });

            const data = enrollments.map((e: any) => ({
                enrollmentId: e.id,
                status: e.status,
                checkin: e.checkin,
                checkinAt: e.checkin_at,
                class: {
                    id: e.class.id,
                    date: e.class.date,
                    time: e.class.time,
                    teacher: e.class.teacher,
                    place: e.class.place,
                    modality: e.class.modality,
                },
            }));

            return res.json({ success: true, data });
        } catch (error: any) {
            console.error('[StudentClassController.myEnrollments]', error);
            return res.status(500).json({
                success: false,
                error: 'Erro ao buscar matrículas',
                message: process.env.NODE_ENV === 'development' ? error.message : undefined,
            });
        }
    }
}