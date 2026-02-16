#!/usr/bin/env node

/**
 * Dark Mode Converter
 * Applies dark mode classes to React components automatically
 */

const fs = require('fs');
const path = require('path');

// Files to process
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

// Conversion rules
const conversions = [
    // Backgrounds
    { from: /className="([^"]*)\bbg-white\b([^"]*)"/g, to: 'className="$1bg-white dark:bg-slate-900$2"' },
    { from: /className="([^"]*)\bbg-slate-50\b([^"]*)"/g, to: 'className="$1bg-slate-50 dark:bg-slate-950$2"' },
    { from: /className="([^"]*)\bbg-slate-100\b([^"]*)"/g, to: 'className="$1bg-slate-100 dark:bg-slate-800$2"' },
    { from: /className="([^"]*)\bbg-gray-50\b([^"]*)"/g, to: 'className="$1bg-gray-50 dark:bg-slate-900$2"' },
    { from: /className="([^"]*)\bbg-gray-100\b([^"]*)"/g, to: 'className="$1bg-gray-100 dark:bg-slate-800$2"' },

    // Text colors
    { from: /className="([^"]*)\btext-slate-900\b([^"]*)"/g, to: 'className="$1text-slate-900 dark:text-white$2"' },
    { from: /className="([^"]*)\btext-slate-800\b([^"]*)"/g, to: 'className="$1text-slate-800 dark:text-slate-100$2"' },
    { from: /className="([^"]*)\btext-slate-700\b([^"]*)"/g, to: 'className="$1text-slate-700 dark:text-slate-200$2"' },
    { from: /className="([^"]*)\btext-slate-600\b([^"]*)"/g, to: 'className="$1text-slate-600 dark:text-slate-300$2"' },
    { from: /className="([^"]*)\btext-gray-900\b([^"]*)"/g, to: 'className="$1text-gray-900 dark:text-white$2"' },
    { from: /className="([^"]*)\btext-gray-800\b([^"]*)"/g, to: 'className="$1text-gray-800 dark:text-slate-100$2"' },
    { from: /className="([^"]*)\btext-gray-700\b([^"]*)"/g, to: 'className="$1text-gray-700 dark:text-slate-200$2"' },

    // Borders
    { from: /className="([^"]*)\bborder-slate-200\b([^"]*)"/g, to: 'className="$1border-slate-200 dark:border-white/10$2"' },
    { from: /className="([^"]*)\bborder-slate-300\b([^"]*)"/g, to: 'className="$1border-slate-300 dark:border-white/20$2"' },
    { from: /className="([^"]*)\bborder-gray-200\b([^"]*)"/g, to: 'className="$1border-gray-200 dark:border-white/10$2"' },
    { from: /className="([^"]*)\bborder-gray-300\b([^"]*)"/g, to: 'className="$1border-gray-300 dark:border-white/20$2"' },

    // Shadows
    { from: /className="([^"]*)\bshadow-sm\b([^"]*)"/g, to: 'className="$1shadow-sm dark:shadow-slate-900/50$2"' },
    { from: /className="([^"]*)\bshadow-md\b([^"]*)"/g, to: 'className="$1shadow-md dark:shadow-slate-900/50$2"' },
    { from: /className="([^"]*)\bshadow-lg\b([^"]*)"/g, to: 'className="$1shadow-lg dark:shadow-slate-900/50$2"' },
    { from: /className="([^"]*)\bshadow-xl\b([^"]*)"/g, to: 'className="$1shadow-xl dark:shadow-slate-900/50$2"' },
    { from: /className="([^"]*)\bshadow-2xl\b([^"]*)"/g, to: 'className="$1shadow-2xl dark:shadow-slate-900/50$2"' },

    // Hover states
    { from: /className="([^"]*)\bhover:bg-slate-50\b([^"]*)"/g, to: 'className="$1hover:bg-slate-50 dark:hover:bg-white/5$2"' },
    { from: /className="([^"]*)\bhover:bg-slate-100\b([^"]*)"/g, to: 'className="$1hover:bg-slate-100 dark:hover:bg-white/10$2"' },
    { from: /className="([^"]*)\bhover:bg-gray-50\b([^"]*)"/g, to: 'className="$1hover:bg-gray-50 dark:hover:bg-white/5$2"' },
    { from: /className="([^"]*)\bhover:bg-gray-100\b([^"]*)"/g, to: 'className="$1hover:bg-gray-100 dark:hover:bg-white/10$2"' },
];

console.log('🌙 Dark Mode Converter\n');

let totalFiles = 0;
let totalChanges = 0;

files.forEach(filePath => {
    const fullPath = path.join(process.cwd(), filePath);

    if (!fs.existsSync(fullPath)) {
        console.log(`⚠️  Arquivo não encontrado: ${filePath}`);
        return;
    }

    console.log(`🔄 Processando: ${filePath}`);

    // Read file
    let content = fs.readFileSync(fullPath, 'utf8');
    const originalContent = content;

    // Apply conversions
    let fileChanges = 0;
    conversions.forEach(({ from, to }) => {
        const matches = content.match(from);
        if (matches) {
            fileChanges += matches.length;
            content = content.replace(from, to);
        }
    });

    // Only write if changes were made
    if (content !== originalContent) {
        // Create backup
        fs.writeFileSync(`${fullPath}.backup`, originalContent);

        // Write updated file
        fs.writeFileSync(fullPath, content);

        console.log(`   ✅ ${fileChanges} alterações aplicadas`);
        totalFiles++;
        totalChanges += fileChanges;
    } else {
        console.log(`   ℹ️  Nenhuma alteração necessária`);
    }
});

console.log(`\n🎉 Conversão concluída!`);
console.log(`📊 Estatísticas:`);
console.log(`   - Arquivos modificados: ${totalFiles}`);
console.log(`   - Total de alterações: ${totalChanges}`);
console.log(`\n📝 Backups criados com extensão .backup`);
console.log(`🧪 Teste a aplicação e, se tudo estiver OK, remova os backups:`);
console.log(`   find src -name "*.backup" -delete`);
