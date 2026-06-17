import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, BrainCircuit, AlertCircle, Bot, User, 
  X, Settings, Briefcase, Trash2, CheckCircle2, 
  XCircle, MinusCircle, RefreshCw, Eye, LogOut, Globe
} from 'lucide-react';
import { supabase } from './lib/supabase';

// --- API Keys ---
const POLYGON_API_KEY = "tdvJPbi2C7T2NpXrxLD5jb0Mq48GEY9I";
const FMP_API_KEY = "wY6xAsF8U0lIZrphQ1ooZh5MzA5Igu6O";
const getStoredGeminiKey = () => localStorage.getItem('gemini_api_key') || '';

// --- Translations ---
const T = {
  ar: {
    title: "ألفا تريد برو",
    subtitle: "مستشار الذكاء الاصطناعي",
    welcome: "مرحباً! أنا ألفا تريد. (لأغراض تعليمية فقط)\nاسألني عن أي سهم للتحليل.",
    inputPlaceholder: "اسأل عن سهم (مثل AAPL)...",
    disclaimer: "البيانات للاستخدام التعليمي فقط وليست نصيحة مالية مضمونة. قرار الاستثمار مسؤوليتك.",
    settings: "الإعدادات",
    portfolio: "المحفظة",
    watchlist: "قائمة المراقبة",
    apiKey: "مفتاح Gemini API",
    beginnerMode: "وضع المبتدئين (تبسيط المصطلحات)",
    save: "حفظ",
    addStock: "إضافة",
    qty: "الكمية",
    buyPrice: "سعر الشراء",
    currentPrice: "السعر الحالي",
    pnl: "الربح/الخسارة",
    action: "إجراء",
    totalValue: "القيمة الإجمالية",
    analyzing: "جاري التحليل...",
    errorApi: "فشل الاتصال بالذكاء الاصطناعي.",
    live: "مباشر",
    today: "اليوم",
    newsTitle: "أخبار السوق",
    ipoTitle: "اكتتابات قادمة",
    refreshAnalysis: "تحديث التحليل",
    analyze: "تحليل",
    movePort: "نقل للمحفظة",
    addToWatchlist: "أضف للمراقبة",
    decisionChecklist: "قائمة التحقق للمبتدئين",
    buyChecklist: ["هل الاتجاه العام إيجابي؟", "هل هذا السهم يركز محفظتك بشدة؟", "هل الأخبار خالية من الكوارث؟", "هل مستوى المخاطرة مقبول؟", "هل السهم متوافق شرعياً؟", "هل لديك خطة لوقف الخسارة؟"],
    sellChecklist: ["هل تغير سبب الشراء الأساسي؟", "هل الخسارة تجاوزت حدك الأقصى؟", "هل تبيع بناءً على منطق وليس ذعر؟", "هل الأخبار تزداد سوءاً؟"]
  },
  en: {
    title: "AlphaTrade Pro",
    subtitle: "AI Consultant",
    welcome: "Hello! I am AlphaTrade. (Educational use only)\nAsk me to analyze any stock.",
    inputPlaceholder: "Ask for stock analysis...",
    disclaimer: "Data provided for educational purposes, not guaranteed financial advice. You decide.",
    settings: "Settings",
    portfolio: "Portfolio",
    watchlist: "Watchlist",
    apiKey: "Gemini API Key",
    beginnerMode: "Beginner Mode (Explain jargon)",
    save: "Save",
    addStock: "Add Stock",
    qty: "Qty",
    buyPrice: "Buy Price",
    currentPrice: "Current Price",
    pnl: "P&L",
    action: "Action",
    totalValue: "Total Value",
    analyzing: "Analyzing...",
    errorApi: "AI connection failed.",
    live: "Live",
    today: "Today",
    newsTitle: "Live News",
    ipoTitle: "Upcoming IPOs",
    refreshAnalysis: "Refresh Analysis",
    analyze: "Analyze",
    movePort: "To Portfolio",
    addToWatchlist: "Add to Watchlist",
    decisionChecklist: "Decision Checklist",
    buyChecklist: ["Is the trend positive?", "Is it not over-concentrating your portfolio?", "Is the news clear of disasters?", "Is the risk acceptable?", "Is it Shariah compliant?", "Do you have a stop-loss plan?"],
    sellChecklist: ["Did your original thesis change?", "Is the loss beyond your limit?", "Are you selling on logic, not panic?", "Is the outlook worsening?"]
  }
};

// --- Utilities ---
const fetchPolygon = async (endpoint) => {
  try {
    const url = `https://api.polygon.io${endpoint}${endpoint.includes('?') ? '&' : '?'}apiKey=${POLYGON_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch(e) { return null; }
};

const fetchFMP = async (endpoint) => {
  try {
    const url = `https://financialmodelingprep.com/stable${endpoint}${endpoint.includes('?') ? '&' : '?'}apikey=${FMP_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch(e) { return null; }
};

const getLivePrice = async (symbol) => {
  const res = await fetchPolygon(`/v2/aggs/ticker/${symbol}/prev?adjusted=true`);
  if (!res || !res.results || !res.results[0]) return null;
  const data = res.results[0];
  return {
    c: data.c,
    h: data.h,
    l: data.l,
    dp: data.o ? ((data.c - data.o) / data.o) * 100 : 0
  };
};

const detectStockSymbol = (text) => {
  const match = text.match(/\b([A-Z]{1,5})\b/);
  if (match) return match[1];
  const map = {
    'apple': 'AAPL', 'أبل': 'AAPL', 'tesla': 'TSLA', 'تسلا': 'TSLA',
    'microsoft': 'MSFT', 'مايكروسوفت': 'MSFT', 'nvidia': 'NVDA', 'نفيديا': 'NVDA',
    'amazon': 'AMZN', 'أمازون': 'AMZN', 'meta': 'META', 'ميتا': 'META',
    'alphabet': 'GOOGL', 'google': 'GOOGL', 'جوجل': 'GOOGL', 'amd': 'AMD',
    'palantir': 'PLTR'
  };
  const lower = text.toLowerCase();
  for (const [key, val] of Object.entries(map)) {
    if (lower.includes(key)) return val;
  }
  return null;
};

// --- Scoring Logic ---
const computeSignals = (data) => {
  let signals = {
    valuation: { score: 0, state: 'neutral', value: 'Unavailable', explanation: 'P/E data missing.' },
    profitability: { score: 0, state: 'neutral', value: 'Unavailable', explanation: 'ROE data missing.' },
    debt: { score: 0, state: 'neutral', value: 'Unavailable', explanation: 'Debt data missing.' },
    pricePosition: { score: 0, state: 'neutral', value: 'Unavailable', explanation: 'Price range missing.' },
    newsSentiment: { score: 0, state: 'neutral', value: 'Waiting...', explanation: '' } 
  };

  if (data.ratios?.priceToEarningsRatioTTM) {
    const pe = data.ratios.priceToEarningsRatioTTM;
    if (pe > 0 && pe < 15) signals.valuation = { score: 1, state: 'bullish', value: `P/E ${pe.toFixed(1)}`, explanation: 'Valuation is cheap relative to earnings.' };
    else if (pe > 25 || pe <= 0) signals.valuation = { score: -1, state: 'bearish', value: `P/E ${pe.toFixed(1)}`, explanation: 'Valuation is expensive or earnings are negative.' };
    else signals.valuation = { score: 0, state: 'neutral', value: `P/E ${pe.toFixed(1)}`, explanation: 'Valuation is average.' };
  }

  if (data.metrics?.returnOnEquityTTM) {
    const roe = data.metrics.returnOnEquityTTM * 100;
    if (roe > 15) signals.profitability = { score: 1, state: 'bullish', value: `ROE ${roe.toFixed(1)}%`, explanation: 'High return on shareholder equity.' };
    else if (roe < 5) signals.profitability = { score: -1, state: 'bearish', value: `ROE ${roe.toFixed(1)}%`, explanation: 'Low or negative return on equity.' };
    else signals.profitability = { score: 0, state: 'neutral', value: `ROE ${roe.toFixed(1)}%`, explanation: 'Average profitability.' };
  }

  if (data.ratios?.debtToEquityRatioTTM) {
    const de = data.ratios.debtToEquityRatioTTM;
    if (de < 0.5) signals.debt = { score: 1, state: 'bullish', value: `D/E ${de.toFixed(2)}`, explanation: 'Low debt compared to equity.' };
    else if (de > 2.0) signals.debt = { score: -1, state: 'bearish', value: `D/E ${de.toFixed(2)}`, explanation: 'High debt burden.' };
    else signals.debt = { score: 0, state: 'neutral', value: `D/E ${de.toFixed(2)}`, explanation: 'Moderate debt levels.' };
  }

  if (data.profile?.range && data.quote?.c) {
    const parts = data.profile.range.split('-');
    if (parts.length === 2) {
      const low = parseFloat(parts[0]);
      const high = parseFloat(parts[1]);
      const p = data.quote.c;
      const range = high - low;
      if (range > 0) {
        const pct = (p - low) / range;
        if (pct <= 0.3) signals.pricePosition = { score: 1, state: 'bullish', value: 'Near 52w Low', explanation: 'Price is low compared to last year.' };
        else if (pct >= 0.7) signals.pricePosition = { score: -1, state: 'bearish', value: 'Near 52w High', explanation: 'Price is high compared to last year.' };
        else signals.pricePosition = { score: 0, state: 'neutral', value: 'Mid 52w Range', explanation: 'Price is in middle of its annual range.' };
      }
    }
  }

  return signals;
};

const getVerdict = (signals) => {
  let score = 0;
  let counts = { 1:0, '-1':0, 0:0 };
  Object.values(signals).forEach(s => {
    score += s.score;
    counts[s.score]++;
  });

  const maxAgreed = Math.max(counts[1], counts['-1'], counts[0]);
  let confidence = 'Low';
  if (maxAgreed >= 4) confidence = 'High';
  else if (maxAgreed === 3) confidence = 'Medium';

  let verdict = 'HOLD';
  if (score >= 3) verdict = 'BUY';
  else if (score >= 1) verdict = 'WATCH';
  else if (score <= -3) verdict = 'SELL';
  else if (score <= -1) verdict = 'AVOID';

  return { verdict, confidence, score };
};

// --- Components ---
const AuthScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setError(error.message);
    else setError('Success! Check your email (or try logging in if emails are disabled).');
    setLoading(false);
  };

  return (
    <div className="flex h-screen bg-slate-950 items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl max-w-md w-full shadow-xl">
        <div className="flex justify-center mb-6 text-emerald-500"><BrainCircuit size={48}/></div>
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Login to AlphaTrade</h2>
        {error && <div className="bg-rose-500/10 text-rose-400 p-3 rounded-lg mb-4 text-sm text-center">{error}</div>}
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white" required />
          </div>
          <div className="flex gap-4 mt-6">
            <button onClick={handleLogin} disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg">Login</button>
            <button onClick={handleSignup} disabled={loading} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 rounded-lg border border-slate-600">Sign Up</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Tooltip = ({ term, beginnerMode, explanation, children }) => {
  if (!beginnerMode) return <span>{children}</span>;
  return (
    <span className="group relative cursor-help inline-block border-b border-dashed border-slate-500/50">
      {children}
      <span className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 w-48 text-xs bg-slate-800 text-slate-200 rounded-lg shadow-xl border border-slate-700 z-[100] text-center font-normal">
        <span className="font-bold text-emerald-400 block mb-1">{term}</span>
        {explanation}
      </span>
    </span>
  );
};

const DecisionChecklist = ({ type, lang }) => {
  const t = T[lang];
  const list = type === 'BUY' ? t.buyChecklist : type === 'SELL' ? t.sellChecklist : [];
  const [checks, setChecks] = useState(list.map(() => false));
  
  if (list.length === 0) return null;
  const allChecked = checks.every(c => c);

  return (
    <div className="mt-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
      <h4 className="font-bold text-slate-200 mb-3 flex items-center gap-2 text-sm">
        <AlertCircle size={16} className="text-blue-400" /> {t.decisionChecklist} ({type})
      </h4>
      <div className="space-y-2">
        {list.map((item, i) => (
          <label key={i} className="flex items-start gap-3 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={checks[i]} 
              onChange={() => {
                const n = [...checks];
                n[i] = !n[i];
                setChecks(n);
              }}
              className="mt-0.5 rounded bg-slate-900 border-slate-600 text-blue-500 focus:ring-blue-500/20"
            />
            <span className={`text-sm ${checks[i] ? 'text-slate-400 line-through' : 'text-slate-300 group-hover:text-white'}`}>{item}</span>
          </label>
        ))}
      </div>
      {allChecked && <div className="mt-3 text-xs font-bold text-emerald-400 flex items-center gap-1"><CheckCircle2 size={12}/> Ready!</div>}
    </div>
  );
};

const DecisionWidget = ({ data, lang, beginnerMode }) => {
  if (!data) return null;
  const { verdict, confidence, fiveSignals, summary, risks, whatWouldChange, shariah, 52: range52 } = data;
  
  const colors = {
    BUY: 'bg-emerald-500 text-white',
    HOLD: 'bg-blue-500 text-white',
    SELL: 'bg-rose-500 text-white',
    WATCH: 'bg-amber-500 text-white',
    AVOID: 'bg-red-700 text-white',
  };
  
  const confColor = confidence === 'High' ? 'text-emerald-400' : confidence === 'Medium' ? 'text-amber-400' : 'text-rose-400';

  return (
    <div className="mt-4 bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-md w-full shadow-lg" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex justify-between items-start mb-4">
        <div className={`px-4 py-2 rounded-lg font-black tracking-widest text-xl ${colors[verdict] || 'bg-slate-700'}`}>
          {verdict}
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Confidence</div>
          <div className={`font-bold ${confColor}`}>{confidence}</div>
        </div>
      </div>
      
      <p className="text-slate-200 font-medium leading-relaxed mb-6 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
        {summary}
      </p>

      {/* 52 Week Bar */}
      {range52 && range52.high && range52.low && (
        <div className="mb-6">
          <div className="flex justify-between text-xs text-slate-500 mb-1 font-mono">
            <Tooltip term="52w Low" beginnerMode={beginnerMode} explanation="Lowest price in the last year">${range52.low.toFixed(2)}</Tooltip>
            <Tooltip term="52w High" beginnerMode={beginnerMode} explanation="Highest price in the last year">${range52.high.toFixed(2)}</Tooltip>
          </div>
          <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="absolute top-0 bottom-0 w-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)] z-10" 
              style={{ left: `${Math.max(0, Math.min(100, ((range52.price - range52.low)/(range52.high - range52.low))*100))}%` }}
            />
          </div>
          <div className="text-center text-xs text-slate-400 mt-1 font-mono font-bold">${range52.price?.toFixed(2)}</div>
        </div>
      )}

      {/* Signals */}
      <div className="space-y-3 mb-6">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
          5 Independent Signals
          {beginnerMode && <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Beginner Mode ON</span>}
        </h4>
        {Object.entries(fiveSignals).map(([key, sig]) => (
          <div key={key} className="flex items-start gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800/50">
            <div className="mt-0.5">
              {sig.state === 'bullish' ? <CheckCircle2 size={16} className="text-emerald-500" /> : 
               sig.state === 'bearish' ? <XCircle size={16} className="text-rose-500" /> : 
               <MinusCircle size={16} className="text-slate-500" />}
            </div>
            <div>
              <div className="text-sm font-bold text-slate-300 capitalize">
                <Tooltip term={key.replace(/([A-Z])/g, ' $1').trim()} beginnerMode={beginnerMode} explanation={sig.explanation}>
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </Tooltip>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">{beginnerMode ? sig.explanation : sig.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Shariah Note */}
      {shariah && (
        <div className={`mb-6 p-3 rounded-xl border text-sm ${shariah.compliant ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
          <div className="font-bold mb-1 flex items-center gap-1">
            <Globe size={14}/> {shariah.compliant ? 'Shariah Compliant' : 'Not Shariah Compliant'}
          </div>
          <p className="text-xs text-slate-300 mb-2">{shariah.reason}</p>
          {!shariah.compliant && shariah.alternative && (
            <div className="text-xs">Alternative: <strong className="text-white">{shariah.alternative}</strong></div>
          )}
        </div>
      )}

      {/* Risks & Changes */}
      <div className="space-y-4 mb-4">
        <div>
          <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-1">Key Risks</h4>
          <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
            {risks?.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">What would change this?</h4>
          <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
            {whatWouldChange?.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      </div>
      
      <DecisionChecklist type={verdict} lang={lang} />

      <div className="mt-4 pt-4 border-t border-slate-800 text-[10px] text-slate-500 text-center flex items-center justify-center gap-1">
        <AlertCircle size={12}/> Educational use only. Not financial advice. You decide.
      </div>
    </div>
  );
};

const PortfolioModal = ({ isOpen, onClose, lang, handleAnalyze, session, portfolio, setPortfolio }) => {
  const t = T[lang];
  const [symbol, setSymbol] = useState('');
  const [qty, setQty] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [livePrices, setLivePrices] = useState({});

  useEffect(() => {
    if (!isOpen || !portfolio) return;
    const fetchPrices = async () => {
      const prices = {};
      for (const item of portfolio) {
        if (!prices[item.symbol]) {
          const res = await getLivePrice(item.symbol);
          if(res) prices[item.symbol] = res;
        }
      }
      setLivePrices(prices);
    };
    fetchPrices();
  }, [isOpen, portfolio]);

  if (!isOpen) return null;

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!symbol || !qty || !buyPrice || !session) return;
    const s = symbol.toUpperCase();
    
    const { data } = await supabase.from('portfolios').insert({ 
      user_id: session.user.id, symbol: s, qty: Number(qty), buy_price: Number(buyPrice) 
    }).select();

    if (data && data[0]) {
      setPortfolio([...portfolio, data[0]]);
      getLivePrice(s).then(res => setLivePrices(p => ({...p, [s]: res})));
    }
    
    setSymbol(''); setQty(''); setBuyPrice('');
  };

  const handleRemove = async (id) => {
    if (!session) return;
    await supabase.from('portfolios').delete().eq('id', id).eq('user_id', session.user.id);
    setPortfolio(portfolio.filter(x => x.id !== id));
  };

  let totalValue = 0;
  let totalCost = 0;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl max-w-2xl w-full shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><Briefcase size={20} className="text-emerald-500" /> {t.portfolio}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>

        <form onSubmit={handleAdd} className="flex gap-2 mb-6 shrink-0">
          <input type="text" value={symbol} onChange={e=>setSymbol(e.target.value)} placeholder="AAPL" className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white uppercase" required dir="ltr"/>
          <input type="number" step="any" value={qty} onChange={e=>setQty(e.target.value)} placeholder={t.qty} className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" required />
          <input type="number" step="any" value={buyPrice} onChange={e=>setBuyPrice(e.target.value)} placeholder={t.buyPrice} className="w-28 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" required />
          <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 rounded-lg font-bold">{t.addStock}</button>
        </form>

        <div className="flex-1 overflow-y-auto space-y-2">
          {portfolio.map(item => {
            const live = livePrices[item.symbol];
            const currentPrice = live ? live.c : item.buy_price;
            const currentVal = item.qty * currentPrice;
            const cost = item.qty * item.buy_price;
            const pnl = currentVal - cost;
            const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
            
            totalValue += currentVal;
            totalCost += cost;

            return (
              <div key={item.id} className="flex flex-wrap md:flex-nowrap justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700 gap-4">
                <div className="w-16 font-bold text-white text-lg" dir="ltr">{item.symbol}</div>
                <div className="text-sm text-slate-400 w-20 text-center">
                  <div className="text-[10px] uppercase">Qty / Buy</div>
                  <div>{item.qty} @ ${item.buy_price}</div>
                </div>
                <div className="text-sm font-bold w-24 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-normal">Live Price</div>
                  <div className="text-white">${currentPrice.toFixed(2)}</div>
                </div>
                <div className={`text-sm font-bold w-24 text-center ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} dir="ltr">
                  <div className="text-[10px] uppercase text-slate-400 font-normal">P&L</div>
                  {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} ({pnlPct.toFixed(2)}%)
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { handleAnalyze(`Analyze my portfolio holding of ${item.symbol}. I bought ${item.qty} shares at $${item.buy_price}. How is it performing and what is your advice?`, item.symbol); onClose(); }} className="text-xs bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded text-white font-bold">{t.analyze}</button>
                  <button onClick={() => handleRemove(item.id)} className="text-slate-500 hover:text-rose-400 p-2"><Trash2 size={16}/></button>
                </div>
              </div>
            );
          })}
        </div>

        {portfolio.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between items-center text-sm shrink-0">
            <span className="text-slate-400">{t.totalValue}</span>
            <div className="text-right">
              <div className="text-xl font-bold text-white">${totalValue.toFixed(2)}</div>
              <div className={`font-bold ${totalValue >= totalCost ? 'text-emerald-400' : 'text-rose-400'}`} dir="ltr">
                {totalValue >= totalCost ? '+' : ''}{(totalValue - totalCost).toFixed(2)} ({(totalCost > 0 ? ((totalValue - totalCost)/totalCost)*100 : 0).toFixed(2)}%)
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


const WatchlistModal = ({ isOpen, onClose, lang, handleAnalyze, session, watchlist, setWatchlist }) => {
  const t = T[lang];
  const [symbol, setSymbol] = useState('');
  const [livePrices, setLivePrices] = useState({});

  useEffect(() => {
    if (!isOpen || !watchlist) return;
    const fetchPrices = async () => {
      const prices = {};
      for (const s of watchlist) {
        const res = await getLivePrice(s);
        if(res) prices[s] = res;
      }
      setLivePrices(prices);
    };
    fetchPrices();
  }, [isOpen, watchlist]);

  if (!isOpen) return null;

  const handleAdd = async () => {
    if (!symbol || !session) return;
    const s = symbol.toUpperCase();
    if (!watchlist.includes(s)) {
      const nw = [...watchlist, s];
      setWatchlist(nw);
      await supabase.from('watchlists').insert({ user_id: session.user.id, symbol: s });
      getLivePrice(s).then(res => setLivePrices(p => ({...p, [s]: res})));
    }
    setSymbol('');
  };

  const handleRemove = async (s) => {
    if (!session) return;
    const nw = watchlist.filter(x => x !== s);
    setWatchlist(nw);
    await supabase.from('watchlists').delete().eq('symbol', s).eq('user_id', session.user.id);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl max-w-lg w-full shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><Eye size={20} className="text-blue-500" /> {t.watchlist}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="flex gap-2 mb-4">
          <input type="text" value={symbol} onChange={e=>setSymbol(e.target.value)} placeholder="AAPL" className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white uppercase" dir="ltr"/>
          <button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-lg font-bold">Add</button>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {watchlist.map(s => {
            const data = livePrices[s];
            const isPos = data?.dp >= 0;
            return (
              <div key={s} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                <div>
                  <span className="font-bold text-white text-lg mr-2" dir="ltr">{s}</span>
                  {data && <span className="text-slate-300">${data.c?.toFixed(2)}</span>}
                </div>
                <div className="flex items-center gap-3">
                  {data && <span className={`text-sm font-bold ${isPos?'text-emerald-400':'text-rose-400'}`} dir="ltr">{isPos?'+':''}{data.dp?.toFixed(2)}%</span>}
                  <button onClick={() => { handleAnalyze(s); onClose(); }} className="text-xs bg-slate-700 hover:bg-emerald-600 px-2 py-1 rounded text-white">{t.analyze}</button>
                  <button onClick={() => handleRemove(s)} className="text-slate-500 hover:text-rose-400"><Trash2 size={16}/></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};


// --- Main Application ---
export default function App() {
  const [session, setSession] = useState(null);
  
  const [lang, setLang] = useState('ar');
  const t = T[lang];

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  
  const [geminiKey, setGeminiKey] = useState(getStoredGeminiKey());
  const [beginnerMode, setBeginnerMode] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [isWatchlistOpen, setIsWatchlistOpen] = useState(false);
  const [watchlist, setWatchlist] = useState([]);

  const [isPortfolioOpen, setIsPortfolioOpen] = useState(false);
  const [portfolio, setPortfolio] = useState([]);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      supabase.from('watchlists').select('symbol').eq('user_id', session.user.id).then(({data}) => {
        if(data) setWatchlist(data.map(r => r.symbol));
      });
      supabase.from('portfolios').select('*').eq('user_id', session.user.id).then(({data}) => {
        if(data) setPortfolio(data);
      });
      supabase.from('profiles').select('beginner_mode').eq('id', session.user.id).single().then(({data}) => {
        if(data && data.beginner_mode !== null) setBeginnerMode(data.beginner_mode);
      });
    }
  }, [session]);

  const handleSaveBeginnerMode = async (val) => {
    setBeginnerMode(val);
    if (session) {
      await supabase.from('profiles').upsert({ id: session.user.id, beginner_mode: val });
    }
  };

  useEffect(() => {
    if (session && messages.length === 0) {
       setMessages([{ id: 'welcome', role: 'assistant', content: t.welcome }]);
    }
  }, [lang, t.welcome, session, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, loadingStatus]);

  if (!session) {
    return <AuthScreen />;
  }

  const handleSend = async (textToProcess = null, directSymbol = null) => {
    const prompt = textToProcess || input;
    if (!prompt.trim() && !directSymbol) return;

    if (!geminiKey) { setIsSettingsOpen(true); return; }

    const symbol = directSymbol || detectStockSymbol(prompt);
    
    if (!directSymbol) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: prompt }]);
      setInput('');
    }

    setIsLoading(true);
    setLoadingStatus('Gathering signals from FMP & Polygon...');

    try {
      let cardData = null;
      if (symbol) {
        setLoadingStatus(`Fetching ${symbol} data...`);
        const [quote, profileRaw, metricsRaw, ratiosRaw, newsRaw] = await Promise.all([
          getLivePrice(symbol),
          fetchFMP(`/profile?symbol=${symbol}`),
          fetchFMP(`/key-metrics-ttm?symbol=${symbol}`),
          fetchFMP(`/ratios-ttm?symbol=${symbol}`),
          fetchPolygon(`/v2/reference/news?ticker=${symbol}&limit=5`)
        ]);

        const profile = profileRaw?.[0] || {};
        const metrics = metricsRaw?.[0] || {};
        const ratios = ratiosRaw?.[0] || {};
        const news = newsRaw?.results || [];

        const rawData = { quote, profile, metrics, ratios, news };
        const codeSignals = computeSignals(rawData);

        setLoadingStatus('Asking AI...');

        const systemInstruction = `
          You are AlphaTrade, an educational AI assistant.
          Beginner Mode is ${beginnerMode ? 'ON' : 'OFF'}. 
          Language: ${lang === 'ar' ? 'Arabic' : 'English'}.
          
          Stock: ${symbol}
          Profile: ${profile.description}
          Metrics Summary: P/E: ${ratios?.priceToEarningsRatioTTM?.toFixed(2)}, ROE: ${(metrics?.returnOnEquityTTM*100)?.toFixed(1)}%, D/E: ${ratios?.debtToEquityRatioTTM?.toFixed(2)}
          Recent News Headlines: ${news?.slice(0,5).map(n => n.title).join(' | ')}
          
          TASK: Create a JSON response. 
          Provide 'message' (a short greeting).
          Provide 'decisionCard' containing:
          - newsSentiment: (bullish/bearish/neutral based on headlines)
          - newsExplanation: (short reason)
          - summary: (1 sentence beginner summary of the stock's current situation)
          - risks: (array of 2-4 strings, simple risks)
          - whatWouldChange: (array of 1-2 strings, what would change the verdict)
          - shariah: { compliant: boolean, reason: string, alternative: string } 
            (Assess strictly on business activity based on AAOIFI Shariah standards. Ignore raw totalDebtToEquityQuarterly metric. Flag extremely obvious high-debt or non-compliant business sectors like alcohol/banking/pork.)
          
          Ensure all strings are in ${lang === 'ar' ? 'Arabic' : 'English'}.
          NO markdown fences. Pure JSON.
        `;

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: "Evaluate the data and provide the JSON object." }] }],
            systemInstruction: { parts: [{ text: systemInstruction }] },
            generationConfig: { responseMimeType: "application/json" }
          })
        });

        if (!res.ok) throw new Error('AI Error');
        const aiDataRaw = await res.json();
        let aiData;
        try {
            const text = aiDataRaw.candidates[0].content.parts[0].text.replace(/```json/g, '').replace(/```/g, '');
            aiData = JSON.parse(text);
        } catch(e) {
            aiData = { message: "Failed to parse AI structured response." };
        }

        if (aiData.decisionCard) {
          const aiSent = aiData.decisionCard.newsSentiment?.toLowerCase() || 'neutral';
          codeSignals.newsSentiment = {
            score: aiSent === 'bullish' ? 1 : aiSent === 'bearish' ? -1 : 0,
            state: aiSent,
            value: aiData.decisionCard.newsSentiment,
            explanation: aiData.decisionCard.newsExplanation || 'Sentiment derived from recent news.'
          };

          const verdictObj = getVerdict(codeSignals);

          cardData = {
            verdict: verdictObj.verdict,
            confidence: verdictObj.confidence,
            summary: aiData.decisionCard.summary,
            fiveSignals: codeSignals,
            risks: aiData.decisionCard.risks,
            whatWouldChange: aiData.decisionCard.whatWouldChange,
            shariah: aiData.decisionCard.shariah,
            52: profile?.range && quote ? { 
              low: parseFloat(profile.range.split('-')[0]), 
              high: parseFloat(profile.range.split('-')[1]), 
              price: quote.c 
            } : null
          };
        }
        
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Here is the analysis for ${symbol}:`,
          decisionData: cardData
        }]);
      } else {
        setLoadingStatus('Asking AI...');
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            systemInstruction: { parts: [{ text: `You are an educational AI financial advisor. Answer the user's question in ${lang === 'ar' ? 'Arabic' : 'English'} simply and directly without markdown fences.` }] },
          })
        });

        if (!res.ok) throw new Error('AI Error');
        const aiDataRaw = await res.json();
        const textResponse = aiDataRaw.candidates[0].content.parts[0].text;
        
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: textResponse
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: t.errorApi }]);
    } finally {
      setIsLoading(false);
      setLoadingStatus('');
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 font-sans text-slate-300" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl max-w-md w-full shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><Settings size={20} className="text-emerald-500" /> {t.settings}</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">{t.apiKey}</label>
                <input type="password" value={geminiKey} onChange={(e) => { setGeminiKey(e.target.value); localStorage.setItem('gemini_api_key', e.target.value); }} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white" dir="ltr" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={beginnerMode} onChange={(e) => handleSaveBeginnerMode(e.target.checked)} className="rounded bg-slate-900 border-slate-600 text-emerald-500 focus:ring-emerald-500/20" />
                <span className="text-sm font-medium text-slate-300">{t.beginnerMode}</span>
              </label>
              <button onClick={() => setIsSettingsOpen(false)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg">{t.save}</button>
            </div>
          </div>
        </div>
      )}

      {/* Portfolio Modal */}
      <PortfolioModal isOpen={isPortfolioOpen} onClose={() => setIsPortfolioOpen(false)} lang={lang} handleAnalyze={(text, s) => handleSend(text, s)} session={session} portfolio={portfolio} setPortfolio={setPortfolio} />

      {/* Watchlist Modal */}
      <WatchlistModal isOpen={isWatchlistOpen} onClose={() => setIsWatchlistOpen(false)} lang={lang} handleAnalyze={(s) => handleSend(null, s)} session={session} watchlist={watchlist} setWatchlist={setWatchlist} />

      {/* Main Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Topbar */}
        <div className="h-16 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-6 shrink-0 backdrop-blur-md">
           <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 text-emerald-400 font-bold"><BrainCircuit size={20}/> {t.title}</div>
           </div>
           <div className="flex items-center gap-4">
             <button onClick={() => setIsPortfolioOpen(true)} className="flex items-center gap-1 text-sm font-bold text-slate-400 hover:text-emerald-400"><Briefcase size={16}/> {t.portfolio}</button>
             <button onClick={() => setIsWatchlistOpen(true)} className="flex items-center gap-1 text-sm font-bold text-slate-400 hover:text-blue-500"><Eye size={16}/> {t.watchlist}</button>
             <button onClick={() => setIsSettingsOpen(true)} className="text-slate-400 hover:text-emerald-400"><Settings size={18} /></button>
             <button onClick={() => supabase.auth.signOut()} title="Logout" className="text-slate-500 hover:text-rose-400 ml-2"><LogOut size={18} /></button>
           </div>
        </div>

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-950">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-4 max-w-4xl mx-auto ${msg.role === 'user' ? (lang === 'ar' ? 'flex-row-reverse' : '') : ''}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`flex flex-col gap-2 min-w-0 flex-1 ${msg.role === 'user' && lang === 'ar' ? 'items-end' : ''}`}>
                {msg.content && (
                  <div className={`text-sm leading-relaxed p-4 rounded-2xl break-words ${msg.role === 'user' ? 'bg-slate-800 text-slate-200' : 'bg-transparent text-slate-300'}`}>
                    {msg.content}
                  </div>
                )}
                {msg.decisionData && <DecisionWidget data={msg.decisionData} lang={lang} beginnerMode={beginnerMode} />}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-4 max-w-4xl mx-auto opacity-70">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center"><Bot size={16} className="animate-pulse" /></div>
              <div className="text-sm p-4 bg-transparent text-emerald-400/80 flex items-center gap-2">
                <RefreshCw size={14} className="animate-spin" /> {loadingStatus}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Input */}
        <div className="p-4 sm:p-6 bg-slate-900/50 border-t border-slate-800 backdrop-blur-md">
          <div className="max-w-4xl mx-auto relative flex items-center gap-3">
             <input
               value={input}
               onChange={(e) => setInput(e.target.value)}
               onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
               placeholder={t.inputPlaceholder}
               className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-sm text-white focus:outline-none focus:border-emerald-500 pr-12 shadow-inner"
             />
             <button onClick={() => handleSend()} disabled={isLoading} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg disabled:opacity-50">
               <Send size={18} />
             </button>
          </div>
          <div className="max-w-4xl mx-auto mt-2 text-center text-[10px] text-slate-600">{t.disclaimer}</div>
        </div>
      </div>
    </div>
  );
}
