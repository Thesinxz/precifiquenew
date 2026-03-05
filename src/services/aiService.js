import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

/**
 * Extracts product information from images, PDFs or text using Gemini AI.
 * @param {Array<File>} files - Array of files (images/PDFs)
 * @param {string} text - Manual text input
 * @returns {Promise<Array>} - List of products
 */
export async function extractImportProducts(files = [], text = "") {
    if (!API_KEY) {
        throw new Error("Gemini API Key não configurada no arquivo .env");
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    console.log("AI Service: Using gemini-2.5-flash for extraction");

    // Prepare prompt parts
    const prompt = `
        Analise a imagem, PDF ou texto fornecido e extraia uma lista detalhada de produtos.
        Para cada produto, identifique:
        - Nome completo (incluindo modelo, armazenamento, cor se disponível)
        - Quantidade
        - Custo Unitário em Dólar (USD)
        - Categoria (iPhone, iPad, Watch, MacBook, Acessório, Outros)
        - Armazenamento (ex: 128GB, 1TB) - se aplicável
        - Cor - se aplicável

        Retorne APENAS um array JSON puro, sem formatação markdown, com a seguinte estrutura:
        [
            {
                "productName": "iPhone 15 Pro Max 256GB Black",
                "quantity": 2,
                "cost": 950.00,
                "category": "iPhone",
                "storage": "256GB",
                "color": "Black"
            }
        ]

        Se houver uma lista de produtos sem preços e valores separados, tente associar corretamente.
        Se o custo estiver em outra moeda, tente identificar, mas o padrão esperado é USD.
        Ignore cabeçalhos de faturas, endereços ou informações que não sejam itens de produto.
    `;

    const parts = [{ text: prompt }];

    // Add manual text if exists
    if (text) {
        parts.push({ text: `Texto para análise: \n${text}` });
    }

    // Add files (images and PDFs)
    for (const file of files) {
        if (file.type.startsWith('image/') || file.type === 'application/pdf') {
            const base64Data = await fileToGenerativePart(file);
            parts.push(base64Data);
        }
    }

    try {
        const result = await model.generateContent(parts);
        const response = await result.response;
        const resultText = response.text();

        // Clean JSON response (more robust cleaning)
        let cleanJson = resultText.trim();
        if (cleanJson.includes("```")) {
            cleanJson = cleanJson.replace(/```json/gi, "").replace(/```/g, "").trim();
        }

        // If it starts with anything before [, try to find [
        const firstBracket = cleanJson.indexOf("[");
        const lastBracket = cleanJson.lastIndexOf("]");
        if (firstBracket !== -1 && lastBracket !== -1) {
            cleanJson = cleanJson.substring(firstBracket, lastBracket + 1);
        }

        const parsed = JSON.parse(cleanJson);
        return Array.isArray(parsed) ? parsed : [parsed];
    } catch (error) {
        console.error("Gemini AI Error:", error);

        // More specific error message for 404
        if (error.message?.includes("404") || error.message?.includes("not found")) {
            throw new Error(`Modelo AI não encontrado ou não suportado. Tente novamente mais tarde.`);
        }

        throw new Error(`Erro na extração AI: ${error.message || "Erro desconhecido"}`);
    }
}

/**
 * Converts a File object to a format Gemini SDK understands.
 */
async function fileToGenerativePart(file) {
    const base64Promise = new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(file);
    });

    return {
        inlineData: {
            data: await base64Promise,
            mimeType: file.type
        },
    };
}

/**
 * Generates business insights based on store data using Gemini.
 * @param {Object} data - Store context (stock value, top items, etc.)
 * @returns {Promise<Object>} - Structured advice
 */
export async function askBusinessAdvisor(data) {
    if (!API_KEY) throw new Error("Gemini API Key missing.");
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    console.log("AI Service: Using gemini-2.5-flash for business advisor with 10 tips");

    const prompt = `
        Atue como um consultor de negócios sênior especializado em varejo de alta performance e revenda de eletrônicos premium (Apple, Samsung, etc).
        Analise minuciosamente os dados da loja abaixo e forneça 10 dicas (estratégias) táticas e acionáveis para otimizar o estoque, aumentar o giro e Maximizar o Lucro Líquido.

        DADOS DA LOJA:
        - Valor total em Estoque (Custo): ${data.totalStockValue}
        - Itens com Capital Travado (Sem giro): ${data.stagnantItems}
        - Top Modelos Vendidos (Focar neles): ${data.topItems}
        - Faturamento Potencial Estimado: ${data.potentialRevenue}

        Retorne APENAS um JSON com esta estrutura (sem markdown):
        {
            "analysis": "Diagnóstico profundo e direto da operação (1 parágrafo potente).",
            "tips": [
                { "title": "Dica 1", "description": "Descrição detalhada e técnica da ação...", "type": "alert" },
                ... até a dica 10
            ]
        }
        
        DIRETRIZES PARA AS DICAS:
        1. Para itens com capital travado, sugira sempre uma "Liquidação Estratégica" com foco em liberar fluxo de caixa rápido.
        2. Use os tipos: "alert" (problemas graves), "growth" (escala), "profit" (margem).
        3. Use terminologia de mercado (Markup, ROI, Giro, Cash Conversion Cycle).
        4. Seja ambicioso e foque em resultados práticos.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const cleanBox = response.text().replace(/```json/gi, "").replace(/```/g, "").trim();
    return JSON.parse(cleanBox);
}

/**
 * AI Sales Agent for Public Catalog.
 * Answers customer questions based on available products.
 * @param {string} question - Customer question
 * @param {Array} products - List of products in catalog
 * @returns {Promise<string>} - Agent response
 */
export async function askSalesAgent(question, products) {
    // FALLBACK FOR DEMO / NO API KEY
    if (!API_KEY) {
        console.warn("Gemini API Key missing. Using fallback logic.");
        const q = question.toLowerCase();

        // Simple search
        const match = products.find(p => p.name.toLowerCase().includes(q) || (p.category && q.includes(p.category.toLowerCase())));

        if (q.includes('preço') || q.includes('valor') || q.includes('quanto')) {
            return "Para valores atualizados e descontos exclusivos, clique em 'Comprar' que nosso time te passa tudo no WhatsApp! 🤑";
        }

        if (match) {
            return `Temos sim! O ${match.name} está disponível. É uma excelente escolha! Clique em 'Comprar' para reservar o seu. ✨`;
        }

        if (q.includes('oi') || q.includes('olá')) {
            return "Olá! Tudo bem? Digite o nome do produto que você procura (ex: iPhone 14) que eu verifico no estoque agora! 🚀";
        }

        return "Desculpe, não encontrei exatamente isso. Mas dê uma olhada no nosso catálogo acima, temos muitas ofertas incríveis! Se preferir, clique em 'Falar com Humano'. 😉";
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Simplify product list to save tokens and focus context
    const context = products.map(p =>
        `- ${p.name}: ${p.details || ''} (${p.condition || 'Novo'}). Preço: consulte.`
    ).join("\n");

    const prompt = `
        Você é o assistente virtual da loja "Precifica Store".
        Sua missão é ajudar clientes a encontrar produtos no catálogo abaixo.
        
        CATÁLOGO ATUAL:
        ${context}

        PERGUNTA DO CLIENTE:
        "${question}"

        DIRETRIZES:
        1. Responda de forma curta, amigável e vendedora (máx 3 frases).
        2. Se o produto estiver na lista, confirme e destaque qualidades.
        3. Se NÃO estiver, sugira um similar da lista ou diga que não temos no momento.
        4. NÃO INVENTE PRODUTOS. Use apenas o catálogo acima.
        5. Se perguntarem preço, diga para clicar no botão "Tenho Interesse" para negociar no WhatsApp.
        6. Use Emojis pontuais.

        RESPOSTA:
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
}

/**
 * Generates a high-conversion sales copy for a product.
 * @param {Object} product - Product details
 * @returns {Promise<string>} - Persuasive ad text
 */
export async function generateProductCopy(product) {
    if (!API_KEY) throw new Error("Gemini API Key missing.");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
        Atue como um especialista em marketing de eletrônicos premium e revenda Apple.
        Crie um anúncio persuasivo para o seguinte produto:
        
        PRODUTO: ${product.name}
        COR: ${product.color}
        ARMAZENAMENTO: ${product.storage}
        CONDIÇÃO: ${product.condition} (Novo/Seminovo)
        SAÚDE DA BATERIA: ${product.batteryHealth}%
        PREÇO SUGERIDO: ${product.price}
        
        DIRETRIZES:
        1. Comece com um gancho emocional (Ex: "A oportunidade que você esperava!")
        2. Destaque os benefícios (Design, performance, estado impecável).
        3. Se a bateria for > 90%, enfatize como "Bateria Excelente".
        4. O tom deve ser PROFISSIONAL, EXCLUSIVO e CONVINCENTE.
        5. Use emojis moderados e elegantes.
        6. Organize em tópicos curtos.
        7. Termine com uma Chamada para Ação (CTA) forte.
        
        RETORNE APENAS O TEXTO DO ANÚNCIO.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
}
