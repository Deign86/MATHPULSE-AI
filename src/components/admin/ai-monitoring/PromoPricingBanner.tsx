import React, { useState, useMemo } from 'react';
import { X, Zap } from 'lucide-react';

interface PromoPricingBannerProps {
  promoExpiresUtc: string | null;
  daysUntilPromoEnds: number;
  fullPriceInputRate: number;
  fullPriceOutputRate: number;
}

export const PromoPricingBanner: React.FC<PromoPricingBannerProps> = ({
  promoExpiresUtc,
  daysUntilPromoEnds,
  fullPriceInputRate,
  fullPriceOutputRate,
}) => {
  const [dismissed, setDismissed] = useState(false);

  const daysLeft = useMemo(() => {
    if (!promoExpiresUtc) return daysUntilPromoEnds;
    const diff = new Date(promoExpiresUtc).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [promoExpiresUtc, daysUntilPromoEnds]);

  if (dismissed) return null;

  return (
    <div className="relative rounded-lg border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 rounded p-1 hover:bg-amber-200/50"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-start gap-2 pr-6">
        <Zap className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
        <div>
          <span className="font-semibold">DeepSeek V4 Pro is currently 75% OFF</span>
          {' '}(cache-miss: $0.435/1M, output: $0.87/1M).
          Sale ends May 31, 2026 at 15:59 UTC — <strong>{daysLeft} days remaining</strong>.
          <br />
          <span className="text-amber-700">
            Full price after sale: ${fullPriceInputRate}/1M input · ${fullPriceOutputRate}/1M output.
          </span>
        </div>
      </div>
    </div>
  );
};
