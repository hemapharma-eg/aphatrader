import React from 'react';
import { Target, TrendingUp } from 'lucide-react';

export const AnalystWidget = ({ forecast, currentPrice, lang }) => {
  if (!forecast || !forecast.analystRatings) return null;

  const { analystRatings, priceTargets } = forecast;
  
  const totalAnalysts = Object.values(analystRatings).reduce((a, b) => a + b, 0);
  if (totalAnalysts === 0) return null;

  // Calculate gauge angle (-90 to 90)
  // Strong Sell = 1, Sell = 2, Hold = 3, Buy = 4, Strong Buy = 5
  let score = 0;
  score += analystRatings.strongSell * 1;
  score += analystRatings.sell * 2;
  score += analystRatings.hold * 3;
  score += analystRatings.buy * 4;
  score += analystRatings.strongBuy * 5;
  
  const avgScore = score / totalAnalysts; // 1 to 5
  // Map 1 -> -90, 3 -> 0, 5 -> 90
  const angle = ((avgScore - 1) / 4) * 180 - 90;

  const t = lang === 'ar' ? {
    rating: 'تقييم المحللين',
    basedOn: `بناءً على ${totalAnalysts} محللاً في الأشهر الثلاثة الماضية.`,
    strongBuy: 'شراء قوي',
    buy: 'شراء',
    hold: 'احتفاظ',
    sell: 'بيع',
    strongSell: 'بيع قوي',
    target: 'توقع السعر (سنة)',
    current: 'الحالي',
    max: 'أقصى',
    avg: 'متوسط',
    min: 'أدنى',
  } : {
    rating: 'Analyst Rating',
    basedOn: `Based on ${totalAnalysts} analysts giving stock ratings in the past 3 months.`,
    strongBuy: 'Strong buy',
    buy: 'Buy',
    hold: 'Hold',
    sell: 'Sell',
    strongSell: 'Strong sell',
    target: '1-Year Price Target',
    current: 'Current',
    max: 'Max',
    avg: 'Avg',
    min: 'Min',
  };

  const currentLabel = avgScore >= 4.5 ? t.strongBuy : avgScore >= 3.5 ? t.buy : avgScore >= 2.5 ? t.hold : avgScore >= 1.5 ? t.sell : t.strongSell;
  const currentLabelColor = avgScore >= 3.5 ? 'text-accent-teal' : avgScore >= 2.5 ? 'text-amber-500' : 'text-accent-coral';

  const Bar = ({ label, count, color }) => (
    <div className="flex items-center gap-3 text-xs mb-2">
      <div className="w-16 text-slate-500 dark:text-slate-400 font-medium">{label}</div>
      <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${(count / totalAnalysts) * 100}%` }} />
      </div>
      <div className="w-6 text-right text-slate-700 dark:text-slate-300 font-mono">{count}</div>
    </div>
  );

  return (
    <div className="mt-4 glass-panel rounded-3xl p-6 max-w-lg w-full" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Analyst Rating Section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Target size={18} className="text-navy-500 dark:text-accent-teal" />
          <h3 className="font-heading font-black text-lg text-slate-800 dark:text-white">{t.rating}</h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">{t.basedOn}</p>

        {/* Gauge */}
        <div className="relative w-48 h-24 mx-auto mb-4">
          <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f97316" />   {/* Orange/Sell */}
                <stop offset="50%" stopColor="#eab308" />  {/* Yellow/Hold */}
                <stop offset="100%" stopColor="#14b8a6" /> {/* Teal/Buy */}
              </linearGradient>
            </defs>
            <path
              d="M 10 50 A 40 40 0 0 1 90 50"
              fill="none"
              stroke="url(#gaugeGrad)"
              strokeWidth="8"
              strokeLinecap="round"
              className="opacity-20"
            />
            <path
              d="M 10 50 A 40 40 0 0 1 90 50"
              fill="none"
              stroke="url(#gaugeGrad)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray="125.6"
              strokeDashoffset="0"
            />
            
            {/* Needle */}
            <g transform={`rotate(${angle}, 50, 50)`}>
              <circle cx="50" cy="50" r="3" fill="currentColor" className="text-slate-800 dark:text-white" />
              <polygon points="48,50 52,50 50,15" fill="currentColor" className="text-slate-800 dark:text-white" />
            </g>
          </svg>
          <div className={`absolute -bottom-4 w-full text-center font-bold text-sm ${currentLabelColor}`}>
            {currentLabel}
          </div>
        </div>

        {/* Bars */}
        <div className="mt-8">
          <Bar label={t.strongBuy} count={analystRatings.strongBuy} color="bg-accent-teal" />
          <Bar label={t.buy} count={analystRatings.buy} color="bg-teal-400" />
          <Bar label={t.hold} count={analystRatings.hold} color="bg-slate-400" />
          <Bar label={t.sell} count={analystRatings.sell} color="bg-amber-500" />
          <Bar label={t.strongSell} count={analystRatings.strongSell} color="bg-accent-coral" />
        </div>
      </div>

      {/* Price Target Section */}
      {priceTargets && priceTargets.avg > 0 && currentPrice > 0 && (
        <div className="pt-6 border-t border-slate-200 dark:border-white/5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-navy-500 dark:text-accent-teal" />
            <h3 className="font-heading font-black text-lg text-slate-800 dark:text-white">{t.target}</h3>
          </div>
          
          <div className="flex items-end gap-3 mb-6">
            <div className="text-3xl font-heading font-black text-slate-800 dark:text-white">
              {priceTargets.avg.toFixed(2)}
            </div>
            <div className={`text-sm font-bold mb-1 ${priceTargets.avg > currentPrice ? 'text-accent-teal' : 'text-accent-coral'}`}>
              {priceTargets.avg > currentPrice ? '+' : ''}{(((priceTargets.avg - currentPrice) / currentPrice) * 100).toFixed(2)}%
            </div>
          </div>

          {/* Target Cone UI */}
          <div className="relative h-32 mt-4 flex">
            {/* Fake historical line chart (left half) */}
            <div className="w-1/3 h-full relative">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                <path d="M0,80 Q20,60 40,70 T80,40 L100,50" fill="none" stroke="#3b82f6" strokeWidth="2" />
                <circle cx="100" cy="50" r="3" fill="#3b82f6" />
              </svg>
            </div>
            {/* Forecast cone (right two-thirds) */}
            <div className="flex-1 h-full relative border-l border-slate-300 dark:border-slate-700">
               {/* Map prices to Y axis 0-100 */}
               {(() => {
                 const minP = Math.min(priceTargets.min, currentPrice) * 0.9;
                 const maxP = Math.max(priceTargets.max, currentPrice) * 1.1;
                 const range = maxP - minP;
                 const getY = (p) => 100 - (((p - minP) / range) * 100);

                 const yCurr = getY(currentPrice);
                 const yMax = getY(priceTargets.max);
                 const yAvg = getY(priceTargets.avg);
                 const yMin = getY(priceTargets.min);

                 return (
                   <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full absolute inset-0 overflow-visible">
                      {/* Polygon for cone background */}
                      <polygon points={`0,${yCurr} 100,${yMax} 100,${yMin}`} fill="rgba(59, 130, 246, 0.05)" />
                      {/* Dotted lines */}
                      <line x1="0" y1={yCurr} x2="100" y2={yMax} stroke="#14b8a6" strokeWidth="1.5" strokeDasharray="4 2" />
                      <line x1="0" y1={yCurr} x2="100" y2={yAvg} stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 2" />
                      <line x1="0" y1={yCurr} x2="100" y2={yMin} stroke="#fb7185" strokeWidth="1.5" strokeDasharray="4 2" />
                      
                      {/* Labels */}
                      <foreignObject x="45" y={yMax - 8} width="60" height="20" className="overflow-visible">
                        <div className="text-[9px] font-bold text-accent-teal bg-teal-500/10 px-1 rounded inline-block">{t.max} {(priceTargets.max/currentPrice - 1)*100 > 0 ? '+' : ''}{((priceTargets.max/currentPrice - 1)*100).toFixed(0)}%</div>
                      </foreignObject>
                      <foreignObject x="45" y={yAvg - 8} width="60" height="20" className="overflow-visible">
                        <div className="text-[9px] font-bold text-blue-500 bg-blue-500/10 px-1 rounded inline-block">{t.avg} {(priceTargets.avg/currentPrice - 1)*100 > 0 ? '+' : ''}{((priceTargets.avg/currentPrice - 1)*100).toFixed(0)}%</div>
                      </foreignObject>
                      <foreignObject x="45" y={yMin - 8} width="60" height="20" className="overflow-visible">
                        <div className="text-[9px] font-bold text-accent-coral bg-rose-500/10 px-1 rounded inline-block">{t.min} {(priceTargets.min/currentPrice - 1)*100 > 0 ? '+' : ''}{((priceTargets.min/currentPrice - 1)*100).toFixed(0)}%</div>
                      </foreignObject>

                      {/* Right side values */}
                      <foreignObject x="105" y={yMax - 6} width="40" height="20" className="overflow-visible">
                        <div className="text-[10px] font-mono text-slate-500">{priceTargets.max.toFixed(2)}</div>
                      </foreignObject>
                      <foreignObject x="105" y={yAvg - 6} width="40" height="20" className="overflow-visible">
                        <div className="text-[10px] font-mono text-slate-500">{priceTargets.avg.toFixed(2)}</div>
                      </foreignObject>
                      <foreignObject x="105" y={yMin - 6} width="40" height="20" className="overflow-visible">
                        <div className="text-[10px] font-mono text-slate-500">{priceTargets.min.toFixed(2)}</div>
                      </foreignObject>
                   </svg>
                 );
               })()}
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
};
