# 🚀 Plano de Ação: Estoque e Vitrine Premium 2026
**Foco: Experiência de Compra e Ordenação Inteligente**

Data de Criação: 15/02/2026
Status: Planejamento

---

## 🎯 Pilar 1: Ordenação e Inteligência de Exibição

### 🔴 Ação 1.1: Algoritmo "iPhone First"
**Objetivo:** Garantir que os produtos mais desejados apareçam primeiro.
- **Regra de Ouro:** iPhone Lacrado > iPhone Seminovo > Outros Celulares > Acessórios.
- **Lógica de Desempate:**
  1. Modelo mais recente (15 > 14 > 13).
  2. Maior capacidade (512GB > 256GB).
  3. Preço (Maior valor agregado primeiro ou configurável).
- **Implementação:** Alterar a lógica de `sort` no `PublicCatalog.jsx` e `StockManager.jsx`.

### 🟡 Ação 1.2: Badges Visuais e Destaques
**Objetivo:** Chamar atenção para oportunidades.
- **Tags Automáticas:**
  - "Novo": Cadastrado há menos de 7 dias.
  - "Últimas Unidades": Estoque < 3.
  - "Oportunidade": Preço abaixo da média.
- **Destaque Manual:** Checkbox "Destacar na Home" no cadastro de produtos.

---

## 💎 Pilar 2: Experiência Visual Premium

### 🟡 Ação 2.1: Agrupamento Inteligente de Variantes (SKU)
**Objetivo:** Limpar a vitrine visualmente.
- **Card Único por Modelo:** Em vez de 5 cards para "iPhone 13 128GB Preto", "Azul", "Branco"... exibir UM card "iPhone 13".
- **Seletor no Card:** Bolinhas de cor e chips de capacidade dentro do próprio card na listagem.
- **Preço "A partir de":** Exibir o menor preço dentre as variantes disponíveis.

### 🟢 Ação 2.2: Banners Promocionais Editáveis
**Objetivo:** Campanhas de marketing na vitrine.
- **Gerenciador de Banners:** No painel administrativo, permitir upload de imagens para o carrossel.
- **Links nos Banners:** Clicar no banner leva para uma categoria ou produto específico.

---

## 🚀 Pilar 3: Conversão e Facilidade (Mobile First)

### 🟡 Ação 3.1: Filtros Avançados Mobile
**Objetivo:** Facilitar a busca no celular.
- **Filtros por Categoria:** Chips horizontais deslizantes (já existem, melhorar visual).
- **Filtros por Condição:** Toggle para ver só "Novos" ou só "Seminovos".
- **Ordenar Por:** Menor Preço, Mais Recentes, Relevância (Padrão).

### 🟢 Ação 3.2: Botão de Compra Rápida (Quick Buy)
**Objetivo:** Reduzir cliques até o checkout.
- **Botão Whatsapp Direto:** "Negociar agora" flutuante.
- **Carrinho Persistente:** Lembrar itens se o cliente sair e voltar.

---

## 📅 Cronograma Sugerido

### 🏁 Passo 1: Algoritmo de Ordenação (Imediato)
É a principal dor relatada. Faremos os iPhones lacrados aparecerem no topo hoje mesmo.

### 🏁 Passo 2: Agrupamento de Variantes (Semana 1)
Crucial para organizar o catálogo se houver muitas variações de cor/memória.

### 🏁 Passo 3: Filtros e Badges (Semana 2)
Refinamento visual e funcional.
