import React, { useState, useMemo } from 'react';
import { X, Zap, Clock, Shield } from 'lucide-react';

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
    <div className="relative overflow-hidden rounded-2xl border border-amber-300/70 dark:border-amber-700/50 bg-gradient-to-r from-amber-50 via-amber-100/40 to-orange-50/60 dark:from-amber-950/40 dark:via-amber-900/20 dark:to-orange-950/30 p-4 shadow-xs text-amber-950 dark:text-amber-100">
      {/* Top golden shine */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 dark:bg-amber-400/20 text-amber-600 dark:text-amber-300 flex items-center justify-center border border-amber-300/60 dark:border-amber-700/60 shrink-0 shadow-xs mt-0.5">
            <Zap size={18} className="animate-pulse text-amber-600 dark:text-amber-400" />
          </div>

          <div className="space-y-1 text-xs sm:text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white">
                DeepSeek Reasoning Engine — 75% Promotional Rate Active
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-200/80 dark:bg-amber-800/60 text-amber-900 dark:text-amber-100 border border-amber-300/80 dark:border-amber-600">
                <Clock size={11} /> {daysLeft} Days Left
              </span>
            </div>

            <p className="text-xs text-amber-900/80 dark:text-amber-200/90 leading-relaxed">
              Discounted pricing: <strong className="font-bold text-slate-900 dark:text-white">$0.435/1M</strong> (cache-miss input) & <strong className="font-bold text-slate-900 dark:text-white">$0.87/1M</strong> (output). 
              Standard rates resume after May 31, 2026 (${fullPriceInputRate}/1M input · ${fullPriceOutputRate}/1M output).
            </p>
          </div>
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="rounded-xl p-1.5 text-amber-800/60 dark:text-amber-300/60 hover:text-amber-950 dark:hover:text-white hover:bg-amber-200/50 dark:hover:bg-amber-900/50 transition-colors shrink-0 cursor-pointer"
          aria-label="Dismiss promotional banner"
          title="Dismiss"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
};
