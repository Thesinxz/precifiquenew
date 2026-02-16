const fs = require('fs');
const path = require('path');

const files = [
    'src/components/tools/TechLabModern.jsx',
    'src/components/tools/ServiceOrderWizard.jsx',
    'src/components/tools/ServiceOrderComponents.jsx',
    'src/components/tools/PatternLock.jsx',
    'src/components/tools/ClientsPage.jsx',
    'src/components/calculators/SmartPricing.jsx',
    'src/components/calculators/MassPricing.jsx',
    'src/components/tools/QuickPOS.jsx',
    'src/components/tools/SmartSale.jsx',
    'src/components/tools/DashboardModern.jsx',
];

files.forEach(file => {
    const fullPath = path.join(process.cwd(), file);
    if (!fs.existsSync(fullPath)) return;

    let content = fs.readFileSync(fullPath, 'utf8');

    // Deduplicate tailwind classes in className strings
    content = content.replace(/className="([^"]+)"/g, (match, classes) => {
        const parts = classes.split(/\s+/).filter(Boolean);
        const unique = [...new Set(parts)];
        return `className="${unique.join(' ')}"`;
    });

    fs.writeFileSync(fullPath, content);
    console.log(`Cleaned ${file}`);
});
