import React, { useState, useEffect, useMemo } from 'react';
import {
    Search, Plus, LayoutGrid, List, Filter, History, Trash2, Smartphone, Wrench,
    Loader2, Box, Wand2, FileDown, Sparkles, Tag, Tags
} from 'lucide-react';
import { StockService } from '../../../services/stockService';
import { useToast } from '../../ui/Toast';
import { cn, formatCurrency, parsePrice } from '../../../lib/utils';
import { useNavigate } from 'react-router-dom';

import { getProductImage } from '../../../lib/data/iphoneData';

// Subcomponents
import { StockStats } from './StockStats';
import { ProductCard } from './ProductCard';
import { UnitDrawer } from './UnitDrawer';
import { ProductForm } from './ProductForm';
import { ProductList } from './ProductList';
import { MovementHistory } from './MovementHistory';
import { TrashView } from './TrashView';
import { AIImportDrawer } from './AIImportDrawer';
import { ThermalLabelModal } from '../../ui/ThermalLabelModal';
import { XMLImportModal } from '../XMLImportModal';

export function StockManager({ user, userProfile, settings, isSalesMode }) {
    const { showToast } = useToast();
    const orgId = userProfile?.organizationId || user?.uid;
    const userId = user?.uid;
    const navigate = useNavigate();

    // Core States
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('inventory'); // inventory, parts, movements, trash
    const [viewMode, setViewMode] = useState('vitrine'); // vitrine, list
    const [searchTerm, setSearchTerm] = useState('');
    const [filterLowStock, setFilterLowStock] = useState(false);
    const [selectedModelName, setSelectedModelName] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isAIImportOpen, setIsAIImportOpen] = useState(false);
    const [isXMLImportOpen, setIsXMLImportOpen] = useState(false);
    const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
    const [selectedForLabels, setSelectedForLabels] = useState([]);
    const [editingItem, setEditingItem] = useState(null);

    // Initial Load
    useEffect(() => {
        if (orgId) loadData();
    }, [orgId, activeTab]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            let data = [];
            if (activeTab === 'inventory' || activeTab === 'parts') {
                data = await StockService.getStock(orgId);
            } else if (activeTab === 'trash') {
                data = await StockService.getTrashedItems(orgId);
            } else if (activeTab === 'movements') {
                data = await StockService.getMovements(orgId);
            }
            setItems(data);
        } catch (error) {
            showToast("Erro ao carregar dados", "error");
        } finally {
            setIsLoading(false);
        }
    };

    // Derived State: Filtering & Grouping
    const filteredItems = useMemo(() => {
        return items.filter(i => {
            const isPart = i.type === 'part';
            if (activeTab === 'inventory' && isPart) return false;
            if (activeTab === 'parts' && !isPart) return false;

            const matchesSearch = (i.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (i.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (i.color || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (i.imei || '').toLowerCase().includes(searchTerm.toLowerCase());

            const matchesLowStock = !filterLowStock || (i.quantity <= (i.minQuantity || 5));

            return matchesSearch && matchesLowStock;
        });
    }, [items, searchTerm, filterLowStock, activeTab]);

    const groupedModels = useMemo(() => {
        if (activeTab !== 'inventory') return [];

        const groups = filteredItems.reduce((acc, item) => {
            const name = item.name.trim();
            if (!acc[name]) {
                acc[name] = {
                    name,
                    category: item.category,
                    totalQuantity: 0,
                    minPrice: Infinity,
                    maxPrice: -Infinity,
                    variants: [],
                    storages: new Set(),
                    colors: new Set(),
                    image: null
                };
            }
            acc[name].totalQuantity += parseInt(item.quantity) || 0;
            const price = parseFloat(item.price) || 0;
            if (price > 0) {
                acc[name].minPrice = Math.min(acc[name].minPrice, price);
                acc[name].maxPrice = Math.max(acc[name].maxPrice, price);
            }
            if (item.storage) acc[name].storages.add(item.storage);
            if (item.color) acc[name].colors.add(item.color);
            if (item.imageUrl && !acc[name].image) acc[name].image = item.imageUrl;
            acc[name].variants.push(item);
            return acc;
        }, {});

        return Object.values(groups).map(g => ({
            ...g,
            minPrice: g.minPrice === Infinity ? 0 : g.minPrice
        })).sort((a, b) => a.name.localeCompare(b.name));
    }, [filteredItems, activeTab]);

    const stats = useMemo(() => {
        const uniqueModels = new Set(items.filter(i => i.type !== 'part').map(i => i.name)).size;
        const totalItems = items.reduce((acc, i) => acc + (parseInt(i.quantity) || 0), 0);
        const totalCost = items.reduce((acc, i) => acc + (parsePrice(i.cost) * (parseInt(i.quantity) || 0)), 0);
        const totalRevenue = items.reduce((acc, i) => acc + (parsePrice(i.price) * (parseInt(i.quantity) || 0)), 0);
        const lowStockCount = items.filter(i => (parseInt(i.quantity) || 0) <= (i.minQuantity || 5)).length;

        return {
            uniqueModels,
            totalItems,
            totalCost,
            totalRevenue,
            lowStockCount,
            avgMargin: totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0
        };
    }, [items]);

    // Handlers
    const handleShareModel = (modelName) => {
        const sellerName = userProfile?.name || user?.displayName || user?.email?.split('@')[0];
        const url = `${window.location.origin}/dashboard/stock?c=${orgId}&model=${encodeURIComponent(modelName)}&s=${encodeURIComponent(sellerName)}`;
        navigator.clipboard.writeText(url);
        showToast("Link do modelo copiado!", "success");
    };

    const handleDeleteItem = async (item) => {
        if (!item?.id) {
            showToast("ID do item não encontrado", "error");
            return;
        }
        if (!confirm(`Deseja arquivar ${item.name}?`)) return;
        try {
            await StockService.deleteItem(orgId, userId, item.id, item);
            showToast("Item movido para a lixeira", "success");
            loadData();
        } catch (error) {
            showToast("Erro ao excluir item", "error");
        }
    };

    const handleRestoreItem = async (item) => {
        try {
            await StockService.restoreItem(item.id);
            showToast("Item restaurado com sucesso!", "success");
            loadData();
        } catch (error) {
            showToast("Erro ao restaurar", "error");
        }
    };

    const handleStandardizeNames = async () => {
        if (!confirm("Padronizar nomes do estoque? (Ex: 'iphone 11' -> 'Apple iPhone 11')")) return;

        setIsLoading(true);
        try {
            let count = 0;
            for (const item of items) {
                if (item.type === 'part') continue;
                let newName = item.name;
                if (!newName.toLowerCase().includes('apple') && (
                    newName.toLowerCase().includes('iphone') ||
                    newName.toLowerCase().includes('ipad') ||
                    newName.toLowerCase().includes('watch')
                )) {
                    newName = `Apple ${newName}`;
                }
                // Add more logic or AI-based standardization here
                if (newName !== item.name) {
                    await StockService.updateItem(orgId, userId, item.id, { name: newName });
                    count++;
                }
            }
            showToast(`${count} itens padronizados!`, "success");
            loadData();
        } catch {
            showToast("Erro ao padronizar", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrintLabels = (itemsToPrint) => {
        setSelectedForLabels(itemsToPrint);
        setIsLabelModalOpen(true);
    };

    const handleAIImported = async (newItems) => {
        setIsLoading(true);
        try {
            for (const it of newItems) {
                try {
                    const formData = {
                        name: it.productName || "Produto Não Identificado",
                        category: it.category || "",
                        quantity: String(it.quantity || 1),
                        cost: String(it.cost || 0),
                        price: String((parseFloat(it.cost) || 0) * 1.3), // Basic markup
                        storage: it.storage || "",
                        color: it.color || "",
                        type: (it.category || "").toLowerCase().includes('peça') ? 'part' : 'device',
                        imageUrl: getProductImage(it.productName, it.color) || ""
                    };
                    await StockService.addItem(orgId, userId, formData);
                } catch (err) {
                    console.error("Erro ao importar item individual:", it, err);
                }
            }
            showToast(`${newItems.length} itens processados!`, "success");
            loadData();
        } catch (error) {
            console.error("Erro geral na importação AI:", error);
            showToast("Erro na importação", "error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full px-4 sm:px-6 lg:px-8 pb-20 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-10 mt-6">
                <div>
                    <h1 className="text-5xl font-black text-slate-800 dark:text-white tracking-tighter mb-2">
                        VeloStock <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-violet-500">Pro</span>
                    </h1>
                    <p className="text-slate-500 font-medium text-lg">Gestão inteligente de inventário e ativos.</p>
                </div>

                {/* Main Navigation Tabs */}
                <div className="flex p-2 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-full shadow-lg shadow-indigo-500/5 overflow-x-auto max-w-full">
                    {[
                        { id: 'inventory', label: 'Estoque', icon: Smartphone },
                        { id: 'parts', label: 'Peças', icon: Wrench },
                        { id: 'movements', label: 'Histórico', icon: History },
                        { id: 'trash', label: 'Lixeira', icon: Trash2 },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex items-center gap-2 px-6 py-3 rounded-full text-xs uppercase font-black tracking-widest transition-all shrink-0 relative overflow-hidden",
                                activeTab === tab.id
                                    ? "text-white shadow-lg shadow-indigo-500/20"
                                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/50"
                            )}
                        >
                            {activeTab === tab.id && (
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600" />
                            )}
                            <tab.icon className="w-4 h-4 relative z-10" />
                            <span className="relative z-10">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Dashboard */}
            {activeTab !== 'trash' && activeTab !== 'movements' && (
                <StockStats
                    stats={stats}
                    onFilterLowStock={() => setFilterLowStock(!filterLowStock)}
                    filterActive={filterLowStock}
                />
            )}

            {/* Toolbar: Search & Actions */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="relative flex-1 group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Pesquisar por modelo, IMEI, cor, categoria..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/20 dark:border-white/10 p-5 pl-16 rounded-[2rem] outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 text-slate-700 dark:text-white font-medium transition-all shadow-sm"
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <button className="p-2 text-slate-300 hover:text-slate-500 dark:hover:text-slate-400 transition-colors">
                            <Filter className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex gap-3">
                    <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl p-1.5 rounded-[1.5rem] flex border border-white/20 dark:border-white/10 shadow-sm">
                        <button
                            onClick={() => setViewMode('vitrine')}
                            className={cn("p-3 rounded-2xl transition-all", viewMode === 'vitrine' ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm" : "text-slate-400 hover:text-indigo-500")}
                        >
                            <LayoutGrid className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn("p-3 rounded-2xl transition-all", viewMode === 'list' ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm" : "text-slate-400 hover:text-indigo-500")}
                        >
                            <List className="w-5 h-5" />
                        </button>
                    </div>

                    <button
                        onClick={() => {
                            setEditingItem(null);
                            setIsFormOpen(true);
                        }}
                        className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-8 py-4 rounded-[1.5rem] font-black uppercase text-xs tracking-widest flex items-center gap-2 transition-all shadow-xl shadow-indigo-600/20 active:scale-95 border border-white/10"
                    >
                        <Plus className="w-5 h-5" /> Novo Item
                    </button>

                    <button
                        onClick={() => setIsAIImportOpen(true)}
                        className="p-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/20 dark:border-white/10 text-indigo-500 rounded-[1.5rem] shadow-sm hover:border-indigo-500/50 hover:bg-white/60 transition-all active:scale-95"
                        title="Importação Inteligente com AI"
                    >
                        <Sparkles className="w-6 h-6" />
                    </button>

                    <button
                        onClick={() => setIsXMLImportOpen(true)}
                        className="p-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/20 dark:border-white/10 text-purple-500 rounded-[1.5rem] shadow-sm hover:border-purple-500/50 hover:bg-white/60 transition-all active:scale-95"
                        title="Importar XML de Fornecedor"
                    >
                        <FileDown className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Smart Tools Bar */}
            <div className="flex flex-wrap gap-3 mb-10 overflow-x-auto no-scrollbar pb-2">
                <button
                    onClick={handleStandardizeNames}
                    className="flex items-center gap-2 px-6 py-3 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl text-slate-500 dark:text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/20 dark:border-white/10 hover:border-indigo-500/30 hover:bg-white/60 transition-all shadow-sm"
                >
                    <Wand2 className="w-4 h-4 text-indigo-500" /> Padronizar Nomes
                </button>
                <button
                    onClick={() => handlePrintLabels(filteredItems)}
                    className="flex items-center gap-2 px-6 py-3 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl text-slate-500 dark:text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/20 dark:border-white/10 hover:border-emerald-500/30 hover:bg-white/60 transition-all shadow-sm"
                >
                    <Tag className="w-4 h-4 text-emerald-500" /> Etiquetas Térmicas
                </button>
                <button
                    onClick={() => {
                        const params = new URLSearchParams();
                        if (searchTerm) params.set('q', searchTerm);
                        if (filterLowStock) params.set('low', '1');
                        navigate(`/dashboard/price-list?${params.toString()}`);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl text-slate-500 dark:text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/20 dark:border-white/10 hover:border-purple-500/30 hover:bg-white/60 transition-all shadow-sm"
                >
                    <Tags className="w-4 h-4 text-purple-500" /> Gerar Lista de Preços
                </button>
                <button
                    className="flex items-center gap-2 px-6 py-3 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl text-slate-500 dark:text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/20 dark:border-white/10 hover:border-blue-500/30 hover:bg-white/60 transition-all shadow-sm"
                >
                    <FileDown className="w-4 h-4 text-blue-500" /> Exportar Planilha
                </button>
            </div>

            {/* Content Area */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-4">
                    <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest animate-pulse">Sincronizando Inventário...</p>
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] p-24 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-6">
                        <Box className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Nenhum item encontrado</h3>
                    <p className="text-slate-400 dark:text-slate-500 font-medium mt-2 max-w-sm">Tente ajustar seus filtros ou realizar uma nova busca no estoque.</p>
                </div>
            ) : viewMode === 'vitrine' && (activeTab === 'inventory' || activeTab === 'parts') ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-8 md:gap-10">
                    {activeTab === 'inventory' ? (
                        groupedModels.map((model, idx) => (
                            <ProductCard
                                key={idx}
                                model={model}
                                onOpen={setSelectedModelName}
                                onShare={(m) => handleShareModel(m.name)}
                            />
                        ))
                    ) : (
                        filteredItems.map((item, idx) => (
                            <ProductCard
                                key={idx}
                                model={{
                                    ...item,
                                    totalQuantity: item.quantity,
                                    minPrice: item.price,
                                    storages: new Set([item.storage].filter(Boolean)),
                                    colors: new Set([item.color].filter(Boolean)),
                                    variants: [item]
                                }}
                                onOpen={() => {
                                    setEditingItem(item);
                                    setIsFormOpen(true);
                                }}
                                onShare={() => {
                                    const sellerName = userProfile?.name || user?.displayName || user?.email?.split('@')[0];
                                    const url = `${window.location.origin}/?c=${orgId}&product=${item.id}&s=${encodeURIComponent(sellerName)}`;
                                    navigator.clipboard.writeText(url);
                                    showToast("Link do produto copiado!", "success");
                                }}
                            />
                        ))
                    )}
                </div>
            ) : activeTab === 'movements' ? (
                <MovementHistory movements={items} isLoading={isLoading} />
            ) : activeTab === 'trash' ? (
                <TrashView items={items} onRestore={handleRestoreItem} isLoading={isLoading} />
            ) : (
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                    <ProductList
                        items={filteredItems}
                        onEdit={(item) => {
                            setEditingItem(item);
                            setIsFormOpen(true);
                        }}
                        onDelete={handleDeleteItem}
                        onShare={(item) => {
                            const sellerName = userProfile?.name || user?.displayName || user?.email?.split('@')[0];
                            const url = `${window.location.origin}/?c=${orgId}&product=${item.id}&s=${encodeURIComponent(sellerName)}`;
                            navigator.clipboard.writeText(url);
                            showToast("Link copiado!", "success");
                        }}
                        userRole={userProfile?.role}
                    />
                </div>
            )}

            {/* Unit Details Drawer */}
            <UnitDrawer
                open={!!selectedModelName}
                onClose={() => setSelectedModelName(null)}
                model={groupedModels.find(m => m.name === selectedModelName)}
                onEditUnit={(unit) => {
                    setEditingItem(unit);
                    setIsFormOpen(true);
                }}
                onDeleteUnit={async (unit) => {
                    if (!confirm("Remover esta unidade?")) return;
                    try {
                        await StockService.deleteItem(orgId, userId, unit.id, unit);
                        showToast("Unidade removida", "success");
                        loadData();
                    } catch {
                        showToast("Erro ao remover", "error");
                    }
                }}
                onShareUnit={(unit) => {
                    const sellerName = userProfile?.name || user?.displayName || user?.email?.split('@')[0];
                    const url = `${window.location.origin}/?c=${orgId}&product=${unit.id}&s=${encodeURIComponent(sellerName)}`;
                    navigator.clipboard.writeText(url);
                    showToast("Link da unidade copiado!", "success");
                }}
            />
            {/* Product Form Modal */}
            <ProductForm
                open={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                item={editingItem}
                onSaved={loadData}
                orgId={orgId}
                userId={userId}
                settings={settings}
                showToast={showToast}
            />

            {/* AI Import Drawer */}
            <AIImportDrawer
                open={isAIImportOpen}
                onClose={() => setIsAIImportOpen(false)}
                onImported={handleAIImported}
                orgId={orgId}
                userId={userId}
            />

            {/* XML Import Modal */}
            <XMLImportModal
                open={isXMLImportOpen}
                onClose={() => {
                    setIsXMLImportOpen(false);
                    loadData();
                }}
                user={user}
                userProfile={userProfile}
            />

            {/* Thermal Label Modal */}
            {isLabelModalOpen && (
                <ThermalLabelModal
                    isOpen={isLabelModalOpen}
                    onClose={() => setIsLabelModalOpen(false)}
                    items={selectedForLabels.map(i => ({ ...i, quantity: 1 }))}
                    settings={settings}
                />
            )}
        </div>
    );
}
