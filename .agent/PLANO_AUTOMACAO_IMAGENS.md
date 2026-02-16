# 📸 Plano de Ação: Automação de Imagens Apple (Smart Assets)

**Objetivo:** Eliminar 100% da necessidade de upload manual de fotos para iPhones e produtos Apple padronizados.
**O Problema Atual:** Ao adicionar um "iPhone 13 Midnight", o usuário perde tempo procurando e subindo a foto do aparelho, sendo que a foto é sempre a mesma.

---

## 🧠 Solução: Sistema de "Smart Assets"

O sistema passará a ter um "cérebro" visual. Ele saberá qual foto usar baseada apenas no **Nome** e na **Cor** do produto.

### 📅 Fase 1: O Cérebro (Mapeamento)
Criar uma biblioteca interna (`src/utils/appleAssets.js`) contendo os links oficiais de alta resolução para:
- **Modelos:** iPhone 11 ao 16 (Pro, Max, Plus).
- **Cores:** Mapear nomes como "Meia-noite" -> "Midnight", "Estelar" -> "Starlight".

### 🚀 Fase 2: Automação no Cadastro (Backend/Admin)
Mudar a tela de cadastro de produtos (`StockManager`):
1. Ao digitar o modelo (ex: "iPhone 14") e selecionar a cor.
2. O sistema verifica se o campo "Foto" está vazio.
3. Se estiver vazio, ele **preenche automaticamente** com a URL da imagem oficial.
4. **Benefício:** O cadastro fica instantâneo. Nome + Cor + Preço = Produto Pronto.

### 💎 Fase 3: Vitrine Inteligente (Frontend/Public)
Mudar a vitrine pública (`PublicCatalog`):
1. Se um produto foi cadastrado sem foto (apenas texto), a vitrine não mostra o ícone de "Sem Imagem".
2. Ela consulta o "Cérebro" e exibe a foto oficial do produto em tempo real.
3. **Benefício:** Mesmo produtos antigos sem foto ganharão imagens profissionais imediatamente.

---

## 🛠 Passo a Passo de Implementação

### 1. Criar Biblioteca de Imagens (`src/data/appleImages.js`)
Mapear as URLs de imagens da Apple (ou CDN confiável) para cada combinação.

Exemplo de Estrutura:
```javascript
export const appleImages = {
  "iphone 13": {
    "meia-noite": "https://.../iphone-13-midnight.png",
    "estelar": "https://.../iphone-13-starlight.png",
    "azul": "https://.../iphone-13-blue.png"
  },
  "iphone 14 pro max": {
    "roxo profundo": "https://.../iphone-14-pro-max-deep-purple.png"
  }
}
```

### 2. Atualizar Componente de Cadastro
No formulário de adição de estoque:
- Adicionar um "Listener" nos campos Nome e Cor.
- Se `imageUrl` estiver vazio, tentar encontrar a imagem correspondente e definir o estado.

### 3. Atualizar Vitrine
No card do produto:
- `src = item.image || getAppleImage(item.name, item.color)`

---

## 🏁 Resultado Esperado
- **Tempo de Cadastro:** Redução de ~2 minutos para ~15 segundos por item.
- **Padronização:** Todas as fotos terão o mesmo ângulo, fundo e qualidade (padrão Apple).
- **Zero Trabalho:** O usuário só precisa saber o nome e a cor.
