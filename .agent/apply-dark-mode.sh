#!/bin/bash

# Dark Mode Conversion Script
# Applies dark mode classes to all component files

echo "🌙 Iniciando conversão para Dark Mode..."

# Array de arquivos a processar
files=(
  "src/components/tools/TechLab.jsx"
  "src/components/tools/ClientsPage.jsx"
  "src/components/calculators/SmartPricing.jsx"
  "src/components/tools/CheckoutPage.jsx"
  "src/components/tools/Inbox.jsx"
  "src/components/tools/ProposalPage.jsx"
  "src/components/tools/MarketingPage.jsx"
  "src/components/tools/DREPage.jsx"
  "src/components/tools/CashFlowPage.jsx"
  "src/components/tools/ReceivablesPage.jsx"
  "src/components/tools/PayablesPage.jsx"
  "src/components/tools/AuditPage.jsx"
  "src/components/tools/PurchasesPage.jsx"
  "src/components/tools/HistoryPage.jsx"
  "src/components/tools/OCRPage.jsx"
  "src/components/tools/ReversePage.jsx"
  "src/components/tools/TeamPage.jsx"
  "src/components/tools/TermsPage.jsx"
  "src/components/tools/SettingsPage.jsx"
  "src/components/tools/ProfilePage.jsx"
)

# Função de conversão
convert_file() {
  local file=$1
  
  if [ ! -f "$file" ]; then
    echo "⚠️  Arquivo não encontrado: $file"
    return
  fi
  
  echo "🔄 Processando: $file"
  
  # Criar backup
  cp "$file" "${file}.backup"
  
  # Backgrounds
  sed -i '' 's/className="\([^"]*\)bg-white\([^"]*\)"/className="\1bg-white dark:bg-slate-900\2"/g' "$file"
  sed -i '' 's/className="\([^"]*\)bg-slate-50\([^"]*\)"/className="\1bg-slate-50 dark:bg-slate-950\2"/g' "$file"
  sed -i '' 's/className="\([^"]*\)bg-slate-100\([^"]*\)"/className="\1bg-slate-100 dark:bg-slate-800\2"/g' "$file"
  sed -i '' 's/className="\([^"]*\)bg-gray-50\([^"]*\)"/className="\1bg-gray-50 dark:bg-slate-900\2"/g' "$file"
  sed -i '' 's/className="\([^"]*\)bg-gray-100\([^"]*\)"/className="\1bg-gray-100 dark:bg-slate-800\2"/g' "$file"
  
  # Text Colors
  sed -i '' 's/className="\([^"]*\)text-slate-900\([^"]*\)"/className="\1text-slate-900 dark:text-white\2"/g' "$file"
  sed -i '' 's/className="\([^"]*\)text-slate-800\([^"]*\)"/className="\1text-slate-800 dark:text-slate-100\2"/g' "$file"
  sed -i '' 's/className="\([^"]*\)text-slate-700\([^"]*\)"/className="\1text-slate-700 dark:text-slate-200\2"/g' "$file"
  sed -i '' 's/className="\([^"]*\)text-slate-600\([^"]*\)"/className="\1text-slate-600 dark:text-slate-300\2"/g' "$file"
  sed -i '' 's/className="\([^"]*\)text-gray-900\([^"]*\)"/className="\1text-gray-900 dark:text-white\2"/g' "$file"
  
  # Borders
  sed -i '' 's/className="\([^"]*\)border-slate-200\([^"]*\)"/className="\1border-slate-200 dark:border-white\/10\2"/g' "$file"
  sed -i '' 's/className="\([^"]*\)border-slate-300\([^"]*\)"/className="\1border-slate-300 dark:border-white\/20\2"/g' "$file"
  sed -i '' 's/className="\([^"]*\)border-gray-200\([^"]*\)"/className="\1border-gray-200 dark:border-white\/10\2"/g' "$file"
  
  echo "✅ Concluído: $file"
}

# Processar todos os arquivos
for file in "${files[@]}"; do
  convert_file "$file"
done

echo ""
echo "🎉 Conversão concluída!"
echo "📝 Backups criados com extensão .backup"
echo "🧪 Teste a aplicação e, se tudo estiver OK, remova os backups:"
echo "   find src -name '*.backup' -delete"
