const fs = require('fs');
const path = require('path');
const root = process.cwd();
const packagePath = path.join(root, 'package.json');
if (!fs.existsSync(packagePath) || !fs.existsSync(path.join(root, 'app.json'))) {
  console.error('ERRO: execute este comando na raiz do seu projeto Expo (onde ficam package.json e app.json).');
  process.exit(1);
}
const patchRoot = __dirname;
const targets = [
  ['src/app/index.tsx', 'src/app/index.tsx'],
  ['src/app/_layout.tsx', 'src/app/_layout.tsx'],
];
for (const [source, destination] of targets) {
  const src = path.join(patchRoot, source);
  const dest = path.join(root, destination);
  if (!fs.existsSync(src)) { console.error('Arquivo do pacote não encontrado: ' + src); process.exit(1); }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.existsSync(dest)) {
    const backup = dest + '.backup-' + new Date().toISOString().replace(/[:.]/g, '-');
    fs.copyFileSync(dest, backup);
    console.log('Backup criado: ' + path.relative(root, backup));
  }
  fs.copyFileSync(src, dest);
  console.log('Atualizado: ' + destination);
}
const appPath = path.join(root, 'app.json');
const app = JSON.parse(fs.readFileSync(appPath, 'utf8'));
app.expo = app.expo || {};
app.expo.plugins = app.expo.plugins || [];
const hasLocalAuth = app.expo.plugins.some(p => (Array.isArray(p) ? p[0] : p) === 'expo-local-authentication');
if (!hasLocalAuth) app.expo.plugins.push(['expo-local-authentication', { faceIDPermission: 'Permitir que o ORBE use o Face ID para autenticar seu acesso.' }]);
fs.writeFileSync(appPath, JSON.stringify(app, null, 2) + '\n');
console.log('Configuração de autenticação biométrica adicionada ao app.json.');
