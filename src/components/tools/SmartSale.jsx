import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNotifications } from '../../contexts/NotificationContext';
import { Timestamp, addDoc, collection } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useToast } from '../ui/Toast';
import {
    Plus, User, Search, ShoppingCart, Loader2, Check,
    Smartphone, X, Package, TicketPercent, Wallet,
    CreditCard, Banknote, Calendar, Wrench, ChevronLeft, ChevronDown,
    Clock, History, ArrowUpRight, ShoppingBag, FileText, Printer,
    Trash2, Edit3, Settings2, RefreshCw, Activity, Pencil, TrendingUp, Building2,
    Zap, Calculator, Target, ShieldCheck, PlusCircle, UserX, ChevronRight
} from 'lucide-react';
import { ClientService } from '../../services/clientService';
import { StockService } from '../../services/stockService';
import { formatCurrency, cn, generateReferenceCode } from '../../lib/utils';
import { SalesService } from '../../services/salesService';
import { UserService } from '../../services/userService';
import { ClientFormModal } from './ClientFormModal';
import { InvoiceEmissionModal } from './InvoiceEmissionModal';

export function SmartSale({ user, userProfile, settings }) {
    const [view, setView] = useState('list'); // 'list' | 'new-sale'
    const [isLoading, setIsLoading] = useState(false);
    const { showToast } = useToast();

    // --- New Sale State ---
    const [step, setStep] = useState(1); // 1: Client, 2: Products, 3: Payment

    // Step 1: Client
    const [clientSearch, setClientSearch] = useState('');
    const [clients, setClients] = useState([]);
    const [selectedClient, setSelectedClient] = useState(null);
    const [isCreatingClient, setIsCreatingClient] = useState(false);

    // Step 2: Products
    const [stock, setStock] = useState([]);
    const [productSearch, setProductSearch] = useState('');
    const [cart, setCart] = useState([]);
    const [selectedSale, setSelectedSale] = useState(null); // For details/cancelling

    // Step 3: Payment overhaul
    const [paymentEntries, setPaymentEntries] = useState([]); // [{ id, method, amount, installments }]
    const [discount, setDiscount] = useState(0);
    const [walletBalance, setWalletBalance] = useState(0);

    // Fix for Calculator Input
    const [isEditingTotal, setIsEditingTotal] = useState(false);
    const [customTotal, setCustomTotal] = useState('');

    const parsePrice = (p) => {
        if (!p) return 0;
        // Priority: price -> pixPrice -> cost * 1.3
        const raw = p.price || p.pixPrice || (p.cost ? p.cost * 1.3 : 0);
        if (typeof raw === 'number') return raw;
        if (typeof raw === 'string') {
            // Handle "1.200,00" or "1200.00"
            // If it has comma, assume BRL format (remove dots, replace comma with dot)
            if (raw.includes(',')) {
                return parseFloat(raw.replace(/\./g, '').replace(',', '.')) || 0;
            }
            return parseFloat(raw) || 0;
        }
        return 0;
    };

    // Timeline / Activity Flow
    const [recentSales, setRecentSales] = useState([]);
    const [pendingOrders, setPendingOrders] = useState([]);
    const [activitySearch, setActivitySearch] = useState('');
    const [lastFetchTime, setLastFetchTime] = useState(null);
    const [fetchError, setFetchError] = useState(null);

    const [isProcessingSale, setIsProcessingSale] = useState(false);
    const [showMobileSummary, setShowMobileSummary] = useState(false);

    // Post-Sale Modal
    const [lastSale, setLastSale] = useState(null);
    const [showPostSaleModal, setShowPostSaleModal] = useState(false);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);

    // Tech Lab / Trade-In Integration
    const [showLabModal, setShowLabModal] = useState(false);
    const [labEntryData, setLabEntryData] = useState({
        model: '', imei: '', value: '',
        checklist: {
            screen: false,
            battery: false,
            faceid: false,
            cameras: false,
            housing: false,
            buttons: false,
            wifi: false,
            sound: false
        },
        observations: ''
    });

    // Seller Selection (Admin Mode)
    const [teamMembers, setTeamMembers] = useState([]);
    const [selectedSellerId, setSelectedSellerId] = useState(user?.uid);
    const [editingSale, setEditingSale] = useState(null);
    const [selectedCostCenterId, setSelectedCostCenterId] = useState(null);

    // Quick Add Product State
    const [showQuickAddModal, setShowQuickAddModal] = useState(false);
    const [quickProductData, setQuickProductData] = useState({
        name: '', price: '', cost: '', category: 'Acessórios', imei: '', quantity: 1
    });

    const handleQuickAddSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const orgId = userProfile?.organizationId || user.uid;
            const price = parseFloat(quickProductData.price) || 0;
            const cost = parseFloat(quickProductData.cost) || 0;

            // 1. Add to Stock
            const newItemId = await StockService.addItem(orgId, user.uid, {
                ...quickProductData,
                price,
                cost,
                minStock: 1,
                condition: 'novo'
            });

            // 2. Add to Cart immediately
            const newItem = {
                id: newItemId,
                ...quickProductData,
                price,
                cost,
                sellingPrice: price, // Use the retail price
                quantity: 1,
                imageUrl: null
            };

            addToCart(newItem);
            // Refresh stock list silently so it appears in search next time
            StockService.getStock(orgId).then(s => setStock(s));

            showToast("Produto cadastrado e adicionado!", "success");
            setShowQuickAddModal(false);
            setQuickProductData({ name: '', price: '', cost: '', category: 'Acessórios', imei: '', quantity: 1 });
        } catch (error) {
            console.error(error);
            showToast("Erro ao cadastrar produto rápido.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (settings?.costCenters?.length > 0 && !selectedCostCenterId) {
            const firstActive = settings.costCenters.find(cc => cc.active);
            if (firstActive) setSelectedCostCenterId(firstActive.id);
        }
    }, [settings]);

    useEffect(() => {
        if (user?.uid && !selectedSellerId) setSelectedSellerId(user.uid);
    }, [user]);

    useEffect(() => {
        if (userProfile?.role === 'owner' || userProfile?.role === 'admin' || userProfile?.role === 'seller') {
            const orgId = userProfile.organizationId || user.uid;
            UserService.getTeam(orgId).then(t => setTeamMembers(t || []));
        }
    }, [userProfile, user]);

    // --- State Persistence (Prevent Data Loss) ---
    useEffect(() => {
        const saved = localStorage.getItem('precifique_pending_sale');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (data.cart?.length > 0 || data.selectedClient) {
                    setCart(data.cart || []);
                    setSelectedClient(data.selectedClient || null);
                    setStep(data.step || 1);
                    setView(data.view || 'list');
                    setDiscount(data.discount || 0);
                    setPaymentEntries(data.paymentEntries || []);
                }
            } catch (e) { console.error("Restore error:", e); }
        }
    }, []);

    useEffect(() => {
        // Synchronize state with localStorage to prevent data loss or navigation loops
        if (cart.length > 0 || selectedClient) {
            const data = { cart, selectedClient, step, view, discount, paymentEntries };
            localStorage.setItem('precifique_pending_sale', JSON.stringify(data));
        } else {
            // Truly empty state, we can clean up
            localStorage.removeItem('precifique_pending_sale');
        }
    }, [cart, selectedClient, step, view, discount, paymentEntries]);

    // Fetch wallet when client selected
    useEffect(() => {
        if (selectedClient && userProfile?.organizationId) {
            import('../../services/loyaltyService').then(({ LoyaltyService }) => {
                LoyaltyService.getWallet(selectedClient.id, userProfile.organizationId).then(w => {
                    setWalletBalance(w?.balance || 0);
                });
            });
        }
    }, [selectedClient, userProfile]);

    useEffect(() => {
        if (user) {
            console.log("DEBUG: useEffect triggered", { hasProfile: !!userProfile, orgId: userProfile?.organizationId });
            loadInitialData();
        }
    }, [user, userProfile?.organizationId]); // Depend specifically on the orgId

    // --- KEYBOARD SHORTCUTS ---
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Only active if in POS context
            if (e.key === 'F2') {
                e.preventDefault();
                setView('new-sale');
                setStep(1);
                // We rely on autoFocus attribute in inputs
            }
            if (e.key === 'F4') {
                e.preventDefault();
                if (view === 'new-sale' && selectedClient) {
                    setStep(2);
                } else if (view !== 'new-sale') {
                    setView('new-sale'); // Just go to sales mode
                }
            }
            if (e.key === 'F9') {
                e.preventDefault();
                if (view === 'new-sale' && cart.length > 0) {
                    if (step < 3) setStep(3);
                    else {
                        // If in payment, try to finalize? Or maybe just focus finalize button
                        const btn = document.getElementById('finalize-sale-btn');
                        if (btn && !btn.disabled) btn.click();
                    }
                }
            }
            if (e.key === 'Escape') {
                // Close modals if open
                if (showQuickAddModal) setShowQuickAddModal(false);
                else if (showLabModal) setShowLabModal(false);
                else if (showPostSaleModal) setShowPostSaleModal(false);
                else if (selectedSale) setSelectedSale(null);
                else if (view === 'new-sale' && step === 1) setView('list');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [view, step, selectedClient, cart, showQuickAddModal, showLabModal, showPostSaleModal, selectedSale]);

    const loadInitialData = async (silent = false) => {
        if (!silent) console.log("DEBUG: loadInitialData started");
        setIsLoading(true);
        try {
            const orgId = userProfile?.organizationId || user.uid;
            if (!silent) console.log("DEBUG: Fetching with orgId", orgId);

            // Listen for changes or just fetch
            const [c, s, sales] = await Promise.all([
                ClientService.getClients(orgId),
                StockService.getStock(orgId),
                SalesService.getSales(orgId)
            ]);

            // Fetch Pending Orders
            const { getDocs, query, collection, where, orderBy } = await import('firebase/firestore');
            const ordersQ = query(
                collection(db, 'orders'),
                where("organizationId", "==", orgId),
                where("status", "==", "pending"),
                orderBy("createdAt", "desc")
            );
            const ordersSnap = await getDocs(ordersQ);
            const orders = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            console.log("DEBUG: Initial Data Load SUCCESS", {
                orgId,
                userId: user.uid,
                clients: c.length,
                stock: s.length,
                sales: sales.length,
                pendingOrders: orders.length
            });

            // Diagnostic: check if there are sales for the other ID just in case
            if (sales.length === 0 && orgId !== user.uid) {
                console.log("DEBUG: 0 sales for orgId, checking for userId...");
                const fallbackSales = await SalesService.getSales(user.uid);
                if (fallbackSales.length > 0) {
                    console.log("DEBUG: Found sales for userId instead!", fallbackSales.length);
                    // If we found them for userId, maybe we should alert or show them?
                }
            }

            setClients(c);
            setStock(s);
            setRecentSales(sales); // Don't slice here to see everything in debug
            setPendingOrders(orders);
            setLastFetchTime(new Date());
            setFetchError(null);
        } catch (e) {
            console.error("DEBUG: Error loading initial data:", e);
            setFetchError(e.message);
            // Fallback for missing index on orders
            if (e.code === 'failed-precondition') {
                console.warn("DEBUG: Falling back to simple query for orders due to missing index");
                const orgId = userProfile?.organizationId || user.uid;
                const { getDocs, query, collection, where } = await import('firebase/firestore');
                const qSimple = query(collection(db, 'orders'), where("organizationId", "==", orgId), where("status", "==", "pending"));
                const snap = await getDocs(qSimple);
                setPendingOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                setLastFetchTime(new Date());
            }
        }
        setIsLoading(false);
    };



    const handleImportOrder = (order) => {
        console.log("DEBUG: Importing Order", order);
        if (!confirm(`Deseja importar o pedido de ${order.customer?.name || 'Cliente'}?`)) return;

        // Setup client
        if (order.customer) {
            const existingClient = clients.find(c => c.cpf === order.customer.cpf || c.phone === order.customer.phone);
            if (existingClient) {
                setSelectedClient(existingClient);
            } else {
                setSelectedClient({ ...order.customer, id: 'temp_order_client' });
            }
        }

        // Setup Cart
        const cartItems = order.items.map(item => {
            // Try to find matching stock item
            const stockItem = stock.find(s => s.id === item.id);
            return {
                ...(stockItem || item),
                quantity: item.quantity || 1,
                sellingPrice: item.price || item.sellingPrice
            };
        });
        setCart(cartItems);

        // Setup Logic
        setStep(3); // Go straight to payment
        setView('new-sale');
        showToast("Pedido importado com sucesso!", "success");
    };

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.cpf?.includes(clientSearch) ||
        c.phone?.includes(clientSearch)
    );

    // Product Logic
    const addToCart = (product) => {
        setCart(prev => {
            const exists = prev.find(p => p.id === product.id);
            if (exists) {
                if (exists.quantity >= product.quantity) {
                    showToast("Estoque insuficiente", "error");
                    return prev;
                }
                return prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p);
            }
            return [...prev, { ...product, quantity: 1, sellingPrice: parsePrice(product) }];
        });
    };

    const removeFromCart = (id) => setCart(prev => prev.filter(p => p.id !== id));

    const cartTotal = cart.reduce((acc, item) => acc + (item.sellingPrice * item.quantity), 0);
    const paidTotal = paymentEntries.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);
    // Logic Update: If paidTotal > (cartTotal - discount), the excess is INTEREST/SURCHARGE.
    // So the 'remainingBalance' should only be positive if paidTotal < (cartTotal - discount).
    // If paidTotal is higher, remaining is 0.
    const effectiveTotal = Math.max(cartTotal - discount, paidTotal);
    const remainingBalance = Math.max(0, (cartTotal - discount) - paidTotal);
    const surcharge = Math.max(0, paidTotal - (cartTotal - discount));

    // Checkout Logic
    const handleFinishSale = async () => {
        console.log("DEBUG: handleFinishSale triggered");
        console.log("DEBUG: selectedClient", selectedClient);
        console.log("DEBUG: cart", cart);
        console.log("DEBUG: paymentEntries", paymentEntries);
        console.log("DEBUG: remainingBalance", remainingBalance);

        if (!selectedClient || cart.length === 0) {
            console.error("DEBUG: Client or Cart missing", { selectedClient, cart });
            return;
        }
        if (remainingBalance > 1) {
            console.warn("DEBUG: Payment incomplete", remainingBalance);
            showToast(`Ainda falta ${formatCurrency(remainingBalance)} para completar o pagamento.`, "warning");
            return;
        }
        setIsProcessingSale(true);
        try {
            const subtotal = cart.reduce((acc, p) => acc + (p.sellingPrice * p.quantity), 0);
            // If the user paid MORE than (subtotal - discount), we consider that the 'Total' of the sale increased (Surcharge/Interest)
            // effectiveTotal was calculated above as Math.max(subtotal - discount, paidTotal)
            const total = effectiveTotal;

            const sellerObj = selectedSellerId === user.uid
                ? { name: userProfile?.name || user.email?.split('@')[0] || 'Vendedor', id: user.uid }
                : teamMembers.find(m => m.id === selectedSellerId) || { name: 'Vendedor', id: selectedSellerId };

            const saleData = {
                client: {
                    id: selectedClient.id || null, // Ensure NO undefined
                    name: selectedClient.name || 'Consumidor Final',
                    phone: selectedClient.phone || '',
                    cpf: selectedClient.cpf || '',
                    cep: selectedClient.cep || '',
                    street: selectedClient.street || '',
                    number: selectedClient.number || '',
                    neighborhood: selectedClient.neighborhood || '',
                    city: selectedClient.city || '',
                    state: selectedClient.state || '',
                    address: selectedClient.address || '',
                    instagram: selectedClient.instagram || ''
                },
                code: generateReferenceCode('SALE'),
                items: cart.map(i => ({
                    id: i.id,
                    name: i.name,
                    quantity: i.quantity,
                    price: i.sellingPrice,
                    cost: i.cost || 0,
                    category: i.category || 'iPhone',
                    imei: i.imei || null,
                    batteryHealth: i.batteryHealth || null,
                    variant: {
                        color: i.color || i.variant?.color || 'N/A',
                        storage: i.storage || i.variant?.storage || 'N/A',
                        condition: i.condition || i.variant?.condition || 'lacrado'
                    }
                })),
                total: total,
                subtotal: subtotal,
                discount: discount,
                surcharge: surcharge, // Save this metric for transparency
                paymentEntries: paymentEntries.map(p => ({
                    method: p.method,
                    amount: p.amount,
                    installments: p.installments || 1,
                    details: p.details || {}
                })),
                paymentMethod: paymentEntries.length > 1 ? 'misto' : (paymentEntries[0]?.method || 'pix'),
                status: 'completed',
                origin: 'smart_sale',
                costCenterId: selectedCostCenterId || null,
                costCenterName: settings?.costCenters?.find(cc => cc.id === selectedCostCenterId)?.name || null,
                sellerName: sellerObj.name,
                sellerId: sellerObj.id,
                userName: sellerObj.name, // Added for dashboard consistency
                settings: settings // Pass for fee calculation
            };

            console.log("DEBUG: Prepared saleData", saleData);

            // 1. Create Sale (Handles stock and everything)
            const orgId = userProfile?.organizationId || user.uid;

            // CRITICAL VALIDATION: If user is staff/admin but organizationId is missing, ABORT to prevent "Permission Denied" (wrong org context)
            if (userProfile?.role !== 'owner' && userProfile?.role !== 'user' && !userProfile?.organizationId) {
                console.error("DEBUG: CRITICAL - Staff member missing organizationId. Aborting sale to prevent 403.");
                showToast("Erro crítico: Identificação da Loja não encontrada no seu perfil. Relogue e tente novamente.", "error");
                setIsProcessingSale(false);
                return;
            }

            console.log("DEBUG: Calling SalesService.createSale", {
                uid: user.uid,
                orgId: orgId,
                userRole: userProfile?.role,
                profileOrgId: userProfile?.organizationId
            });
            // Pass orgId as the context ID for writes
            const result = await SalesService.createSale(user.uid, orgId, saleData);
            console.log("DEBUG: SalesService.createSale SUCCESS", result); // Added Result Log

            // 2. Process Loyalty Reward (Cashback)
            if (settings?.loyalty?.enabled) {
                console.log("DEBUG: Processing Loyalty Reward");
                try {
                    const { LoyaltyService } = await import('../../services/loyaltyService');
                    await LoyaltyService.processSaleReward(saleData, settings.loyalty);
                    console.log("DEBUG: Loyalty Reward SUCCESS");
                } catch (loyaltyError) {
                    console.error("DEBUG: Loyalty processing failed but sale was created:", loyaltyError);
                }
            }

            showToast("Venda realizada com sucesso!", "success");
            // Set for Post-Sale Actions Modal
            setLastSale({ id: saleData.id || result?.id, ...saleData, createdAt: new Date() });
            setShowPostSaleModal(true);

            setView('list');
            resetForm();
            localStorage.removeItem('precifique_pending_sale');
            // Reload initial data to refresh recent sales
            loadInitialData();
        } catch (e) {
            console.error("DEBUG: ERROR in handleFinishSale", e);
            if (e.code === 'permission-denied' || e.message?.includes('permission-denied') || e.message?.includes('Missing or insufficient permissions')) {
                showToast("Erro de permissão/acesso. Por favor, atualize a página (recusar cache) e tente novamente. Se persistir, contate o suporte.", "error");
            } else {
                showToast(`Erro ao finalizar venda: ${e.message}`, "error");
            }
        } finally { setIsProcessingSale(false); }
    };

    const handleCancelOrder = async (orderId) => {
        if (!confirm("Deseja cancelar este pedido da vitrine? O estoque será devolvido.")) return;
        setIsLoading(true);
        try {
            const { runTransaction, doc, serverTimestamp } = await import('firebase/firestore');
            const order = pendingOrders.find(o => o.id === orderId);
            if (!order) return;

            await runTransaction(db, async (transaction) => {
                for (const item of order.items) {
                    if (item.id) {
                        const stockRef = doc(db, 'stock', item.id);
                        const stockSnap = await transaction.get(stockRef);
                        if (stockSnap.exists()) {
                            transaction.update(stockRef, { quantity: (stockSnap.data().quantity || 0) + (item.quantity || 1) });
                        }
                    }
                }
                transaction.update(doc(db, 'orders', orderId), { status: 'cancelled', updatedAt: serverTimestamp() });
            });
            showToast("Pedido da vitrine cancelado!", "info");
            loadInitialData();
        } catch (e) {
            console.error(e);
            showToast("Erro ao cancelar pedido", "error");
        } finally { setIsLoading(false); }
    };

    const handleCancelSale = async (saleId) => {
        if (!saleId) {
            showToast("ID da venda não encontrado", "error");
            return;
        }

        if (!confirm("Tem certeza que deseja CANCELAR esta venda? O estoque será devolvido e o registro excluído.")) return;

        setIsLoading(true);
        try {
            const orgId = userProfile?.organizationId || user.uid;
            if (!orgId) {
                throw new Error("ID da organização não encontrado");
            }
            await SalesService.cancelSale(saleId, orgId);
            showToast("Venda cancelada e estoque devolvido!", "success");
            setSelectedSale(null);
            loadInitialData();
        } catch (e) {
            console.error("Erro ao cancelar venda:", e);
            const errorMessage = e.message || "Erro desconhecido ao cancelar venda";
            showToast(`Erro ao cancelar venda: ${errorMessage}`, "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrintThermal = async (sale) => {
        try {
            const { PrintingService } = await import('../../services/printingService');
            // Ensure we have paymentEntries for the thermal service
            const saleAdapter = {
                ...sale,
                paymentEntries: sale.paymentEntries || [{
                    method: sale.paymentMethod || 'pix',
                    amount: sale.total,
                    installments: sale.installments || 1
                }]
            };
            PrintingService.printThermalReceipt(saleAdapter, settings);
        } catch (err) {
            console.error(err);
            showToast("Erro ao imprimir cupom térmico.", "error");
        }
    };

    const handlePrintLabel = (sale) => {
        const printWindow = window.open('', '', 'width=400,height=600');
        if (!printWindow) return;
        const company = settings?.company || {};
        const customer = sale.client || {};
        const content = `
            <html><head><style>
                body { font-family: sans-serif; padding: 20px; text-align: center; }
                .label-box { border: 2px solid #000; padding: 15px; border-radius: 10px; }
            </style></head><body>
                <div class="label-box">
                    <div style="font-weight:900;font-size:18px;">${company.name || 'VENDA'}</div>
                    <div style="font-size:32px;font-weight:900;margin:20px 0;border:3px solid #000;display:inline-block;padding:5px 20px;">${sale.code || sale.id?.slice(-6).toUpperCase()}</div>
                    <div style="text-align:left;margin-top:20px;font-size:14px;">
                        <strong>CLIENTE:</strong> ${customer.name || 'CONS. FINAL'}<br>
                        <strong>DATA:</strong> ${new Date(sale.createdAt?.seconds * 1000 || sale.createdAt).toLocaleDateString()}<br>
                        <strong>TOTAL:</strong> ${formatCurrency(sale.total)}
                    </div>
                </div>
                <script>window.onload = () => { window.print(); window.close(); }</script>
            </body></html>
        `;
        printWindow.document.write(content);
        printWindow.document.close();
    };

    const handleUpdateSale = async () => {
        if (!editingSale) return;
        try {
            const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
            const saleRef = doc(db, 'sales', editingSale.id);
            await updateDoc(saleRef, {
                sellerId: editingSale.sellerId,
                sellerName: editingSale.sellerName,
                createdAt: editingSale.createdAt,
                paymentMethod: editingSale.paymentMethod,
                updatedAt: serverTimestamp()
            });
            showToast("Venda atualizada!", "success");
            setEditingSale(null);
            setSelectedSale(null);
            loadInitialData();
        } catch (e) {
            showToast("Erro ao atualizar.", "error");
        }
    };

    const handlePrintReceipt = (sale) => {
        const printWindow = window.open('', '', 'width=900,height=1000');
        if (!printWindow) return;

        const company = settings?.company || {};
        // Fallback strategies for Company Info
        const logoUrl = company.logoUrl || userProfile?.logoUrl || userProfile?.photoURL;
        const companyName = company.name || userProfile?.companyName || userProfile?.name || 'SUA LOJA';
        const companyCnpj = company.cnpj || userProfile?.cnpj || '00.000.000/0000-00';
        const companyAddress = company.address || userProfile?.address || 'Endereço não informado';

        const customer = sale.client || {};
        // Construct detailed address
        const customerAddressFull = customer.address
            ? `${customer.address}${customer.number ? `, ${customer.number}` : ''}${customer.neighborhood ? ` - ${customer.neighborhood}` : ''}`
            : '---';

        const itemsRows = sale.items.map((i, idx) => {
            // Robustly find variant details
            const storage = i.storage || i.variant?.storage || '';
            const color = i.color || i.variant?.color || '';
            const condition = (i.condition || i.variant?.condition || '').toUpperCase();
            const battery = i.batteryHealth || i.variant?.batteryHealth;
            const imei = i.imei || i.variant?.imei || i.serial;

            return `
            <tr>
                <td style="text-align:center;">${idx + 1}</td>
                <td style="text-align:left;">
                    <strong style="display:block; font-size:12px;">${i.name}</strong>
                    <span style="font-size:10px; color:#64748b;">
                        ${storage} ${storage && color ? '•' : ''} ${color} ${condition ? `• ${condition}` : ''}
                        ${battery ? ` • Bat: ${battery}%` : ''}
                    </span>
                    ${imei ? `<br/><span style="font-size:9px; color:#334155; font-family:monospace; font-weight:600;">IMEI/SN: ${imei}</span>` : ''}
                </td>
                <td style="text-align:center;">${i.quantity || 1}</td>
                <td style="text-align:right;">${formatCurrency(i.price)}</td>
                <td style="text-align:right;">${formatCurrency(i.price * (i.quantity || 1))}</td>
            </tr>
        `}).join('');

        const paymentEntriesSafe = sale.paymentEntries && sale.paymentEntries.length > 0
            ? sale.paymentEntries
            : (sale.paymentMethod ? [{ method: sale.paymentMethod, amount: sale.total, installments: 1 }] : []);

        const paymentsRows = paymentEntriesSafe.map(p => {
            const isCredit = p.method === 'credit' || p.method === 'credit_card';
            const installmentText = (isCredit && p.installments > 1)
                ? `<div style="font-size:9px; color:#64748b;">${p.installments}x de ${formatCurrency(p.amount / p.installments)}</div>`
                : '';

            const methodName = p.method === 'pix' ? 'PIX'
                : p.method === 'credit' ? 'CRÉDITO'
                    : p.method === 'debit' ? 'DÉBITO'
                        : p.method === 'cash' ? 'DINHEIRO'
                            : p.method === 'trade_in' ? 'TROCA'
                                : (p.method || 'OUTROS').toUpperCase();

            return `
            <tr>
                <td style="text-align:left;">
                    <span style="font-weight:600;">${methodName}</span>
                    ${installmentText}
                </td>
                <td style="text-align:center;">${p.installments || 1}x</td>
                <td style="text-align:right;">${formatCurrency(p.amount)}</td>
                <td style="text-align:left; font-size:9px; color:#64748b;">${p.details?.model ? `Troca: ${p.details.model}` : '-'}</td>
            </tr>
        `}).join('');

        const content = `
            <html><head><style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
                body { font-family: 'Inter', sans-serif; padding: 20px; color: #1e293b; background: #fff; }
                .main-container { max-width: 800px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 30px; border-radius: 8px; }
                
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th { background: #f8fafc; color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; padding: 12px 10px; border: 1px solid #e2e8f0; }
                td { padding: 10px; border: 1px solid #e2e8f0; font-size: 11px; vertical-align: middle; }
                
                .header-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 20px; }
                .logo-container { display: flex; align-items: center; gap: 15px; }
                .logo-img { max-height: 80px; max-width: 150px; object-fit: contain; }
                
                .section-title { background: #f1f5f9; padding: 8px 12px; font-weight: 800; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #475569; margin-top: 20px; border-radius: 4px; }
                
                .data-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: #e2e8f0; border: 1px solid #e2e8f0; margin-top: 10px; border-radius: 4px; overflow: hidden; }
                .data-item { background: #fff; padding: 10px; }
                .data-item label { display: block; font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 2px; }
                .data-item span { font-size: 11px; font-weight: 600; color: #334155; }
                
                .total-section { margin-top: 20px; display: flex; justify-content: flex-end; }
                .total-card { background: #1e293b; color: #fff; padding: 20px; border-radius: 12px; min-width: 250px; text-align: right; }
                .total-card p { margin: 0; font-size: 10px; opacity: 0.7; text-transform: uppercase; font-weight: 800; }
                .total-card h2 { margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -1px; }

                .legal-section { margin-top: 40px; padding: 20px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
                .legal-section h4 { margin: 0 0 10px 0; font-size: 12px; font-weight: 800; text-transform: uppercase; text-align: center; }
                .legal-content { font-size: 9px; line-height: 1.6; color: #475569; text-align: justify; }
                .legal-clause { margin-bottom: 8px; }

                .signature-section { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
                .sig-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 40px 20px 15px 20px; text-align: center; }
                .sig-line { border-top: 1px solid #cbd5e1; margin-bottom: 5px; }
                .sig-label { font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; }
            </style></head><body>
                <div class="main-container">
                    <div class="header-grid">
                        <div class="logo-container">
                            ${logoUrl ? `<img src="${logoUrl}" class="logo-img">` : `<div style="width:60px; height:60px; background:#4f46e5; border-radius:12px; display:flex; align-items:center; justify-content:center; color:white; font-weight:900;">LOJA</div>`}
                            <div>
                                <h1 style="margin:0; font-size:18px; font-weight:800; color:#1e293b;">${companyName}</h1>
                                <p style="margin:0; font-size:10px; color:#64748b;">CNPJ: ${companyCnpj}</p>
                                <p style="margin:0; font-size:10px; color:#64748b;">${companyAddress}</p>
                            </div>
                        </div>
                        <div style="text-align: right">
                            <h2 style="margin:0; color:#4f46e5; font-size:24px; font-weight:800;">PEDIDO #${sale.code || '0000'}</h2>
                            <p style="margin:2px 0; font-size:11px; font-weight:600;">Data: ${new Date(sale.createdAt?.seconds * 1000 || sale.createdAt).toLocaleDateString()} ${new Date(sale.createdAt?.seconds * 1000 || sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            <p style="margin:0; font-size:10px; color:#64748b; font-weight:600; text-transform:uppercase;">Vendedor: ${sale.sellerName || 'Loja'}</p>
                        </div>
                    </div>

                    <div class="section-title">Dados do Cliente</div>
                    <div class="data-grid">
                        <div class="data-item" style="grid-column: span 2;"><label>Cliente</label><span>${customer.name || 'Consumidor Final'}</span></div>
                        <div class="data-item" style="grid-column: span 1;"><label>CPF/CNPJ</label><span>${customer.cpf || '---'}</span></div>
                        <div class="data-item" style="grid-column: span 1;"><label>Telefone</label><span>${customer.phone || '---'}</span></div>
                        <div class="data-item" style="grid-column: span 3;"><label>Endereço</label><span>${customerAddressFull}</span></div>
                        <div class="data-item" style="grid-column: span 1;"><label>Cidade/UF</label><span>${customer.city || '--'} / ${customer.state || '--'}</span></div>
                    </div>

                    <div class="section-title">Produtos / Serviços</div>
                    <table>
                        <thead>
                            <tr>
                                <th style="width:30px;">#</th>
                                <th>Descrição do Produto / SKU</th>
                                <th style="width:40px;">Qtd</th>
                                <th style="width:100px;">Unitário</th>
                                <th style="width:100px;">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>${itemsRows}</tbody>
                    </table>

                    <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 20px; align-items: start;">
                        <div>
                            <div class="section-title">Informações de Pagamento</div>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Forma</th>
                                        <th style="width:50px;">Parc.</th>
                                        <th style="width:90px;">Valor</th>
                                        <th>Observação</th>
                                    </tr>
                                </thead>
                                <tbody>${paymentsRows}</tbody>
                            </table>
                        </div>
                        <div class="total-section">
                            <div class="total-card">
                                <p>Valor Total do Pedido</p>
                                <h2>${formatCurrency(sale.total)}</h2>
                            </div>
                        </div>
                    </div>

                    <div class="legal-section">
                        <h4>Termos de Garantia e Condições de Venda</h4>
                        <div class="legal-content">
                            <div class="legal-clause"><strong>1. OBJETO E PRAZO:</strong> O comprador declara estar adquirindo o item acima descrito em plena condição de uso e funcionamento. A garantia para defeitos técnicos é de <strong>90 (noventa) dias</strong> a partir desta data, conforme ART. 26 do CDC.</div>
                            <div class="legal-clause"><strong>2. EXCLUSÕES CRÍTICAS:</strong> A garantia será anulada em caso de: (A) Danos físicos, quedas, telas quebradas ou riscos no display; (B) Contato com umidade ou oxidação (mesmo em aparelhos resistentes à água); (C) Violação dos selos de garantia da loja; (D) Uso de carregadores falsificados ou picos de energia; (E) Software modificado (jailbreak/root).</div>
                            <div class="legal-clause"><strong>3. BATERIA E VEDAÇÃO:</strong> Para seminovos, a garantia não cobre desgaste natural de bateria se a saúde estiver acima de 80%. Aparelhos abertos para manutenção perdem a vedação original de fábrica contra líquidos.</div>
                            <div class="legal-clause"><strong>4. PROCEDIMENTO:</strong> Para assistência, é obrigatória a apresentação deste recibo. O prazo legal para reparo é de até 30 dias. Não realizamos trocas por arrependimento de cor/modelo após a saída da loja.</div>
                        </div>
                    </div>

                    <div class="signature-section">
                        <div class="sig-box">
                            <div class="sig-line"></div>
                            <div class="sig-label">${companyName}</div>
                        </div>
                        <div class="sig-box">
                            <div class="sig-line"></div>
                            <div class="sig-label">Assinatura do Cliente: ${customer.name || ''}</div>
                        </div>
                    </div>
                    
                    <div style="text-align:center; margin-top:20px; font-size:8px; color:94a3b8; font-weight:800; text-transform:uppercase; letter-spacing:0.2em;">
                        Documento gerado por Precifique Pro - Gestão Inteligente
                    </div>
                </div>
                <script>window.onload = () => { window.print(); }</script>
            </body></html>
        `;
        printWindow.document.write(content);
        printWindow.document.close();
    };

    const handlePrintWarranty = (sale) => {
        const printWindow = window.open('', '', 'width=800,height=900');
        if (!printWindow) return;
        printWindow.document.write(`
            <html>
                <head><title>Termo de Garantia</title></head>
                <body style="font-family: sans-serif; padding: 50px;">
                    <h1 style="text-align: center">TERMO DE GARANTIA</h1>
                    <p>Pelo presente instrumento, a loja garante o funcionamento do(s) produto(s) abaixo descrito(s) pelo prazo de 90 dias.</p>
                    <div style="background: #f8fafc; padding: 20px; border-radius: 10px; margin: 20px 0;">
                        <strong>Produto:</strong> ${sale.items.map(i => i.name).join(', ')}<br>
                        <strong>Cliente:</strong> ${sale.client?.name}<br>
                        <strong>Data:</strong> ${new Date(sale.createdAt).toLocaleDateString()}
                    </div>
                    <h3>CONDIÇÕES:</h3>
                    <p>1. A garantia cobre exclusivamente defeitos técnicos de fabricação.</p>
                    <p>2. A garantia NÃO cobre: danos físicos, contato com água, quebra de visor, ou tentativa de reparo por terceiros.</p>
                    <script>window.onload = () => { window.print(); window.close(); }</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const resetForm = () => {
        setStep(1);
        if (step === 1) {
            setClientSearch('');
        }
        setCart([]);
        setSelectedClient(null);
        setDiscount(0);
        setPaymentEntries([]);
        localStorage.removeItem('precifique_pending_sale');
    };

    const handleLabEntrySubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const orgId = userProfile?.organizationId || user.uid;
            const checklistSummary = Object.entries(labEntryData.checklist)
                .filter(([_, val]) => val)
                .map(([key, _]) => key.toUpperCase())
                .join(', ');

            await addDoc(collection(db, 'technical_lab'), {
                ...labEntryData,
                origin: 'trade_in',
                status: 'triagem',
                expectedCost: 0,
                ownerName: selectedClient?.name || 'Cliente Venda',
                ownerPhone: selectedClient?.phone || '',
                organizationId: orgId,
                createdAt: new Date(),
                updatedAt: new Date(),
                history: [{ status: 'triagem', date: new Date(), note: `Entrada via Checkout. Checklist: ${checklistSummary}. Obs: ${labEntryData.observations}` }]
            });

            // Add as a payment entry
            const val = parseFloat(labEntryData.value) || 0;
            setPaymentEntries(prev => [
                ...prev,
                { id: Date.now(), method: 'trade_in', amount: val, details: { model: labEntryData.model, imei: labEntryData.imei } }
            ]);

            setShowLabModal(false);
            showToast("Aparelho enviado para o Lab e valor aplicado!", "success");
        } catch (e) {
            console.error(e);
            showToast("Erro ao registrar no Lab", "error");
        } finally {
            setIsLoading(false);
        }
    };

    // --- CHECKOUT SIDEBAR (SPLIT VIEW RIGHT PANEL) ---
    const CheckoutSidebar = () => (
        <div className="flex flex-col h-full relative">
            {/* 1. Client Header (Compact) */}
            {selectedClient && (
                <div className="bg-white dark:bg-slate-900/40 p-4 rounded-[1.5rem] border border-slate-100 dark:border-white/5 mb-4 flex items-center gap-3 shadow-sm dark:shadow-slate-900/50 group/client hover:border-indigo-200 transition-all shrink-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-indigo-200 dark:shadow-none shrink-0 group-hover/client:scale-110 transition-transform">
                        {selectedClient.name[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="font-extrabold text-slate-800 dark:text-white text-sm leading-tight truncate">{selectedClient.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded uppercase tracking-widest border border-indigo-100 dark:border-indigo-500/20">
                                {selectedClient.id === 'consumer_default' ? 'Rápido' : 'VIP'}
                            </span>
                            {walletBalance > 0 && (
                                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase tracking-widest border border-emerald-100 italic flex items-center gap-1">
                                    <Wallet className="w-3 h-3" /> {formatCurrency(walletBalance)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 2. Main Scroll Area: Cart & Payments */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-1 space-y-6 pb-20">

                {/* A. Totals Display */}
                <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-[2rem] border border-slate-100 dark:border-white/5 relative overflow-hidden shadow-inner">
                    <div className="flex justify-between items-end mb-2 relative z-10">
                        <div>
                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">Total a Pagar</p>
                            <p className={cn("text-3xl font-black tracking-tighter transition-colors",
                                remainingBalance <= 0.01 ? "text-emerald-500" : "text-slate-900 dark:text-white"
                            )}>
                                {formatCurrency(remainingBalance)}
                            </p>
                        </div>
                    </div>

                    {/* Breakdown (Discount/Surcharge) */}
                    {(discount > 0 || surcharge > 0) && (
                        <div className="flex gap-4 mt-2 pt-2 border-t border-slate-200 dark:border-white/10 relative z-10">
                            {discount > 0 && (
                                <div>
                                    <p className="text-[9px] font-black uppercase text-red-400 tracking-wider">Desconto</p>
                                    <p className="text-xs font-black text-red-500">-{formatCurrency(discount)}</p>
                                </div>
                            )}
                            {surcharge > 0 && (
                                <div>
                                    <p className="text-[9px] font-black uppercase text-blue-400 tracking-wider">Juros</p>
                                    <p className="text-xs font-black text-blue-600">+{formatCurrency(surcharge)}</p>
                                </div>
                            )}
                            <div className="ml-auto text-right">
                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Subtotal</p>
                                <p className="text-xs font-bold text-slate-500 line-through">{formatCurrency(cartTotal)}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* B. Payment Methods Grid - Simplified for Sidebar */}
                {cart.length > 0 && remainingBalance > 0.01 && (
                    <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-bottom-2 fade-in">
                        {[
                            { id: 'pix', label: 'Dinheiro/Pix', icon: Banknote, color: 'emerald', action: () => setPaymentEntries(prev => [...prev, { id: Date.now(), method: 'pix', amount: remainingBalance }]) },
                            { id: 'credit', label: 'Cartão', icon: CreditCard, color: 'indigo', action: () => setPaymentEntries(prev => [...prev, { id: Date.now(), method: 'credit', amount: remainingBalance, originalAmount: remainingBalance, installments: 1, passFees: true }]) },
                            { id: 'trade-in', label: 'Trade-In', icon: Smartphone, color: 'blue', action: () => { setLabEntryData({ ...labEntryData, value: remainingBalance }); setShowLabModal(true); } },
                            { id: 'fiado', label: 'Prazo', icon: History, color: 'amber', action: () => setPaymentEntries(prev => [...prev, { id: Date.now(), method: 'fiado', amount: remainingBalance, dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }]) },
                        ].map((btn) => (
                            <button
                                key={btn.id}
                                onClick={btn.action}
                                className={cn(
                                    "flex flex-col items-center justify-center p-3 rounded-xl border transition-all active:scale-95 hover:shadow-lg",
                                    btn.id === 'pix' ? "bg-emerald-50 border-emerald-100 hover:bg-emerald-100/50 text-emerald-700" :
                                        btn.id === 'credit' ? "bg-indigo-50 border-indigo-100 hover:bg-indigo-100/50 text-indigo-700" :
                                            btn.id === 'trade-in' ? "bg-blue-50 border-blue-100 hover:bg-blue-100/50 text-blue-700" :
                                                "bg-amber-50 border-amber-100 hover:bg-amber-100/50 text-amber-700"
                                )}
                            >
                                <btn.icon className="w-5 h-5 mb-1" />
                                <span className="text-[9px] font-black uppercase tracking-wider">{btn.label}</span>
                            </button>
                        ))}
                        <button
                            onClick={() => { const val = prompt('Valor do desconto:'); if (val) setDiscount(prev => prev + parseFloat(val)); }}
                            className="col-span-2 flex items-center justify-center gap-2 p-2 rounded-xl bg-red-50 border border-red-100 text-red-600 hover:bg-red-100 transition-colors uppercase text-[10px] font-black tracking-widest"
                        >
                            <TicketPercent className="w-4 h-4" /> Adicionar Desconto
                        </button>
                    </div>
                )}

                {/* C. Payment Entries List */}
                {paymentEntries.length > 0 && (
                    <div className="space-y-2 animate-in slide-in-from-bottom-2 fade-in">
                        <div className="flex items-center gap-2 px-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Recebimentos ({paymentEntries.length})</span>
                            <div className="h-px flex-1 bg-slate-100 dark:bg-white/10" />
                        </div>
                        {paymentEntries.map((entry, idx) => (
                            <div key={entry.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/10 p-3 rounded-xl shadow-sm flex flex-col gap-2 group relative overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div className={cn("p-1.5 rounded-lg",
                                            entry.method === 'pix' ? "bg-emerald-100 text-emerald-600" :
                                                entry.method === 'credit' ? "bg-indigo-100 text-indigo-600" :
                                                    entry.method === 'trade-in' ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600"
                                        )}>
                                            {entry.method === 'pix' ? <Banknote className="w-3.5 h-3.5" /> :
                                                entry.method === 'credit' ? <CreditCard className="w-3.5 h-3.5" /> :
                                                    entry.method === 'trade-in' ? <Smartphone className="w-3.5 h-3.5" /> : <History className="w-3.5 h-3.5" />}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-200">{entry.method === 'pix' ? 'Dinheiro/Pix' : entry.method === 'credit' ? 'Cartão' : entry.method === 'fiado' ? 'Prazo' : 'Trade-In'}</span>
                                            {entry.method === 'credit' && (
                                                <select
                                                    className="text-[9px] bg-slate-50 dark:bg-slate-800 border-none outline-none rounded p-0 text-slate-500 cursor-pointer w-auto mt-0.5"
                                                    value={entry.installments || 1}
                                                    onChange={(e) => {
                                                        const newEntries = [...paymentEntries];
                                                        newEntries[idx].installments = parseInt(e.target.value);
                                                        // Simplified Installment Logic for Sidebar (Basic Recalc)
                                                        setPaymentEntries(newEntries);
                                                    }}
                                                >
                                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => <option key={i} value={i}>{i}x</option>)}
                                                </select>
                                            )}
                                        </div>
                                    </div>
                                    <input
                                        type="number"
                                        className="w-20 text-right bg-transparent font-black text-sm outline-none border-b border-transparent hover:border-slate-300 focus:border-indigo-500 transition-all text-slate-900 dark:text-white"
                                        value={entry.amount}
                                        onChange={(e) => {
                                            const newEntries = [...paymentEntries];
                                            newEntries[idx].amount = parseFloat(e.target.value) || 0;
                                            setPaymentEntries(newEntries);
                                        }}
                                    />
                                    <button onClick={() => setPaymentEntries(prev => prev.filter(p => p.id !== entry.id))} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors ml-1">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* D. Cart Items List */}
                <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 px-1">
                        <ShoppingCart className="w-3 h-3 text-slate-400" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Carrinho ({cart.length})</span>
                    </div>

                    {cart.length === 0 ? (
                        <div className="py-10 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Vazio</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className="flex gap-3 items-start group relative p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors">
                                <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 flex items-center justify-center shrink-0">
                                    {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-contain p-1" /> : <Smartphone className="w-4 h-4 text-slate-300" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-slate-800 dark:text-white text-xs leading-tight mb-1 truncate">{item.name}</p>
                                    <div className="flex justify-between items-center">
                                        <div className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-500">{item.quantity}x</div>
                                        <p className="font-bold text-slate-900 dark:text-white text-xs">{formatCurrency(item.sellingPrice * item.quantity)}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeFromCart(item.id)}
                                    className="absolute top-1 right-1 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-900 shadow-sm rounded-md"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <div className="h-20" /> {/* Spacer */}
            </div>

            {/* 3. Sticky Footer Actions */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-100 dark:border-white/5 z-20 rounded-b-[2rem]">
                <button
                    id="finalize-sale-btn"
                    onClick={handleFinishSale}
                    disabled={remainingBalance > 1 || isProcessingSale || cart.length === 0}
                    className={cn(
                        "w-full py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl hover:shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-2 group relative overflow-hidden",
                        remainingBalance <= 1 && cart.length > 0
                            ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-200 dark:shadow-emerald-900/20"
                            : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                    )}
                >
                    {isProcessingSale ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                        <>
                            <span>{remainingBalance <= 1 ? 'Finalizar Venda' : (cart.length === 0 ? 'Adicione Produtos' : 'Complete o Pgto')}</span>
                            {remainingBalance <= 1 && <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                        </>
                    )}
                </button>
            </div>

            {/* Client Form Modal (Kept for creating clients) */}
            <ClientFormModal
                open={isCreatingClient}
                onClose={() => setIsCreatingClient(false)}
                onSaved={(client) => {
                    setClients(prev => [...prev, client]);
                    setSelectedClient(client);
                    setStep(2);
                }}
                user={user}
                userProfile={userProfile}
            />
        </div>
    );

    return (
        <div className="h-full relative font-sans bg-slate-50 dark:bg-slate-950">
            {view === 'list' ? (
                <div className="h-full flex flex-col p-4 md:p-6 space-y-6 animate-in fade-in overflow-y-auto custom-scrollbar">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gradient-to-br from-violet-700 via-indigo-600 to-blue-600 p-8 rounded-[2rem] text-white shadow-2xl dark:shadow-slate-900/50 shadow-indigo-200/50 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-white dark:bg-slate-900/20 transition-all duration-700" />
                        <div>
                            <h2 className="text-3xl font-black tracking-tighter relative z-10 flex items-center gap-3">
                                Pedidos de Venda
                                <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-900/20 rounded-full text-[9px] font-bold uppercase tracking-widest border border-white/10 opacity-80">
                                    <span className="bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 px-1 rounded-sm">F2</span> CLIE
                                    <span className="w-px h-3 bg-white dark:bg-slate-900/30 mx-1" />
                                    <span className="bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 px-1 rounded-sm">F4</span> PROD
                                    <span className="w-px h-3 bg-white dark:bg-slate-900/30 mx-1" />
                                    <span className="bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 px-1 rounded-sm">F9</span> PAGAR
                                </span>
                            </h2>
                            <p className="text-indigo-100 font-medium relative z-10 text-sm md:text-base opacity-90">Gestão profissional de vendas e estoque.</p>
                        </div>
                        <button
                            onClick={() => setView('new-sale')}
                            className="px-8 py-4 bg-white dark:bg-slate-900 text-indigo-600 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl dark:shadow-slate-900/50 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 relative z-10 group/btn"
                        >
                            <div className="bg-indigo-50 p-1.5 rounded-lg group-hover/btn:bg-indigo-100 transition-colors">
                                <Plus className="w-5 h-5" />
                            </div>
                            Nova Venda
                        </button>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] shadow-xl dark:shadow-slate-900/50 shadow-slate-200/50 border border-slate-100 dark:border-white/10 relative overflow-hidden h-full flex flex-col backdrop-blur-xl">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                            <History className="w-32 h-32 text-slate-900 dark:text-white" />
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
                            <div>
                                {/* State Persistence Banner (User Request Fix for "lost sales") */}
                                {cart.length > 0 && (
                                    <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/10 border-2 border-amber-200 dark:border-amber-900/30 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-500 shadow-lg dark:shadow-slate-900/50 shadow-amber-100/50">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400 animate-pulse">
                                                <ShoppingBag className="w-6 h-6" strokeWidth={3} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-amber-900 dark:text-amber-100 uppercase tracking-tighter italic">Venda pendente detectada!</p>
                                                <p className="text-xs font-bold text-amber-600 dark:text-amber-300">O carrinho contém {cart.length} item(ns). Deseja continuar?</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 w-full md:w-auto">
                                            <button
                                                onClick={() => setView('new-sale')}
                                                className="flex-1 md:flex-none px-6 py-3 bg-amber-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl dark:shadow-slate-900/50 shadow-amber-200 hover:bg-amber-700 active:scale-95 transition-all"
                                            >
                                                Retomar Venda
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm("Deseja descartar os itens pendentes no carrinho?")) {
                                                        resetForm();
                                                    }
                                                }}
                                                className="px-4 py-3 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 text-amber-600 dark:text-amber-500 rounded-xl font-bold text-[10px] uppercase hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-all"
                                            >
                                                Limpar
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tighter uppercase">Fluxo de Atividade</h3>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="flex items-center gap-1 text-[9px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 italic">
                                        {pendingOrders.length} Pendentes
                                    </span>
                                    <span className="flex items-center gap-1 text-[9px] font-black text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 italic">
                                        {recentSales.length} Hoje
                                    </span>
                                </div>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar cliente ou código..."
                                    value={activitySearch}
                                    onChange={(e) => setActivitySearch(e.target.value)}
                                    className="pl-8 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 w-full md:w-56 text-slate-800 dark:text-slate-200"
                                />
                            </div>
                        </div>

                        <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
                            {(() => {
                                const unified = [
                                    ...pendingOrders.map(o => ({ ...o, type: 'order', sortDate: o.createdAt?.toDate ? o.createdAt.toDate() : (o.createdAt ? new Date(o.createdAt) : new Date()) })),
                                    ...recentSales.map(s => ({ ...s, type: 'sale', sortDate: s.createdAt?.toDate ? s.createdAt.toDate() : (s.createdAt ? new Date(s.createdAt) : new Date()) }))
                                ].sort((a, b) => b.sortDate - a.sortDate)
                                    .filter(item => {
                                        const search = activitySearch.toLowerCase();
                                        return (item.customer?.name || item.client?.name || '').toLowerCase().includes(search) ||
                                            (item.code || '').toLowerCase().includes(search);
                                    });

                                if (unified.length === 0) return (
                                    <div className="text-center py-20 opacity-30">
                                        <Package className="w-12 h-12 mx-auto mb-2" />
                                        <p className="text-xs font-bold uppercase tracking-widest">Nada por aqui</p>
                                    </div>
                                );

                                return unified.map(item => (
                                    <div key={item.id} className={cn(
                                        "p-5 rounded-3xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group relative overflow-hidden",
                                        item.type === 'order'
                                            ? "bg-gradient-to-r from-blue-50/80 to-blue-50/20 dark:from-blue-900/20 dark:to-blue-900/5 border-blue-100 dark:border-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg hover:shadow-blue-100 dark:hover:shadow-blue-900/20 hover:-translate-y-0.5"
                                            : "bg-white dark:bg-slate-900 border-slate-100 dark:border-white/10 hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:shadow-lg hover:shadow-slate-100 dark:hover:shadow-slate-900/50 hover:-translate-y-0.5"
                                    )}>
                                        <div className="flex items-center gap-5 relative z-10">
                                            <div className={cn(
                                                "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm transition-all group-hover:scale-110 duration-300",
                                                item.type === 'order' ? "bg-blue-600 text-white shadow-blue-200 dark:shadow-blue-900/50" : "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                                            )}>
                                                {item.type === 'order' ? <ShoppingBag className="w-6 h-6" /> : <History className="w-6 h-6" />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <p className="font-extrabold text-slate-800 dark:text-slate-100 text-base leading-tight">{item.customer?.name || item.client?.name || 'Venda sem Cliente'}</p>
                                                    <span className={cn(
                                                        "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                                                        item.type === 'order' ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800" : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800"
                                                    )}>
                                                        {item.type === 'order' ? 'Vitrine' : 'Venda'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                                    <span className="font-mono bg-slate-50 dark:bg-slate-950 px-1.5 rounded border border-slate-100 dark:border-white/10 text-slate-500 dark:text-slate-400">#{item.code || item.id.slice(-6)}</span>
                                                    <span>•</span>
                                                    <span>{item.sortDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    <span>•</span>
                                                    <span className={cn("text-sm", item.type === 'order' ? "text-blue-600 dark:text-blue-400" : "text-emerald-600 dark:text-emerald-400")}>{formatCurrency(item.total)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {item.type === 'order' ? (
                                                <>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleCancelOrder(item.id); }}
                                                        className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                        title="Cancelar Pedido"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleImportOrder(item); }}
                                                        className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg dark:shadow-slate-900/50 shadow-blue-200 active:scale-95 flex items-center gap-2"
                                                    >
                                                        Fazer Checkout <ArrowUpRight className="w-4 h-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleCancelSale(item.id); }}
                                                        className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                        title="Estornar Venda (Devolver Estoque)"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setSelectedSale(item); }}
                                                        className="px-4 py-2 bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 rounded-xl border border-slate-100 dark:border-white/10 hover:bg-indigo-600 hover:text-white dark:hover:text-white transition-all shadow-sm dark:shadow-slate-900/50 active:scale-95 flex items-center gap-2"
                                                    >
                                                        <span className="text-[10px] font-black uppercase">Gerenciar</span>
                                                        <Settings2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>

                    {/* Permanent System Stats Bar Removed */}
                </div>
            ) : (
                <div className="h-full flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-sm dark:shadow-slate-900/50 border border-slate-100 dark:border-white/10 overflow-hidden relative">
                    {/* Premium Header with Stepper */}
                    <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 bg-white dark:bg-slate-900 z-20">
                        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
                            <button
                                onClick={() => setView('list')}
                                className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-950 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-slate-800 hover:text-red-500 transition-all flex items-center justify-center shrink-0"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight md:hidden">Nova Venda</h2>
                        </div>

                        {/* Desktop Premium Stepper */}
                        <div className="flex items-center gap-4 md:gap-12 w-full md:w-auto justify-center">
                            {[
                                { id: 1, label: 'Identificação', icon: User },
                                { id: 2, label: 'Carrinho', icon: ShoppingBag },
                                { id: 3, label: 'Checkout', icon: ShieldCheck }
                            ].map((s, idx) => (
                                <div key={s.id} className="flex items-center gap-4 md:gap-12">
                                    <div className={cn("flex flex-col items-center gap-2 group cursor-default transition-all duration-500",
                                        step === s.id ? "scale-110" : step > s.id ? "opacity-70" : "opacity-30 blur-[0.5px]"
                                    )}>
                                        <div className={cn("w-12 h-12 rounded-[1.25rem] flex items-center justify-center transition-all duration-500 relative",
                                            step === s.id ? "bg-indigo-600 text-white shadow-2xl shadow-indigo-200 rotate-[5deg]" :
                                                step > s.id ? "bg-emerald-500 text-white shadow-lg shadow-emerald-100" : "bg-slate-100 text-slate-400"
                                        )}>
                                            {step > s.id ? (
                                                <Check className="w-6 h-6" strokeWidth={3} />
                                            ) : (
                                                <s.icon className="w-5 h-5" strokeWidth={2.5} />
                                            )}
                                            {step === s.id && (
                                                <div className="absolute -inset-1 border-2 border-indigo-600 rounded-[1.5rem] animate-ping opacity-20 pointer-events-none" />
                                            )}
                                        </div>
                                        <span className={cn("hidden md:block text-[10px] font-black uppercase tracking-[0.2em] transition-colors",
                                            step === s.id ? "text-indigo-600" : "text-slate-400"
                                        )}>
                                            {s.label}
                                        </span>
                                    </div>
                                    {idx < 2 && (
                                        <div className="hidden md:block w-16 h-[2px] bg-slate-100 dark:bg-slate-800 rounded-full relative overflow-hidden">
                                            <div className={cn("absolute inset-0 bg-indigo-500 transition-all duration-1000 transform origin-left",
                                                step > s.id ? "scale-x-100" : "scale-x-0"
                                            )} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => {
                                if (confirm("Deseja cancelar esta venda e limpar o carrinho?")) {
                                    resetForm();
                                    setView('list');
                                }
                            }}
                            className="px-4 py-2 text-slate-400 hover:text-red-500 font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" /> Descartar
                        </button>
                    </div>

                    <div className="flex-1 overflow-hidden flex">
                        {/* Steps Content */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">

                            {/* STEP 1: CLIENT - PREMIUM REDESIGN */}
                            {step === 1 && (
                                <div className="space-y-10 animate-in slide-in-from-bottom-8 duration-500">
                                    <div className="text-center md:text-left">
                                        <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">Identificação do Cliente</h3>
                                        <p className="text-slate-400 font-medium text-lg mt-2">Selecione um cliente para personalizar a experiência de venda.</p>
                                    </div>

                                    {!isCreatingClient ? (
                                        <div className="space-y-8">
                                            {/* MODERN ACTION CARDS */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <button
                                                    onClick={() => {
                                                        setSelectedClient({ id: 'consumer_default', name: 'Consumidor Final', phone: '', cpf: '' });
                                                        setStep(2);
                                                    }}
                                                    className="group relative h-44 bg-emerald-50 border-2 border-emerald-100 rounded-[2.5rem] overflow-hidden transition-all hover:bg-emerald-500 hover:border-emerald-500 shadow-xl dark:shadow-slate-900/50 shadow-emerald-100/50 active:scale-[0.98]"
                                                >
                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white dark:bg-slate-900/20 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-emerald-400 transition-all opacity-0 group-hover:opacity-100" />
                                                    <div className="h-full flex flex-col items-center justify-center gap-4 relative z-10 p-6">
                                                        <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-3xl flex items-center justify-center text-emerald-500 shadow-lg dark:shadow-slate-900/50 group-hover:scale-110 transition-transform">
                                                            <ShoppingBag className="w-8 h-8" strokeWidth={2.5} />
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="font-black text-emerald-950 uppercase tracking-[0.2em] text-xs group-hover:text-white">Venda Balcão</p>
                                                            <p className="text-[10px] font-bold text-emerald-600 mt-1 uppercase tracking-widest group-hover:text-emerald-100">Checkout Rápido sem Cadastro</p>
                                                        </div>
                                                    </div>
                                                </button>

                                                <button
                                                    onClick={() => setIsCreatingClient(true)}
                                                    className="group relative h-44 bg-indigo-50 border-2 border-indigo-100 rounded-[2.5rem] overflow-hidden transition-all hover:bg-indigo-600 hover:border-indigo-600 shadow-xl dark:shadow-slate-900/50 shadow-indigo-100/50 active:scale-[0.98]"
                                                >
                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white dark:bg-slate-900/20 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-indigo-400 transition-all opacity-0 group-hover:opacity-100" />
                                                    <div className="h-full flex flex-col items-center justify-center gap-4 relative z-10 p-6">
                                                        <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-3xl flex items-center justify-center text-indigo-500 shadow-lg dark:shadow-slate-900/50 group-hover:scale-110 transition-transform">
                                                            <PlusCircle className="w-8 h-8" strokeWidth={2.5} />
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="font-black text-indigo-950 uppercase tracking-[0.2em] text-xs group-hover:text-white">Novo Cadastro</p>
                                                            <p className="text-[10px] font-bold text-indigo-600 mt-1 uppercase tracking-widest group-hover:text-indigo-100">Registrar Cliente no Ecossistema</p>
                                                        </div>
                                                    </div>
                                                </button>
                                            </div>

                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-8 flex items-center pointer-events-none">
                                                    <Search className="w-7 h-7 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                                                </div>
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    placeholder="Digite Nome, CPF ou Telefone para buscar..."
                                                    value={clientSearch}
                                                    onChange={(e) => setClientSearch(e.target.value)}
                                                    className="w-full pl-20 pr-10 py-7 bg-white dark:bg-slate-900 border-2 border-slate-100 rounded-[2.5rem] text-xl font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-300 focus:border-indigo-500 focus:ring-8 focus:ring-indigo-500/5 outline-none transition-all shadow-2xl dark:shadow-slate-900/50 shadow-slate-100"
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {filteredClients.slice(0, 6).map(client => (
                                                    <button
                                                        key={client.id}
                                                        onClick={() => { setSelectedClient(client); setStep(2); }}
                                                        className="w-full p-6 bg-white dark:bg-slate-900 border-2 border-slate-50 rounded-[2.5rem] hover:border-indigo-500 hover:shadow-2xl dark:shadow-slate-900/50 hover:shadow-indigo-500/10 transition-all group flex items-center justify-between text-left relative overflow-hidden active:scale-95"
                                                    >
                                                        <div className="flex items-center gap-6 relative z-10">
                                                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-950 rounded-2xl flex items-center justify-center text-slate-400 font-black text-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                                                                {client.name[0]}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-black text-slate-800 dark:text-slate-100 text-lg leading-tight group-hover:text-indigo-700 transition-colors">{client.name}</h4>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{client.phone || '00 00000-0000'}</span>
                                                                    <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{client.cpf || 'Sem CPF'}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-300 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                                            <ChevronRight className="w-6 h-6" />
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>

                                            {filteredClients.length === 0 && clientSearch && (
                                                <div className="bg-slate-50 dark:bg-slate-950/50 rounded-[2.5rem] p-12 text-center border-2 border-dashed border-slate-200 dark:border-white/10 animate-in zoom-in-95">
                                                    <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm dark:shadow-slate-900/50">
                                                        <UserX className="w-10 h-10 text-slate-200" strokeWidth={1.5} />
                                                    </div>
                                                    <h4 className="text-xl font-black text-slate-800 dark:text-slate-100">Nenhum cliente familiar?</h4>
                                                    <p className="text-slate-400 font-medium mt-1">Refine a busca ou crie um novo cadastro ao lado.</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="bg-slate-50 dark:bg-slate-950/50 rounded-[2.5rem] p-12 text-center border-2 border-dashed border-slate-200 dark:border-white/10 animate-in zoom-in-95">
                                            <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm dark:shadow-slate-900/50">
                                                <UserX className="w-10 h-10 text-slate-200" strokeWidth={1.5} />
                                            </div>
                                            <h4 className="text-xl font-black text-slate-800 dark:text-slate-100">Crie um novo cadastro</h4>
                                            <p className="text-slate-400 font-medium mt-1">Clique no botão "Novo Cadastro" acima para preencher todos os dados do cliente.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* STEP 2 & 3: PRODUCTS & CHECKOUT (SPLIT VIEW) */}
                            {step >= 2 && (
                                <div className="space-y-6 animate-in slide-in-from-right duration-300">
                                    <div className="flex flex-col gap-6">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Adicionar Produtos</h3>
                                                <button onClick={() => setStep(1)} className="text-sm font-bold text-indigo-600 hover:underline flex items-center gap-1">
                                                    <User className="w-3 h-3" /> {selectedClient?.name}
                                                </button>
                                            </div>
                                            <div className="text-right">
                                                <div className="flex items-center gap-2 justify-end">
                                                    <div className="px-3 py-1 bg-violet-50 text-violet-700 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                                        {selectedClient?.id === 'new_client' ? 'Novo Cliente' : 'Cliente Recorrente'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* CLIENT INSIGHTS BANNER */}
                                        {selectedClient && recentSales.some(s => s.client?.id === selectedClient.id) && (
                                            <div className="bg-slate-900 rounded-[2rem] p-6 text-white relative overflow-hidden shadow-xl dark:shadow-slate-900/50">
                                                <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500 rounded-full blur-[100px] opacity-20 -mr-20 -mt-20" />
                                                <div className="relative z-10 flex flex-wrap gap-8 items-center">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900/10 flex items-center justify-center backdrop-blur-md">
                                                            <Activity className="w-6 h-6 text-emerald-400" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Total Gasto</p>
                                                            <p className="text-2xl font-black">
                                                                {formatCurrency(recentSales.filter(s => s.client?.id === selectedClient.id).reduce((acc, s) => acc + s.total, 0))}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="w-px h-10 bg-white dark:bg-slate-900/10 hidden md:block" />
                                                    <div>
                                                        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Última Compra</p>
                                                        <p className="text-sm font-bold text-slate-200">
                                                            {new Date(recentSales.filter(s => s.client?.id === selectedClient.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]?.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <div className="w-px h-10 bg-white dark:bg-slate-900/10 hidden md:block" />
                                                    <div>
                                                        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Ticket Médio</p>
                                                        <p className="text-sm font-bold text-emerald-400">
                                                            {formatCurrency(
                                                                recentSales.filter(s => s.client?.id === selectedClient.id).reduce((acc, s) => acc + s.total, 0) /
                                                                recentSales.filter(s => s.client?.id === selectedClient.id).length
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-4 mb-8 overflow-x-auto pb-4 custom-scrollbar snap-x">
                                        {[
                                            { label: 'Películas', icon: Smartphone, color: 'blue' },
                                            { label: 'Capas', icon: Package, color: 'amber' },
                                            { label: 'Serviços', icon: Wrench, color: 'emerald' },
                                            { label: 'iPhones', icon: Smartphone, color: 'indigo' },
                                            { label: 'Cabos', icon: Zap, color: 'orange' },
                                        ].map((action, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    setProductSearch(action.label);
                                                    document.querySelector('input[placeholder*="Buscar produto"]')?.focus();
                                                }}
                                                className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-100 rounded-2xl hover:border-indigo-500 hover:shadow-xl dark:shadow-slate-900/50 hover:shadow-indigo-500/5 transition-all whitespace-nowrap snap-start group"
                                            >
                                                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center transition-all group-hover:bg-indigo-600 group-hover:text-white",
                                                    action.color === 'blue' ? "bg-blue-50 text-blue-500" :
                                                        action.color === 'amber' ? "bg-amber-50 text-amber-500" :
                                                            action.color === 'emerald' ? "bg-emerald-50 text-emerald-500" :
                                                                action.color === 'indigo' ? "bg-indigo-50 text-indigo-500" : "bg-orange-50 text-orange-500"
                                                )}>
                                                    <action.icon className="w-4 h-4" />
                                                </div>
                                                <span className="text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 group-hover:text-indigo-900">{action.label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex gap-3">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder="Buscar produto, IMEI ou Código (Enter p/ adicionar 1º)"
                                                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-white/10 rounded-2xl outline-none focus:border-indigo-500 focus:bg-white dark:bg-slate-900 font-bold text-slate-700 dark:text-slate-200 text-lg transition-all shadow-sm dark:shadow-slate-900/50"
                                                value={productSearch}
                                                onChange={e => setProductSearch(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        // Smart Selection Logic
                                                        const matches = stock.filter(p => {
                                                            if (!productSearch) return false;
                                                            const normalize = (s) => s ? s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
                                                            const term = normalize(productSearch);
                                                            const tokens = term.split(/\s+/).filter(t => t.length > 0);
                                                            const target = normalize(`${p.name} ${p.imei || ''} ${p.color || ''} ${p.storage || ''} ${p.category || ''}`);
                                                            return tokens.every(t => target.includes(t));
                                                        });

                                                        if (matches.length > 0) {
                                                            const firstMatch = matches[0];
                                                            addToCart(firstMatch);
                                                            setProductSearch('');
                                                            showToast(`${firstMatch.name} adicionado!`, "success");
                                                        }
                                                    }
                                                }}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                console.log("Opening Quick Add Modal"); // Debug
                                                if (productSearch) setQuickProductData(prev => ({ ...prev, name: productSearch }));
                                                setShowQuickAddModal(true);
                                            }}
                                            className="px-4 bg-indigo-50 text-indigo-600 rounded-2xl font-black uppercase tracking-wider text-[10px] border-2 border-indigo-100 hover:bg-indigo-500 hover:text-white hover:border-indigo-500 transition-all shadow-sm dark:shadow-slate-900/50 active:scale-95 flex flex-col items-center justify-center gap-1 min-w-[90px]"
                                        >
                                            <Plus className="w-5 h-5" />
                                            Cadastrar
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
                                        {stock.filter(p => {
                                            if (!productSearch) return true;

                                            const normalize = (s) => s ? s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
                                            const term = normalize(productSearch);
                                            const tokens = term.split(/\s+/).filter(t => t.length > 0);

                                            // Search in Name, IMEI, Color, Storage, Category
                                            const target = normalize(`${p.name} ${p.imei || ''} ${p.color || ''} ${p.storage || ''} ${p.category || ''}`);

                                            // Robust match: all typed parts must exist in the product info
                                            return tokens.every(t => target.includes(t));
                                        }).slice(0, 50).map(product => (
                                            <button
                                                key={product.id}
                                                onClick={() => addToCart(product)}
                                                disabled={product.quantity <= 0}
                                                className={cn(
                                                    "group bg-white border border-slate-100 p-4 rounded-[2rem] transition-all text-left flex flex-col items-center relative overflow-hidden duration-200",
                                                    product.quantity > 0 ? "hover:border-violet-500 hover:shadow-2xl hover:shadow-violet-200/50 active:scale-95 cursor-pointer" : "opacity-60 grayscale cursor-not-allowed"
                                                )}
                                            >
                                                {product.quantity <= 0 && (
                                                    <div className="absolute top-3 right-3 z-20 bg-red-500 text-white text-[10px] font-black uppercase px-2 py-1 rounded-lg shadow-sm dark:shadow-slate-900/50 animate-in fade-in">
                                                        Esgotado
                                                    </div>
                                                )}
                                                <div className="w-full aspect-square bg-slate-50 dark:bg-slate-950 rounded-2xl mb-4 flex items-center justify-center relative overflow-hidden group-hover:bg-violet-50 transition-colors">
                                                    {product.imageUrl ? (
                                                        <img src={product.imageUrl} className="w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-110 mix-blend-multiply" />
                                                    ) : (
                                                        <Smartphone className="w-10 h-10 text-slate-300 group-hover:text-violet-400 transition-colors" />
                                                    )}
                                                    {product.batteryHealth && (
                                                        <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md text-white text-[9px] font-bold px-2 py-1 rounded-lg">
                                                            {product.batteryHealth}%
                                                        </div>
                                                    )}
                                                </div>
                                                <h4 className="font-extrabold text-slate-700 dark:text-slate-200 text-sm text-center leading-tight mb-2 px-1 line-clamp-2 group-hover:text-violet-700 transition-colors">{product.name}</h4>
                                                <div className="flex flex-col items-center gap-1.5 mb-3 w-full">
                                                    <div className="flex items-center gap-2 justify-center w-full">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded-md border border-slate-100">{product.storage}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded-md border border-slate-100">{product.color}</span>
                                                    </div>
                                                    {product.imei && <p className="text-[9px] font-mono font-bold text-slate-400">IMEI: {product.imei.slice(-4)}</p>}
                                                </div>
                                                <div className="mt-auto pt-3 border-t border-slate-100 w-full text-center group-hover:border-violet-100 transition-colors">
                                                    <span className="font-black text-slate-800 dark:text-slate-100 text-lg tracking-tight group-hover:text-violet-600 transition-colors">{formatCurrency(parsePrice(product))}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    {/* SMART SUGGESTIONS (CROSS-SELL) */}
                                    {cart.length > 0 && (
                                        <div className="bg-orange-50/50 border border-orange-100 rounded-[2rem] p-6 animate-in slide-in-from-bottom duration-500 mt-6">
                                            <h4 className="text-xs font-black text-orange-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <TrendingUp className="w-4 h-4" /> Sugestões para turbinar a venda
                                            </h4>
                                            <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar snap-x">
                                                {stock.filter(p => {
                                                    const isAccessory = (p.category || '').toLowerCase().includes('acess') ||
                                                        (p.name || '').toLowerCase().includes('capa') ||
                                                        (p.name || '').toLowerCase().includes('película') ||
                                                        (p.name || '').toLowerCase().includes('fonte') ||
                                                        (p.name || '').toLowerCase().includes('carregador');
                                                    const inCart = cart.some(c => c.id === p.id);
                                                    return isAccessory && !inCart && p.quantity > 0;
                                                }).slice(0, 5).map(acc => (
                                                    <button
                                                        key={acc.id}
                                                        onClick={() => addToCart(acc)}
                                                        className="min-w-[160px] bg-white dark:bg-slate-900 p-3 rounded-2xl border border-orange-100 hover:border-orange-400 hover:shadow-lg dark:shadow-slate-900/50 hover:shadow-orange-100 transition-all text-left flex flex-col gap-2 snap-start active:scale-95"
                                                    >
                                                        <div className="w-full h-24 bg-slate-50 dark:bg-slate-950 rounded-xl flex items-center justify-center">
                                                            {acc.imageUrl ? (
                                                                <img src={acc.imageUrl} className="h-full object-contain mix-blend-multiply" />
                                                            ) : (
                                                                <Package className="w-6 h-6 text-orange-200" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 line-clamp-1">{acc.name}</p>
                                                            <p className="text-[10px] font-black text-orange-500">{formatCurrency(acc.price)}</p>
                                                        </div>
                                                        <div className="mt-auto w-full py-1.5 bg-orange-50 text-orange-600 rounded-lg text-[10px] font-black uppercase text-center group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                                            Adicionar +
                                                        </div>
                                                    </button>
                                                ))}
                                                {stock.filter(p => (p.category || '').toLowerCase().includes('acess') || (p.name || '').toLowerCase().includes('capa')).length === 0 && (
                                                    <p className="text-xs text-slate-400 italic">Nenhuma sugestão disponível no momento.</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                        </div >

                        <div className="hidden lg:flex lg:w-[400px] bg-white dark:bg-slate-900 border-l border-slate-100 p-8 flex-col shadow-2xl dark:shadow-slate-900/50 z-30">
                            <CheckoutSidebar />
                        </div>

                        {/* Mobile Cart Trigger */}
                        {/* Mobile Floating Command */}
                        {
                            view === 'new-sale' && cart.length > 0 && !showMobileSummary && (
                                <button
                                    onClick={() => setShowMobileSummary(true)}
                                    className="fixed bottom-8 right-8 w-20 h-20 bg-indigo-600 text-white rounded-[2rem] shadow-2xl dark:shadow-slate-900/50 shadow-indigo-300 lg:hidden flex items-center justify-center animate-bounce z-[60] border-4 border-white active:scale-90 transition-transform"
                                >
                                    <div className="absolute -top-3 -right-3 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white shadow-lg dark:shadow-slate-900/50">
                                        {cart.length}
                                    </div>
                                    <ShoppingCart className="w-8 h-8" strokeWidth={2.5} />
                                </button>
                            )
                        }

                        {/* Mobile Summary Sheet */}
                        {
                            showMobileSummary && (
                                <div className="lg:hidden fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                                    <div className="absolute bottom-0 left-0 right-0 max-h-[90vh] bg-white dark:bg-slate-900 rounded-t-[2.5rem] flex flex-col animate-in slide-in-from-bottom duration-300">
                                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                            <h4 className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest text-xs">Resumo do Pedido</h4>
                                            <button onClick={() => setShowMobileSummary(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                                                <X className="w-5 h-5 text-slate-500" />
                                            </button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-6">
                                            <CheckoutSidebar />
                                        </div>
                                    </div>
                                </div>
                            )
                        }



                    </div >
                </div >
            )
            }

            {/* Quick Add Product Modal - Portaled to Body to prevent clipping */}
            {
                showQuickAddModal && createPortal(
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-lg shadow-2xl dark:shadow-slate-900/50 p-8 relative animate-in zoom-in-95">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tighter uppercase">Cadastro Rápido</h3>
                                    <p className="text-xs font-bold text-slate-400">Adicionar produto ao estoque e à venda.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setShowQuickAddModal(false);
                                    }}
                                    className="p-2 bg-slate-50 dark:bg-slate-950 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-slate-800 transition-colors"
                                >
                                    <X className="w-6 h-6 text-slate-400" />
                                </button>
                            </div>

                            <form onSubmit={handleQuickAddSubmit} className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-2 block">Nome do Produto</label>
                                    <input
                                        required
                                        autoFocus
                                        placeholder="Ex: Capa iPhone 13 Pro"
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold text-slate-700 dark:text-slate-200"
                                        value={quickProductData.name}
                                        onChange={e => setQuickProductData({ ...quickProductData, name: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-2 block">Categoria</label>
                                        <select
                                            className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold text-slate-700 dark:text-slate-200 appearance-none cursor-pointer"
                                            value={quickProductData.category}
                                            onChange={e => {
                                                const newCatName = e.target.value;
                                                setQuickProductData(prev => {
                                                    // Recalculate price if cost exists based on new category margin
                                                    let newPrice = prev.price;
                                                    const cat = settings?.categories?.find(c => c.name === newCatName);
                                                    if (cat && prev.cost) {
                                                        const margin = parseFloat(cat.margin || 0) / 100;
                                                        const cost = parseFloat(prev.cost);
                                                        if (!isNaN(cost) && !isNaN(margin)) {
                                                            newPrice = (cost * (1 + margin)).toFixed(2);
                                                        }
                                                    }
                                                    return { ...prev, category: newCatName, price: newPrice };
                                                });
                                            }}
                                        >
                                            <option value="">Selecione...</option>
                                            {settings?.categories?.map(c => (
                                                <option key={c.id} value={c.name}>{c.name}</option>
                                            ))}
                                            {!settings?.categories?.length && <option value="Acessórios">Acessórios</option>}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-2 block">Custo (Opcional)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold text-slate-700 dark:text-slate-200"
                                            value={quickProductData.cost}
                                            onChange={e => {
                                                const newCost = e.target.value;
                                                setQuickProductData(prev => {
                                                    // Auto-calc price based on Category Margin
                                                    let newPrice = prev.price;
                                                    const cat = settings?.categories?.find(c => c.name === prev.category);
                                                    if (cat && newCost) {
                                                        const margin = parseFloat(cat.margin || 0) / 100;
                                                        const cost = parseFloat(newCost);
                                                        if (!isNaN(cost) && !isNaN(margin)) {
                                                            newPrice = (cost * (1 + margin)).toFixed(2);
                                                        }
                                                    }
                                                    return { ...prev, cost: newCost, price: newPrice };
                                                });
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-2 block">Preço de Venda (R$)</label>
                                        <div className="relative">
                                            <input
                                                required
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold text-slate-700 dark:text-slate-200"
                                                value={quickProductData.price}
                                                onChange={e => setQuickProductData({ ...quickProductData, price: e.target.value })}
                                            />
                                            {quickProductData.cost && quickProductData.price && (
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">
                                                    {(() => {
                                                        const c = parseFloat(quickProductData.cost);
                                                        const p = parseFloat(quickProductData.price);
                                                        if (c > 0) return `${(((p - c) / c) * 100).toFixed(0)}% Mg`;
                                                        return '';
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-2 block">IMEI / Serial (Opcional)</label>
                                        <input
                                            placeholder="Serial..."
                                            className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold text-slate-700 dark:text-slate-200 font-mono"
                                            value={quickProductData.imei}
                                            onChange={e => setQuickProductData({ ...quickProductData, imei: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl dark:shadow-slate-900/50 shadow-indigo-200 mt-4 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    {isLoading ? <Loader2 className="animate-spin" /> : <><Plus className="w-5 h-5" /> Cadastrar e Adicionar</>}
                                </button>
                            </form>
                        </div>
                    </div >,
                    document.body
                )
            }

            {/* Tech Lab Entry Modal */}
            {
                showLabModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-lg shadow-2xl dark:shadow-slate-900/50 p-8 relative animate-in zoom-in-95">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tighter uppercase">Registrar Entrada p/ Lab</h3>
                                    <p className="text-xs font-bold text-slate-400">Este aparelho entrará automaticamente na Triagem.</p>
                                </div>
                                <button onClick={() => setShowLabModal(false)} className="p-2 bg-slate-50 dark:bg-slate-950 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-slate-800 transition-colors">
                                    <X className="w-6 h-6 text-slate-400" />
                                </button>
                            </div>

                            <form onSubmit={handleLabEntrySubmit} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-2 block">Modelo do Aparelho</label>
                                        <input
                                            required
                                            placeholder="Ex: iPhone 13 Pro 256GB"
                                            className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-bold"
                                            value={labEntryData.model}
                                            onChange={e => setLabEntryData({ ...labEntryData, model: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-2 block">IMEI / Serial</label>
                                        <input
                                            required
                                            placeholder="0000000000"
                                            className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-bold font-mono"
                                            value={labEntryData.imei}
                                            onChange={e => setLabEntryData({ ...labEntryData, imei: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-2 block">Valor de Entrada (R$)</label>
                                        <input
                                            required
                                            type="number"
                                            placeholder="0.00"
                                            className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-bold"
                                            value={labEntryData.value}
                                            onChange={e => setLabEntryData({ ...labEntryData, value: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Verification Checklist */}
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-4 block underline decoration-blue-500 underline-offset-4">Checklist de Verificação</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {Object.keys(labEntryData.checklist).map(key => (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => setLabEntryData({
                                                    ...labEntryData,
                                                    checklist: { ...labEntryData.checklist, [key]: !labEntryData.checklist[key] }
                                                })}
                                                className={cn("flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-xs font-bold capitalize",
                                                    labEntryData.checklist[key] ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-slate-50 border-slate-100 text-slate-400"
                                                )}
                                            >
                                                <div className={cn("w-4 h-4 rounded-md border-2 flex items-center justify-center",
                                                    labEntryData.checklist[key] ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300"
                                                )}>
                                                    {labEntryData.checklist[key] && <Check className="w-3 h-3" />}
                                                </div>
                                                {key === 'faceid' ? 'Face ID / Touch ID' :
                                                    key === 'housing' ? 'Carcaça / Vidro' :
                                                        key === 'sound' ? 'Áudio (Mic/Alt)' : key}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-2 block">Observações Técnicas</label>
                                    <textarea
                                        placeholder="Ex: Saúde da bateria 88%, tela paralela..."
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-medium min-h-[80px] text-sm"
                                        value={labEntryData.observations}
                                        onChange={e => setLabEntryData({ ...labEntryData, observations: e.target.value })}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl dark:shadow-slate-900/50 shadow-blue-200 mt-4 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    {isLoading ? <Loader2 className="animate-spin" /> : <><Wrench className="w-5 h-5" /> Confirmar e Aplicar Crédito</>}
                                </button>
                            </form>
                        </div>
                    </div >
                )
            }

            {/* Post-Sale Actions Modal */}
            {
                showPostSaleModal && lastSale && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-2xl shadow-2xl dark:shadow-slate-900/50 p-8 relative animate-in zoom-in-95">
                            <div className="w-24 h-24 bg-gradient-to-tr from-emerald-400 to-teal-600 text-white rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl dark:shadow-slate-900/50 shadow-emerald-200 rotate-3 animate-bounce">
                                <Check className="w-12 h-12" strokeWidth={4} />
                            </div>
                            <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900">Venda Realizada!</h3>
                            <p className="text-slate-400 font-black text-sm uppercase tracking-[0.2em] mt-2">Transação finalizada com sucesso</p>
                            <div className="mt-4 px-6 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 rounded-full flex items-center gap-3">
                                <span className="text-[10px] font-black text-slate-400 uppercase">Cód: {lastSale.code}</span>
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="text-[10px] font-black text-emerald-600 uppercase">{formatCurrency(lastSale.total)}</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Receipt A4 */}
                                <button
                                    onClick={() => handlePrintReceipt(lastSale)}
                                    className="p-8 bg-white dark:bg-slate-900 border border-slate-100 rounded-[2.5rem] flex flex-col items-center gap-4 hover:border-indigo-500 hover:shadow-2xl dark:shadow-slate-900/50 hover:shadow-indigo-500/10 transition-all group relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform opacity-50" />
                                    <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center transition-all group-hover:bg-indigo-600 group-hover:text-white shadow-inner relative z-10">
                                        <FileText className="w-8 h-8" />
                                    </div>
                                    <div className="text-center relative z-10">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-indigo-600">Recibo Profissional</span>
                                        <p className="text-lg font-black text-slate-900 dark:text-white">Impressão A4</p>
                                    </div>
                                </button>

                                {/* Thermal Receipt */}
                                <button
                                    onClick={async () => {
                                        try {
                                            const { PrintingService } = await import('../../services/printingService');
                                            if (lastSale && lastSale.items) {
                                                PrintingService.printThermalReceipt(lastSale);
                                            } else {
                                                showToast("Dados da venda incompletos para impressão.", "error");
                                            }
                                        } catch (err) {
                                            console.error("Erro impressão térmica:", err);
                                            showToast("Erro ao abrir impressor.", "error");
                                        }
                                    }}
                                    className="p-8 bg-slate-900 border border-slate-800 rounded-[2.5rem] flex flex-col items-center gap-4 hover:bg-black hover:shadow-2xl dark:shadow-slate-900/50 transition-all group relative overflow-hidden"
                                >
                                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white dark:bg-slate-900/5 rounded-full -ml-12 -mb-12 group-hover:scale-150 transition-transform" />
                                    <div className="w-16 h-16 bg-white/10 text-white rounded-2xl flex items-center justify-center transition-all group-hover:bg-white dark:bg-slate-900 group-hover:text-black shadow-lg dark:shadow-slate-900/50 relative z-10">
                                        <Printer className="w-8 h-8" />
                                    </div>
                                    <div className="text-center relative z-10">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Impressão Rápida</span>
                                        <p className="text-lg font-black text-white">Cupom 80mm</p>
                                    </div>
                                </button>

                                {/* Warranty Term */}
                                <button
                                    onClick={() => handlePrintWarranty(lastSale)}
                                    className="p-6 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 rounded-[2rem] flex flex-col items-center gap-3 hover:border-emerald-500 hover:bg-emerald-50 transition-all group"
                                >
                                    <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm dark:shadow-slate-900/50 text-slate-400 group-hover:text-emerald-600 transition-colors">
                                        <Check className="w-8 h-8" />
                                    </div>
                                    <span className="text-xs font-black uppercase tracking-widest">Termo de Garantia</span>
                                </button>

                                {/* NFE/NFCE */}
                                <button
                                    onClick={() => setShowInvoiceModal(true)}
                                    className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 border-2 border-indigo-200 dark:border-indigo-800 rounded-[2rem] flex flex-col items-center gap-3 hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-200 dark:hover:shadow-indigo-900/50 transition-all group"
                                >
                                    <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm dark:shadow-slate-900/50 text-indigo-600 group-hover:scale-110 transition-transform">
                                        <FileText className="w-8 h-8" />
                                    </div>
                                    <span className="text-xs font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-400">Emitir NF-e / NFC-e</span>
                                </button>
                            </div>

                            <div className="mt-8 pt-8 border-t border-slate-100 grid grid-cols-2 gap-4">
                                <button
                                    onClick={async () => {
                                        if (!confirm("Deseja CANCELAR esta venda e editar?")) return;
                                        const saleToEdit = { ...lastSale };
                                        setIsLoading(true);
                                        try {
                                            const orgId = userProfile?.organizationId || user.uid;
                                            await SalesService.cancelSale(saleToEdit.id, orgId);
                                            setCart(saleToEdit.items.map(i => ({ ...i, sellingPrice: i.price, quantity: i.quantity })));
                                            setSelectedClient(saleToEdit.client);
                                            setShowPostSaleModal(false);
                                            setView('new-sale');
                                            setStep(2);
                                            showToast("Venda removida e itens carregados para ajuste!", "success");
                                        } catch (e) { console.error(e); } finally { setIsLoading(false); }
                                    }}
                                    className="flex items-center justify-center gap-2 py-4 bg-slate-50 dark:bg-slate-950 text-slate-500 rounded-2xl text-[10px] font-black uppercase hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                                >
                                    <Edit3 className="w-4 h-4" /> Errei algo, quero editar
                                </button>
                                <button
                                    onClick={async () => {
                                        if (!confirm("Tem certeza que deseja cancelar esta venda?")) return;
                                        setIsLoading(true);
                                        try {
                                            const orgId = userProfile?.organizationId || user.uid;
                                            await SalesService.cancelSale(lastSale.id, orgId);
                                            setShowPostSaleModal(false);
                                            showToast("Venda cancelada com sucesso!", "success");
                                            loadInitialData();
                                        } catch (e) { console.error(e); } finally { setIsLoading(false); }
                                    }}
                                    className="flex items-center justify-center gap-2 py-4 bg-red-50 text-red-500 rounded-2xl text-[10px] font-black uppercase hover:bg-red-600 hover:text-white transition-all underline underline-offset-4 decoration-red-200"
                                >
                                    <Trash2 className="w-4 h-4" /> Cancelar Venda
                                </button>
                            </div>

                            <button
                                onClick={() => setShowPostSaleModal(false)}
                                className="w-full py-5 bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest mt-8 hover:bg-slate-900 transition-all active:scale-95"
                            >
                                Fechar e Continuar
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Selected Sale Details / Cancel Modal */}
            {
                selectedSale && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-2xl shadow-2xl dark:shadow-slate-900/50 p-8 relative animate-in zoom-in-95">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <span className="bg-indigo-100 text-indigo-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest block w-fit mb-2">Venda {selectedSale.code}</span>
                                    <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tighter uppercase italic">Detalhes da Venda</h3>
                                </div>
                                <button onClick={() => setSelectedSale(null)} className="p-2 bg-slate-50 dark:bg-slate-950 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-slate-800 transition-colors">
                                    <X className="w-6 h-6 text-slate-400" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-100 grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</p>
                                        <p className="font-bold text-slate-700 dark:text-slate-200">{selectedSale.client?.name || 'Venda Direta'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</p>
                                        <p className="font-bold text-slate-700 dark:text-slate-200">
                                            {(selectedSale.createdAt?.toDate ? selectedSale.createdAt.toDate() : (selectedSale.createdAt ? new Date(selectedSale.createdAt) : new Date())).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="col-span-2 pt-2 border-t border-slate-200 dark:border-white/10">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Itens</p>
                                        <div className="space-y-1 mt-1">
                                            {selectedSale.items?.map((item, i) => (
                                                <div key={i} className="flex justify-between items-start border-b border-slate-100 pb-2 mb-2 last:border-0 last:mb-0 last:pb-0">
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">{item.quantity}x {item.name}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase">
                                                            {item.variant?.storage || ''} {item.variant?.color || ''} {(item.batteryHealth || item.variant?.batteryHealth) ? `• Bat ${item.batteryHealth || item.variant?.batteryHealth}%` : ''}
                                                        </p>
                                                        {(item.imei || item.variant?.imei) && <p className="text-[9px] text-slate-300 font-mono">IMEI: {item.imei || item.variant?.imei}</p>}
                                                    </div>
                                                    <span className="text-sm font-black text-slate-700 dark:text-slate-200">{formatCurrency(item.price)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <button onClick={() => handlePrintReceipt(selectedSale)} className="p-4 bg-white dark:bg-slate-900 border border-slate-100 rounded-2xl flex flex-col items-center gap-2 hover:border-blue-500 transition-all group">
                                        <Printer className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
                                        <span className="text-[10px] font-black uppercase">Recibo</span>
                                    </button>
                                    <button onClick={() => handlePrintWarranty(selectedSale)} className="p-4 bg-white dark:bg-slate-900 border border-slate-100 rounded-2xl flex flex-col items-center gap-2 hover:border-emerald-500 transition-all group">
                                        <FileText className="w-5 h-5 text-slate-400 group-hover:text-emerald-500" />
                                        <span className="text-[10px] font-black uppercase">Garantia</span>
                                    </button>
                                    <button onClick={() => handlePrintThermal(selectedSale)} className="p-4 bg-white dark:bg-slate-900 border border-slate-100 rounded-2xl flex flex-col items-center gap-2 hover:border-slate-900 transition-all group">
                                        <Printer className="w-5 h-5 text-slate-400 group-hover:text-slate-900 dark:text-white" />
                                        <span className="text-[10px] font-black uppercase">Cupom</span>
                                    </button>
                                    <button onClick={() => handlePrintLabel(selectedSale)} className="p-4 bg-white dark:bg-slate-900 border border-slate-100 rounded-2xl flex flex-col items-center gap-2 hover:border-amber-500 transition-all group">
                                        <Package className="w-5 h-5 text-slate-400 group-hover:text-amber-500" />
                                        <span className="text-[10px] font-black uppercase">Etiqueta</span>
                                    </button>

                                    {/* NFe/NFCe Emission Button */}
                                    <button
                                        onClick={() => {
                                            setShowInvoiceModal(true);
                                        }}
                                        className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 border-2 border-indigo-200 dark:border-indigo-800 rounded-2xl flex flex-col items-center gap-2 hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-200 dark:hover:shadow-indigo-900/50 transition-all group"
                                    >
                                        <FileText className="w-5 h-5 text-indigo-600 group-hover:scale-110 transition-transform" />
                                        <span className="text-[10px] font-black uppercase text-indigo-700 dark:text-indigo-400">NF-e / NFC-e</span>
                                    </button>

                                    <button onClick={() => setEditingSale(selectedSale)} className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex flex-col items-center gap-2 hover:border-indigo-500 transition-all group">
                                        <Settings2 className="w-5 h-5 text-indigo-400 group-hover:text-indigo-600" />
                                        <span className="text-[10px] font-black uppercase text-indigo-600">Alterar Dados</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            const sale = selectedSale;
                                            let msg = `📃 *RECIBO DE VENDA*\n🔖 *Pedido:* #${sale.code || sale.id.slice(0, 6).toUpperCase()}\n📅 *Data:* ${new Date(sale.createdAt?.seconds * 1000 || sale.createdAt).toLocaleDateString()}\n👤 *Cliente:* ${sale.client?.name || 'Consumidor Final'}\n\n👇 *RESUMO DO PEDIDO:*`;

                                            sale.items.forEach(item => {
                                                msg += `\n\n📦 *${item.name}*`;
                                                if (item.variant) msg += `\n   📝 ${[item.variant.condition, item.variant.color, item.variant.storage].filter(Boolean).join(' • ')}`;
                                                msg += `\n   💰 ${item.quantity}x ${formatCurrency(item.price)}`;
                                            });

                                            msg += `\n\n💰 *TOTAL: ${formatCurrency(sale.total)}*`;

                                            if (sale.paymentEntries && sale.paymentEntries.length > 0) {
                                                msg += `\n\n💳 *PAGAMENTO:*`;
                                                sale.paymentEntries.forEach(p => {
                                                    msg += `\n   • ${p.method === 'pix' ? 'Pix' : p.method === 'credit' ? 'Crédito' : p.method === 'debit' ? 'Débito' : p.method} (${p.installments || 1}x): ${formatCurrency(p.amount)}`;
                                                });
                                            }

                                            msg += `\n\n✅ *Obrigado pela preferência!*`;

                                            // Attempt to use client phone
                                            const phone = sale.client?.phone ? sale.client.phone.replace(/\D/g, '') : '';
                                            const target = phone ? `55${phone}` : '';

                                            window.open(`https://wa.me/${target}?text=${encodeURIComponent(msg)}`, '_blank');
                                        }}
                                        className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex flex-col items-center gap-2 hover:border-emerald-500 transition-all group"
                                    >
                                        <div className="w-5 h-5 text-emerald-500 group-hover:text-emerald-700">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                        </div>
                                        <span className="text-[10px] font-black uppercase text-emerald-600">Enviar Zap</span>
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (!confirm("Deseja abrir esta venda para edição? A venda atual será CANCELADA (estornando o estoque) e os itens voltarão para o seu carrinho para você ajustar.")) return;

                                            const saleToEdit = { ...selectedSale };
                                            setIsLoading(true);
                                            try {
                                                const orgId = userProfile?.organizationId || user.uid;
                                                await SalesService.cancelSale(saleToEdit.id, orgId);

                                                // Put items back in cart
                                                setCart(saleToEdit.items.map(i => ({
                                                    ...i,
                                                    sellingPrice: i.price,
                                                    // Ensure quantity is available for the new sale
                                                    quantity: i.quantity
                                                })));

                                                setSelectedClient(saleToEdit.client);
                                                setView('new-sale');
                                                setStep(2);
                                                setSelectedSale(null);
                                                showToast("Venda original cancelada e itens carregados no carrinho!", "success");
                                                loadInitialData();
                                            } catch (e) {
                                                console.error(e);
                                                showToast("Erro ao preparar edição", "error");
                                            } finally {
                                                setIsLoading(false);
                                            }
                                        }}
                                        className="p-4 bg-white dark:bg-slate-900 border border-slate-100 rounded-2xl flex flex-col items-center gap-2 hover:border-indigo-500 transition-all group"
                                    >
                                        <Edit3 className="w-5 h-5 text-slate-400 group-hover:text-indigo-500" />
                                        <span className="text-[10px] font-black uppercase">Editar/Refazer</span>
                                    </button>
                                </div>

                                <div className="pt-6 border-t border-slate-100 flex gap-4">
                                    <button
                                        onClick={() => {
                                            if (!selectedSale?.id) {
                                                showToast("Erro: ID da venda não encontrado", "error");
                                                return;
                                            }
                                            handleCancelSale(selectedSale.id);
                                        }}
                                        disabled={isLoading || !selectedSale?.id}
                                        className="flex-1 py-4 bg-red-50 text-red-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isLoading ? <Loader2 className="animate-spin" /> : <><X className="w-4 h-4" /> Cancelar Venda e Devolver Estoque</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Edit Sale Modal */}
            {
                editingSale && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl dark:shadow-slate-900/50 animate-in zoom-in-95">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">Alterar Dados da Venda</h2>
                                <button onClick={() => setEditingSale(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-slate-800 rounded-full"><X className="w-6 h-6 text-slate-400" /></button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Vendedor</label>
                                    <select
                                        className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 font-bold text-slate-700 dark:text-slate-200 outline-none transition-all"
                                        value={editingSale.sellerId || ''}
                                        onChange={(e) => {
                                            const selId = e.target.value;
                                            const selName = teamMembers.find(m => m.id === selId)?.name || 'Vendedor';
                                            setEditingSale({ ...editingSale, sellerId: selId, sellerName: selName });
                                        }}
                                    >
                                        <option value={user.uid}>{userProfile?.name} (Eu)</option>
                                        {teamMembers.filter(m => m.id !== user.uid).map(m => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Data da Venda</label>
                                    <input
                                        type="datetime-local"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 font-bold text-slate-700 dark:text-slate-200 outline-none transition-all"
                                        value={(() => {
                                            const date = editingSale.createdAt?.toDate ? editingSale.createdAt.toDate() : (editingSale.createdAt ? new Date(editingSale.createdAt) : new Date());
                                            const tzOffset = date.getTimezoneOffset() * 60000;
                                            return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
                                        })()}
                                        onChange={(e) => setEditingSale({ ...editingSale, createdAt: new Date(e.target.value) })}
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-1">Forma de Pagamento</label>
                                    <div className="flex gap-2">
                                        {['pix', 'credit', 'debit', 'cash'].map(method => (
                                            <button
                                                key={method}
                                                onClick={() => setEditingSale({ ...editingSale, paymentMethod: method })}
                                                className={cn(
                                                    "flex-1 p-3 rounded-xl border-2 font-black text-[10px] uppercase transition-all",
                                                    editingSale.paymentMethod === method ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-100 text-slate-400"
                                                )}
                                            >
                                                {method}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex gap-4">
                                <button onClick={() => setEditingSale(null)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase text-xs">Cancelar</button>
                                <button onClick={handleUpdateSale} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg dark:shadow-slate-900/50 shadow-indigo-200">Salvar</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Invoice Emission Modal */}
            <InvoiceEmissionModal
                open={showInvoiceModal}
                onClose={() => setShowInvoiceModal(false)}
                sale={selectedSale || lastSale}
                orgId={userProfile?.organizationId || user?.uid}
            />
        </div >
    );
}
