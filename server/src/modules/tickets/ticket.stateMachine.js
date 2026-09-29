import { ApiError } from '../../utils/ApiError.js';

const allowedTransitions = {
  OPEN: ['IN_PROGRESS', 'PENDING_VERIFICATION'],
  IN_PROGRESS: ['PENDING_VERIFICATION'],
  PENDING_VERIFICATION: ['CLOSED', 'REOPENED'],
  REOPENED: ['IN_PROGRESS', 'PENDING_VERIFICATION']
};

export function canMove(fromStatus, toStatus) {
  return allowedTransitions[fromStatus]?.includes(toStatus) ?? false;
}

export function assertCanMove(fromStatus, toStatus) {
  if (!canMove(fromStatus, toStatus)) {
    throw new ApiError(
      409,
      'ILLEGAL_TRANSITION',
      `This ticket cannot move from ${fromStatus} to ${toStatus}.`
    );
  }
}
