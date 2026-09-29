import { describe, expect, it } from 'vitest';
import { assertCanMove, canMove } from '../src/modules/tickets/ticket.stateMachine.js';

describe('ticket state machine', () => {
  it.each([
    ['OPEN', 'IN_PROGRESS'],
    ['OPEN', 'PENDING_VERIFICATION'],
    ['IN_PROGRESS', 'PENDING_VERIFICATION'],
    ['PENDING_VERIFICATION', 'CLOSED'],
    ['PENDING_VERIFICATION', 'REOPENED'],
    ['REOPENED', 'IN_PROGRESS'],
    ['REOPENED', 'PENDING_VERIFICATION']
  ])('allows %s to %s', (fromStatus, toStatus) => {
    expect(canMove(fromStatus, toStatus)).toBe(true);
    expect(() => assertCanMove(fromStatus, toStatus)).not.toThrow();
  });

  it.each([
    ['SUBMITTED', 'IN_PROGRESS'],
    ['OPEN', 'CLOSED'],
    ['IN_PROGRESS', 'IN_PROGRESS'],
    ['CLOSED', 'REOPENED'],
    ['REJECTED', 'OPEN']
  ])('refuses %s to %s', (fromStatus, toStatus) => {
    expect(canMove(fromStatus, toStatus)).toBe(false);
    try {
      assertCanMove(fromStatus, toStatus);
    } catch (error) {
      expect(error).toMatchObject({ status: 409, code: 'ILLEGAL_TRANSITION' });
      return;
    }

    throw new Error('Expected an illegal transition error.');
  });
});
