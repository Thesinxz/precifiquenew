
// Smart Assets System
// Automatically provides high-quality official images for Apple products based on Model and Color.

const APPLE_CDN_BASE = "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is";

// Map of common color names (PT-BR) to Apple's internal color codes (EN)
const COLOR_MAP = {
    'meia-noite': 'midnight',
    'midnight': 'midnight',
    'estelar': 'starlight',
    'starlight': 'starlight',
    'azul': 'blue',
    'blue': 'blue',
    'rosa': 'pink',
    'pink': 'pink',
    'verde': 'green',
    'green': 'green',
    'vermelho': 'product-red',
    'red': 'product-red',
    'product red': 'product-red',
    'roxo': 'purple',
    'purple': 'purple',
    'amarelo': 'yellow',
    'yellow': 'yellow',
    'preto': 'black',
    'black': 'black',
    'branco': 'white',
    'white': 'white',
    'dourado': 'gold',
    'gold': 'gold',
    'prata': 'silver',
    'silver': 'silver',
    'cinza-espacial': 'space-gray',
    'space gray': 'space-gray',
    'grafite': 'graphite',
    'graphite': 'graphite',
    'azul-sierra': 'sierra-blue',
    'sierra blue': 'sierra-blue',
    'verde-alpino': 'alpine-green',
    'alpine green': 'alpine-green',
    'roxo-profundo': 'deep-purple',
    'deep purple': 'deep-purple',
    'preto-espacial': 'space-black',
    'space black': 'space-black',
    'titânio-natural': 'natural-titanium',
    'natural titanium': 'natural-titanium',
    'titânio-azul': 'blue-titanium',
    'blue titanium': 'blue-titanium',
    'titânio-branco': 'white-titanium',
    'white titanium': 'white-titanium',
    'titânio-preto': 'black-titanium',
    'black titanium': 'black-titanium',
    'titânio-deserto': 'desert-titanium',
    'desert titanium': 'desert-titanium',
    // Future/Rumored Colors
    'titânio-cobre': 'copper-titanium',
    'copper titanium': 'copper-titanium',
    'bronze': 'bronze-titanium',
    'teal': 'teal',
    'ultramarino': 'ultramarine',
    'ultramarine': 'ultramarine',
    'lapis': 'lapis',

    // iPhone 17 / New Colors (Speculative Mapping)
    'laranja-cósmico': 'cosmic-orange', // Placeholder
    'azul-intenso': 'deep-blue',
    'azul-névoa': 'mist-blue',
    'sálvia': 'sage',
    'lavanda': 'lavender',
    'azul-céu': 'sky-blue',
    'branco-nuvem': 'cloud-white',
    'dourado-claro': 'pale-gold',

    'titânio preto': 'black-titanium',
    'titânio branco': 'white-titanium',
    'titânio natural': 'natural-titanium',
    'titanium black': 'black-titanium',
    'titanium white': 'white-titanium',
    'titanium natural': 'natural-titanium',
    'space-black': 'space-black',
    'deep-purple': 'deep-purple',
    'verde meia-noite': 'midnight-green',
    'azul-pacífico': 'pacific-blue'
};

// Map of models to their specific image year/code pattern
const MODEL_PATTERNS = {
    // iPhone 17 Series (Released Sep 2025)
    'iphone 17 pro max': { year: '202509', format: 'iphone-17-pro-max-[color]-select' },
    'iphone 17 pro': { year: '202509', format: 'iphone-17-pro-[color]-select' },
    'iphone 17 air': { year: '202509', format: 'iphone-17-air-[color]-select' },
    'iphone 17': { year: '202509', format: 'iphone-17-[color]-select' },

    // iPhone 16 Series (Released Sep 2024)
    'iphone 16 pro max': { year: '202409', format: 'iphone-16-pro-max-[color]-select' },
    'iphone 16 pro': { year: '202409', format: 'iphone-16-pro-[color]-select' },
    'iphone 16 plus': { year: '202409', format: 'iphone-16-plus-[color]-select' },
    'iphone 16': { year: '202409', format: 'iphone-16-[color]-select' },

    'iphone 15 pro max': { year: '202309', format: 'iphone-15-pro-max-[color]-select' },
    'iphone 15 pro': { year: '202309', format: 'iphone-15-pro-[color]-select' },
    'iphone 15 plus': { year: '202309', format: 'iphone-15-plus-[color]-select' },
    'iphone 15': { year: '202309', format: 'iphone-15-[color]-select' },

    'iphone 14 pro max': { year: '202209', format: 'iphone-14-pro-max-[color]-select' },
    'iphone 14 pro': { year: '202209', format: 'iphone-14-pro-[color]-select' },
    'iphone 14 plus': { year: '202209', format: 'iphone-14-plus-[color]-select' },
    'iphone 14': { year: '202209', format: 'iphone-14-[color]-select' },

    'iphone 13 pro max': { year: '202109', format: 'iphone-13-pro-max-[color]-select' },
    'iphone 13 pro': { year: '202109', format: 'iphone-13-pro-[color]-select' },
    'iphone 13': { year: '2021', format: 'iphone-13-[color]-select' }, // 2021 standard
    'iphone 13 mini': { year: '2021', format: 'iphone-13-mini-[color]-select' },

    'iphone 12 pro max': { year: '202010', format: 'iphone-12-pro-max-[color]-select' },
    'iphone 12 pro': { year: '202010', format: 'iphone-12-pro-[color]-select' },
    'iphone 12': { year: '2020', format: 'iphone-12-[color]-select' },
    'iphone 12 mini': { year: '2020', format: 'iphone-12-mini-[color]-select' },

    'iphone 11': { year: '201909', format: 'iphone11-[color]-select' },
    'iphone 11 pro': { year: '201909', format: 'iphone-11-pro-[color]-select' },
    'iphone 11 pro max': { year: '201909', format: 'iphone-11-pro-max-[color]-select' },

    'iphone se': { year: '202203', format: 'iphone-se-[color]-select' } // SE 3rd gen
};

/**
 * Tries to generate an official Apple image URL based on model name and color.
 * @param {string} modelName - e.g. "iPhone 13", "iPhone 14 Pro Max"
 * @param {string} colorName - e.g. "Meia-noite", "Roxo Profundo", "Azul"
 * @returns {string|null} - URL or null if not found
 */
export const getSmartImage = (modelName, colorName) => {
    if (!modelName) return null;

    // Normalize inputs
    const name = modelName.toLowerCase().trim().replace(/\s+\d+(gb|tb)/, ''); // Remove storage
    const color = (colorName || '').toLowerCase().trim();

    // Find model pattern
    // We check if the input name INCLUDES the key (e.g. "Apple iPhone 13 128GB" includes "iphone 13")
    // Keys are sorted by length desc to match "Pro Max" before "Pro" or base
    const matchedModelKey = Object.keys(MODEL_PATTERNS)
        .sort((a, b) => b.length - a.length)
        .find(key => name.includes(key));

    if (!matchedModelKey) return null;

    const pattern = MODEL_PATTERNS[matchedModelKey];
    const appleColor = COLOR_MAP[color];

    if (!appleColor && color) {
        // console.warn(`SmartAssets: Color '${color}' not mapped for '${modelName}'`);
        return null;
    }

    // Default to a 'hero' color if no color provided? 
    // Apple URLs require color. If no color, we can't guess easily without checking all.
    // Let's assume 'black' or 'midnight' or 'graphite' as fallback if color is missing but rarely works universally.
    if (!appleColor) return null;

    // Construct URL
    // Handle Mid-Cycle Color Updates (Apple changes the year suffix for later releases)
    let yearSuffix = pattern.year;

    // iPhone 14 Yellow (March 2023)
    if ((name.includes('iphone 14') || name.includes('iphone 14 plus')) && appleColor === 'yellow') {
        yearSuffix = '202303';
    }
    // iPhone 13 Green / Alpine Green (March 2022)
    if (name.includes('iphone 13') && (appleColor === 'green' || appleColor === 'alpine-green')) {
        yearSuffix = '202203';
    }
    // iPhone 12 Purple (April 2021)
    if (name.includes('iphone 12') && appleColor === 'purple') {
        yearSuffix = '202104';
    }

    // Format: https://store.storeimages.cdn-apple.com/.../iphone-13-midnight-select-2021.png?wid=2000&hei=2000&fmt=png-alpha
    const filename = `${pattern.format.replace('[color]', appleColor)}-${yearSuffix}`;

    // Apple CDN requires .png extension and format parameters for transparency
    // wid=2000&hei=2000 ensures high resolution for retina displays
    return `${APPLE_CDN_BASE}/${filename}.png?wid=2000&hei=2000&fmt=png-alpha`;
};

/**
 * Examples:
 * getSmartImage('iPhone 13 128GB', 'Meia-noite') -> link to midnight image
 * getSmartImage('iPhone 14 Pro Max', 'Roxo Profundo') -> link to deep purple image
 */
