import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Send, BrainCircuit, TrendingUp, TrendingDown, Newspaper, 
  AlertCircle, Activity, Bot, User, Sparkles, CalendarDays, 
  LineChart as ChartIcon, Zap, Mic, MicOff, Volume2, Globe, Image as ImageIcon, X,
  Settings, Briefcase, Plus, Trash2
} from 'lucide-react';

// --- API Keys ---
const FINNHUB_API_KEY = "d8pb0h9r01qgoi5hni8gd8pb0h9r01qgoi5hni90";
const getStoredGeminiKey = () => localStorage.getItem('gemini_api_key') || '';

// --- Translations Dictionary ---
const T = {
  ar: {
    title: "ألفا تريد برو",
    subtitle: "مستشار الذكاء الاصطناعي",
    welcome: "مرحباً! أنا ألفا تريد، مستشارك المالي. عقلي مدعوم بالذكاء الاصطناعي، وبياناتي متصلة مباشرة بسوق الأسهم الأمريكي عبر Finnhub. \n\nاسألني عن تحليل سهم معين، أو أحدث أخبار السوق، أو الاكتتابات القادمة. (يمكنك التحدث معي صوتياً أو إرفاق صور للتحليل!)",
    capabilities: "القدرات المباشرة",
    quotes: "أسعار الأسهم الحية",
    news: "أخبار مالية فورية",
    ipos: "جدول الاكتتابات (IPO)",
    vision: "تحليل الرسوم البيانية",
    active: "قنوات البيانات متصلة",
    engine: "محرك التحليل",
    source: "المصدر المباشر",
    inputPlaceholder: "اسأل عن سهم (مثل AAPL)، أو أرفق صورة...",
    disclaimer: "البيانات مقدمة كما هي من Finnhub. يرجى التحقق قبل الاستثمار.",
    analyzing: "جاري تحليل طلبك وجلب البيانات...",
    listening: "جاري الاستماع... تحدث الآن",
    errorApi: "فشل الاتصال بالذكاء الاصطناعي. يرجى المحاولة مرة أخرى أو التأكد من مفتاح API.",
    errorMic: "الميكروفون غير مدعوم في هذا المتصفح أو تم رفض الصلاحية.",
    live: "مباشر",
    today: "اليوم",
    aiAnalysis: "تحليل الذكاء الاصطناعي",
    newsTitle: "أخبار السوق المباشرة",
    newsNote: "(الأخبار باللغة الإنجليزية من المصدر)",
    ipoTitle: "الاكتتابات القادمة (30 يوماً)",
    date: "التاريخ",
    symbol: "الرمز",
    company: "الشركة",
    price: "السعر",
    noIpo: "لا توجد اكتتابات كبرى مجدولة حالياً.",
    prompts: ["حلل سهم تيسلا (TSLA)", "ما هي أحدث أخبار السوق؟", "هل هناك اكتتابات قادمة؟", "كيف هو أداء محفظتي اليوم؟"],
    settings: "الإعدادات",
    portfolio: "محفظتي",
    apiKey: "مفتاح Gemini API",
    save: "حفظ",
    addStock: "إضافة سهم",
    qty: "الكمية",
    buyPrice: "سعر الشراء",
    currentPrice: "السعر الحالي",
    pnl: "الربح/الخسارة",
    action: "إجراء",
    requireKey: "يرجى إدخال مفتاح Gemini API في الإعدادات للمتابعة.",
    close: "إغلاق",
    totalValue: "القيمة الإجمالية"
  },
  en: {
    title: "AlphaTrade Pro",
    subtitle: "AI Consultant",
    welcome: "Hello! I am AlphaTrade. My AI brain is powered by Gemini, and my real-time data is hardwired directly to Finnhub.io. \n\nAsk me to analyze a specific stock symbol, fetch the latest market news, or show upcoming IPOs. (You can also use voice chat or upload images for analysis!)",
    capabilities: "Live Capabilities",
    quotes: "Real-time Quotes",
    news: "Live Financial News",
    ipos: "IPO Calendar Data",
    vision: "Chart & Image Analysis",
    active: "Data Pipelines Active",
    engine: "Analysis Engine",
    source: "Live Quotes",
    inputPlaceholder: "Ask for stock analysis, or upload an image...",
    disclaimer: "Data provided 'as is' by Finnhub API. Verify before investing.",
    analyzing: "Analyzing request & fetching live API...",
    listening: "Listening... Speak now",
    errorApi: "AI connection failed. Please try again or check your API key.",
    errorMic: "Microphone not supported in this browser or permission denied.",
    live: "Live",
    today: "Today",
    aiAnalysis: "AI Analysis",
    newsTitle: "Live Market Intelligence",
    newsNote: "",
    ipoTitle: "Upcoming IPOs (30 Days)",
    date: "Date",
    symbol: "Symbol",
    company: "Company",
    price: "Price",
    noIpo: "No major IPOs scheduled at this time.",
    prompts: ["Analyze TSLA stock today", "Show me the latest market news", "Any upcoming IPOs?", "How is my portfolio performing?"],
    settings: "Settings",
    portfolio: "My Portfolio",
    apiKey: "Gemini API Key",
    save: "Save",
    addStock: "Add Stock",
    qty: "Quantity",
    buyPrice: "Buy Price",
    currentPrice: "Current Price",
    pnl: "P&L",
    action: "Action",
    requireKey: "Please enter your Gemini API Key in settings to continue.",
    close: "Close",
    totalValue: "Total Value"
  }
};

// --- API Utility (Finnhub) ---
const fetchFinnhub = async (endpoint) => {
  const url = `https://finnhub.io/api/v1${endpoint}&token=${FINNHUB_API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Finnhub API Error: ${response.status}`);
  return await response.json();
};

// --- Helper Components ---
const SimpleLineChart = ({ data, color }) => {
  if (!data || data.length === 0) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1; 
  
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - (((val - min) / range) * 100);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
      <polyline points={points} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points={`0,100 ${points} 100,100`} fill={color} opacity="0.15" />
    </svg>
  );
};

// --- Settings Modal ---
const SettingsModal = ({ isOpen, onClose, lang, geminiKey, setGeminiKey }) => {
  const t = T[lang];
  const [localKey, setLocalKey] = useState(geminiKey);

  useEffect(() => {
    setLocalKey(geminiKey);
  }, [geminiKey, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    setGeminiKey(localKey);
    localStorage.setItem('gemini_api_key', localKey);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl max-w-md w-full shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><Settings size={20} className="text-emerald-500" /> {t.settings}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">{t.apiKey}</label>
            <input 
              type="password" 
              value={localKey} 
              onChange={(e) => setLocalKey(e.target.value)}
              placeholder="AIzaSy..." 
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
              dir="ltr"
            />
          </div>
          <button 
            onClick={handleSave}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg transition-colors"
          >
            {t.save}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Portfolio Modal ---
const PortfolioModal = ({ isOpen, onClose, lang, portfolio, setPortfolio }) => {
  const [symbol, setSymbol] = useState('');
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [livePrices, setLivePrices] = useState({});
  const [loading, setLoading] = useState(false);
  const t = T[lang];

  useEffect(() => {
    if (!isOpen) return;
    const fetchPrices = async () => {
      setLoading(true);
      const prices = {};
      for (const item of portfolio) {
        try {
          const res = await fetchFinnhub(`/quote?symbol=${item.symbol}`);
          prices[item.symbol] = res.c;
        } catch (e) {
          console.error("Failed to fetch quote for", item.symbol);
        }
      }
      setLivePrices(prices);
      setLoading(false);
    };
    fetchPrices();
  }, [isOpen, portfolio]);

  if (!isOpen) return null;

  const handleAdd = () => {
    if (!symbol || !qty || !price) return;
    const newItem = { symbol: symbol.toUpperCase(), qty: parseFloat(qty), buyPrice: parseFloat(price) };
    const updated = [...portfolio, newItem];
    setPortfolio(updated);
    localStorage.setItem('alpha_portfolio', JSON.stringify(updated));
    setSymbol(''); setQty(''); setPrice('');
    
    // Fetch live price for the new item
    fetchFinnhub(`/quote?symbol=${newItem.symbol}`).then(res => {
      setLivePrices(prev => ({...prev, [newItem.symbol]: res.c}));
    }).catch(e => console.error(e));
  };

  const handleRemove = (index) => {
    const updated = portfolio.filter((_, i) => i !== index);
    setPortfolio(updated);
    localStorage.setItem('alpha_portfolio', JSON.stringify(updated));
  };

  let totalValue = 0;
  let totalCost = 0;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl max-w-3xl w-full shadow-xl max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><Briefcase size={20} className="text-emerald-500" /> {t.portfolio}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>

        {/* Add New Stock */}
        <div className="flex flex-wrap gap-3 mb-6 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
          <div className="flex-1 min-w-[100px]">
            <label className="block text-xs text-slate-400 mb-1">{t.symbol}</label>
            <input type="text" value={symbol} onChange={e => setSymbol(e.target.value)} placeholder="AAPL" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500" dir="ltr" />
          </div>
          <div className="flex-1 min-w-[100px]">
            <label className="block text-xs text-slate-400 mb-1">{t.qty}</label>
            <input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="10" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500" dir="ltr" />
          </div>
          <div className="flex-1 min-w-[100px]">
            <label className="block text-xs text-slate-400 mb-1">{t.buyPrice}</label>
            <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="150.50" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500" dir="ltr" />
          </div>
          <div className="flex items-end">
            <button onClick={handleAdd} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2 h-[42px]">
              <Plus size={16} /> <span className="hidden sm:inline">{t.addStock}</span>
            </button>
          </div>
        </div>

        {/* Portfolio List */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-300" style={{ textAlign: lang === 'ar' ? 'right' : 'left' }}>
            <thead className="text-xs text-slate-500 uppercase bg-slate-800/50 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3">{t.symbol}</th>
                <th className="px-4 py-3">{t.qty}</th>
                <th className="px-4 py-3">{t.buyPrice}</th>
                <th className="px-4 py-3">{t.currentPrice}</th>
                <th className="px-4 py-3">{t.pnl}</th>
                <th className="px-4 py-3 text-center">{t.action}</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.length === 0 && (
                <tr><td colSpan="6" className="px-4 py-4 text-center text-slate-500">لا توجد أسهم / No stocks</td></tr>
              )}
              {portfolio.map((item, i) => {
                const livePrice = livePrices[item.symbol];
                const cost = item.qty * item.buyPrice;
                let val = 0;
                let pnl = 0;
                let pnlPercent = 0;
                if (livePrice) {
                  val = item.qty * livePrice;
                  pnl = val - cost;
                  pnlPercent = (pnl / cost) * 100;
                  totalValue += val;
                } else {
                  totalValue += cost; // fallback
                }
                totalCost += cost;
                
                const isPositive = pnl >= 0;

                return (
                  <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-white" dir="ltr">{item.symbol}</td>
                    <td className="px-4 py-3" dir="ltr">{item.qty}</td>
                    <td className="px-4 py-3" dir="ltr">${item.buyPrice.toFixed(2)}</td>
                    <td className="px-4 py-3" dir="ltr">
                      {livePrice ? `$${livePrice.toFixed(2)}` : (loading ? '...' : '-')}
                    </td>
                    <td className={`px-4 py-3 font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`} dir="ltr">
                      {livePrice ? `${isPositive ? '+' : ''}$${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%)` : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleRemove(i)} className="text-slate-500 hover:text-rose-400 p-1">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {portfolio.length > 0 && (
              <tfoot className="border-t border-slate-700 bg-slate-900/50 font-bold text-white">
                <tr>
                  <td colSpan="3" className="px-4 py-3 text-right">{t.totalValue}</td>
                  <td colSpan="3" className="px-4 py-3" dir="ltr">${totalValue.toFixed(2)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};


// --- Live Finnhub Widgets ---
const StockWidget = ({ symbol, insight, lang }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const t = T[lang];

  useEffect(() => {
    const loadStock = async () => {
      try {
        const quote = await fetchFinnhub(`/quote?symbol=${symbol}`);
        const to = Math.floor(Date.now() / 1000);
        const from = to - (30 * 24 * 60 * 60);
        const candles = await fetchFinnhub(`/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}`);
        
        let history = candles.s === 'ok' && candles.c ? candles.c : Array(30).fill(quote.c || 0);
        setData({ price: quote.c, change: quote.dp, changeAbs: quote.d, history });
      } catch (err) {
        setError(lang === 'ar' ? "فشل جلب البيانات المباشرة." : "Failed to fetch live data.");
      }
    };
    loadStock();
  }, [symbol, lang]);

  if (error) return <div className="mt-4 p-4 text-rose-400 bg-rose-500/10 rounded-xl text-sm border border-rose-500/20">{error}</div>;
  if (!data) return (
    <div className="mt-4 bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-sm w-full animate-pulse flex flex-col gap-4">
      <div className="h-6 bg-slate-800 rounded w-1/3"></div>
      <div className="h-10 bg-slate-800 rounded w-1/2"></div>
      <div className="h-16 bg-slate-800 rounded w-full"></div>
    </div>
  );

  const isPositive = data.change >= 0;

  return (
    <div className="mt-4 bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-sm w-full shadow-lg" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-black text-white text-2xl tracking-tight uppercase">{symbol}</h3>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <Zap size={10} /> {t.live}
          </span>
        </div>
        <div className={`px-2 py-1 rounded-md text-sm font-bold flex items-center gap-1 ${isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
          <span dir="ltr">{data.change?.toFixed(2)}%</span>
          {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
        </div>
      </div>
      <div className="text-4xl font-black text-white mb-1">
        ${data.price?.toFixed(2)}
      </div>
      <div className={`text-sm font-medium mb-4 flex gap-1 items-center ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
        <span dir="ltr">{isPositive ? '+' : ''}{data.changeAbs?.toFixed(2)}</span> <span>{t.today}</span>
      </div>
      <div className="h-20 w-full mb-4" dir="ltr">
        <SimpleLineChart data={data.history} color={isPositive ? '#10b981' : '#f43f5e'} />
      </div>
      {insight && (
        <div className="p-3 bg-slate-800/80 rounded-xl text-sm text-slate-300 border border-slate-700">
          <span className="font-bold text-emerald-400 flex items-center gap-1 mb-1">
            <Sparkles size={14} /> {t.aiAnalysis}
          </span>
          <p className="leading-relaxed">{insight}</p>
        </div>
      )}
    </div>
  );
};

const NewsWidget = ({ lang }) => {
  const [news, setNews] = useState(null);
  const t = T[lang];
  
  useEffect(() => {
    fetchFinnhub('/news?category=general')
      .then(res => setNews(res.slice(0, 4)))
      .catch(() => setNews([]));
  }, []);

  if (!news) return <div className="mt-4 p-4 text-emerald-400 text-sm">Fetching...</div>;

  return (
    <div className="mt-4 bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-2xl w-full shadow-lg" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Newspaper className="text-emerald-500" size={18} /> {t.newsTitle}
        </h3>
        {t.newsNote && <span className="text-[10px] text-slate-500">{t.newsNote}</span>}
      </div>
      <div className="space-y-4">
        {news.map((item, idx) => (
          <a key={idx} href={item.url} target="_blank" rel="noreferrer" className="block border-b border-slate-800 pb-3 last:border-0 last:pb-0 group">
            <p className="text-slate-200 text-sm font-medium leading-relaxed group-hover:text-emerald-400 transition-colors line-clamp-2" dir="ltr" style={{ textAlign: lang === 'ar' ? 'right' : 'left' }}>
              {item.headline}
            </p>
            <div className="text-xs text-slate-500 mt-2 flex gap-3 font-medium uppercase tracking-wider">
              <span className="text-emerald-400/80">{item.source}</span>
              <span>•</span>
              <span>{new Date(item.datetime * 1000).toLocaleString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

const IpoWidget = ({ lang }) => {
  const [ipos, setIpos] = useState(null);
  const t = T[lang];

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    fetchFinnhub(`/calendar/ipo?from=${today}&to=${nextMonth}`)
      .then(res => setIpos(res.ipoCalendar?.slice(0, 5) || []))
      .catch(() => setIpos([]));
  }, []);

  if (!ipos) return <div className="mt-4 p-4 text-emerald-400 text-sm">Fetching...</div>;

  return (
    <div className="mt-4 bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-2xl w-full shadow-lg overflow-hidden" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <h3 className="font-bold text-white mb-4 flex items-center gap-2">
        <CalendarDays className="text-emerald-500" size={18} /> {t.ipoTitle}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-slate-300" style={{ textAlign: lang === 'ar' ? 'right' : 'left' }}>
          <thead className="text-xs text-slate-500 uppercase bg-slate-800/50 border-b border-slate-700">
            <tr>
              <th className="px-4 py-3">{t.date}</th>
              <th className="px-4 py-3">{t.symbol}</th>
              <th className="px-4 py-3">{t.company}</th>
              <th className="px-4 py-3">{t.price}</th>
            </tr>
          </thead>
          <tbody>
            {ipos.length === 0 && (
              <tr><td colSpan="4" className="px-4 py-4 text-center text-slate-500">{t.noIpo}</td></tr>
            )}
            {ipos.map((ipo, i) => (
              <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-3 text-emerald-400 whitespace-nowrap" dir="ltr">{ipo.date}</td>
                <td className="px-4 py-3 font-mono font-bold text-white" dir="ltr">{ipo.symbol || 'TBA'}</td>
                <td className="px-4 py-3" dir="ltr" style={{ textAlign: lang === 'ar' ? 'right' : 'left' }}>{ipo.name}</td>
                <td className="px-4 py-3" dir="ltr">{ipo.price ? `$${ipo.price}` : 'TBA'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};


// --- Main Application ---
export default function App() {
  const [lang, setLang] = useState('ar');
  const t = T[lang];

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState(null); 
  const [imagePreview, setImagePreview] = useState(null); 
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  
  // BYOK & Portfolio state
  const [geminiKey, setGeminiKey] = useState(getStoredGeminiKey());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPortfolioOpen, setIsPortfolioOpen] = useState(false);
  const [portfolio, setPortfolio] = useState(() => {
    const saved = localStorage.getItem('alpha_portfolio');
    return saved ? JSON.parse(saved) : [];
  });

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Initialize Welcome Message dynamically based on language
  useEffect(() => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: t.welcome,
      rawContent: JSON.stringify({ message: t.welcome }),
      hasImage: false
    }]);
  }, [lang, t.welcome]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, isListening, imagePreview]);

  // --- Voice Engine (STT & TTS) ---
  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError(t.errorMic);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang === 'ar' ? 'ar-AE' : 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      handleSend(transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setError(t.errorMic);
    };

    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  const playTTS = (text) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
    utterance.rate = lang === 'ar' ? 0.9 : 1; 
    window.speechSynthesis.speak(utterance);
  };

  // --- Image Handling ---
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result.split(',')[1]); 
        setImagePreview(reader.result); 
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    const handlePaste = (e) => {
      const items = (e.clipboardData || e.originalEvent.clipboardData).items;
      for (let index in items) {
        const item = items[index];
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          const reader = new FileReader();
          reader.onloadend = () => {
            setSelectedImage(reader.result.split(',')[1]);
            setImagePreview(reader.result);
          };
          reader.readAsDataURL(file);
        }
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

  // --- AI API Call ---
  const handleSend = async (textToProcess) => {
    const prompt = textToProcess || input;
    if (!prompt.trim() && !selectedImage) return;

    if (!geminiKey) {
      setError(t.requireKey);
      setIsSettingsOpen(true);
      return;
    }

    const currentImage = selectedImage;
    const currentPreview = imagePreview;

    const newUserMsg = { 
      id: Date.now().toString(), 
      role: 'user', 
      content: prompt, 
      rawContent: prompt,
      image: currentPreview 
    };
    
    setMessages(prev => [...prev, newUserMsg]);
    setInput('');
    removeImage(); 
    setIsLoading(true);
    setError(null);

    const schema = {
      type: "OBJECT",
      properties: {
        message: { type: "STRING" },
        widget: {
          type: "OBJECT",
          nullable: true,
          properties: {
            type: { type: "STRING" },
            symbol: { type: "STRING", nullable: true },
            insight: { type: "STRING", nullable: true }
          }
        }
      },
      required: ["message"]
    };

    const portfolioText = portfolio.length > 0 
      ? `User's Portfolio:\n${portfolio.map(p => `- ${p.symbol}: ${p.qty} shares @ $${p.buyPrice}`).join('\n')}\nUse this portfolio data to give personalized advice.`
      : "The user has not added any stocks to their portfolio yet.";

    const systemInstruction = `
      You are AlphaTrade Consultant, an elite AI personal financial advisor. 
      CRITICAL: The user interface is currently in ${lang === 'ar' ? 'ARABIC' : 'ENGLISH'}.
      YOU MUST reply in ${lang === 'ar' ? 'ARABIC' : 'ENGLISH'} for both the 'message' and the widget 'insight' fields.
      However, the Finnhub API requires standard English symbols, so keep 'symbol' strictly in English (e.g., AAPL).
      If the user uploads an image (like a chart or financial report), analyze it thoroughly and provide insights in the 'message'.
      Delegate specific real-time market data requests to UI widgets (types: 'stock', 'news', 'ipo') when appropriate.
      Keep responses professional, insightful, and perfectly translated.
      
      ${portfolioText}
    `;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
      
      const contents = messages.filter(msg => msg.role !== 'system').map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.rawContent }] 
      }));
      
      const currentParts = [];
      if (prompt) currentParts.push({ text: prompt });
      if (currentImage) {
         currentParts.push({
           inlineData: {
             mimeType: "image/jpeg", 
             data: currentImage
           }
         });
         if (!prompt) currentParts.push({ text: lang === 'ar' ? 'قم بتحليل هذه الصورة مالياً.' : 'Analyze this financial image.' });
      }

      contents.push({ role: 'user', parts: currentParts });

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: systemInstruction }] },
          tools: [{ google_search: {} }],
          generationConfig: { responseMimeType: "application/json", responseSchema: schema }
        })
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `HTTP Error ${res.status}`);
      }
      
      const result = await res.json();
      const responseData = JSON.parse(result.candidates[0].content.parts[0].text);
      
      const newAssistantMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseData.message,
        widget: responseData.widget,
        rawContent: JSON.stringify(responseData),
        hasImage: false
      };
      
      setMessages(prev => [...prev, newAssistantMsg]);
      
    } catch (err) {
      setError(`${t.errorApi} Details: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 font-sans text-slate-300 selection:bg-emerald-500/30" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        lang={lang} 
        geminiKey={geminiKey} 
        setGeminiKey={setGeminiKey} 
      />

      <PortfolioModal 
        isOpen={isPortfolioOpen}
        onClose={() => setIsPortfolioOpen(false)}
        lang={lang}
        portfolio={portfolio}
        setPortfolio={setPortfolio}
      />

      {/* Sidebar - Desktop */}
      <div className="hidden md:flex flex-col w-72 bg-slate-900 border-x border-slate-800 shrink-0">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center justify-between mb-1">
             <div className="flex items-center gap-3 text-emerald-400 font-bold text-2xl tracking-tighter">
                <BrainCircuit className="w-8 h-8" />
                {t.title}
             </div>
             <button onClick={() => setIsSettingsOpen(true)} className="text-slate-500 hover:text-emerald-400 transition-colors">
               <Settings size={18} />
             </button>
          </div>
          <div className="text-xs font-medium text-slate-500 tracking-wide uppercase">{t.subtitle}</div>
        </div>

        <div className="px-6 pt-6">
           <button 
             onClick={() => setIsPortfolioOpen(true)}
             className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 py-3 rounded-xl transition-colors font-bold text-sm shadow-sm"
           >
             <Briefcase size={16} className="text-amber-500" /> {t.portfolio}
           </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{t.capabilities}</h4>
            <ul className="space-y-3 text-sm font-medium text-slate-400">
              <li className="flex items-center gap-3"><ChartIcon size={16} className="text-emerald-500" /> {t.quotes}</li>
              <li className="flex items-center gap-3"><Newspaper size={16} className="text-blue-500" /> {t.news}</li>
              <li className="flex items-center gap-3"><TrendingUp size={16} className="text-amber-500" /> {t.ipos}</li>
              <li className="flex items-center gap-3"><ImageIcon size={16} className="text-purple-500" /> {t.vision}</li>
            </ul>
          </div>
          
          <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-400">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              {t.active}
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">{t.engine}</span>
              <span className="font-bold text-slate-300" dir="ltr">Gemini 3.1 Flash</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">{t.source}</span>
              <span className="font-bold text-emerald-400" dir="ltr">Finnhub.io</span>
            </div>
          </div>
        </div>

        {/* Language Toggle Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-center">
          <button 
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-sm font-bold text-slate-300"
          >
            <Globe size={16} className="text-emerald-500" />
            {lang === 'ar' ? 'Switch to English' : 'التغيير للعربية'}
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative h-full max-h-screen">
        
        {/* Mobile Header */}
        <div className="md:hidden flex justify-between items-center p-4 bg-slate-900 border-b border-slate-800 z-10 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xl tracking-tighter">
            <BrainCircuit className="w-6 h-6" /> {t.title}
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => setIsPortfolioOpen(true)} className="text-amber-500 hover:text-amber-400">
               <Briefcase size={20} />
             </button>
             <button onClick={() => setIsSettingsOpen(true)} className="text-slate-400 hover:text-slate-200">
               <Settings size={20} />
             </button>
             <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} className="p-2 bg-slate-800 rounded-lg text-emerald-500">
               <Globe size={20} />
             </button>
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-4 max-w-4xl mx-auto ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              
              {/* Avatar Assistant */}
              {msg.role === 'assistant' && (
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400">
                  <Bot size={20} />
                </div>
              )}

              {/* Message Content */}
              <div className={`flex flex-col ${msg.role === 'user' ? (lang === 'ar' ? 'items-start' : 'items-end') : (lang === 'ar' ? 'items-end' : 'items-start')} max-w-[90%] md:max-w-[85%]`}>
                
                {/* User Uploaded Image Preview in Chat */}
                {msg.image && (
                   <img src={msg.image} alt="User upload" className="max-w-sm rounded-xl mb-2 border border-slate-700 shadow-md" />
                )}

                {msg.content && (
                  <div className="relative group">
                    <div className={`px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
                      msg.role === 'user' 
                        ? `bg-emerald-600 text-white ${lang === 'ar' ? 'rounded-tl-sm' : 'rounded-tr-sm'}` 
                        : `bg-slate-800 text-slate-200 border border-slate-700 ${lang === 'ar' ? 'rounded-tr-sm' : 'rounded-tl-sm'}`
                    }`}>
                      {msg.content.split('\n').map((line, i) => (
                        <React.Fragment key={i}>
                          {line}
                          {i !== msg.content.split('\n').length - 1 && <br />}
                        </React.Fragment>
                      ))}
                    </div>
                    
                    {/* AI TTS Button */}
                    {msg.role === 'assistant' && (
                      <button 
                        onClick={() => playTTS(msg.content)}
                        className={`absolute top-2 ${lang === 'ar' ? '-left-10' : '-right-10'} p-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity`}
                        title="Play Audio"
                      >
                        <Volume2 size={16} />
                      </button>
                    )}
                  </div>
                )}

                {/* Render Dynamic Live Widget */}
                {msg.widget && (
                  <div className="w-full animate-in slide-in-from-bottom-2 duration-500">
                    {msg.widget.type === 'stock' && msg.widget.symbol && (
                      <StockWidget symbol={msg.widget.symbol.toUpperCase()} insight={msg.widget.insight} lang={lang} />
                    )}
                    {msg.widget.type === 'news' && <NewsWidget lang={lang} />}
                    {msg.widget.type === 'ipo' && <IpoWidget lang={lang} />}
                  </div>
                )}
              </div>

              {/* Avatar User */}
              {msg.role === 'user' && (
                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-slate-400">
                  <User size={20} />
                </div>
              )}
            </div>
          ))}

          {/* Loading States */}
          {isListening && (
            <div className="flex gap-4 max-w-4xl mx-auto justify-end animate-in fade-in">
              <div className="bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 px-5 py-3 rounded-2xl flex items-center gap-3">
                 <Mic size={18} className="animate-pulse" /> {t.listening}
              </div>
            </div>
          )}

          {isLoading && (
             <div className="flex gap-4 max-w-4xl mx-auto justify-start animate-in fade-in">
               <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400">
                  <Bot size={20} />
                </div>
                <div className={`bg-slate-800 rounded-2xl border border-slate-700 px-5 py-4 flex items-center gap-2 shadow-sm ${lang === 'ar' ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  <span className={`text-sm text-slate-400 font-medium tracking-wide ${lang === 'ar' ? 'mr-2' : 'ml-2'}`}>{t.analyzing}</span>
                </div>
             </div>
          )}

          {/* Error State */}
          {error && (
            <div className="max-w-4xl mx-auto flex items-center gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium">
              <AlertCircle size={18} /> {error}
            </div>
          )}
          
          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-slate-950 border-t border-slate-800">
          <div className="max-w-4xl mx-auto">
            
            {/* Suggested Prompts */}
            {messages.length < 3 && (
              <div className={`flex flex-wrap gap-2 mb-4 justify-center md:justify-start ${lang === 'ar' ? 'flex-row-reverse md:flex-row' : ''}`}>
                {t.prompts.map((prompt, i) => (
                  <button 
                    key={i}
                    onClick={() => handleSend(prompt)}
                    className="text-xs font-medium px-4 py-2 bg-slate-900 border border-slate-700 rounded-full text-slate-400 hover:text-emerald-400 hover:border-emerald-500/50 hover:bg-slate-800 transition-all shadow-sm"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Image Preview Area */}
            {imagePreview && (
              <div className="mb-2 relative inline-block">
                <img src={imagePreview} alt="Preview" className="h-20 rounded-lg border border-slate-700 object-cover" />
                <button 
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 bg-slate-800 text-slate-300 hover:text-white rounded-full p-1 border border-slate-600 shadow-sm"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <div className="relative flex items-end gap-2 bg-slate-900 border border-slate-700 rounded-2xl p-2 focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/50 transition-all shadow-lg">
              
              <button 
                onClick={isListening ? () => window.SpeechRecognition?.abort() : handleVoiceInput}
                disabled={isLoading}
                className={`shrink-0 w-11 h-11 flex items-center justify-center rounded-xl transition-colors ${
                  isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-800 text-slate-400 hover:text-emerald-400 hover:bg-slate-700'
                }`}
                title="Voice Input"
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              {/* Hidden File Input */}
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                className="hidden" 
              />
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="shrink-0 w-11 h-11 flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:text-purple-400 hover:bg-slate-700 transition-colors"
                title="Upload Image (or Paste)"
              >
                <ImageIcon size={18} />
              </button>

              <textarea 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t.inputPlaceholder}
                className="w-full bg-transparent text-slate-200 placeholder-slate-500 resize-none max-h-32 min-h-[44px] py-2.5 px-2 focus:outline-none text-[15px]"
                rows={1}
                disabled={isLoading || isListening}
              />
              
              <button 
                onClick={() => handleSend()}
                disabled={(!input.trim() && !selectedImage) || isLoading}
                className={`shrink-0 w-11 h-11 flex items-center justify-center rounded-xl transition-colors shadow-sm ${
                  (!input.trim() && !selectedImage) || isLoading ? 'bg-slate-800 text-slate-500' : 'bg-emerald-500 text-white hover:bg-emerald-400'
                }`}
              >
                <Send size={18} className={(input.trim() || selectedImage) && !isLoading ? (lang === 'ar' ? '-translate-x-0.5' : 'translate-x-0.5') : ''} style={{ transform: lang === 'ar' ? 'scaleX(-1)' : 'none' }} />
              </button>
            </div>
            
            <div className="text-center mt-3">
              <span className="text-[11px] text-slate-500 font-medium tracking-wide flex items-center justify-center gap-1">
                {t.disclaimer}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
