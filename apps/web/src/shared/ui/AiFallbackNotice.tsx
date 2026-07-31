import type { AiFallbackReason } from '@admin/contracts';
import { AlertTriangle } from 'lucide-react';
import { formatAiFallbackReason } from '../config/aiProviderMode';

interface AiFallbackNoticeProps {
  readonly reason?: AiFallbackReason;
}

export function AiFallbackNotice({ reason }: AiFallbackNoticeProps) {
  if (!reason) return null;

  return (
    <p className="mt-3 inline-flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold leading-5 text-amber-900">
      <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0" size={16} />
      {formatAiFallbackReason(reason)}
    </p>
  );
}
