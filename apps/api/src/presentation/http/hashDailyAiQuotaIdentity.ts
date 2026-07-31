import { createHmac } from 'node:crypto';

export function hashDailyAiQuotaIdentity(input: {
  readonly day: string;
  readonly secret: string;
  readonly value: string;
}): string {
  return createHmac('sha256', input.secret)
    .update(input.day)
    .update(':')
    .update(input.value)
    .digest('hex');
}
