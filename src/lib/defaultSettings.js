export const DEFAULT_SETTINGS = {
    company: {
        name: 'Minha Loja',
        cnpj: '',
        address: ''
    },
    financial: {
        activeGatewayId: 'gateway1',
        notaFiscalRate: 4.0,
        gateways: [
            {
                id: 'gateway1',
                name: 'Status Pay VISA/MASTER',
                rates: {
                    pix: 1.99,
                    debit: 1.99,
                    credit1x: 4.39,
                    credit12x: 13.79,
                    maxInstallments: 21
                }
            },
            {
                id: 'gateway_elo',
                name: 'Status Pay HIPER/ELO',
                rates: {
                    pix: 1.99,
                    debit: 2.24,
                    credit1x: 4.39,
                    credit12x: 13.79,
                    maxInstallments: 21
                }
            },
            {
                id: 'pagbank_visa_master',
                name: 'PagBank VISA/MASTER (PP150)',
                rates: {
                    pix: 0.50,
                    debit: 0.99,
                    credit1x: 2.99,
                    credit12x: 10.90,
                    maxInstallments: 18
                }
            },
            {
                id: 'pagbank_elo',
                name: 'PagBank ELO (PP150)',
                rates: {
                    pix: 0.50,
                    debit: 1.60,
                    credit1x: 3.99,
                    credit12x: 12.70,
                    maxInstallments: 18
                }
            },
            {
                id: 'gateway2',
                name: 'Link de Pagamento',
                rates: {
                    pix: 0,
                    debit: 0,
                    credit1x: 3.49,
                    credit12x: 18.99,
                    maxInstallments: 12
                }
            }
        ]
    },
    categories: [
        {
            id: 'iphone',
            name: 'iPhones Lacrados',
            type: 'product',
            margin: 15,
            marginType: 'percent',
            warranty: '1 Ano Apple',
            icon: 'smartphone',
            gatewayId: 'gateway1',
            requiresNotaFiscal: true,
            defaultGifts: [1, 2]
        },
        {
            id: 'iphonesemi',
            name: 'iPhones Seminovos',
            type: 'product',
            margin: 25,
            marginType: 'percent',
            warranty: '3 Meses Loja',
            icon: 'smartphone',
            gatewayId: 'gateway1',
            requiresNotaFiscal: false,
            defaultGifts: [1]
        },
        {
            id: 'xiaomi',
            name: 'Xiaomi / Android',
            type: 'product',
            margin: 20,
            marginType: 'percent',
            warranty: '3 Meses',
            icon: 'smartphone',
            gatewayId: 'gateway1',
            requiresNotaFiscal: false,
            defaultGifts: []
        },
        {
            id: 'accessories',
            name: 'Acessórios',
            type: 'product',
            margin: 50,
            marginType: 'percent',
            warranty: '7 dias',
            icon: 'headphones',
            gatewayId: 'gateway1',
            requiresNotaFiscal: false,
            defaultGifts: []
        }
    ],
    messages: {
        iphone: { pricing: "*%{name}*\n-------------------------\n💰 *À vista:* %{pix}\n💳 *Cartão (12x):* %{card12x}\n-------------------------\n_Oferta válida hoje!_" },
    },
    gifts: {
        gifts: [
            { id: 1, name: 'Capinha Premium', cost: 15 },
            { id: 2, name: 'Película 3D', cost: 8 },
            { id: 3, name: 'Fonte 20W', cost: 35 }
        ],
        showcase: { title: 'Ofertas Imperdíveis', color: '#4f46e5' }
    }
};
