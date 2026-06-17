import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, BrainCircuit, AlertCircle, Bot, User, 
  Settings, Briefcase, Trash2, CheckCircle2, 
  XCircle, MinusCircle, RefreshCw, Eye, LogOut, Globe,
  MessageSquare, ChevronRight, ChevronLeft, LayoutDashboard, TrendingUp, Sun, Moon
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
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
    disclaimer: "البيانات للاستخدام التعليمي فقط وليست نصيحة مالية مضمونة.",
    settings: "الإعدادات",
    portfolio: "المحفظة",
    watchlist: "قائمة المراقبة",
    chat: "المحادثة",
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
    analyze: "تحليل ذكي",
    movePort: "نقل للمحفظة",
    addToWatchlist: "أضف للمراقبة",
    decisionChecklist: "قائمة التحقق للمبتدئين",
    buyChecklist: ["هل الاتجاه العام إيجابي؟", "هل الأخبار خالية من الكوارث؟", "هل السهم متوافق شرعياً؟", "هل لديك خطة لوقف الخسارة؟"],
    sellChecklist: ["هل تغير سبب الشراء الأساسي؟", "هل الخسارة تجاوزت حدك الأقصى؟", "هل تبيع بناءً على منطق؟"]
  },
  en: {
    title: "AlphaTrade Pro",
    subtitle: "AI Consultant",
    welcome: "Hello! I am AlphaTrade. (Educational use only)\nAsk me to analyze any stock.",
    inputPlaceholder: "Ask for stock analysis...",
    disclaimer: "Data provided for educational purposes, not guaranteed financial advice.",
    settings: "Settings",
    portfolio: "Portfolio",
    watchlist: "Watchlist",
    chat: "AI Chat",
    apiKey: "Gemini API Key",
    beginnerMode: "Beginner Mode (Explain jargon)",
    save: "Save",
    addStock: "Add",
    qty: "Qty",
    buyPrice: "Buy Price",
    currentPrice: "Live Price",
    pnl: "P&L",
    action: "Action",
    totalValue: "Total Portfolio Value",
    analyzing: "Analyzing...",
    errorApi: "AI connection failed.",
    live: "Live",
    today: "Today",
    newsTitle: "Live News",
    analyze: "Smart Analysis",
    movePort: "To Portfolio",
    addToWatchlist: "Watch",
    decisionChecklist: "Decision Checklist",
    buyChecklist: ["Is the trend positive?", "Is the news clear of disasters?", "Is it Shariah compliant?", "Do you have a stop-loss?"],
    sellChecklist: ["Did your original thesis change?", "Is the loss beyond your limit?", "Are you selling on logic?"]
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
  const res = await fetchFMP(`/profile?symbol=${symbol}`);
  if (!res || !res[0]) return null;
  const data = res[0];
  return {
    c: data.price,
    dp: data.changePercentage,
    h: data.range ? parseFloat(data.range.split('-')[1]) : 0,
    l: data.range ? parseFloat(data.range.split('-')[0]) : 0
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
    else setError('Success! Check your email.');
    setLoading(false);
  };

  return (
    <div className="flex h-screen scibayan-bg items-center justify-center p-4">
      <div className="glass-panel p-8 rounded-3xl max-w-md w-full">
        <div className="flex justify-center mb-6 text-navy-500 drop-shadow-[0_0_15px_rgba(0,210,255,0.5)]">
          <BrainCircuit size={56} strokeWidth={1.5}/>
        </div>
        <h2 className="text-3xl font-heading font-bold text-slate-800 dark:text-white mb-6 text-center tracking-tight">AlphaTrade Pro</h2>
        {error && <div className="bg-rose-100 dark:bg-accent-coral/10 border border-rose-300 dark:border-accent-coral/20 text-accent-coral dark:text-accent-coral p-3 rounded-xl mb-4 text-sm text-center">{error}</div>}
        <form className="space-y-4">
          <div>
            <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700/50 rounded-xl px-4 py-3 text-slate-800 dark:text-white focus:outline-none focus:border-navy-500/50 focus:ring-1 focus:ring-navy-500/50 transition-all" required />
          </div>
          <div>
            <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700/50 rounded-xl px-4 py-3 text-slate-800 dark:text-white focus:outline-none focus:border-navy-500/50 focus:ring-1 focus:ring-navy-500/50 transition-all" required />
          </div>
          <div className="flex gap-4 mt-8">
            <button onClick={handleLogin} disabled={loading} className="flex-1 bg-gradient-to-r from-navy-600 to-navy-500 hover:from-navy-500 hover:to-accent-teal text-white font-bold py-3 rounded-xl shadow-[0_0_20px_rgba(0,210,255,0.3)] transition-all">Login</button>
            <button onClick={handleSignup} disabled={loading} className="flex-1 glass-card hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-white font-bold py-3 rounded-xl transition-all">Sign Up</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Tooltip = ({ term, beginnerMode, explanation, children }) => {
  if (!beginnerMode) return <span>{children}</span>;
  return (
    <span className="group relative cursor-help inline-block border-b border-dashed border-slate-400 dark:border-slate-500/50 hover:border-navy-500/50 transition-colors">
      {children}
      <span className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 w-56 text-xs glass-panel text-slate-700 dark:text-slate-200 rounded-xl z-[100] text-center font-normal">
        <span className="font-bold text-navy-600 dark:text-accent-teal block mb-1">{term}</span>
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
    <div className="mt-6 glass-card p-4 rounded-2xl">
      <h4 className="font-heading font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2 text-sm tracking-wide">
        <AlertCircle size={16} className="text-blue-500 dark:text-blue-400" /> {t.decisionChecklist} ({type})
      </h4>
      <div className="space-y-3">
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
              className="mt-0.5 rounded bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-navy-500 focus:ring-navy-500/20 w-4 h-4"
            />
            <span className={`text-sm transition-colors ${checks[i] ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white'}`}>{item}</span>
          </label>
        ))}
      </div>
      {allChecked && <div className="mt-4 text-xs font-bold text-navy-500 dark:text-accent-teal flex items-center gap-1 animate-pulse"><CheckCircle2 size={14}/> Ready to execute!</div>}
    </div>
  );
};

const DecisionWidget = ({ data, lang, beginnerMode }) => {
  if (!data) return null;
  const { verdict, confidence, fiveSignals, summary, risks, whatWouldChange, shariah, 52: range52 } = data;
  
  const colors = {
    BUY: 'bg-gradient-to-r from-navy-500 to-accent-teal text-white shadow-[0_0_20px_rgba(0,210,255,0.3)]',
    HOLD: 'bg-gradient-to-r from-blue-500 to-blue-400 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]',
    SELL: 'bg-gradient-to-r from-accent-coral to-accent-coral text-white shadow-[0_0_20px_rgba(255,107,107,0.3)]',
    WATCH: 'bg-gradient-to-r from-amber-500 to-amber-400 text-white shadow-[0_0_20px_rgba(245,158,11,0.3)]',
    AVOID: 'bg-gradient-to-r from-red-700 to-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)]',
  };
  
  const confColor = confidence === 'High' ? 'text-navy-500 dark:text-accent-teal text-glow-accent' : confidence === 'Medium' ? 'text-amber-500 dark:text-amber-400' : 'text-accent-coral dark:text-accent-coral text-glow-coral';

  return (
    <div className="mt-4 glass-panel rounded-3xl p-6 max-w-lg w-full" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex justify-between items-center mb-6">
        <div className={`px-5 py-2 rounded-xl font-heading font-black tracking-widest text-2xl ${colors[verdict] || 'bg-slate-300 dark:bg-slate-700'}`}>
          {verdict}
        </div>
        <div className="text-right">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">Confidence</div>
          <div className={`font-heading font-black tracking-wide ${confColor}`}>{confidence}</div>
        </div>
      </div>
      
      <p className="text-slate-700 dark:text-slate-200 font-medium leading-relaxed mb-6 glass-card p-4 rounded-2xl">
        {summary}
      </p>

      {/* 52 Week Bar */}
      {range52 && range52.high && range52.low && (
        <div className="mb-8">
          <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-2 font-mono uppercase tracking-wider font-bold">
            <Tooltip term="52w Low" beginnerMode={beginnerMode} explanation="Lowest price in the last year">L ${range52.low.toFixed(2)}</Tooltip>
            <Tooltip term="52w High" beginnerMode={beginnerMode} explanation="Highest price in the last year">H ${range52.high.toFixed(2)}</Tooltip>
          </div>
          <div className="relative h-2.5 bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-300 dark:border-white/5">
            <div 
              className="absolute top-0 bottom-0 w-3 bg-gradient-to-r from-accent-teal to-cyan-400 rounded-full shadow-[0_0_10px_rgba(56,189,248,0.8)] z-10" 
              style={{ left: `${Math.max(0, Math.min(100, ((range52.price - range52.low)/(range52.high - range52.low))*100))}%` }}
            />
          </div>
          <div className="text-center text-sm text-slate-800 dark:text-white mt-2 font-mono font-bold tracking-tight">${range52.price?.toFixed(2)}</div>
        </div>
      )}

      {/* Signals */}
      <div className="space-y-3 mb-8">
        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          5 Core Signals
          {beginnerMode && <span className="text-[9px] text-navy-600 dark:text-accent-teal border border-navy-500/20 bg-navy-50 dark:bg-navy-500/10 px-2 py-0.5 rounded-full">Beginner</span>}
        </h4>
        <div className="grid grid-cols-1 gap-2">
          {Object.entries(fiveSignals).map(([key, sig]) => (
            <div key={key} className="flex items-center gap-4 bg-white/50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
              <div className="shrink-0 p-2 rounded-xl bg-slate-100 dark:bg-slate-950">
                {sig.state === 'bullish' ? <CheckCircle2 size={18} className="text-navy-500 dark:text-accent-teal drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" /> : 
                 sig.state === 'bearish' ? <XCircle size={18} className="text-accent-coral dark:text-accent-coral drop-shadow-[0_0_8px_rgba(251,113,133,0.5)]" /> : 
                 <MinusCircle size={18} className="text-slate-400 dark:text-slate-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 capitalize">
                  <Tooltip term={key.replace(/([A-Z])/g, ' $1').trim()} beginnerMode={beginnerMode} explanation={sig.explanation}>
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </Tooltip>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{beginnerMode ? sig.explanation : sig.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Shariah Note */}
      {shariah && (
        <div className={`mb-8 p-4 rounded-2xl border ${shariah.compliant ? 'bg-navy-50 dark:bg-navy-500/10 border-emerald-200 dark:border-navy-500/30' : 'bg-rose-50 dark:bg-accent-coral/10 border-rose-200 dark:border-accent-coral/30'}`}>
          <div className={`font-heading font-bold mb-2 flex items-center gap-2 ${shariah.compliant ? 'text-navy-600 dark:text-accent-teal text-glow-accent' : 'text-accent-coral dark:text-accent-coral text-glow-coral'}`}>
            <Globe size={16}/> {shariah.compliant ? 'Shariah Compliant' : 'Not Shariah Compliant'}
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300 mb-2 leading-relaxed">{shariah.reason}</p>
          {!shariah.compliant && shariah.alternative && (
            <div className="text-xs mt-3 bg-white/50 dark:bg-slate-950/50 p-2 rounded-lg border border-slate-200 dark:border-white/5">Alternative: <strong className="text-slate-800 dark:text-white">{shariah.alternative}</strong></div>
          )}
        </div>
      )}

      {/* Risks & Changes */}
      <div className="space-y-5 mb-4">
        <div>
          <h4 className="text-[10px] font-bold text-accent-coral dark:text-accent-coral uppercase tracking-widest mb-2 flex items-center gap-2"><TrendingUp size={12}/> Key Risks</h4>
          <ul className="list-none text-sm text-slate-700 dark:text-slate-300 space-y-2">
            {risks?.map((r, i) => <li key={i} className="flex gap-2 items-start"><span className="text-accent-coral/50">•</span> {r}</li>)}
          </ul>
        </div>
        <div>
          <h4 className="text-[10px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2"><RefreshCw size={12}/> What changes this?</h4>
          <ul className="list-none text-sm text-slate-700 dark:text-slate-300 space-y-2">
            {whatWouldChange?.map((c, i) => <li key={i} className="flex gap-2 items-start"><span className="text-blue-500/50">•</span> {c}</li>)}
          </ul>
        </div>
      </div>
      
      <DecisionChecklist type={verdict} lang={lang} />

      <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/10 text-[10px] text-slate-500 text-center flex items-center justify-center gap-1 uppercase tracking-widest font-bold">
        <AlertCircle size={12}/> Educational Use Only
      </div>
    </div>
  );
};


const PortfolioTab = ({ lang, handleAnalyze, session, portfolio, setPortfolio, setTab }) => {
  const t = T[lang];
  const [symbol, setSymbol] = useState('');
  const [qty, setQty] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [livePrices, setLivePrices] = useState({});

  useEffect(() => {
    if (!portfolio || portfolio.length === 0) return;
    const fetchPrices = async () => {
      const symbols = portfolio.map(p => p.symbol);
      const { data } = await supabase.from('stock_analyses').select('symbol, last_price, change_pct').in('symbol', symbols);
      const prices = {};
      const cachedSymbols = [];
      if (data) {
        data.forEach(row => {
          prices[row.symbol] = { c: row.last_price, dp: row.change_pct };
          cachedSymbols.push(row.symbol);
        });
      }
      // Fallback: Populate cache for missing symbols
      const missingSymbols = symbols.filter(s => !cachedSymbols.includes(s));
      for (const s of missingSymbols) {
        const res = await getLivePrice(s);
        if (res) {
          prices[s] = res;
          await supabase.from('stock_analyses').upsert({ symbol: s, last_price: res.c, change_pct: res.dp });
        }
      }
      setLivePrices(prices);
    };
    fetchPrices();
  }, [portfolio]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!symbol || !qty || !buyPrice || !session) return;
    const s = symbol.toUpperCase();
    
    const { data } = await supabase.from('portfolios').insert({ 
      user_id: session.user.id, symbol: s, qty: Number(qty), buy_price: Number(buyPrice) 
    }).select();

    if (data && data[0]) {
      setPortfolio([...portfolio, data[0]]);
      
      const { data: cached } = await supabase.from('stock_analyses').select('last_price, change_pct').eq('symbol', s).single();
      if (cached) {
        setLivePrices(p => ({...p, [s]: { c: cached.last_price, dp: cached.change_pct }}));
      } else {
        const res = await getLivePrice(s);
        if (res) {
          await supabase.from('stock_analyses').upsert({ symbol: s, last_price: res.c, change_pct: res.dp });
          setLivePrices(p => ({...p, [s]: res}));
        }
      }
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
    <div className="h-full flex flex-col p-6 max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <h2 className="text-3xl font-heading font-bold text-slate-800 dark:text-white mb-8 flex items-center gap-3 drop-shadow-md">
        <Briefcase size={28} className="text-navy-500 dark:text-accent-teal" /> {t.portfolio}
      </h2>

      <div className="glass-panel p-6 rounded-3xl mb-8">
        <form onSubmit={handleAdd} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[120px]">
            <label className="block text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1 font-bold">Ticker</label>
            <input type="text" value={symbol} onChange={e=>setSymbol(e.target.value)} placeholder="AAPL" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700/50 rounded-xl px-4 py-3 text-slate-800 dark:text-white uppercase focus:border-navy-500/50 focus:outline-none" required dir="ltr"/>
          </div>
          <div className="w-24">
            <label className="block text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1 font-bold">{t.qty}</label>
            <input type="number" step="any" value={qty} onChange={e=>setQty(e.target.value)} placeholder="10" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700/50 rounded-xl px-4 py-3 text-slate-800 dark:text-white focus:border-navy-500/50 focus:outline-none" required />
          </div>
          <div className="w-32">
            <label className="block text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1 font-bold">{t.buyPrice}</label>
            <input type="number" step="any" value={buyPrice} onChange={e=>setBuyPrice(e.target.value)} placeholder="150.00" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700/50 rounded-xl px-4 py-3 text-slate-800 dark:text-white focus:border-navy-500/50 focus:outline-none" required />
          </div>
          <button type="submit" className="bg-navy-600 hover:bg-navy-500 text-white px-8 py-3 rounded-xl font-bold transition-colors">{t.addStock}</button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-3">
        {portfolio.map(item => {
          const live = livePrices[item.symbol];
          const currentPrice = live?.c || null;
          const cost = item.qty * item.buy_price;
          const currentVal = currentPrice ? item.qty * currentPrice : cost;
          const pnl = currentPrice ? currentVal - cost : 0;
          const pnlPct = (currentPrice && cost > 0) ? (pnl / cost) * 100 : 0;
          
          if (currentPrice) {
            totalValue += currentVal;
            totalCost += cost;
          }

          return (
            <div key={item.id} className="glass-card flex flex-wrap md:flex-nowrap justify-between items-center p-4 rounded-2xl gap-6 hover:bg-slate-100/50 dark:hover:bg-slate-800/60 transition-colors">
              <div className="flex items-center gap-4 w-40">
                <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-900 flex items-center justify-center font-heading font-bold text-slate-700 dark:text-white border border-slate-300 dark:border-white/5">
                  {item.symbol.substring(0,2)}
                </div>
                <div>
                  <div className="font-heading font-bold text-slate-800 dark:text-white text-lg tracking-wide" dir="ltr">{item.symbol}</div>
                  <div className="text-xs text-slate-500 font-mono">{item.qty} @ ${item.buy_price}</div>
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">{t.currentPrice}</div>
                <div className="text-slate-800 dark:text-white font-mono text-lg">{currentPrice ? `$${currentPrice.toFixed(2)}` : 'N/A'}</div>
              </div>

              <div className="text-center" dir="ltr">
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">{t.pnl}</div>
                <div className={`font-mono text-lg font-bold ${currentPrice ? (pnl >= 0 ? 'text-navy-500 dark:text-accent-teal text-glow-accent' : 'text-accent-coral dark:text-accent-coral text-glow-coral') : 'text-slate-400'}`}>
                  {currentPrice ? `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} (${pnlPct.toFixed(2)}%)` : '-'}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={() => { handleAnalyze(`Analyze my portfolio holding of ${item.symbol}. I bought ${item.qty} shares at $${item.buy_price}. How is it performing and what is your advice?`, item.symbol); setTab('chat'); }} className="text-xs bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-white font-bold transition-colors">{t.analyze}</button>
                <button onClick={() => handleRemove(item.id)} className="text-slate-400 hover:text-accent-coral p-2 transition-colors"><Trash2 size={18}/></button>
              </div>
            </div>
          );
        })}
        {portfolio.length === 0 && (
          <div className="text-center text-slate-500 mt-20">No holdings in your portfolio yet.</div>
        )}
      </div>

      {portfolio.length > 0 && (
        <div className="mt-6 glass-panel p-6 rounded-3xl flex justify-between items-center shrink-0">
          <div className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.totalValue}</div>
          <div className="text-right">
            <div className="text-3xl font-heading font-black text-slate-800 dark:text-white tracking-tight">${totalValue.toFixed(2)}</div>
            <div className={`font-mono text-lg font-bold ${totalValue >= totalCost ? 'text-navy-500 dark:text-accent-teal' : 'text-accent-coral dark:text-accent-coral'}`} dir="ltr">
              {totalValue >= totalCost ? '+' : ''}{(totalValue - totalCost).toFixed(2)} ({(totalCost > 0 ? ((totalValue - totalCost)/totalCost)*100 : 0).toFixed(2)}%)
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


const WatchlistTab = ({ lang, handleAnalyze, session, watchlist, setWatchlist, setTab }) => {
  const t = T[lang];
  const [symbol, setSymbol] = useState('');
  const [livePrices, setLivePrices] = useState({});

  useEffect(() => {
    if (!watchlist || watchlist.length === 0) return;
    const fetchPrices = async () => {
      const { data } = await supabase.from('stock_analyses').select('symbol, last_price, change_pct').in('symbol', watchlist);
      const prices = {};
      const cachedSymbols = [];
      if (data) {
        data.forEach(row => {
          prices[row.symbol] = { c: row.last_price, dp: row.change_pct };
          cachedSymbols.push(row.symbol);
        });
      }
      // Fallback: Populate cache for missing symbols
      const missingSymbols = watchlist.filter(s => !cachedSymbols.includes(s));
      for (const s of missingSymbols) {
        const res = await getLivePrice(s);
        if (res) {
          prices[s] = res;
          await supabase.from('stock_analyses').upsert({ symbol: s, last_price: res.c, change_pct: res.dp });
        }
      }
      setLivePrices(prices);
    };
    fetchPrices();
  }, [watchlist]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!symbol || !session) return;
    const s = symbol.toUpperCase();
    if (!watchlist.includes(s)) {
      const nw = [...watchlist, s];
      setWatchlist(nw);
      await supabase.from('watchlists').insert({ user_id: session.user.id, symbol: s });
      
      const { data: cached } = await supabase.from('stock_analyses').select('last_price, change_pct').eq('symbol', s).single();
      if (cached) {
        setLivePrices(p => ({...p, [s]: { c: cached.last_price, dp: cached.change_pct }}));
      } else {
        const res = await getLivePrice(s);
        if (res) {
          await supabase.from('stock_analyses').upsert({ symbol: s, last_price: res.c, change_pct: res.dp });
          setLivePrices(p => ({...p, [s]: res}));
        }
      }
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
    <div className="h-full flex flex-col p-6 max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <h2 className="text-3xl font-heading font-bold text-slate-800 dark:text-white mb-8 flex items-center gap-3 drop-shadow-md">
        <Eye size={28} className="text-blue-500 dark:text-blue-400" /> {t.watchlist}
      </h2>

      <div className="glass-panel p-6 rounded-3xl mb-8">
        <form onSubmit={handleAdd} className="flex gap-4">
          <input type="text" value={symbol} onChange={e=>setSymbol(e.target.value)} placeholder="AAPL" className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700/50 rounded-xl px-4 py-3 text-slate-800 dark:text-white uppercase focus:border-blue-500/50 focus:outline-none" dir="ltr" required/>
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold transition-colors">{t.addStock}</button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pb-6">
        {watchlist.map(s => {
          const data = livePrices[s];
          const isPos = data?.dp >= 0;
          return (
            <div key={s} className="glass-card p-5 rounded-2xl flex flex-col justify-between hover:bg-slate-100/50 dark:hover:bg-slate-800/60 transition-colors group">
              <div className="flex justify-between items-start mb-4">
                <div className="font-heading font-bold text-slate-800 dark:text-white text-2xl tracking-wide" dir="ltr">{s}</div>
                <button onClick={() => handleRemove(s)} className="text-slate-400 hover:text-accent-coral opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={18}/></button>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Price</div>
                  <div className="text-xl font-mono text-slate-800 dark:text-white">{data && data.c ? `$${data.c.toFixed(2)}` : 'N/A'}</div>
                </div>
                <div className="text-right">
                  {data && data.c && (
                    <div className={`text-lg font-mono font-bold ${isPos?'text-navy-500 dark:text-accent-teal text-glow-accent':'text-accent-coral dark:text-accent-coral text-glow-coral'}`} dir="ltr">
                      {isPos?'+':''}{data.dp?.toFixed(2)}%
                    </div>
                  )}
                </div>
              </div>
              <button onClick={() => { handleAnalyze(s); setTab('chat'); }} className="mt-5 w-full text-sm bg-slate-200 dark:bg-slate-800 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 py-2 rounded-xl text-slate-700 dark:text-white font-bold transition-colors">{t.analyze}</button>
            </div>
          );
        })}
        {watchlist.length === 0 && (
          <div className="col-span-full text-center text-slate-500 mt-10">No symbols in watchlist.</div>
        )}
      </div>
    </div>
  );
};


// --- Main Application ---
export default function App() {
  const [session, setSession] = useState(null);
  
  const [lang, setLang] = useState('en');
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const [activeTab, setActiveTab] = useState('chat');

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  
  const [geminiKey, setGeminiKey] = useState(getStoredGeminiKey());
  const [beginnerMode, setBeginnerMode] = useState(true);
  
  const [watchlist, setWatchlist] = useState([]);
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
       setMessages([{ id: 'welcome', role: 'assistant', content: T[lang].welcome }]);
    }
  }, [lang, session, messages.length]);

  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, loadingStatus, activeTab]);

  if (!session) {
    return <AuthScreen />;
  }

  const handleSend = async (textToProcess = null, directSymbol = null) => {
    const prompt = textToProcess || input;
    if (!prompt.trim() && !directSymbol) return;

    if (!geminiKey) { setActiveTab('settings'); return; }

    const symbol = directSymbol || detectStockSymbol(prompt);
    
    if (!directSymbol) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: prompt }]);
      setInput('');
    }

    setIsLoading(true);
    setActiveTab('chat');
    setLoadingStatus('Gathering signals...');

    try {
      let cardData = null;
      if (symbol) {
        setLoadingStatus(`Fetching ${symbol} data...`);
        const [profileRaw, metricsRaw, ratiosRaw, newsRaw] = await Promise.all([
          fetchFMP(`/profile?symbol=${symbol}`),
          fetchFMP(`/key-metrics-ttm?symbol=${symbol}`),
          fetchFMP(`/ratios-ttm?symbol=${symbol}`),
          fetchPolygon(`/v2/reference/news?ticker=${symbol}&limit=5`)
        ]);

        const profile = profileRaw?.[0] || {};
        const quote = profile.price ? {
            c: profile.price,
            dp: profile.changePercentage,
            h: profile.range ? parseFloat(profile.range.split('-')[1]) : 0,
            l: profile.range ? parseFloat(profile.range.split('-')[0]) : 0,
        } : null;
        
        const metrics = Array.isArray(metricsRaw) ? metricsRaw[0] : {};
        const ratios = Array.isArray(ratiosRaw) ? ratiosRaw[0] : {};
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

          // --- Caching Layer Upsert ---
          if (quote && quote.c) {
             await supabase.from('stock_analyses').upsert({
               symbol: symbol,
               last_price: quote.c,
               change_pct: quote.dp,
               analysis_json: cardData
             });
          }
        }
        
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Here is the analysis for ${symbol}:`,
          decisionData: cardData
        }]);
      } else {
        setLoadingStatus('Fetching market context...');
        const marketNewsRaw = await fetchPolygon(`/v2/reference/news?limit=10`);
        const marketNews = marketNewsRaw?.results || [];
        const newsContext = marketNews.map(n => `- ${n.title} (Tickers: ${n.tickers?.join(', ') || 'General'})`).join('\n');

        setLoadingStatus('Asking AI...');
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            systemInstruction: { parts: [{ text: `You are a premium AI financial analyst. Provide highly informative, data-driven answers with discussion and market predictions based on the latest context. Do NOT tell the user to use other apps or websites; provide the best possible analysis yourself. 
            
            LATEST MARKET NEWS:
            ${newsContext}
            
            Answer the user's question in ${lang === 'ar' ? 'Arabic' : 'English'}. VERY IMPORTANT: Make your answer extremely easy to read. Use structured formatting with well-spaced bullet points (- ), numbered lists, and short paragraphs. Avoid walls of text. Provide hard numbers and deep insights.` }] },
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
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: T[lang].errorApi }]);
    } finally {
      setIsLoading(false);
      setLoadingStatus('');
    }
  };

  const NavItem = ({ id, icon: Icon, label }) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === id ? 'bg-navy-500 text-white shadow-[0_0_15px_rgba(0,210,255,0.3)]' : 'text-slate-500 hover:text-navy-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 dark:text-slate-400 dark:hover:text-accent-teal'}`}
    >
      <Icon size={20} />
      <span className="hidden md:inline">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen scibayan-bg transition-colors duration-300" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Sidebar Navigation */}
      <div className="w-16 md:w-64 glass-panel border-r border-slate-200 dark:border-white/5 flex flex-col shrink-0 z-20">
        <div className="h-20 flex items-center justify-center md:justify-start md:px-6 shrink-0 border-b border-slate-200 dark:border-white/5">
          <BrainCircuit size={28} className="text-navy-500 dark:text-accent-teal drop-shadow-[0_0_10px_rgba(0,210,255,0.5)]"/>
          <span className="hidden md:inline ml-3 font-heading font-black text-xl text-slate-800 dark:text-white tracking-tight">AlphaTrade</span>
        </div>
        
        <div className="flex-1 px-2 py-6 space-y-2 overflow-y-auto">
          <NavItem id="chat" icon={MessageSquare} label={T[lang].chat} />
          <NavItem id="portfolio" icon={Briefcase} label={T[lang].portfolio} />
          <NavItem id="watchlist" icon={Eye} label={T[lang].watchlist} />
          <NavItem id="settings" icon={Settings} label={T[lang].settings} />
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-white/5 space-y-2">
          <div className="flex gap-2">
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white font-bold transition-colors">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white font-bold transition-colors uppercase">
              <Globe size={16} /> <span className="hidden md:inline">{lang === 'ar' ? 'EN' : 'AR'}</span>
            </button>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-slate-500 hover:text-accent-coral hover:bg-rose-50 dark:hover:bg-accent-coral/10 transition-colors">
            <LogOut size={16} /> <span className="hidden md:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-gradient-to-br from-white/50 to-slate-50/50 dark:from-slate-950/50 dark:to-slate-900/50 backdrop-blur-3xl">
        
        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col h-full animate-in fade-in zoom-in-95 duration-300">
            {/* Chat Feed */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-4 max-w-4xl mx-auto ${msg.role === 'user' ? (lang === 'ar' ? 'flex-row-reverse' : 'flex-row-reverse') : ''}`}>
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${msg.role === 'user' ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' : 'bg-white dark:bg-slate-800 border border-navy-500/30 text-navy-500 dark:text-accent-teal'}`}>
                    {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                  </div>
                  <div className={`flex flex-col gap-2 min-w-0 flex-1 ${msg.role === 'user' ? (lang === 'ar' ? 'items-start' : 'items-end') : 'items-start'}`}>
                    {msg.content && (
                      <div className={`text-sm leading-relaxed p-5 rounded-3xl break-words shadow-md ${msg.role === 'user' ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-sm whitespace-pre-wrap' : 'glass-card text-slate-800 dark:text-slate-200 rounded-tl-sm prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-heading prose-a:text-accent-teal prose-strong:text-slate-900 dark:prose-strong:text-white marker:text-navy-500 dark:marker:text-accent-teal'}`}>
                        {msg.role === 'user' ? msg.content : <ReactMarkdown>{msg.content}</ReactMarkdown>}
                      </div>
                    )}
                    {msg.decisionData && <DecisionWidget data={msg.decisionData} lang={lang} beginnerMode={beginnerMode} />}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-4 max-w-4xl mx-auto opacity-70">
                  <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 text-navy-500 dark:text-accent-teal flex items-center justify-center border border-navy-500/30"><Bot size={20} className="animate-pulse" /></div>
                  <div className="text-sm p-5 glass-card text-navy-600 dark:text-accent-teal rounded-3xl rounded-tl-sm flex items-center gap-3">
                    <RefreshCw size={16} className="animate-spin" /> <span className="font-medium tracking-wide">{loadingStatus}</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* Input */}
            <div className="p-4 sm:p-6 bg-white/80 dark:bg-slate-900/80 border-t border-slate-200 dark:border-white/5 backdrop-blur-xl shrink-0">
              <div className="max-w-4xl mx-auto relative flex items-center">
                 <input
                   value={input}
                   onChange={(e) => setInput(e.target.value)}
                   onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                   placeholder={T[lang].inputPlaceholder}
                   className="w-full bg-slate-100/50 dark:bg-slate-950/50 border border-slate-300 dark:border-white/10 rounded-2xl px-6 py-4 text-base text-slate-800 dark:text-white focus:outline-none focus:border-navy-500/50 focus:ring-1 focus:ring-navy-500/50 pr-16 shadow-inner transition-all"
                 />
                 <button onClick={() => handleSend()} disabled={isLoading} className={`absolute ${lang === 'ar' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 p-3 bg-navy-600 hover:bg-navy-500 text-white rounded-xl disabled:opacity-50 transition-colors shadow-lg`}>
                   <Send size={20} className={lang === 'ar' ? 'rotate-180' : ''}/>
                 </button>
              </div>
              <div className="max-w-4xl mx-auto mt-3 text-center text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">{T[lang].disclaimer}</div>
            </div>
          </div>
        )}

        {/* Portfolio Tab */}
        {activeTab === 'portfolio' && (
          <PortfolioTab lang={lang} handleAnalyze={handleSend} session={session} portfolio={portfolio} setPortfolio={setPortfolio} setTab={setActiveTab} />
        )}

        {/* Watchlist Tab */}
        {activeTab === 'watchlist' && (
          <WatchlistTab lang={lang} handleAnalyze={handleSend} session={session} watchlist={watchlist} setWatchlist={setWatchlist} setTab={setActiveTab} />
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="h-full flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="glass-panel p-8 rounded-3xl max-w-md w-full">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-heading font-bold text-slate-800 dark:text-white flex items-center gap-3"><Settings size={24} className="text-navy-500" /> {T[lang].settings}</h2>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">{T[lang].apiKey}</label>
                  <input type="password" value={geminiKey} onChange={(e) => { setGeminiKey(e.target.value); localStorage.setItem('gemini_api_key', e.target.value); }} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700/50 rounded-xl px-4 py-3 text-slate-800 dark:text-white focus:outline-none focus:border-navy-500/50" dir="ltr" />
                </div>
                <label className="flex items-center gap-4 cursor-pointer p-4 glass-card rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors">
                  <input type="checkbox" checked={beginnerMode} onChange={(e) => handleSaveBeginnerMode(e.target.checked)} className="rounded bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-navy-500 focus:ring-navy-500/20 w-5 h-5" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{T[lang].beginnerMode}</span>
                </label>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
