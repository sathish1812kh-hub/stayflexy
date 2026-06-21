const fs = require('fs');
let env = fs.readFileSync('.env.example', 'utf8');
env += '\nDATABASE_URL=postgresql://postgres:postgres@localhost:5432/stayflexi_dev?schema=public\n';
fs.writeFileSync('.env', env, 'utf8');
console.log('Fixed .env with Native credentials');