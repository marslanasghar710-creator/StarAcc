import { describe, expect, it } from 'vitest';

import { accountFormSchema } from '@/features/accounts/schemas';

describe('accountFormSchema', () => {
  it('requires code, name, and account type', () => {
    const result = accountFormSchema.safeParse({
      code: '',
      name: '',
      description: '',
      account_type: undefined,
      account_subtype: '',
      parent_account_id: '',
      currency_code: '',
      is_postable: true,
      is_active: true,
    });

    expect(result.success).toBe(false);
  });

  it('accepts a valid account payload', () => {
    const result = accountFormSchema.safeParse({
      code: '1000',
      name: 'Cash',
      description: 'Operating cash',
      account_type: 'asset',
      account_subtype: 'current_asset',
      parent_account_id: '',
      currency_code: 'USD',
      is_postable: true,
      is_active: true,
    });

    expect(result.success).toBe(true);
  });
});
