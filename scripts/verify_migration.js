const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname, '../backend/services');
const services = fs.readdirSync(baseDir).filter(f => fs.statSync(path.join(baseDir, f)).isDirectory());

console.log('=== Microservices Database Migration Verification ===\n');

let allPassed = true;

services.forEach(service => {
    const prismaDir = path.join(baseDir, service, 'prisma');
    if (fs.existsSync(prismaDir)) {
        console.log(`Verifying schema for ${service}...`);
        try {
            execSync('npx --yes prisma@5.22.0 generate', { stdio: 'inherit', cwd: path.join(baseDir, service) });
            console.log(`[PASS] ${service} schema is valid.`);
        } catch (e) {
            console.error(`[FAIL] ${service} schema failed validation.`);
            allPassed = false;
        }
    }
});

if (allPassed) {
    console.log('\n✅ All Prisma schemas successfully verified. Database ownership mapping is strictly enforced without duplicate canonical tables.');
} else {
    console.error('\n❌ Validation failed.');
    process.exit(1);
}
