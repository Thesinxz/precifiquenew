# 🚀 Plano de Ação: Evolução Precifique 2026
**Documento de Implementação Técnica**

Data de Criação: 15/02/2026
Status: Em Execução

---

## 📋 Visão Geral

Este plano visa elevar o Precifique ao nível Enterprise, aplicando o padrão de qualidade estabelecido no novo **ServiceOrderWizard** em todo o sistema. O foco está em três pilares: **Experiência Premium**, **Automação Inteligente** e **Inteligência de Negócio**.

---

## 🎯 Pilar 1: Unificação Estética (Visual Premium)

### ✅ Ação 1.1: Redesign do Dashboard Principal
**Arquivo:** `src/components/tools/DashboardPage.jsx` (1498 linhas)

**Objetivo:** Transformar o dashboard em um centro de comando limpo e profissional.

**Mudanças Específicas:**
1. **Header Simplificado**
   - Remover poluição visual
   - Cards de métricas com hierarquia clara
   - Uso de gradientes sutis (Indigo/Slate)

2. **Cards de Métricas (KPIs)**
   ```jsx
   // Padrão Atual: Cards genéricos
   // Padrão Novo: Cards com ícones grandes, números em destaque, micro-animações
   <div className="bg-white rounded-3xl p-6 border border-slate-100 hover:shadow-xl transition-all">
     <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
       <DollarSign className="w-6 h-6 text-indigo-600" />
     </div>
     <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Receita Hoje</p>
     <h3 className="text-3xl font-black text-slate-900 mt-1">R$ 12.450</h3>
     <p className="text-xs text-emerald-600 mt-2">↑ 23% vs ontem</p>
   </div>
   ```

3. **Gráficos Modernos**
   - Remover bordas desnecessárias
   - Cores consistentes (Indigo para vendas, Emerald para lucro)
   - Tooltips customizados

4. **Seção de Ações Rápidas**
   - Botões grandes e visuais
   - "Nova Venda", "Nova OS", "Adicionar Estoque"
   - Ícones proeminentes

**Prioridade:** 🔴 ALTA  
**Tempo Estimado:** 4-6 horas  
**Dependências:** Nenhuma

---

### ✅ Ação 1.2: Refatoração do Tech Lab
**Arquivo:** `src/components/tools/TechLab.jsx` (325 linhas)

**Objetivo:** Interface focada para técnicos, minimalista e eficiente.

**Mudanças Específicas:**
1. **Kanban Visual Limpo**
   ```jsx
   // Colunas: Triagem → Manutenção → Revisão → Pronto
   // Cards minimalistas com:
   // - Foto do aparelho (se disponível)
   // - Modelo em destaque
   // - Status badge colorido
   // - Tempo desde entrada (ex: "há 2h")
   ```

2. **Drag & Drop entre Colunas**
   - Implementar `react-beautiful-dnd` ou similar
   - Feedback visual ao arrastar

3. **Quick Actions no Card**
   - WhatsApp direto
   - Imprimir etiqueta
   - Ver histórico

4. **Filtros Inteligentes**
   - Por técnico responsável
   - Por urgência
   - Por tipo de reparo

**Prioridade:** 🔴 ALTA  
**Tempo Estimado:** 3-4 horas  
**Dependências:** Nenhuma

---

### ✅ Ação 1.3: Dark Mode Nativo
**Arquivos:** `src/index.css`, todos os componentes

**Objetivo:** Modo escuro real, não apenas inversão de cores.

**Mudanças Específicas:**
1. **Variáveis CSS Globais**
   ```css
   :root {
     --bg-primary: #ffffff;
     --bg-secondary: #f8fafc;
     --text-primary: #0f172a;
     --text-secondary: #64748b;
     --border: #e2e8f0;
   }

   [data-theme="dark"] {
     --bg-primary: #0f172a;
     --bg-secondary: #1e293b;
     --text-primary: #f1f5f9;
     --text-secondary: #94a3b8;
     --border: #334155;
   }
   ```

2. **Toggle no Header**
   - Ícone de sol/lua
   - Transição suave
   - Persistência no localStorage

**Prioridade:** 🟡 MÉDIA  
**Tempo Estimado:** 2-3 horas  
**Dependências:** Ação 1.1 e 1.2 concluídas

---

## ⚙️ Pilar 2: Automação e "Frictionless"

### ✅ Ação 2.1: Sincronização de Estoque em Tempo Real
**Arquivos:** `ServiceOrderWizard.jsx`, `StockPage.jsx`, `stockService.js`

**Objetivo:** Ao adicionar peça na OS, reservar automaticamente do estoque.

**Mudanças Específicas:**
1. **Seletor de Peças Inteligente**
   ```jsx
   // No Step 4 do Wizard:
   // - Buscar peças do estoque real
   // - Mostrar quantidade disponível
   // - Alertar se estoque baixo
   // - Reservar ao adicionar (status: "reserved")
   ```

2. **Cálculo de Lucro Automático**
   ```javascript
   // Ao selecionar peça:
   const costPrice = selectedPart.costPrice;
   const salePrice = selectedPart.price;
   const grossProfit = salePrice - costPrice;
   // Exibir margem em tempo real
   ```

3. **Liberação de Reserva**
   - Se OS cancelada → liberar peça
   - Se OS concluída → baixar do estoque definitivamente

**Prioridade:** 🔴 ALTA  
**Tempo Estimado:** 5-6 horas  
**Dependências:** Stock Service precisa ter campo `reserved`

---

### ✅ Ação 2.2: Régua de Comunicação WhatsApp
**Arquivos:** `AutomationsPage.jsx`, novo `whatsappService.js`

**Objetivo:** Disparos automáticos de status da OS.

**Mudanças Específicas:**
1. **Triggers Automáticos**
   ```javascript
   // Eventos que disparam mensagens:
   // - OS criada → "Recebemos seu aparelho"
   // - OS aprovada → "Orçamento aprovado, iniciando reparo"
   // - OS concluída → "Seu aparelho está pronto! 🎉"
   // - OS atrasada → "Pedimos desculpas pelo atraso..."
   ```

2. **Templates Personalizáveis**
   - Interface no AutomationsPage para editar mensagens
   - Variáveis dinâmicas: {clientName}, {model}, {osNumber}

3. **Link de Acompanhamento**
   - Gerar URL única: `precifique.app/track/{osId}`
   - Cliente vê status em tempo real

**Prioridade:** 🟡 MÉDIA  
**Tempo Estimado:** 4-5 horas  
**Dependências:** Ação 2.1 (para integração completa)

---

### ✅ Ação 2.3: Checklist de Entrada Digital
**Arquivos:** `ServiceOrderWizard.jsx`, Firebase Storage

**Objetivo:** Fotos e desenhos de avarias salvos na nuvem automaticamente.

**Mudanças Específicas:**
1. **Upload de Imagens**
   ```javascript
   // No Step 2 do Wizard:
   // - Botão "Adicionar Foto"
   // - Upload para Firebase Storage
   // - Thumbnail na OS
   // - Download no PDF final
   ```

2. **Desenho de Avarias**
   - Canvas para marcar riscos/trincas
   - Salvar como PNG
   - Anexar à OS

**Prioridade:** 🟢 BAIXA  
**Tempo Estimado:** 3-4 horas  
**Dependências:** Firebase Storage configurado

---

## 📊 Pilar 3: Inteligência e Retenção

### ✅ Ação 3.1: Linha do Tempo do Cliente
**Arquivo:** `ClientsPage.jsx` (57622 bytes)

**Objetivo:** Perfil unificado com histórico completo.

**Mudanças Específicas:**
1. **Timeline Visual**
   ```jsx
   // Ao clicar em um cliente:
   // - Linha do tempo vertical
   // - Ícones para cada tipo de interação:
   //   📱 Compra de produto
   //   🔧 Ordem de Serviço
   //   💬 Mensagem de suporte
   // - Ordenado por data (mais recente primeiro)
   ```

2. **Métricas do Cliente**
   - Lifetime Value (LTV)
   - Ticket Médio
   - Frequência de compra
   - NPS (se implementado)

**Prioridade:** 🟡 MÉDIA  
**Tempo Estimado:** 4-5 horas  
**Dependências:** Nenhuma

---

### ✅ Ação 3.2: Painel de Performance Técnica (TAT)
**Arquivo:** Novo `TechPerformancePage.jsx`

**Objetivo:** Métricas de eficiência dos técnicos.

**Mudanças Específicas:**
1. **KPIs por Técnico**
   - Tempo médio de reparo (TAT)
   - Taxa de retrabalho
   - Satisfação do cliente
   - OS concluídas no mês

2. **Gráficos Comparativos**
   - Ranking de velocidade
   - Tipos de reparo mais comuns

**Prioridade:** 🟢 BAIXA  
**Tempo Estimado:** 5-6 horas  
**Dependências:** Histórico de OS com timestamps

---

### ✅ Ação 3.3: Business Advisor IA
**Arquivo:** `BusinessAdvisor.jsx` (10597 bytes)

**Objetivo:** Sugestões inteligentes de compra de estoque.

**Mudanças Específicas:**
1. **Análise de Sazonalidade**
   ```javascript
   // Algoritmo:
   // - Analisar vendas dos últimos 12 meses
   // - Identificar picos (ex: Natal, Black Friday)
   // - Sugerir compra antecipada
   ```

2. **Alertas de Estoque Baixo**
   - Notificação quando peça crítica < 3 unidades
   - Sugestão de quantidade ideal

**Prioridade:** 🟢 BAIXA  
**Tempo Estimado:** 6-8 horas  
**Dependências:** Histórico de vendas robusto

---

## 📅 Cronograma de Execução

### Semana 1: Visual Premium
- [ ] Dia 1-2: Redesign Dashboard (Ação 1.1)
- [ ] Dia 3-4: Refatoração Tech Lab (Ação 1.2)
- [ ] Dia 5: Dark Mode (Ação 1.3)

### Semana 2: Automação
- [ ] Dia 1-2: Sincronização de Estoque (Ação 2.1)
- [ ] Dia 3-4: WhatsApp Automático (Ação 2.2)
- [ ] Dia 5: Checklist Digital (Ação 2.3)

### Semana 3: Inteligência
- [ ] Dia 1-2: Timeline do Cliente (Ação 3.1)
- [ ] Dia 3-4: Performance Técnica (Ação 3.2)
- [ ] Dia 5: Business Advisor IA (Ação 3.3)

---

## 🎨 Padrão de Design Estabelecido

Baseado no **ServiceOrderWizard** refatorado:

### Cores
- **Primary:** Indigo-600 (#4f46e5)
- **Secondary:** Slate-900 (#0f172a)
- **Success:** Emerald-600 (#059669)
- **Warning:** Amber-500 (#f59e0b)
- **Error:** Red-600 (#dc2626)

### Tipografia
- **Títulos:** font-black, tracking-tight
- **Labels:** text-[10px], uppercase, tracking-wider, text-slate-400
- **Valores:** text-3xl, font-black, text-slate-900

### Espaçamento
- **Cards:** p-6, rounded-3xl
- **Gaps:** space-y-10 (seções), gap-6 (elementos)
- **Margens:** max-w-5xl mx-auto

### Animações
- **Transições:** transition-all duration-300
- **Hover:** hover:shadow-xl, hover:scale-105
- **Loading:** animate-spin (spinners)

---

## 📝 Notas de Implementação

1. **Testes:** Cada ação deve ser testada em ambiente de desenvolvimento antes de deploy.
2. **Backup:** Fazer commit Git antes de cada mudança grande.
3. **Feedback:** Coletar feedback do usuário após cada semana.
4. **Performance:** Monitorar tempo de carregamento após mudanças.

---

## 🚀 Próximos Passos Imediatos

1. ✅ Criar este documento de planejamento
2. 🔄 Iniciar Ação 1.1 (Redesign Dashboard)
3. 🔄 Preparar branch Git: `feature/dashboard-redesign`

---

**Documento vivo - Atualizar conforme progresso**
