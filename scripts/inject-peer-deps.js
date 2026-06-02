const fs = require('fs');
const path = require('path');

const servicesDir = path.join(__dirname, '..', 'services');

fs.readdirSync(servicesDir).forEach(service => {
  const dockerfilePath = path.join(servicesDir, service, 'Dockerfile');
  if (fs.existsSync(dockerfilePath)) {
    let content = fs.readFileSync(dockerfilePath, 'utf8');
    
    // Replace all occurrences of NPM_CONFIG_IGNORE_SCRIPTS=true with itself and the new legacy peer deps variable
    const target = 'ENV NPM_CONFIG_IGNORE_SCRIPTS=true';
    const replacement = 'ENV NPM_CONFIG_IGNORE_SCRIPTS=true\nENV NPM_CONFIG_LEGACY_PEER_DEPS=true';
    
    if (content.includes(target) && !content.includes('NPM_CONFIG_LEGACY_PEER_DEPS=true')) {
      content = content.split(target).join(replacement);
      fs.writeFileSync(dockerfilePath, content, 'utf8');
      console.log(`Successfully injected NPM_CONFIG_LEGACY_PEER_DEPS in ${service}/Dockerfile`);
    } else {
      console.log(`Skipped (already injected or target not found) for ${service}/Dockerfile`);
    }
  }
});
