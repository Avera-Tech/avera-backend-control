// Re-exports do controller principal em modules/staff
export {
  createStaff as create,
  listStaff as list,
  getStaffById as getById,
  updateStaff as update,
  deactivateStaff as remove,
} from '../../../modules/staff/controllers/staffController';

import {
  createStaff,
  listStaff,
  getStaffById,
  updateStaff,
  deactivateStaff,
} from '../../../modules/staff/controllers/staffController';

export const StaffController = {
  create: createStaff,
  list: listStaff,
  getById: getStaffById,
  update: updateStaff,
  remove: deactivateStaff,
};
