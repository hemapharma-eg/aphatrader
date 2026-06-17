import React from 'react';
import { Newspaper } from 'lucide-react';

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${Math.floor(diffHrs / 24)}d ago`;
};

export const NewsWidget = ({ news, lang }) => {
  if (!news || news.length === 0) return null;

  return (
    <div className="mt-4 glass-panel rounded-3xl p-6 max-w-lg w-full" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-navy-500/10 rounded-xl text-navy-500 dark:text-accent-teal">
          <Newspaper size={20} />
        </div>
        <h3 className="font-heading font-black text-lg text-slate-800 dark:text-white">
          {lang === 'ar' ? 'أحدث الأخبار' : 'Latest News'}
        </h3>
      </div>

      <div className="space-y-4">
        {news.slice(0, 5).map((article, i) => (
          <a
            key={i}
            href={article.article_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-2xl hover:bg-white/80 dark:hover:bg-slate-800/60 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2 text-[10px] uppercase tracking-widest font-bold">
              {article.publisher?.logo_url ? (
                <img src={article.publisher.logo_url} alt={article.publisher.name} className="w-4 h-4 rounded-full" />
              ) : (
                <span className="w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-700"></span>
              )}
              <span className="text-navy-600 dark:text-accent-teal">{article.publisher?.name || 'News'}</span>
              <span className="text-slate-400 dark:text-slate-500">•</span>
              <span className="text-slate-400 dark:text-slate-500">{timeAgo(article.published_utc)}</span>
            </div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-snug">
              {article.title}
            </h4>
          </a>
        ))}
      </div>
    </div>
  );
};
