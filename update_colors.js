import fs from 'fs';

let content = fs.readFileSync('src/App.jsx', 'utf8');

content = content.replace(/cosmic-bg/g, 'scibayan-bg');
content = content.replace(/text-glow-emerald/g, 'text-glow-accent');
content = content.replace(/text-glow-rose/g, 'text-glow-coral');

// Primary colors (was emerald, now navy/teal)
content = content.replace(/emerald-600/g, 'navy-600');
content = content.replace(/emerald-500/g, 'navy-500');
content = content.replace(/emerald-400/g, 'accent-teal');
content = content.replace(/emerald-50/g, 'navy-50');

// Danger colors (was rose, now coral)
content = content.replace(/rose-500/g, 'accent-coral');
content = content.replace(/rose-400/g, 'accent-coral');
content = content.replace(/rose-600/g, 'accent-coral');

content = content.replace(/from-emerald-500 to-emerald-400/g, 'from-navy-600 to-navy-500');
content = content.replace(/rgba\(16,185,129,/g, 'rgba(0,210,255,'); // for teal glow
content = content.replace(/rgba\(244,63,94,/g, 'rgba(255,107,107,'); // for coral glow

fs.writeFileSync('src/App.jsx', content, 'utf8');
console.log('App.jsx colors updated successfully.');
