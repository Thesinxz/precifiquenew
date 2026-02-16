import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ShoppingBag, Wrench, MessageCircle, Calendar, DollarSign, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';

export function ClientTimeline({ events = [], isLoading = false }) {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-40">
                <span className="text-slate-400 font-medium animate-pulse">Carregando histórico...</span>
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className="text-center py-16">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-slate-400 font-medium mb-1">Nenhuma interação registrada</p>
                <p className="text-xs text-slate-400">O histórico aparecerá aqui conforme o cliente interage</p>
            </div>
        );
    }

    // Calculate metrics
    const totalSpent = events
        .filter(e => e.type === 'sale')
        .reduce((sum, e) => sum + (e.total || 0), 0);

    const totalOrders = events.filter(e => e.type === 'sale').length;
    const totalServices = events.filter(e => e.type === 'service_order').length;
    const avgTicket = totalOrders > 0 ? totalSpent / totalOrders : 0;

    const getEventIcon = (type) => {
        switch (type) {
            case 'sale':
                return ShoppingBag;
            case 'service_order':
                return Wrench;
            case 'message':
                return MessageCircle;
            default:
                return Calendar;
        }
    };

    const getEventColor = (type) => {
        switch (type) {
            case 'sale':
                return 'emerald';
            case 'service_order':
                return 'indigo';
            case 'message':
                return 'blue';
            default:
                return 'slate';
        }
    };

    const getEventTitle = (event) => {
        switch (event.type) {
            case 'sale':
                return `Venda #${event.id.slice(0, 6)}`;
            case 'service_order':
                return `OS #${event.osNumber || event.id.slice(0, 6)}`;
            case 'message':
                return 'Mensagem de Suporte';
            default:
                return 'Evento';
        }
    };

    const getStatusBadge = (event) => {
        if (event.type === 'service_order') {
            const statusMap = {
                'triagem': { label: 'Triagem', color: 'amber', icon: Clock },
                'aprovado': { label: 'Aprovado', color: 'blue', icon: CheckCircle },
                'pronto': { label: 'Pronto', color: 'emerald', icon: CheckCircle },
                'concluido': { label: 'Concluído', color: 'emerald', icon: CheckCircle },
                'cancelado': { label: 'Cancelado', color: 'red', icon: AlertCircle }
            };
            const status = statusMap[event.status] || { label: event.status, color: 'slate', icon: Clock };
            const Icon = status.icon;

            return (
                <span className={cn(
                    "inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider",
                    status.color === 'amber' && "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400",
                    status.color === 'blue' && "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400",
                    status.color === 'emerald' && "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400",
                    status.color === 'red' && "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400",
                    status.color === 'slate' && "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                )}>
                    <Icon className="w-3 h-3" />
                    {status.label}
                </span>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6">
            {/* Metrics Summary */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/10 dark:to-emerald-900/5 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/30">
                    <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">LTV Total</p>
                    </div>
                    <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">{formatCurrency(totalSpent)}</p>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-900/10 dark:to-indigo-900/5 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/30">
                    <div className="flex items-center gap-2 mb-2">
                        <ShoppingBag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Compras</p>
                    </div>
                    <p className="text-xl font-black text-indigo-700 dark:text-indigo-300">{totalOrders}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/10 dark:to-blue-900/5 p-4 rounded-2xl border border-blue-200 dark:border-blue-900/30">
                    <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <p className="text-[9px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Ticket Médio</p>
                    </div>
                    <p className="text-xl font-black text-blue-700 dark:text-blue-300">{formatCurrency(avgTicket)}</p>
                </div>
            </div>

            {/* Timeline */}
            <div className="relative">
                {/* Vertical Line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-slate-200 via-slate-200 to-transparent dark:from-slate-700 dark:via-slate-700" />

                <div className="space-y-6">
                    {events.map((event, index) => {
                        const Icon = getEventIcon(event.type);
                        const color = getEventColor(event.type);

                        return (
                            <div key={event.id} className="relative pl-16 group">
                                {/* Timeline Dot */}
                                <div className={cn(
                                    "absolute left-3 top-3 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-slate-900 transition-all group-hover:scale-110",
                                    color === 'emerald' && "bg-emerald-500",
                                    color === 'indigo' && "bg-indigo-500",
                                    color === 'blue' && "bg-blue-500",
                                    color === 'slate' && "bg-slate-400"
                                )}>
                                    <Icon className="w-3 h-3 text-white" />
                                </div>

                                {/* Event Card */}
                                <div className={cn(
                                    "p-5 rounded-2xl border transition-all group-hover:shadow-lg group-hover:-translate-y-0.5",
                                    color === 'emerald' && "bg-emerald-50/50 dark:bg-emerald-900/5 border-emerald-200 dark:border-emerald-900/30 group-hover:border-emerald-300 dark:group-hover:border-emerald-700",
                                    color === 'indigo' && "bg-indigo-50/50 dark:bg-indigo-900/5 border-indigo-200 dark:border-indigo-900/30 group-hover:border-indigo-300 dark:group-hover:border-indigo-700",
                                    color === 'blue' && "bg-blue-50/50 dark:bg-blue-900/5 border-blue-200 dark:border-blue-900/30 group-hover:border-blue-300 dark:group-hover:border-blue-700",
                                    color === 'slate' && "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700"
                                )}>
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-1">{getEventTitle(event)}</h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {event.createdAt ? format(event.createdAt.toDate ? event.createdAt.toDate() : new Date(event.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'Data N/A'}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            {event.total && (
                                                <span className="font-black text-lg text-slate-800 dark:text-slate-100">
                                                    {formatCurrency(event.total)}
                                                </span>
                                            )}
                                            {getStatusBadge(event)}
                                        </div>
                                    </div>

                                    {/* Event Details */}
                                    {event.type === 'sale' && event.items && (
                                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Itens</p>
                                            <ul className="space-y-1">
                                                {event.items.slice(0, 3).map((item, idx) => (
                                                    <li key={idx} className="text-xs text-slate-600 dark:text-slate-300 flex justify-between">
                                                        <span>{item.quantity || 1}x {item.name}</span>
                                                        <span className="font-medium text-slate-400">{formatCurrency(item.originalPrice || 0)}</span>
                                                    </li>
                                                ))}
                                                {event.items.length > 3 && (
                                                    <li className="text-xs text-slate-400 italic">+{event.items.length - 3} itens</li>
                                                )}
                                            </ul>
                                        </div>
                                    )}

                                    {event.type === 'service_order' && (
                                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                            <div className="grid grid-cols-2 gap-3 text-xs">
                                                {event.device && (
                                                    <div>
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Aparelho</p>
                                                        <p className="text-slate-700 dark:text-slate-200 font-medium">{event.device.model || 'N/A'}</p>
                                                    </div>
                                                )}
                                                {event.defect && (
                                                    <div>
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Defeito</p>
                                                        <p className="text-slate-700 dark:text-slate-200 font-medium line-clamp-1">{event.defect}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {event.type === 'message' && event.message && (
                                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                            <p className="text-sm text-slate-600 dark:text-slate-300 italic line-clamp-2">"{event.message}"</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
