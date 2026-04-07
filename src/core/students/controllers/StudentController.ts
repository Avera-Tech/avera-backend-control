import { Request, Response } from 'express';
import { Op } from 'sequelize';
import Joi from 'joi';
import bcrypt from 'bcryptjs';
import Student from '../models/Students.model';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createSchema = Joi.object({
  name: Joi.string().max(100).required().messages({
    'any.required': 'Nome é obrigatório',
  }),
  email: Joi.string().email().required().messages({
    'any.required': 'Email é obrigatório',
    'string.email': 'Email inválido',
  }),
  password: Joi.string().min(6).required().messages({
    'any.required': 'Senha é obrigatória',
    'string.min': 'Senha deve ter no mínimo 6 caracteres',
  }),
  phone: Joi.string().max(20).allow('', null).optional(),
  cpf: Joi.string().length(14).allow('', null).optional().messages({
    'string.length': 'CPF deve estar no formato 000.000.000-00',
  }),
  birthday: Joi.string().isoDate().allow(null).optional(),
  zipCode: Joi.string().max(9).allow('', null).optional(),
  state: Joi.string().max(100).allow('', null).optional(),
  city: Joi.string().max(100).allow('', null).optional(),
  address: Joi.string().max(255).allow('', null).optional(),
  notes: Joi.string().allow('', null).optional(),
  active: Joi.boolean().default(true),
});

const updateSchema = Joi.object({
  name: Joi.string().max(100).optional(),
  phone: Joi.string().max(20).allow('', null).optional(),
  birthday: Joi.string().isoDate().allow(null).optional(),
  zipCode: Joi.string().max(9).allow('', null).optional(),
  state: Joi.string().max(100).allow('', null).optional(),
  city: Joi.string().max(100).allow('', null).optional(),
  address: Joi.string().max(255).allow('', null).optional(),
  notes: Joi.string().allow('', null).optional(),
  active: Joi.boolean().optional(),
}).min(1).messages({
  'object.min': 'Informe ao menos um campo para atualizar',
});

// ─── Controller ───────────────────────────────────────────────────────────────

export class StudentController {

  /**
   * GET /students
   * Lista alunos com filtros opcionais: ?active=true&search=nome
   */
  static async list(req: Request, res: Response): Promise<Response> {
    try {
      const where: any = {};

      if (req.query.active !== undefined) {
        where.active = req.query.active === 'true';
      }

      if (req.query.search) {
        where[Op.or] = [
          { name:  { [Op.like]: `%${req.query.search}%` } },
          { email: { [Op.like]: `%${req.query.search}%` } },
          { phone: { [Op.like]: `%${req.query.search}%` } },
        ];
      }

      const students = await Student.findAll({
        attributes: { exclude: ['password'] },
        where,
        order: [['name', 'ASC']],
      });

      return res.json({
        success: true,
        total: students.length,
        students,
      });
    } catch (error: any) {
      console.error('Erro ao listar alunos:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao listar alunos',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * GET /students/:id
   * Busca aluno por ID
   */
  static async getById(req: Request, res: Response): Promise<Response> {
    try {
      const student = await Student.findByPk(Number(req.params.id), {
        attributes: { exclude: ['password'] },
      });

      if (!student) {
        return res.status(404).json({ success: false, error: 'Aluno não encontrado' });
      }

      return res.json({ success: true, student });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: 'Erro ao buscar aluno' });
    }
  }

  /**
   * POST /students
   * Cria novo aluno
   */
  static async create(req: Request, res: Response): Promise<Response> {
    try {
      const { error, value } = createSchema.validate(req.body, { abortEarly: false });
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details.map((d) => d.message).join('; '),
        });
      }

      const normalizedEmail = value.email.trim().toLowerCase();

      const existing = await Student.findOne({ where: { email: normalizedEmail } });
      if (existing) {
        return res.status(409).json({ success: false, error: 'Email já cadastrado' });
      }

      const saltRounds = Number(process.env.BCRYPT_ROUNDS) || 10;
      const hashedPassword = await bcrypt.hash(value.password, saltRounds);

      const student = await Student.create({
        ...value,
        email:    normalizedEmail,
        password: hashedPassword,
        emailVerified: false,
      });

      const { password: _pw, ...studentData } = student.toJSON() as any;

      return res.status(201).json({
        success: true,
        message: 'Aluno criado com sucesso',
        student: studentData,
      });
    } catch (error: any) {
      console.error('Erro ao criar aluno:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao criar aluno',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * PATCH /students/:id
   * Atualiza dados do aluno — email e senha não são alteráveis aqui
   */
  static async update(req: Request, res: Response): Promise<Response> {
    try {
      if ('email' in req.body || 'password' in req.body) {
        return res.status(400).json({
          success: false,
          error: 'Email e senha não podem ser alterados por esta rota',
        });
      }

      const { error, value } = updateSchema.validate(req.body, { abortEarly: false });
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details.map((d) => d.message).join('; '),
        });
      }

      const student = await Student.findByPk(Number(req.params.id));
      if (!student) {
        return res.status(404).json({ success: false, error: 'Aluno não encontrado' });
      }

      await student.update(value);

      const { password: _pw, ...studentData } = student.toJSON() as any;

      return res.json({
        success: true,
        message: 'Aluno atualizado com sucesso',
        student: studentData,
      });
    } catch (error: any) {
      console.error('Erro ao atualizar aluno:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao atualizar aluno',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * DELETE /students/:id
   * Soft delete — marca active = false
   */
  static async remove(req: Request, res: Response): Promise<Response> {
    try {
      const student = await Student.findByPk(Number(req.params.id));
      if (!student) {
        return res.status(404).json({ success: false, error: 'Aluno não encontrado' });
      }

      await student.update({ active: false });

      return res.json({ success: true, message: `Aluno '${student.name}' desativado com sucesso` });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: 'Erro ao desativar aluno' });
    }
  }
}