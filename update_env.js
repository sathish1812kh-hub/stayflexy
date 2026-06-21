const fs = require('fs');
let env = fs.readFileSync('.env.example', 'utf8');
env += '\nDATABASE_URL=postgresql://stayflexi:stayflexi_dev@localhost:5432/stayflexi?schema=public\n';
fs.writeFileSync('.env', env, 'utf8');
console.log('Fixed .env with Docker credentials');