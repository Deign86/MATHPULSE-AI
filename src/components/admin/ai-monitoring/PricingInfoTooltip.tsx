import React, { useState } from 'react';
import { Info } from 'lucide-react';
import type { PricingMeta } from '../../../services/aiMonitoringService';

interface PricingInfoTooltipProps {
  pricingMeta: PricingMeta;
}

export const PricingInfoTooltip: React.FC<PricingInfoTooltipProps> = ({ pricingMeta }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="rounded p-1 text-slate-400 hover:text-slate-600"
        aria-label="Pricing info"
      >
        <Info className="h-4 w-4" />
      </button>
      {show && (
        <div className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg">
          <p className="font-semibold text-slate-800 mb-1">
            {pricingMeta.isPromotional ? 'Promotional Pricing (75% OFF)' : 'Standard Pricing'}
          </p>
          <div className="space-y-1 text-slate-600">
            <p>Input (cache miss): <strong>${pricingMeta.currentInputCacheMissRate}/1M</strong></p>
            <p>Output: <strong>${pricingMeta.currentOutputRate}/1M</strong></p>
            {pricingMeta.isPromotional && (
              <>
                <hr className="my-1 border-slate-100" />
                <p className="text-slate-400">Full price: ${pricingMeta.fullPriceInputRate}/1M in · ${pricingMeta.fullPriceOutputRate}/1M out</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
