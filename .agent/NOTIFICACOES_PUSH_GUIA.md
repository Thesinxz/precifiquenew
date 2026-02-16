# 🔔 Guia de Configuração - Notificações Push

## Passo 1: Obter VAPID Key do Firebase

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto: **precifiqueantigravity**
3. Vá em **Project Settings** (⚙️ no canto superior esquerdo)
4. Clique na aba **Cloud Messaging**
5. Role até **Web Push certificates**
6. Clique em **Generate key pair** (se ainda não tiver)
7. Copie a chave gerada (começa com `B...`)

## Passo 2: Configurar a VAPID Key

Abra o arquivo `src/services/notificationService.js` e substitua:

```javascript
const VAPID_KEY = 'YOUR_VAPID_KEY_HERE';
```

Por:

```javascript
const VAPID_KEY = 'SUA_CHAVE_COPIADA_AQUI';
```

## Passo 3: Integrar o Componente de Configurações

### Opção A: Adicionar na página de Settings existente

1. Abra `src/components/tools/SettingsPage.jsx`
2. Importe o componente:
```javascript
import { NotificationSettings } from '../settings/NotificationSettings';
```

3. Adicione uma nova seção:
```jsx
<div className="space-y-6">
    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
        Notificações
    </h2>
    <NotificationSettings user={user} userProfile={userProfile} />
</div>
```

### Opção B: Criar rota dedicada

1. Abra `src/App.jsx`
2. Adicione a rota:
```jsx
<Route path="notifications" element={
    <NotificationSettings user={user} userProfile={userProfile} />
} />
```

## Passo 4: Testar as Notificações

1. Acesse a página de configurações
2. Clique em **"Ativar Notificações"**
3. Permita as notificações quando o navegador solicitar
4. Clique em **"Testar Notificação"**
5. Você deve ver uma notificação aparecer!

## Passo 5: Adicionar Notificações em Outros Serviços

### Exemplo: SalesService (Novos Pedidos)

```javascript
import { notificationService } from './notificationService';

// Dentro do método createSale, após salvar:
try {
    await notificationService.notifyNewOrder({
        id: saleId,
        customerName: saleData.clientName,
        total: saleData.total
    });
} catch (error) {
    console.error('Notification error:', error);
}
```

### Exemplo: StockService (Estoque Baixo)

```javascript
// Quando detectar estoque baixo:
if (product.quantity < product.minStock) {
    await notificationService.notifyLowStock({
        id: product.id,
        name: product.name,
        quantity: product.quantity
    });
}
```

## Passo 6: Configurar Cloud Functions (Opcional - Avançado)

Para enviar notificações do servidor (quando o usuário não está online):

1. Instale Firebase Admin SDK:
```bash
npm install firebase-admin
```

2. Crie uma Cloud Function:
```javascript
const admin = require('firebase-admin');
admin.initializeApp();

exports.sendNotificationOnNewOS = functions.firestore
    .document('technical_lab/{osId}')
    .onCreate(async (snap, context) => {
        const osData = snap.data();
        
        // Buscar tokens dos usuários da organização
        const usersSnapshot = await admin.firestore()
            .collection('users')
            .where('organizationId', '==', osData.organizationId)
            .get();
        
        const tokens = [];
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            if (userData.fcmTokens) {
                tokens.push(...userData.fcmTokens);
            }
        });
        
        // Enviar notificação
        if (tokens.length > 0) {
            await admin.messaging().sendMulticast({
                tokens: tokens,
                notification: {
                    title: '🔧 Nova Ordem de Serviço!',
                    body: `OS #${osData.osNumber} - ${osData.device?.model || 'Aparelho'}`
                },
                data: {
                    type: 'service_order',
                    osId: context.params.osId,
                    priority: 'high'
                }
            });
        }
    });
```

## Troubleshooting

### Notificações não aparecem?

1. **Verifique permissões**: Vá em Configurações do navegador > Notificações
2. **Service Worker**: Abra DevTools > Application > Service Workers
3. **Console**: Verifique erros no console do navegador
4. **VAPID Key**: Confirme que está correta

### Notificações aparecem duplicadas?

- Isso pode acontecer se houver múltiplos service workers registrados
- Limpe o cache e recarregue a página

### Notificações não funcionam no iOS?

- Safari no iOS tem suporte limitado a PWA
- Considere usar notificações nativas via app wrapper (Capacitor/Cordova)

## Próximos Passos

- [ ] Adicionar analytics para rastrear taxa de cliques
- [ ] Implementar agendamento de notificações
- [ ] Criar templates de notificação personalizáveis
- [ ] Adicionar rich notifications (imagens, botões de ação)
- [ ] Implementar notificações silenciosas para sync em background
