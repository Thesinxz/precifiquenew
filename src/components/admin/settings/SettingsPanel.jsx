import { useState } from 'react';
import {
    CreditCard,
    Tags,
    MessageSquare,
    Gift,
    Save,
    User,
    Diamond,
    LineChart,
    Zap,
    Palette
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { CompanySettings } from './sections/CompanySettings';
import { FinancialSettings } from './sections/FinancialSettings';
import { CategorySettings } from './sections/CategorySettings';
import { MessageTemplates } from './sections/MessageTemplates';
import { GiftsSettings } from './sections/GiftsSettings';
import { BusinessSettings } from './sections/BusinessSettings';
import { ProfileSettings } from './sections/ProfileSettings';
import { LoyaltySettings } from './sections/LoyaltySettings';
import { BrandingSettings } from './sections/BrandingSettings';
import { IntegrationsSettings } from './sections/IntegrationsSettings';
import { CostCenterSettings } from './sections/CostCenterSettings';
import { FiscalSettings } from './sections/FiscalSettings';
import { Building2, FileText } from 'lucide-react';

import { useToast } from '../../ui/Toast';

export function SettingsPanel({ settings, onSave, userProfile }) {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState(() => {
        return localStorage.getItem('erp_settings_active_tab') || 'profile';
    });

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        localStorage.setItem('erp_settings_active_tab', tabId);
    };
    const [localSettings, setLocalSettings] = useState(settings);
    const [isSaving, setIsSaving] = useState(false);

    const handleUpdate = (section, data) => {
        setLocalSettings(prev => ({
            ...prev,
            [section]: data
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(localSettings);
            showToast("Configurações salvas com sucesso!", "success");
        } catch (error) {
            console.error("Save failed in panel", error);
            showToast("Erro ao salvar configurações.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const tabs = [
        { id: 'profile', label: 'Perfil & Loja', icon: User },
        { id: 'branding', label: 'Marca & TV Mode', icon: Palette },
        { id: 'financial', label: 'Financeiro', icon: CreditCard },
        { id: 'cost_centers', label: 'Centros de Custo', icon: Building2 },
        { id: 'fiscal', label: 'Fiscal & NFe', icon: FileText },
        { id: 'categories', label: 'Categorias & Garantias', icon: Tags },
        { id: 'messages', label: 'Mensagens (WhatsApp)', icon: MessageSquare },
        { id: 'gifts', label: 'Brindes & Vitrine', icon: Gift },
        { id: 'loyalty', label: 'Fidelidade & Cashback', icon: Diamond },
        { id: 'integrations', label: 'Integrações (API)', icon: Zap },
        { id: 'business', label: 'BI & Metas', icon: LineChart },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'fiscal':
                return <FiscalSettings data={localSettings.fiscal} onChange={(d) => handleUpdate('fiscal', d)} />;
            case 'profile':
                return <ProfileSettings data={localSettings.company} onChange={(d) => handleUpdate('company', d)} />;
            case 'financial':
                return <FinancialSettings data={localSettings.financial} onChange={(d) => handleUpdate('financial', d)} />;
            case 'cost_centers':
                return <CostCenterSettings data={localSettings.costCenters} onChange={(d) => handleUpdate('costCenters', d)} />;
            case 'categories':
                return (
                    <CategorySettings
                        data={localSettings.categories}
                        gateways={localSettings.financial?.gateways}
                        giftsList={localSettings.gifts?.gifts}
                        onChange={(d) => handleUpdate('categories', d)}
                    />
                );
            case 'messages':
                return <MessageTemplates data={localSettings.messages} categories={localSettings.categories} onChange={(d) => handleUpdate('messages', d)} />;
            case 'gifts':
                return <GiftsSettings data={localSettings.gifts} onChange={(d) => handleUpdate('gifts', d)} userProfile={userProfile} />;
            case 'loyalty':
                return <LoyaltySettings data={localSettings.loyalty} onChange={(d) => handleUpdate('loyalty', d)} />;
            case 'integrations':
                return <IntegrationsSettings data={localSettings.integrations} onChange={(d) => handleUpdate('integrations', d)} />;
            case 'business':
                return <BusinessSettings data={localSettings.business} onChange={(d) => handleUpdate('business', d)} />;
            case 'branding':
                return <BrandingSettings data={localSettings.branding} onChange={(d) => handleUpdate('branding', d)} userProfile={userProfile} />;
            default: return null;
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Configurações do Sistema</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-slate-500">Gerencie taxas, regras de negócio e personalização.</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 disabled:opacity-70"
                >
                    {isSaving ? 'Salvando...' : (
                        <>
                            <Save className="w-4 h-4" />
                            Salvar Tudo
                        </>
                    )}
                </button>
            </div>

            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden min-h-[600px] flex flex-col md:flex-row">
                <aside className="w-full md:w-64 bg-slate-50 border-r border-slate-100 p-2 md:p-4 flex flex-row md:flex-col overflow-x-auto md:overflow-visible gap-1 md:gap-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all whitespace-nowrap",
                                activeTab === tab.id
                                    ? "bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-50"
                                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                            )}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </aside>

                <div className="flex-1 p-6 md:p-8 bg-white overflow-y-auto">
                    <div className="max-w-3xl mx-auto animate-in fade-in duration-300">
                        {renderContent()}
                    </div>
                </div>
            </div>
        </div>
    );
}
