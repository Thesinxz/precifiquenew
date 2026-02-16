# Guia de Conversão para Dark Mode

## Classes Tailwind a Substituir

### Backgrounds
- `bg-white` → `bg-white dark:bg-slate-900`
- `bg-slate-50` → `bg-slate-50 dark:bg-slate-950`
- `bg-slate-100` → `bg-slate-100 dark:bg-slate-800`
- `bg-gray-50` → `bg-gray-50 dark:bg-slate-900`
- `bg-gray-100` → `bg-gray-100 dark:bg-slate-800`

### Text Colors
- `text-slate-900` → `text-slate-900 dark:text-white`
- `text-slate-800` → `text-slate-800 dark:text-slate-100`
- `text-slate-700` → `text-slate-700 dark:text-slate-200`
- `text-slate-600` → `text-slate-600 dark:text-slate-300`
- `text-slate-500` → `text-slate-500 dark:text-slate-400`
- `text-gray-900` → `text-gray-900 dark:text-white`
- `text-gray-800` → `text-gray-800 dark:text-slate-100`
- `text-gray-700` → `text-gray-700 dark:text-slate-200`
- `text-gray-600` → `text-gray-600 dark:text-slate-300`

### Borders
- `border-slate-200` → `border-slate-200 dark:border-white/10`
- `border-slate-300` → `border-slate-300 dark:border-white/20`
- `border-gray-200` → `border-gray-200 dark:border-white/10`
- `border-gray-300` → `border-gray-300 dark:border-white/20`

### Shadows
- `shadow-sm` → `shadow-sm dark:shadow-slate-900/50`
- `shadow-md` → `shadow-md dark:shadow-slate-900/50`
- `shadow-lg` → `shadow-lg dark:shadow-slate-900/50`
- `shadow-xl` → `shadow-xl dark:shadow-slate-900/50`

### Hover States
- `hover:bg-slate-50` → `hover:bg-slate-50 dark:hover:bg-white/5`
- `hover:bg-slate-100` → `hover:bg-slate-100 dark:hover:bg-white/10`
- `hover:bg-gray-50` → `hover:bg-gray-50 dark:hover:bg-white/5`
- `hover:bg-gray-100` → `hover:bg-gray-100 dark:hover:bg-white/10`

### Inputs & Forms
- `bg-white` (inputs) → `bg-white dark:bg-slate-900`
- `focus:ring-blue-500` → `focus:ring-blue-500 dark:focus:ring-blue-400`
- `focus:border-blue-500` → `focus:border-blue-500 dark:focus:border-blue-400`

## Arquivos a Atualizar

1. TechLab.jsx
2. ClientsPage.jsx
3. SmartPricing.jsx
4. CheckoutPage.jsx
5. Inbox.jsx
6. ProposalPage.jsx
7. MarketingPage.jsx
8. DREPage.jsx
9. CashFlowPage.jsx
10. ReceivablesPage.jsx
11. PayablesPage.jsx
12. AuditPage.jsx
13. PurchasesPage.jsx
14. HistoryPage.jsx
15. OCRPage.jsx
16. ReversePage.jsx
17. TeamPage.jsx
18. TermsPage.jsx
19. SettingsPage.jsx
20. ProfilePage.jsx

## Padrão de Implementação

```jsx
// ANTES
<div className="bg-white rounded-lg p-6 shadow-md border border-slate-200">
  <h2 className="text-2xl font-bold text-slate-900">Título</h2>
  <p className="text-slate-600">Descrição</p>
</div>

// DEPOIS
<div className="bg-white dark:bg-slate-900 rounded-lg p-6 shadow-md dark:shadow-slate-900/50 border border-slate-200 dark:border-white/10">
  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Título</h2>
  <p className="text-slate-600 dark:text-slate-300">Descrição</p>
</div>
```

## Script de Busca e Substituição

Use grep para encontrar ocorrências:
```bash
grep -r "bg-white" src/components/tools/ --include="*.jsx"
grep -r "text-slate-900" src/components/tools/ --include="*.jsx"
grep -r "border-slate-200" src/components/tools/ --include="*.jsx"
```
