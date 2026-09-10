const fs = require('fs');
const path = require('path');

const src = fs.readFileSync('src/main.jsx', 'utf8');
const lines = src.split('\n');
const imports = lines.filter(l => l.startsWith('import')).map(l => {
  const m = l.match(/from ['"](\.\/.+?)['"]/);
  return m ? m[1] : null;
}).filter(Boolean);

const missing = [];
for (const imp of imports) {
  const full = path.resolve('src', imp);
  const exists = fs.existsSync(full) || fs.existsSync(full + '.jsx') || fs.existsSync(full + '.js') || fs.existsSync(full + '.ts') || fs.existsSync(full + '.tsx');
  if (!exists) missing.push(imp);
}
if (missing.length) {
  console.log('MISSING FILES:');
  missing.forEach(m => console.log('  ' + m));
} else {
  console.log('All local imports OK');
}
