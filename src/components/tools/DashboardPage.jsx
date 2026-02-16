import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StockService } from '../../services/stockService';
import { SalesService } from '../../services/salesService';
import { ClientService } from '../../services/clientService';
import { CashFlowService } from '../../services/cashFlowService';
import { SettingsService } from '../../services/settingsService';
import { UserService } from '../../services/userService';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy, limit, Timestamp } from 'firebase/firestore';
import { useToast } from '../ui/Toast';
import { GoalsWidget } from '../dashboard/GoalsWidget';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import {
    LayoutDashboard,
    TrendingUp,
    Package,
    DollarSign,
    Loader2,
    ArrowUpRight,
    PlusCircle,
    ShoppingBag,
    Users,
    Calculator,
    Share2,
    Check,
    Wallet,
    Target,
    AlertCircle,
    Calendar,
    CreditCard,
    Sparkles,
    Smartphone,
    Wrench,
    Bell,
    CheckCircle,
    Landmark,
    Zap,
    Trophy,
    Activity as ActivityIcon,
    Trash2,
    Plus,
    X,
    MessageSquare,
    ChevronLeft,
    ChevronRight,
    MessageSquarePlus,
    ShoppingCart,
    Clock,
    AlertTriangle,
    CheckCircle2,
    FileText,
    User
} from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';
import { startOfMonth, endOfMonth, subDays, format, isSameDay, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DeviceInspectionModal } from './DeviceInspectionModal';

const getFirestoreDate = (timestamp) => {
    if (!timestamp) return new Date();
    if (timestamp.toDate) return timestamp.toDate();
    if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
    return new Date(timestamp);
};

const triggerConfetti = () => {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let pieces = [];
    const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a3f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'];

    for (let i = 0; i < 150; i++) {
        pieces.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            rotation: Math.random() * 360,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: Math.random() * 10 + 5,
            speed: Math.random() * 5 + 3
        });
    }

    function update() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        pieces.forEach(p => {
            p.y += p.speed;
            p.rotation += 5;
            if (p.y > canvas.height) p.y = -20;
            ctx.fillStyle = p.color;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation * Math.PI / 180);
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            ctx.restore();
        });
        if (window.confettiActive) requestAnimationFrame(update);
    }
    window.confettiActive = true;
    update();
    setTimeout(() => { window.confettiActive = false; }, 4000);
};

const generateAiSummary = ({ todaySales, monthTotal, topSellingItems, lowStockItems }) => {
    const hours = new Date().getHours();
    let greeting = hours < 12 ? 'Bom dia' : hours < 18 ? 'Boa tarde' : 'Boa noite';
    const topItem = topSellingItems[0]?.name || 'seus produtos';

    let text = `${greeting}! `;
    if (todaySales > 0) {
        text += `Hoje você já vendeu ${formatCurrency(todaySales)}. `;
    } else {
        text += `Vamos começar o dia com tudo? `;
    }

    text += `O ${topItem} é o seu campeão de vendas do mês. `;

    if (lowStockItems > 0) {
        text += `Atenção: existem ${lowStockItems} produtos com estoque crítico que precisam de reposição imediata. `;
    }

    if (monthTotal > 50000) {
        text += `Impressionante! Você está mantendo um ritmo de vendas excelente este mês.`;
    }

    return text;
};
// Dashboard Component Start
export function DashboardPage({ user, userProfile, settings, isSalesMode, darkMode }) {
    const navigate = useNavigate();

    const { showToast } = useToast();
    // Prioritize userProfile.organizationId, then user.uid as absolute fallback
    const orgId = userProfile?.organizationId || user?.uid;
    const [isLoading, setIsLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [isMounted, setIsMounted] = useState(false); // Fix Recharts width issue

    // Real Data State
    const [salesData, setSalesData] = useState({
        todaySales: 0,
        monthSales: 0,
        monthProfit: 0,
        monthNetProfit: 0, // After expenses
        avgTicket: 0,
        dailyChart: [],
        paymentMethods: [],
        topSellingItems: [],
        ranking: [], // Sales by user
        purchaseSuggestions: [], // Restock recommendations
        recentAuditLog: [], // ADDED: For Profit Audit Report
        totalReceivable: 0,
        totalPayable: 0
    });

    const [activeTab, setActiveTab] = useState('monitor'); // monitor, finance, performance


    const [expenseTotal, setExpenseTotal] = useState(0);
    const [goal, setGoal] = useState(settings?.business?.monthlyGoal || 100000); // Default goal from settings

    const [stockStats, setStockStats] = useState({
        lowStockItems: 0,
        lowStockList: [],
        totalStockValue: 0,
        stagnantItems: [],
        capitalByCategory: []
    });

    const [birthdays, setBirthdays] = useState([]);
    const [showCelebration, setShowCelebration] = useState(false);

    // Expense Modal State
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isInspectionModalOpen, setIsInspectionModalOpen] = useState(false);
    const [expenseLoading, setExpenseLoading] = useState(false);
    const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', category: 'fixo', date: new Date().toISOString().split('T')[0] });

    // Dynamic Dashboard State
    const [announcements, setAnnouncements] = useState([]);
    const [dashboardTasks, setDashboardTasks] = useState([]);

    // Internal Requests Alert Popup
    const [newRequestsAlert, setNewRequestsAlert] = useState([]);
    const [currentAlertIndex, setCurrentAlertIndex] = useState(0);
    const [showRequestsPopup, setShowRequestsPopup] = useState(false);
    const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '' });
    const [newTask, setNewTask] = useState('');

    const handleSaveSettings = async (newSettings) => {
        try {
            await SettingsService.saveSettings(newSettings, orgId);
            showToast("Meta atualizada com sucesso!", "success");
        } catch (e) {
            console.error(e);
            showToast("Erro ao salvar meta.", "error");
        }
    };

    // --- ANNOUNCEMENTS LOGIC ---
    const handleCreateAnnouncement = async (e) => {
        e.preventDefault();
        try {
            const announcementData = {
                ...newAnnouncement,
                organizationId: orgId,
                createdBy: user.uid,
                authorName: userProfile?.name || user.email?.split('@')[0] || 'Alguém',
                createdAt: new Date(),
                type: 'info' // Default for now
            };
            const docRef = await addDoc(collection(db, 'announcements'), announcementData);
            setAnnouncements(prev => [{ id: docRef.id, ...announcementData }, ...prev]);
            setNewAnnouncement({ title: '', content: '' });
            setIsAnnouncementModalOpen(false);
            showToast("Aviso publicado!", "success");
        } catch (e) {
            console.error(e);
            showToast("Erro ao publicar aviso.", "error");
        }
    };

    const handleDeleteAnnouncement = async (id) => {
        if (!confirm("Remover este aviso?")) return;
        try {
            await deleteDoc(doc(db, 'announcements', id));
            setAnnouncements(prev => prev.filter(a => a.id !== id));
            showToast("Aviso removido.", "success");
        } catch (e) {
            console.error(e);
            showToast("Erro ao remover aviso.", "error");
        }
    };

    // --- TASKS LOGIC ---
    const handleCreateTask = async (e) => {
        e.preventDefault();
        try {
            const taskData = {
                title: newTask,
                status: 'pending',
                organizationId: orgId,
                createdBy: user.uid,
                authorName: userProfile?.name || user.email?.split('@')[0] || 'Alguém',
                createdAt: new Date()
            };

            const docRef = await addDoc(collection(db, 'dashboard_tasks'), taskData);

            setDashboardTasks(prev => [{ id: docRef.id, ...taskData }, ...prev]);
            setNewTask('');
            setIsTaskModalOpen(false);
            showToast("Lembrete definido!", "success");
        } catch (e) {
            console.error(e);
            showToast("Erro ao criar tarefa.", "error");
        }
    };

    const handleToggleTask = async (task) => {
        const newStatus = task.status === 'pending' ? 'completed' : 'pending';
        const completionData = {
            status: newStatus,
            completedBy: newStatus === 'completed' ? user.uid : null,
            completedByName: newStatus === 'completed' ? (userProfile?.name || user.email?.split('@')[0]) : null,
            completedAt: newStatus === 'completed' ? new Date() : null
        };

        // Optimistic update
        setDashboardTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...completionData } : t).sort((a, b) => (a.status === 'completed') - (b.status === 'completed')));

        try {
            await updateDoc(doc(db, 'dashboard_tasks', task.id), completionData);
        } catch (e) {
            console.error(e);
        }
    };

    const handleDeleteTask = async (id) => {
        if (!confirm("Remover tarefa?")) return;
        try {
            await deleteDoc(doc(db, 'dashboard_tasks', id));
            setDashboardTasks(prev => prev.filter(t => t.id !== id));
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        if (user) {
            loadDashboardData();
            // Give layout 300ms to stabilize before mounting charts to avoid ResponsiveContainer warnings
            setTimeout(() => setIsMounted(true), 300);
        }
    }, [user, orgId]);

    // Sync goal with settings if changed
    useEffect(() => {
        if (settings?.business?.monthlyGoal) {
            setGoal(parseFloat(settings.business.monthlyGoal));
        }
    }, [settings]);

    const loadDashboardData = async () => {
        if (!orgId) {
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);

            // Date Ranges
            const todayStart = startOfDay(new Date());
            const todayEnd = endOfDay(new Date());
            const monthStart = startOfMonth(new Date());
            const monthEnd = endOfMonth(new Date());
            const chartStart = subDays(new Date(), 6); // Last 7 days

            const results = await Promise.allSettled([
                StockService.getStock(orgId),
                SalesService.getSales(orgId),
                ClientService.getClients(orgId),
                CashFlowService.getExpenses(orgId),
                UserService.getTeam(orgId),
                (userProfile?.role === 'owner' || userProfile?.role === 'admin')
                    ? getDocs(query(collection(db, 'receivables'), where('organizationId', '==', orgId), where('status', '==', 'pending')))
                    : Promise.resolve({ docs: [] }),
                (userProfile?.role === 'owner' || userProfile?.role === 'admin')
                    ? getDocs(query(collection(db, 'payables'), where('organizationId', '==', orgId), where('status', '==', 'pending')))
                    : Promise.resolve({ docs: [] }),
                getDocs(query(collection(db, 'announcements'), where('organizationId', '==', orgId))),
                getDocs(query(collection(db, 'dashboard_tasks'), where('organizationId', '==', orgId))),
                getDocs(query(collection(db, 'internal_requests'), where('organizationId', '==', orgId), where('status', '==', 'pending')))
            ]);

            const stockItems = results[0].status === 'fulfilled' ? results[0].value : [];
            let rawSales = results[1].status === 'fulfilled' ? results[1].value : [];
            const clientsData = results[2].status === 'fulfilled' ? results[2].value : [];
            const expensesRaw = results[3].status === 'fulfilled' ? results[3].value : [];
            const teamMembers = results[4].status === 'fulfilled' ? results[4].value : [];
            const receivablesSnap = results[5].status === 'fulfilled' ? results[5].value : { docs: [] };
            const payablesSnap = results[6].status === 'fulfilled' ? results[6].value : { docs: [] };
            const announcementsSnap = results[7].status === 'fulfilled' ? results[7].value : { docs: [] };
            const tasksSnap = results[8].status === 'fulfilled' ? results[8].value : { docs: [] };

            const announcementsData = announcementsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))
                .slice(0, 5);

            const tasksData = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))
                .sort((a, b) => (a.status === 'completed') - (b.status === 'completed'))
                .slice(0, 10);

            setAnnouncements(announcementsData);
            setDashboardTasks(tasksData);

            // Handle New Requests Popup Alert
            const requestsSnap = results[9].status === 'fulfilled' ? results[9].value : { docs: [] };
            const pendingRequests = requestsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));

            if (pendingRequests.length > 0) {
                // Find the newest request ID (last one since it's sorted ASC)
                const latestId = pendingRequests[pendingRequests.length - 1].id;
                const lastSeenId = localStorage.getItem(`lastSeenRequest_${orgId}`);
                const sessionDismissed = sessionStorage.getItem(`dismissedRequests_${orgId}`);

                if (!sessionDismissed || lastSeenId !== latestId) {
                    setNewRequestsAlert(pendingRequests);
                    setShowRequestsPopup(true);
                }
            }

            // Log failures for debugging
            results.forEach((res, index) => {
                if (res.status === 'rejected') {
                    const source = ['Stock', 'Sales', 'Clients', 'Expenses', 'Team', 'Receivables', 'Payables', 'Announcements', 'Tasks', 'InternalRequests'][index];
                    console.error(`Error loading ${source}:`, res.reason);
                }
            });

            // Handle transition: If fetching by orgId returns nothing, try fetching by userId as fallback
            if (rawSales.length === 0 && user?.uid && orgId !== user.uid) {
                try {
                    const userSales = await SalesService.getSales(user.uid);
                    if (userSales.length > 0) {
                        rawSales = userSales;
                    }
                } catch (e) {
                    console.warn("Fallback sales fetch failed:", e);
                }
            }

            // FILTER SALES BY MONTH IN MEMORY (Safety)
            const allMonthSales = rawSales.filter(s => {
                const sDate = getFirestoreDate(s.createdAt);
                return isWithinInterval(sDate, { start: monthStart, end: todayEnd });
            });

            const totalReceivable = (receivablesSnap?.docs || []).reduce((acc, d) => acc + (d.data().amount || 0), 0);
            const totalPayable = (payablesSnap?.docs || []).reduce((acc, d) => acc + (d.data().amount || 0), 0);

            // Create team map for ranking
            const memberNames = {};
            teamMembers.forEach(m => memberNames[m.id] = m.displayName || m.name || m.email);

            // --- SALES ANALYSIS ---

            // Today Stats
            const todaySales = allMonthSales
                .filter(s => {
                    const sDate = getFirestoreDate(s.createdAt);
                    return s.createdAt && isSameDay(sDate, new Date());
                })
                .reduce((acc, s) => acc + (s.total || 0), 0);

            // Profit Calc (Revenue - Cost of Items Sold - Fees)
            let monthRevenue = 0;
            let monthCost = 0;
            let monthTotalFees = 0;
            let monthGrossProfit = 0;
            let monthNetProfitSales = 0;

            const paymentMap = {};
            allMonthSales.forEach(sale => {
                if (sale.status !== 'cancelled') {
                    monthRevenue += (parseFloat(sale.total) || 0);
                    // Cost Logic: Try 'totalCost' (new apps) -> sum items (old apps)
                    let saleCost = parseFloat(sale.totalCost) || 0;
                    if (saleCost === 0 && sale.items) {
                        saleCost = sale.items.reduce((acc, i) => acc + ((parseFloat(i.cost) || 0) * (parseFloat(i.quantity) || 1)), 0);
                    }
                    monthCost += saleCost;
                    monthTotalFees += (parseFloat(sale.feeAmount) || 0);

                    // Net Profit = (Total - Cost - Fees)
                    const profit = (parseFloat(sale.total) || 0) - saleCost - (parseFloat(sale.feeAmount) || 0);
                    monthNetProfitSales += profit;
                    monthGrossProfit += ((parseFloat(sale.total) || 0) - saleCost); // Revenue - COGS
                }

                // Payment Methods
                if (sale.paymentMethod) {
                    paymentMap[sale.paymentMethod] = (paymentMap[sale.paymentMethod] || 0) + sale.total;
                }
            });

            // Fetch Expenses (Manual Input or Collection)
            const expenseList = expensesRaw || [];
            // Logic: Filter for current month
            const monthExpenses = expenseList
                .filter(e => {
                    const eDate = e.date instanceof Date ? e.date : new Date(e.date);
                    return isWithinInterval(eDate, { start: monthStart, end: monthEnd });
                })
                .reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0);

            setExpenseTotal(monthExpenses);



            const avgTicket = allMonthSales.length > 0 ? monthRevenue / allMonthSales.length : 0;

            // Chart Data (Last 7 Days)
            // Filter salesHistory (which might overlap) or re-process allMonthSales if it covers the range
            // We'll map the last 7 days explicitly
            const chartData = [];
            for (let i = 6; i >= 0; i--) {
                const d = subDays(new Date(), i);
                const daySales = allMonthSales // Using fetched sales 
                    .filter(s => s.createdAt && isSameDay(getFirestoreDate(s.createdAt), d))
                    .reduce((acc, s) => acc + (s.total || 0), 0);

                chartData.push({
                    name: format(d, 'EEE', { locale: ptBR }),
                    fullDate: format(d, 'dd/MM'),
                    vendas: daySales
                });
            }

            // Payment Methods Distribution
            const payMap = {};
            allMonthSales.forEach(s => {
                const method = s.paymentMethod || 'Outros';
                payMap[method] = (payMap[method] || 0) + s.total;
            });
            const paymentMethods = Object.keys(payMap).map(k => ({
                name: k === 'credit' ? 'Crédito' : k === 'debit' ? 'Débito' : k === 'cash' ? 'Dinheiro' : k === 'pix' ? 'Pix' : k === 'misto' || k === 'split' ? 'Misto' : k === 'trade_in' ? 'Troca' : k.toUpperCase(),
                value: payMap[k]
            }));

            // Top Selling Items
            const itemMap = {};
            allMonthSales.forEach(s => {
                s.items?.forEach(i => {
                    if (!itemMap[i.name]) itemMap[i.name] = { name: i.name, qty: 0, revenue: 0 };
                    itemMap[i.name].qty += (i.quantity || 1);
                    itemMap[i.name].revenue += (i.quantity || 1) * (i.originalPrice || 0); // Using original price or unit price logic
                });
            });
            const topSellingItems = Object.values(itemMap)
                .sort((a, b) => b.qty - a.qty)
                .slice(0, 5);


            // --- STOCK ANALYSIS ---
            const totalStockValue = stockItems.reduce((acc, i) => acc + (parseFloat(i.cost || 0) * (parseInt(i.quantity) || 0)), 0);
            const lowStockList = stockItems.filter(item => {
                const qty = parseInt(item.quantity) || 0;
                const minQty = (item.minQuantity !== undefined && item.minQuantity !== null && item.minQuantity !== '') ? parseInt(item.minQuantity) : 5;
                return qty <= minQty;
            });
            const lowStockItems = lowStockList.length;


            // --- RANKING (TOP VENDAS) ---
            const userMap = {};
            allMonthSales.forEach(s => {
                const sellerUID = s.userId || s.sellerId || 'Sistema';
                const userName = s.sellerName || s.userName || memberNames[sellerUID] || (sellerUID === 'Sistema' ? 'Venda Direta' : 'Vendedor');

                if (!userMap[sellerUID]) userMap[sellerUID] = { name: userName, total: 0, profit: 0, sales: 0 };

                // Ensure numeric values
                const saleTotal = parseFloat(s.total) || 0;

                // Calculate Profit just for reference (or mixed usage)
                let calculatedProfit = 0;
                if (s.netProfit !== undefined && s.netProfit !== null) {
                    calculatedProfit = parseFloat(s.netProfit);
                } else {
                    let sCost = parseFloat(s.totalCost) || 0;
                    if (sCost === 0 && s.items) {
                        sCost = s.items.reduce((acc, i) => acc + ((parseFloat(i.cost) || 0) * (parseFloat(i.quantity) || 1)), 0);
                    }
                    const sFees = parseFloat(s.feeAmount) || 0;
                    calculatedProfit = saleTotal - sCost - sFees;
                }

                userMap[sellerUID].total += saleTotal;
                userMap[sellerUID].profit += calculatedProfit;
                userMap[sellerUID].sales += 1;
            });
            // Sort by Total Revenue (High to Low)
            const ranking = Object.values(userMap).sort((a, b) => b.total - a.total);

            // --- AI/PURCHASE FORECAST ---
            const purchaseSuggestions = stockItems
                .filter(item => {
                    const salesVolume = topSellingItems.find(t => t.name === item.name)?.qty || 0;
                    const minQty = (item.minQuantity !== undefined && item.minQuantity !== null && item.minQuantity !== '') ? parseInt(item.minQuantity) : 5;
                    return (parseInt(item.quantity) || 0) <= minQty && salesVolume > 0;
                })
                .map(item => ({
                    name: item.name,
                    reason: `Alta saída (${topSellingItems.find(t => t.name === item.name)?.qty} uni) e estoque crítico (${item.quantity})`,
                    priority: (parseInt(item.quantity) || 0) === 0 ? 'CRÍTICA' : 'ALTA'
                }));

            // --- COMMISSION CALC ---
            const commissionRate = settings?.business?.defaultCommission || 0;
            const totalCommission = monthRevenue * (commissionRate / 100);
            const totalOperatingExpenses = monthExpenses + totalCommission;

            // --- BREAK EVEN ANALYSIS ---
            const grossMarginPercent = monthRevenue > 0 ? (monthGrossProfit / monthRevenue) : 0;
            const breakEvenRevenue = grossMarginPercent > 0 ? (totalOperatingExpenses / grossMarginPercent) : 0;
            const breakEvenShortfall = Math.max(0, breakEvenRevenue - monthRevenue);

            setSalesData({
                todaySales: parseFloat(todaySales) || 0,
                monthSales: parseFloat(monthRevenue) || 0,
                monthCost: parseFloat(monthCost) || 0,
                monthFees: parseFloat(monthTotalFees) || 0,
                monthProfit: parseFloat(monthGrossProfit) || 0,
                monthNetProfit: (parseFloat(monthNetProfitSales) || 0) - (parseFloat(totalOperatingExpenses) || 0),
                monthOperatingExpenses: parseFloat(totalOperatingExpenses) || 0,
                breakEvenRevenue: parseFloat(breakEvenRevenue) || 0,
                breakEvenShortfall: parseFloat(breakEvenShortfall) || 0,
                breakEvenProgress: breakEvenRevenue > 0 ? Math.min(100, (monthRevenue / breakEvenRevenue) * 100) : 0,
                avgTicket: parseFloat(avgTicket) || 0,
                dailyChart: chartData,
                paymentMethods,
                topSellingItems,
                ranking,
                purchaseSuggestions,
                recentAuditLog: allMonthSales
                    .sort((a, b) => getFirestoreDate(a.createdAt) - getFirestoreDate(b.createdAt))
                    .slice(0, 15) // Recent 15
                    .map(s => {
                        // Re-calc specific for table if needed, or use logic from loop
                        let sCost = parseFloat(s.totalCost) || 0;
                        if (sCost === 0 && s.items) sCost = s.items.reduce((acc, i) => acc + ((parseFloat(i.cost) || 0) * (i.quantity || 1)), 0);
                        const sFee = parseFloat(s.feeAmount) || 0;
                        const sNet = (parseFloat(s.total) || 0) - sCost - sFee;
                        return {
                            id: s.id,
                            code: s.code || '---',
                            createdAt: s.createdAt,
                            itemsCount: s.items?.length || 0,
                            itemsSummary: s.items?.map(i => i.name).join(', ') || 'Venda Rápida',
                            total: parseFloat(s.total) || 0,
                            cost: sCost,
                            fees: sFee,
                            netProfit: sNet,
                            sellerName: s.sellerName || s.userName || 'Vendedor',
                            margin: (parseFloat(s.total) > 0 ? (sNet / parseFloat(s.total)) * 100 : 0)
                        };
                    }),
                aiSummary: generateAiSummary({ todaySales, monthTotal: monthRevenue, topSellingItems, lowStockItems }),
                totalReceivable,
                totalPayable
            });

            // --- CAPITAL ANALYSIS ---
            const capMap = {};
            stockItems.forEach(item => {
                const cat = item.category || 'Outros';
                capMap[cat] = (capMap[cat] || 0) + (parseFloat(item.cost || 0) * (parseInt(item.quantity) || 0));
            });
            const capitalByCategory = Object.keys(capMap)
                .map(cat => ({ name: cat, value: capMap[cat] }))
                .sort((a, b) => b.value - a.value);

            setStockStats({
                totalStockValue,
                lowStockItems,
                lowStockList: lowStockList.slice(0, 10), // Store top 10 for view
                stagnantItems: [],
                capitalByCategory,
                capitalByCondition: [
                    { name: 'Novos / Lacrados', value: stockItems.filter(i => i.condition === 'lacrado' || i.condition === 'novo').reduce((acc, i) => acc + (i.cost * i.quantity), 0) },
                    { name: 'Seminovos / Usados', value: stockItems.filter(i => i.condition !== 'lacrado' && i.condition !== 'novo').reduce((acc, i) => acc + (i.cost * i.quantity), 0) }
                ]
            });

            // Birthdays Logic
            const currentMonth = new Date().getMonth();
            const bdays = clientsData.filter(c => {
                if (!c.birthDate) return false;
                // Parse 'YYYY-MM-DD'
                const parts = c.birthDate.split('-');
                if (parts.length !== 3) return false;
                // Month is 0-indexed in JS Date, but parts[1] is 01-12
                return (parseInt(parts[1]) - 1) === currentMonth;
            }).map(c => {
                const parts = c.birthDate.split('-');
                return { ...c, day: parseInt(parts[2]) };
            }).sort((a, b) => a.day - b.day);
            setBirthdays(bdays);

            // Celebration Trigger
            if (monthRevenue >= goal && goal > 0) {
                setShowCelebration(true);
                setTimeout(() => setShowCelebration(false), 5000); // 5 seconds of confetti
            }

        } catch (error) {
            console.error(error);
            showToast("Erro ao carregar dashboard.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (showCelebration && isMounted) {
            setTimeout(() => triggerConfetti(), 100);
        }
    }, [showCelebration, isMounted]);

    const handleShareCatalog = () => {
        if (!orgId || !user) return;
        const sellerName = userProfile?.name || user?.displayName || user?.email?.split('@')[0];
        const url = `${window.location.origin}/public/catalog/${orgId}?s=${encodeURIComponent(sellerName)}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        showToast("Link de vendedor copiado!", "success");
        setTimeout(() => setCopied(false), 2000);
    };

    if (isLoading) {
        return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div>;
    }

    return (
        <div className="w-full px-4 md:px-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6 md:mb-8">
                <div>
                    <h2 className="text-sm font-black text-indigo-600 uppercase tracking-[0.3em] mb-1 animate-pulse">
                        Olá, {userProfile?.name?.split(' ')[0] || 'Usuário'}!
                    </h2>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        <LayoutDashboard className="w-6 h-6 md:w-8 md:h-8 text-indigo-600" />
                        Visão Geral
                    </h2>
                    <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-medium pt-1">Resumo de {format(new Date(), 'MMMM', { locale: ptBR })}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <ActionButton
                        icon={copied ? Check : Share2}
                        label={copied ? "Copiado!" : "Catálogo"}
                        onClick={handleShareCatalog}
                        color="bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    />
                    <ActionButton icon={PlusCircle} label="PDV" onClick={() => navigate('/dashboard/pos')} color="bg-slate-800 dark:bg-indigo-600 text-white hover:bg-slate-700 dark:hover:bg-indigo-500" />
                    <ActionButton icon={MessageSquare} label="Solicitações" onClick={() => navigate('/dashboard/requests')} color="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900 hover:bg-indigo-100 dark:hover:bg-indigo-800" />
                    <ActionButton icon={Users} label="Novo Cliente" onClick={() => navigate('/dashboard/clients')} color="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50" />
                    <ActionButton icon={Wrench} label="Entrada OS" onClick={() => navigate('/dashboard/lab')} color="bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900 hover:bg-slate-50 dark:hover:bg-slate-700/50" />
                    <ActionButton icon={Smartphone} label="Avaliar Troca" onClick={() => setIsInspectionModalOpen(true)} color="bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" />
                    <ActionButton icon={Package} label="Novo Produto" onClick={() => navigate('/dashboard/stock')} color="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50" />
                </div>
            </div>



            {/* Sales KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4 mb-6 md:mb-8">
                <StatsCard
                    title="Vendas Hoje"
                    value={formatCurrency(salesData.todaySales)}
                    icon={DollarSign}
                    color="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                />
                <div className="md:col-span-1">
                    <GoalsWidget currentAmount={salesData.monthSales} userProfile={userProfile} goal={goal} />
                </div>

                {(userProfile?.role === 'owner' || userProfile?.role === 'admin') && (
                    <>
                        <StatsCard
                            title="A Receber"
                            value={formatCurrency(salesData.totalReceivable)}
                            icon={Wallet}
                            color="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
                            onClick={() => navigate('/dashboard/receivables')}
                        />
                        <StatsCard
                            title="A Pagar"
                            value={formatCurrency(salesData.totalPayable)}
                            icon={CreditCard}
                            color="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400"
                            onClick={() => navigate('/dashboard/payables')}
                        />
                        <StatsCard
                            title="Lucro Bruto"
                            value={formatCurrency(salesData.monthProfit)}
                            icon={TrendingUp}
                            color="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
                        />
                        <StatsCard
                            title="Lucro Líquido"
                            value={formatCurrency(salesData.monthNetProfit)}
                            icon={DollarSign}
                            color="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                        />
                    </>
                )}
            </div>

            {/* TAB NAVIGATOR */}
            <div className="flex bg-slate-100/50 dark:bg-slate-900/50 p-1.5 rounded-[2rem] border border-slate-200/50 dark:border-white/5 mb-8 shadow-sm">
                {[
                    { id: 'monitor', label: 'Monitoramento', icon: Zap },
                    { id: 'finance', label: 'Financeiro', icon: Landmark, role: ['owner', 'admin'] },
                    { id: 'performance', label: 'Performance', icon: TrendingUp }
                ].filter(tab => !tab.role || tab.role.includes(userProfile?.role)).map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-4 rounded-[1.6rem] text-xs font-black uppercase tracking-widest transition-all duration-300",
                            activeTab === tab.id
                                ? "bg-white dark:bg-slate-800 text-indigo-600 shadow-lg shadow-slate-200/20 dark:shadow-none translate-y-[-2px]"
                                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        )}
                    >
                        <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "animate-pulse" : "")} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* TAB: MONITORAMENTO */}
            {activeTab === 'monitor' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Avisos Gerais */}
                        {/* Avisos Gerais */}
                        <div className="lg:col-span-1 bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden group flex flex-col">
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform pointer-events-none">
                                <Bell className="w-24 h-24" />
                            </div>
                            <div className="relative z-10 flex-1">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-lg font-black flex items-center gap-2 uppercase tracking-widest">
                                        <Bell className="w-5 h-5" /> Avisos da Loja
                                    </h3>
                                    {(userProfile?.role === 'owner' || userProfile?.role === 'admin') && (
                                        <button
                                            onClick={() => setIsAnnouncementModalOpen(true)}
                                            className="p-2 bg-white/20 hover:bg-white text-white hover:text-indigo-600 rounded-xl transition-all"
                                            title="Novo Aviso"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                    {announcements.length === 0 ? (
                                        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/10 text-center py-8">
                                            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                            <p className="text-sm font-bold opacity-80">Nenhum aviso no momento.</p>
                                        </div>
                                    ) : (
                                        announcements.map(notice => (
                                            <div key={notice.id} className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/10 group/notice relative">
                                                {(userProfile?.role === 'owner' || userProfile?.role === 'admin') && (
                                                    <button
                                                        onClick={() => handleDeleteAnnouncement(notice.id)}
                                                        className="absolute top-2 right-2 p-1.5 hover:bg-red-500 rounded-lg opacity-0 group-hover/notice:opacity-100 transition-all text-white/50 hover:text-white"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                )}
                                                <p className="text-xs font-black uppercase tracking-tight text-white/60 mb-1">{notice.title}</p>
                                                <p className="text-sm font-bold">{notice.content}</p>
                                                <div className="flex justify-between items-end mt-2">
                                                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{notice.authorName}</span>
                                                    <p className="text-[9px] text-white/40">{getFirestoreDate(notice.createdAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <button onClick={() => navigate('/dashboard/wiki')} className="mt-4 text-[10px] font-black uppercase text-white/60 hover:text-white transition-colors block ml-auto">
                                    Ver manuais <ArrowUpRight className="inline w-3 h-3" />
                                </button>
                            </div>
                        </div>

                        {/* Task Manager (Daily Tasks) */}
                        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-white/5 flex flex-col">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-widest">
                                    <CheckCircle className="w-5 h-5 text-indigo-500" /> Tarefas do Dia
                                </h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => navigate('/dashboard/requests')}
                                        className="text-[10px] font-black uppercase text-slate-400 hover:text-indigo-600 px-3 py-1.5 transition-all"
                                    >
                                        Gerenciar Todas
                                    </button>
                                    <button
                                        onClick={() => setIsTaskModalOpen(true)}
                                        className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg transition-all shadow-lg shadow-indigo-200"
                                    >
                                        <Plus className="w-3 h-3" /> Nova Tarefa
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar max-h-[300px]">
                                {dashboardTasks.length === 0 ? (
                                    <div className="text-center py-10 opacity-50">
                                        <CheckCircle className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                                        <p className="font-bold text-slate-400">Tudo feito por hoje!</p>
                                    </div>
                                ) : (
                                    dashboardTasks.map(task => (
                                        <div key={task.id} className={cn(
                                            "flex items-center justify-between p-4 rounded-2xl transition-all group/task",
                                            task.status === 'completed' ? "bg-slate-50 dark:bg-white/5 opacity-50" : "bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/5 shadow-sm hover:border-indigo-200"
                                        )}>
                                            <div
                                                className="flex items-center gap-3 cursor-pointer flex-1"
                                                onClick={() => handleToggleTask(task)}
                                            >
                                                <div className={cn(
                                                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                                                    task.status === 'completed' ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 dark:border-slate-600 hover:border-indigo-400"
                                                )}>
                                                    {task.status === 'completed' && <Check className="w-3 h-3" />}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className={cn("text-sm font-bold select-none", task.status === 'completed' ? "line-through text-slate-400" : "text-slate-700 dark:text-slate-200")}>
                                                        {task.title}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        {task.authorName && (
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Por: {task.authorName}</span>
                                                        )}
                                                        {task.status === 'completed' && task.completedByName && (
                                                            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider">| Feito por: {task.completedByName}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteTask(task.id)}
                                                className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover/task:opacity-100 transition-opacity"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Birthdays Widget */}
                    <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-6 rounded-[2.5rem] text-white shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10"><Calendar className="w-32 h-32" /></div>
                        <div className="relative z-10">
                            <h3 className="text-xl font-black mb-4 flex items-center gap-2">🎂 Aniversariantes de {format(new Date(), 'MMMM', { locale: ptBR })}</h3>

                            {birthdays.length === 0 ? (
                                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-center border border-white/20">
                                    <p className="font-bold text-white/80">Nenhum aniversariante neste mês.</p>
                                    <p className="text-xs text-white/60 mt-1">Cadastre a data de nascimento dos clientes para ser avisado aqui.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {birthdays.map(bday => (
                                        <div key={bday.id} className="bg-white/10 backdrop-blur-md rounded-2xl p-4 flex items-center justify-between border border-white/10 hover:bg-white/20 transition-colors">
                                            <div>
                                                <p className="font-bold text-sm text-white">{bday.name}</p>
                                                <p className="text-[10px] opacity-80 uppercase font-black text-white/80">{bday.day} de {format(new Date(), 'MMMM', { locale: ptBR })}</p>
                                            </div>
                                            <button
                                                onClick={() => window.open(`https://wa.me/55${bday.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(`Parabéns ${bday.name.split(' ')[0]}! 🥳\n\nPassando para desejar um feliz aniversário e muita prosperidade!\n\nQuando puder, venha nos visitar, separamos um brinde especial para você! 🎁`)}`, '_blank')}
                                                className="w-10 h-10 rounded-full bg-white text-rose-500 flex items-center justify-center hover:scale-110 transition-transform shadow-sm"
                                                title="Enviar Parabéns"
                                            >
                                                <Share2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stock Alert Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-indigo-600 p-6 rounded-[2rem] text-white flex flex-col justify-between">
                            <p className="text-[10px] font-black uppercase text-indigo-200">Total em Estoque</p>
                            <p className="text-3xl font-black">{formatCurrency(stockStats.totalStockValue)}</p>
                        </div>
                        <div className={cn(
                            "p-6 rounded-[2rem] text-white flex flex-col justify-between transition-colors",
                            stockStats.lowStockItems > 0 ? "bg-red-500 shadow-lg shadow-red-200 dark:shadow-none" : "bg-emerald-500"
                        )}>
                            <p className="text-[10px] font-black uppercase text-white/70">Itens p/ Reposição</p>
                            <p className="text-3xl font-black">{stockStats.lowStockItems} itens</p>
                        </div>
                    </div>

                    {/* Low Stock List (Experimental) */}
                    {stockStats.lowStockItems > 0 && (
                        <div className="bg-white dark:bg-slate-900/50 p-6 rounded-[2rem] border-2 border-red-50 dark:border-red-900/10">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-4 flex items-center gap-2">
                                <Package className="w-4 h-4" /> Alerta de Estoque Crítico
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {stockStats.lowStockList.map(item => (
                                    <div key={item.id} className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-[10px] font-black uppercase border border-red-100 dark:border-red-900/30">
                                        {item.name} ({item.quantity})
                                    </div>
                                ))}
                                {stockStats.lowStockItems > 10 && <span className="text-[10px] font-bold text-slate-400 mt-1">...e mais {stockStats.lowStockItems - 10} itens</span>}
                            </div>
                        </div>
                    )}

                    {/* Live Sales Monitor */}
                    <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-white/5 overflow-hidden">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-widest">
                                <ActivityIcon className="w-5 h-5 text-indigo-500" /> Atividade Recente
                            </h3>
                            <button onClick={() => navigate('/dashboard/history')} className="text-[10px] font-black uppercase text-slate-400 hover:text-indigo-600">Ver Histórico</button>
                        </div>
                        <div className="space-y-3">
                            {salesData.recentAuditLog.length === 0 ? (
                                <p className="text-center py-6 text-slate-400 font-bold">Nenhuma venda registrada ainda.</p>
                            ) : (
                                salesData.recentAuditLog.slice(0, 5).map(sale => (
                                    <div key={sale.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                                <DollarSign className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{sale.code || '---'}</p>
                                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 uppercase">{sale.sellerName}</span>
                                                </div>
                                                <p className="text-[10px] font-bold text-slate-400 truncate max-w-[200px]">{sale.itemsSummary}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-indigo-600">{formatCurrency(sale.total)}</p>
                                            <p className="text-[9px] font-bold text-slate-400">{format(getFirestoreDate(sale.createdAt), "HH:mm")}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )
            }

            {/* TAB: FINANCEIRO */}
            {
                activeTab === 'finance' && (userProfile?.role === 'owner' || userProfile?.role === 'admin') && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {/* DRE Section */}
                        <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-white/5">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-black flex items-center gap-2"><DollarSign className="w-6 h-6 text-emerald-500" /> Saúde Financeira (DRE)</h3>
                                <button onClick={() => setIsExpenseModalOpen(true)} className="bg-indigo-600 text-white text-[10px] font-black uppercase px-4 py-2 rounded-xl shadow-lg">+ Lançar Despesa</button>
                            </div>
                            <div className="space-y-4 mb-8">
                                <div className="flex justify-between items-center p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10">
                                    <span className="font-bold text-slate-600 dark:text-slate-400">Faturamento Bruto</span>
                                    <span className="font-black text-lg">{formatCurrency(salesData.monthSales)}</span>
                                </div>
                                <div className="flex justify-between items-center p-4 rounded-2xl border border-rose-100 dark:border-rose-900/20 text-rose-600 bg-rose-50/20">
                                    <span className="font-bold">(-) Taxas e Impostos</span>
                                    <span className="font-black">- {formatCurrency(salesData.monthFees || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center p-4 rounded-2xl border border-amber-100 dark:border-amber-900/20 text-amber-600 bg-amber-50/20">
                                    <span className="font-bold">(-) Custo de Produtos (CMV)</span>
                                    <span className="font-black">- {formatCurrency(salesData.monthCost)}</span>
                                </div>
                                <div className="flex justify-between items-center p-4 rounded-2xl border border-slate-100 dark:border-white/5 text-slate-500">
                                    <span className="font-bold">(-) Despesas Fixas/Variáveis</span>
                                    <span className="font-black">- {formatCurrency(salesData.monthOperatingExpenses)}</span>
                                </div>
                            </div>
                            <div className="bg-emerald-500 p-8 rounded-[2.5rem] text-white flex items-center justify-between shadow-2xl shadow-emerald-500/20">
                                <div>
                                    <p className="text-xs font-black uppercase text-emerald-100 mb-1">Lucro Líquido Real</p>
                                    <h4 className="text-4xl font-black tracking-tighter">{formatCurrency(salesData.monthNetProfit)}</h4>
                                </div>
                                <TrendingUp className="w-12 h-12 opacity-20" />
                            </div>
                        </div>

                        {/* Recent Audit Table */}
                        <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-white/5 overflow-hidden">
                            <h3 className="text-lg font-black mb-6">Auditoria por Venda (Últimas 5)</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="border-b border-slate-100 dark:border-white/5 text-[10px] uppercase font-black text-slate-400">
                                        <tr>
                                            <th className="pb-4">Data/Ref</th>
                                            <th className="pb-4">Bruto</th>
                                            <th className="pb-4">Custo/Taxa</th>
                                            <th className="pb-4 text-emerald-600">Lucro Líq</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {salesData.recentAuditLog.slice(0, 5).map(sale => (
                                            <tr key={sale.id} className="border-b border-slate-50 dark:border-white/5 last:border-0">
                                                <td className="py-4">
                                                    <p className="font-bold">{format(getFirestoreDate(sale.createdAt), "dd/MM/yy HH:mm")}</p>
                                                    <p className="text-[9px] opacity-50">#{sale.code}</p>
                                                </td>
                                                <td className="py-4 font-black">{formatCurrency(sale.total)}</td>
                                                <td className="py-4 text-[10px] font-bold text-rose-400">-{formatCurrency(sale.cost + sale.fees)}</td>
                                                <td className="py-4"><span className="text-emerald-500 font-black">{formatCurrency(sale.netProfit)}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* TAB: PERFORMANCE */}
            {
                activeTab === 'performance' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-white/5">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-lg font-black flex items-center gap-2"><Target className="w-5 h-5 text-indigo-500" /> Meta Coletiva da Loja</h3>
                                <div className="text-right">
                                    <span className="text-4xl font-black text-indigo-600">{((salesData.monthSales / (goal || 1)) * 100).toFixed(0)}%</span>
                                    <p className="text-[10px] font-black text-slate-400 uppercase">do objetivo</p>
                                </div>
                            </div>
                            <div className="relative h-6 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4">
                                <div className="h-full bg-indigo-600 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (salesData.monthSales / (goal || 1)) * 100)}%` }} />
                            </div>
                            <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase">
                                <span>R$ 0</span>
                                <span className="text-indigo-600">Alvo: {formatCurrency(goal)}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Weekly Chart */}
                            <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-white/5">
                                <h3 className="text-lg font-black mb-8 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-indigo-500" /> Vendas Útimos 7 Dias</h3>
                                <div className="h-[250px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={salesData.dailyChart}>
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                            <YAxis hide />
                                            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', fontWeight: 'bold' }} />
                                            <Area type="monotone" dataKey="vendas" stroke="#4f46e5" strokeWidth={4} fill="url(#colorVendas)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Top Products */}
                            <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-white/5">
                                <h3 className="text-lg font-black mb-8 flex items-center gap-2"><Package className="w-5 h-5 text-amber-500" /> Top Produtos</h3>
                                <div className="space-y-4">
                                    {salesData.topSellingItems.slice(0, 4).map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-2xl">
                                            <span className="font-bold text-sm truncate max-w-[150px]">{item.name}</span>
                                            <span className="font-black text-indigo-600">{item.qty} un.</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Ranking */}
                        <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-white/5">
                            <h3 className="text-lg font-black mb-8 flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" /> Ranking da Equipe</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {salesData.ranking.slice(0, 3).map((seller, idx) => (
                                    <div key={idx} className="bg-slate-50 dark:bg-white/5 p-6 rounded-[2rem] text-center border border-transparent hover:border-amber-200 transition-all">
                                        <div className={cn("w-12 h-12 mx-auto mb-4 rounded-2xl flex items-center justify-center text-xl font-black", idx === 0 ? "bg-amber-400 text-amber-900" : "bg-white text-slate-400")}>{idx + 1}</div>
                                        <p className="font-bold text-slate-800 dark:text-white truncate">{seller.name}</p>
                                        <p className="text-sm font-black text-indigo-600 mt-1">{formatCurrency(seller.total || 0)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            }

            <DeviceInspectionModal isOpen={isInspectionModalOpen} onClose={() => setIsInspectionModalOpen(false)} />

            {/* Expense Modal */}
            {
                isExpenseModalOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300">
                            <h3 className="text-xl font-black text-slate-800 mb-6">Nova Despesa</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Descrição</label>
                                    <input
                                        value={expenseForm.description}
                                        onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                                        placeholder="Ex: Aluguel, Luz, Internet..."
                                        className="w-full p-3 bg-slate-50 rounded-xl mt-1 border-none outline-none font-bold"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase">Valor (R$)</label>
                                        <input
                                            type="number"
                                            value={expenseForm.amount}
                                            onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                                            placeholder="0,00"
                                            className="w-full p-3 bg-slate-50 rounded-xl mt-1 border-none outline-none font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase">Data</label>
                                        <input
                                            type="date"
                                            value={expenseForm.date}
                                            onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })}
                                            className="w-full p-3 bg-slate-50 rounded-xl mt-1 border-none outline-none font-bold text-sm"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={async () => {
                                        if (!expenseForm.description || !expenseForm.amount) return showToast("Preencha todos os campos", "error");
                                        setExpenseLoading(true);
                                        try {
                                            await CashFlowService.addExpense(orgId, {
                                                description: expenseForm.description,
                                                amount: parseFloat(expenseForm.amount),
                                                date: new Date(expenseForm.date),
                                                category: 'fixo' // Default for DRE
                                            });
                                            showToast("Despesa lançada!", "success");
                                            setIsExpenseModalOpen(false);
                                            setExpenseForm({ description: '', amount: '', category: 'fixo', date: new Date().toISOString().split('T')[0] });
                                            loadDashboardData(); // Refresh DRE
                                        } catch (e) {
                                            console.error(e);
                                            showToast("Erro ao salvar.", "error");
                                        } finally {
                                            setExpenseLoading(false);
                                        }
                                    }}
                                    disabled={expenseLoading}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest mt-4 flex items-center justify-center gap-2"
                                >
                                    {expenseLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Salvar Lançamento"}
                                </button>
                                <button onClick={() => setIsExpenseModalOpen(false)} className="w-full py-3 text-slate-400 font-bold uppercase text-xs hover:text-slate-600 transition-colors">Cancelar</button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Announcement Modal */}
            {isAnnouncementModalOpen && (
                <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 border border-slate-100 dark:border-white/10">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase">Novo Aviso</h3>
                            <button onClick={() => setIsAnnouncementModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full text-slate-400"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-2 block">Título (Curto)</label>
                                <input
                                    autoFocus
                                    required
                                    maxLength={30}
                                    placeholder="Ex: Meta Batida"
                                    className="w-full bg-slate-50 dark:bg-white/5 border-2 border-slate-100 dark:border-white/10 rounded-xl px-4 py-3 font-bold text-slate-700 dark:text-white outline-none focus:border-indigo-500 transition-all"
                                    value={newAnnouncement.title}
                                    onChange={e => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-2 block">Mensagem</label>
                                <textarea
                                    required
                                    rows={3}
                                    placeholder="Ex: Parabéns a todos pelo resultado..."
                                    className="w-full bg-slate-50 dark:bg-white/5 border-2 border-slate-100 dark:border-white/10 rounded-xl px-4 py-3 font-medium text-slate-700 dark:text-white outline-none focus:border-indigo-500 transition-all resize-none text-sm"
                                    value={newAnnouncement.content}
                                    onChange={e => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                                />
                            </div>
                            <button className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest mt-2 shadow-lg shadow-indigo-200/50">
                                Publicar Aviso
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Task Modal */}
            {isTaskModalOpen && (
                <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 border border-slate-100 dark:border-white/10">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase">Nova Tarefa</h3>
                            <button onClick={() => setIsTaskModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full text-slate-400"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleCreateTask} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-2 block">Descrição da Tarefa</label>
                                <input
                                    autoFocus
                                    required
                                    placeholder="Ex: Limpar balcão..."
                                    className="w-full bg-slate-50 dark:bg-white/5 border-2 border-slate-100 dark:border-white/10 rounded-xl px-4 py-3 font-bold text-slate-700 dark:text-white outline-none focus:border-indigo-500 transition-all"
                                    value={newTask}
                                    onChange={e => setNewTask(e.target.value)}
                                />
                            </div>
                            <button className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest mt-2 shadow-lg shadow-indigo-200/50">
                                Adicionar Tarefa
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {isInspectionModalOpen && (
                <DeviceInspectionModal
                    isOpen={isInspectionModalOpen}
                    onClose={() => setIsInspectionModalOpen(false)}
                />
            )}
            {/* Internal Requests Alert Popup */}
            {showRequestsPopup && newRequestsAlert.length > 0 && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[999] flex items-center justify-center p-4 animate-in fade-in duration-500">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[1.5rem] shadow-2xl border-4 border-slate-100 dark:border-white/5 overflow-hidden animate-in zoom-in-95 duration-300">
                        {/* Header */}
                        <div className="bg-indigo-600 p-6 flex justify-between items-center text-white">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-xl">
                                    <Bell className="w-5 h-5 animate-bounce" />
                                </div>
                                <h2 className="text-xl font-black uppercase tracking-widest leading-none">
                                    Novas Solicitações
                                </h2>
                            </div>
                            <button
                                onClick={() => {
                                    setShowRequestsPopup(false);
                                    const newestId = newRequestsAlert[newRequestsAlert.length - 1]?.id;
                                    if (newestId) localStorage.setItem(`lastSeenRequest_${orgId}`, newestId);
                                    sessionStorage.setItem(`dismissedRequests_${orgId}`, 'true');
                                }}
                                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-8 space-y-6">
                            <div className="flex items-start gap-4">
                                <div className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm border shrink-0",
                                    newRequestsAlert[currentAlertIndex].type === 'purchase' ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500 border-amber-100 dark:border-amber-900/20" :
                                        newRequestsAlert[currentAlertIndex].type === 'task' ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-500 border-blue-100 dark:border-blue-900/20" :
                                            "bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-white/10"
                                )}>
                                    {newRequestsAlert[currentAlertIndex].type === 'purchase' && <ShoppingCart className="w-6 h-6" />}
                                    {newRequestsAlert[currentAlertIndex].type === 'task' && <CheckCircle2 className="w-6 h-6" />}
                                    {newRequestsAlert[currentAlertIndex].type === 'budget' && <FileText className="w-6 h-6" />}
                                    {(!newRequestsAlert[currentAlertIndex].type || newRequestsAlert[currentAlertIndex].type === 'other') && <MessageSquarePlus className="w-6 h-6" />}
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase text-indigo-500 tracking-tighter">
                                            {format(getFirestoreDate(newRequestsAlert[currentAlertIndex].createdAt), "dd 'de' MMMM", { locale: ptBR })}
                                        </span>
                                        <span className="text-[10px] font-black text-slate-400 uppercase">
                                            De: {newRequestsAlert[currentAlertIndex].requesterName}
                                        </span>
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">
                                        {newRequestsAlert[currentAlertIndex].title}
                                    </h3>
                                    {newRequestsAlert[currentAlertIndex].clientName && (
                                        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase">
                                            <User className="w-3 h-3" />
                                            Cliente: {newRequestsAlert[currentAlertIndex].clientName}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-2xl border border-slate-100 dark:border-white/5 min-h-[120px]">
                                <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                                    {newRequestsAlert[currentAlertIndex].description}
                                </p>
                            </div>

                            {/* Navigation */}
                            <div className="flex items-center justify-between pt-4">
                                <div className="flex gap-2">
                                    <button
                                        disabled={currentAlertIndex === 0}
                                        onClick={() => setCurrentAlertIndex(prev => prev - 1)}
                                        className="p-3 bg-slate-100 dark:bg-white/5 rounded-xl disabled:opacity-30 hover:bg-slate-200 transition-all"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <button
                                        disabled={currentAlertIndex === newRequestsAlert.length - 1}
                                        onClick={() => setCurrentAlertIndex(prev => prev + 1)}
                                        className="p-3 bg-slate-100 dark:bg-white/5 rounded-xl disabled:opacity-30 hover:bg-slate-200 transition-all"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {currentAlertIndex + 1} de {newRequestsAlert.length} itens
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={async () => {
                                            const req = newRequestsAlert[currentAlertIndex];
                                            try {
                                                await updateDoc(doc(db, 'internal_requests', req.id), { status: 'completed' });
                                                showToast("Solicitação concluída!", "success");

                                                // Update local state
                                                const updated = newRequestsAlert.filter(r => r.id !== req.id);
                                                if (updated.length === 0) {
                                                    setShowRequestsPopup(false);
                                                    const newestId = req.id; // Corrected to use the one just completed if list is empty
                                                    localStorage.setItem(`lastSeenRequest_${orgId}`, newestId);
                                                } else {
                                                    setNewRequestsAlert(updated);
                                                    setCurrentAlertIndex(prev => Math.min(prev, updated.length - 1));
                                                }
                                            } catch (e) {
                                                showToast("Erro ao concluir.", "error");
                                            }
                                        }}
                                        className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-2"
                                    >
                                        <Check className="w-4 h-4" /> Concluir
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowRequestsPopup(false);
                                            const newestId = newRequestsAlert[newRequestsAlert.length - 1]?.id;
                                            if (newestId) localStorage.setItem(`lastSeenRequest_${orgId}`, newestId);
                                            sessionStorage.setItem(`dismissedRequests_${orgId}`, 'true');
                                        }}
                                        className="px-6 py-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:opacity-90 transition-all"
                                    >
                                        Resolver Depois
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ActionButton({ icon: Icon, label, onClick, color }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-xl font-bold text-[10px] md:text-xs uppercase tracking-widest border transition-all active:scale-95 shadow-sm",
                color || "bg-white text-slate-700 hover:bg-slate-50 border-slate-200"
            )}
        >
            <Icon className="w-3 h-3 md:w-4 md:h-4" />
            {label}
        </button>
    );
}

function StatsCard({ title, value, icon: Icon, trend, trendColor, color, onClick }) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "bg-white dark:bg-slate-900 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800/60 relative overflow-hidden group hover:border-indigo-100 dark:hover:border-indigo-900 transition-all",
                onClick && "cursor-pointer active:scale-95"
            )}
        >
            <div className="flex justify-between items-start mb-2 md:mb-4">
                <div className={cn("p-2 md:p-3 rounded-2xl transition-transform group-hover:scale-110", color)}>
                    <Icon className="w-4 h-4 md:w-6 md:h-6" />
                </div>
            </div>
            <h3 className="text-slate-400 dark:text-slate-500 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mb-0.5 md:mb-1">{title}</h3>
            <p className="text-lg md:text-2xl font-black text-slate-800 dark:text-white tracking-tight">{value}</p>
            {trend && (
                <p className={cn("text-[9px] md:text-[10px] font-bold mt-1 md:mt-2", trendColor || "text-slate-400")}>{trend}</p>
            )}
        </div>
    );
}
