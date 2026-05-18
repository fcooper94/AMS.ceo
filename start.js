const { createInterface } = require('readline');
const { execSync, spawn } = require('child_process');
const { readFileSync, existsSync } = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envContent = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';

// Detect current mode from DATABASE_URL line
const dbLine = envContent.split('\n').find(l => l.startsWith('DATABASE_URL=') && !l.startsWith('#'));
const currentMode = dbLine && dbLine.includes('localhost') ? 'local' : 'railway';

const LOCAL_DB_URL = 'postgresql://postgres:Chieftain1994@localhost:5432/airline_control';

console.log('');
console.log('  AMS — Airline Management Simulation');
console.log('  ────────────────────────────────────');
console.log('');
console.log('  1) Railway (Production)  — Live DB + VATSIM auth');
console.log('  2) Local   (Offline Dev) — Local Postgres, no VATSIM needed');
console.log('');
console.log(`  Current: ${currentMode === 'local' ? 'Local' : 'Railway'}`);
console.log('');

const rl = createInterface({ input: process.stdin, output: process.stdout });

rl.question('  Select mode [1/2, Enter = keep current]: ', (answer) => {
  rl.close();
  const choice = answer.trim();

  let dbUrl;
  let modeName;

  if (choice === '2' || (choice === '' && currentMode === 'local')) {
    dbUrl = LOCAL_DB_URL;
    modeName = 'Local (Offline)';
  } else {
    // Restore original Railway URL from .env (find the non-commented DATABASE_URL or the backed-up one)
    const railwayLine = envContent.split('\n').find(l =>
      l.startsWith('DATABASE_URL=') && l.includes('rlwy.net')
    ) || envContent.split('\n').find(l =>
      l.startsWith('#DATABASE_URL=') && l.includes('rlwy.net')
    );
    dbUrl = railwayLine
      ? railwayLine.replace(/^#?DATABASE_URL=/, '')
      : null;
    modeName = 'Railway';
  }

  // Rewrite DATABASE_URL line in .env
  const newEnv = envContent
    .split('\n')
    .map(line => {
      if (line.startsWith('DATABASE_URL=') || (line.startsWith('#DATABASE_URL=') && line.includes('localhost'))) {
        return dbUrl ? `DATABASE_URL=${dbUrl}` : line;
      }
      return line;
    })
    .join('\n');

  require('fs').writeFileSync(envPath, newEnv);

  console.log('');
  console.log(`  Starting in ${modeName} mode...`);
  console.log('');

  const child = spawn('npx', ['nodemon', 'src/server.js'], {
    stdio: 'inherit',
    shell: true
  });

  child.on('exit', (code) => process.exit(code ?? 0));
});
