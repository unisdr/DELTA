import { describe, it, expect, vi, beforeEach } from 'vitest';
import { emailAssignedValidators } from './emailValidationWorkflowService.server';

// Mocks
global.console = { ...console, error: vi.fn() };

vi.mock('~/util/email', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('~/util/config', () => ({
  configPublicUrl: () => 'https://example.com',
}));
vi.mock('~/backend.server/models/hip', () => ({
  getHazardById: vi.fn(async (id) => id === 'haz1' ? [{ nameEn: 'HazardName' }] : []),
  getClusterById: vi.fn(async (id) => id === 'clu1' ? [{ nameEn: 'ClusterName' }] : []),
  getTypeById: vi.fn(async (id) => id === 'typ1' ? [{ nameEn: 'TypeName' }] : []),
}));
vi.mock('~/db/queries/user', () => ({
  getUserById: vi.fn(async (id) => {
    if (id === 'user1') return { firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com' };
    if (id === 'user2') return { firstName: 'Bob', lastName: '', email: 'bob@example.com' };
    if (id === 'submitter') return { firstName: 'Submit', lastName: 'Ter', email: 'submitter@example.com' };
    return null;
  }),
}));

const baseEventFields = {
  startDate: '2025-12-01',
  endDate: '2025-12-02',
  updatedBy: 'submitter',
};

describe('emailAssignedValidators', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends emails to all validator users for hazardous_event', async () => {
    await emailAssignedValidators({
      submittedByUserId: 'submitter',
      validatorUserIds: ['user1', 'user2'],
      entityId: 'hazEventId',
      entityType: 'hazardous_event',
      eventFields: { ...baseEventFields, hipHazardId: 'haz1' },
    });
    const { sendEmail } = await import('~/util/email');
    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(sendEmail).toHaveBeenCalledWith(
      'alice@example.com',
      expect.any(String),
      expect.stringContaining('Alice Smith'),
      expect.stringContaining('Alice Smith')
    );
    expect(sendEmail).toHaveBeenCalledWith(
      'bob@example.com',
      expect.any(String),
      expect.stringContaining('Bob'),
      expect.stringContaining('Bob')
    );
  });

  it('uses cluster/type name if hazard name is missing', async () => {
    await emailAssignedValidators({
      submittedByUserId: 'submitter',
      validatorUserIds: ['user1'],
      entityId: 'hazEventId',
      entityType: 'hazardous_event',
      eventFields: { ...baseEventFields, hipClusterId: 'clu1' },
    });
    const { sendEmail } = await import('~/util/email');
    expect(sendEmail).toHaveBeenCalledWith(
      'alice@example.com',
      expect.any(String),
      expect.any(String),
      expect.stringContaining('ClusterName')
    );
  });

  it('logs and continues on error', async () => {
    const { getUserById } = await import('~/db/queries/user');
    // First call (submitter) succeeds, second call (validator) fails
    (getUserById as any)
      .mockImplementationOnce(async () => ({ firstName: 'Submit', lastName: 'Ter', email: 'submitter@example.com' }))
      .mockImplementationOnce(() => Promise.reject(new Error('fail')))
    ;
    await expect(
      emailAssignedValidators({
        submittedByUserId: 'submitter',
        validatorUserIds: ['user1'],
        entityId: 'hazEventId',
        entityType: 'hazardous_event',
        eventFields: { ...baseEventFields, hipHazardId: 'haz1' },
      })
    ).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to send email to validator'),
      expect.any(Error)
    );
  });
});
