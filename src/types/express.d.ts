import { TenantDb } from '../config/tenantModels';

declare global {
  namespace Express {
    interface Request {
      tenantDb: TenantDb;
    }
  }
}
