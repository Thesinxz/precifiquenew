import { useState, useEffect, useMemo } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Loader2, Zap, WifiOff, Maximize, Smartphone, ShoppingBag, Plane, ShieldCheck, Truck, Star, Box, ArrowRight, CreditCard, Siren } from 'lucide-react';
import { cn } from '../../lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import { Blurhash } from 'react-blurhash';

export function TVMode({ organizationId }) {
    const [products, setProducts] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const [imageCache, setImageCache] = useState({});

    const [resolvedOrgId, setResolvedOrgId] = useState(null);
    const [dataVersion, setDataVersion] = useState(0); // Trigger for soft re-fetch

    // Background Transition State
    const [bgImageA, setBgImageA] = useState(null);
    const [bgImageB, setBgImageB] = useState(null);
    const [activeBg, setActiveBg] = useState('A'); // 'A' or 'B'

    // 0. Cache Buster / Soft Reload (Every 10 min)
    useEffect(() => {
        const timer = setInterval(() => {
            console.log("Auto-refreshing data...");
            // Use soft refresh instead of hard reload to avoid 404 on TVs
            setDataVersion(v => v + 1);
        }, 10 * 60 * 1000);
        return () => clearInterval(timer);
    }, []);

    // 0.1. Resolve Slug
    useEffect(() => {
        const resolveId = async () => {
            if (!organizationId) return;
            const cleanId = organizationId.split('?')[0].trim();

            if (cleanId.length > 20) {
                setResolvedOrgId(cleanId);
                return;
            }

            try {
                const slugRef = doc(db, 'short_links', cleanId.toLowerCase());
                const slugSnap = await getDoc(slugRef);
                if (slugSnap.exists()) {
                    setResolvedOrgId(slugSnap.data().orgId);
                } else {
                    setErrorMsg(`Link "${cleanId}" não encontrado.`);
                    setLoading(false);
                }
            } catch (e) {
                console.error("Error resolving slug", e);
                setErrorMsg("Erro ao buscar link.");
                setLoading(false);
            }
        };
        resolveId();
    }, [organizationId]);

    // 1. Load Settings
    useEffect(() => {
        const loadSettings = async () => {
            if (!resolvedOrgId) return;
            try {
                const ref = doc(db, 'settings', resolvedOrgId);
                const snap = await getDoc(ref);
                if (snap.exists()) setSettings(snap.data());
            } catch (error) {
                console.error("Error loading settings", error);
            }
        };
        loadSettings();
    }, [resolvedOrgId, dataVersion]);

    // 2. Wake Lock
    useEffect(() => {
        let wakeLock = null;
        const requestWakeLock = async () => {
            try {
                if ('wakeLock' in navigator) {
                    wakeLock = await navigator.wakeLock.request('screen');
                }
            } catch (err) {
                console.error(err);
            }
        };
        requestWakeLock();
        const handleVisibilityChange = () => {
            if (wakeLock !== null && document.visibilityState === 'visible') requestWakeLock();
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            if (wakeLock !== null) wakeLock.release();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // 3. Load Products
    useEffect(() => {
        const loadProducts = async () => {
            if (!resolvedOrgId) return;
            try {
                const q = query(collection(db, 'stock'), where('organizationId', '==', resolvedOrgId));
                const snap = await getDocs(q);
                let allItems = [];
                snap.forEach(doc => {
                    const d = doc.data();
                    const qty = parseInt(d.quantity || 0);
                    if ((!isNaN(qty) && qty > 0) || d.status === 'incoming') {
                        allItems.push({ id: doc.id, ...d });
                    }
                });

                // Shuffle
                for (let i = allItems.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [allItems[i], allItems[j]] = [allItems[j], allItems[i]];
                }

                // If refreshing, replace the list. If it's the first load, set it.
                // We keep the shuffle every time for variety on refresh.
                setProducts(allItems.slice(0, 50));
            } catch (error) {
                console.error(error);
                setErrorMsg("Erro ao buscar estoque.");
            } finally {
                setLoading(false);
            }
        };
        loadProducts();
    }, [resolvedOrgId, dataVersion]);

    // PRELOADER & ROTATION
    useEffect(() => {
        if (products.length === 0) return;

        const preload = async (url) => {
            if (!url || imageCache[url]) return;
            try {
                const img = new Image();
                img.src = url;
            } catch (e) { console.error("Failed preload", e); }
        };

        const timer = setInterval(() => {
            setCurrentIndex(prev => {
                const next = (prev + 1) % products.length;
                // Preload next next
                const nextNext = products[(next + 1) % products.length];
                if (nextNext?.imageUrl) preload(nextNext.imageUrl);
                return next;
            });
        }, 30000); // 30 seconds rotation

        return () => clearInterval(timer);
    }, [products]);

    // BACKGROUND MANAGER
    const currentProduct = useMemo(() => products[currentIndex], [products, currentIndex]);

    useEffect(() => {
        if (!currentProduct?.imageUrl) return;

        const imgUrl = currentProduct.imageUrl;

        // When product changes, update the INACTIVE layer then switch active
        if (activeBg === 'A') {
            setBgImageB(imgUrl);
            setTimeout(() => setActiveBg('B'), 100); // Small delay to ensure render
        } else {
            setBgImageA(imgUrl);
            setTimeout(() => setActiveBg('A'), 100);
        }

    }, [currentProduct?.imageUrl]); // Only runs when URL changes

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };

    const formatBRL = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    if (loading) return <div className="h-screen bg-black flex items-center justify-center"><Loader2 className="w-20 h-20 text-indigo-500 animate-spin" /></div>;
    if (products.length === 0) return (
        <div className="h-screen bg-black flex flex-col items-center justify-center text-slate-500">
            <WifiOff className="w-20 h-20 mb-4 opacity-50" />
            <h2 className="text-2xl font-bold">Sem produtos na vitrine.</h2>
        </div>
    );

    const pixPrice = parseFloat(currentProduct.price || 0);
    // Smart Installment Logic:
    // If we have a stored price12x, check if it's the TOTAL or the INSTALLMENT value.
    // If > pixPrice, it's the Total => Divide by 12.
    // If < pixPrice, it's likely already the Installment value.
    // Fallback: Add 15% to Pix Price and divide by 12.
    let raw12x = parseFloat(currentProduct.price12x || 0);
    if (!raw12x || isNaN(raw12x)) {
        raw12x = pixPrice * 1.15; // 15% standard markup if no custom rate
    }
    const installmentPrice12x = raw12x > pixPrice ? (raw12x / 12) : raw12x;

    const isTech = ['iphone', 'samsung', 'xiaomi', 'motorola', 'ipad', 'macbook', 'watch'].some(k => (currentProduct.category || '').toLowerCase().includes(k) || (currentProduct.name || '').toLowerCase().includes(k));

    return (
        <div className="h-screen w-screen bg-black text-white overflow-hidden relative font-inter select-none cursor-none dark flex flex-col">

            {/* --- SMOOTH BACKGROUND SYSTEM --- */}
            <div className="absolute inset-0 z-0 bg-black overflow-hidden">
                {/* Background Ambient Spotlights - Fixed position */}
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-900/20 blur-[150px] rounded-full" />
                <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-emerald-900/10 blur-[150px] rounded-full" />

                {/* Layer A - Floating Shadow Effect */}
                <div
                    className={cn(
                        "absolute right-[-10%] top-1/2 -translate-y-1/2 h-[80%] w-[50%] bg-contain bg-center bg-no-repeat transition-all duration-[2000ms] ease-in-out blur-3xl opacity-30 saturate-200 contrast-125 mix-blend-lighten",
                        activeBg === 'A' ? "opacity-30 scale-100" : "opacity-0 scale-90"
                    )}
                    style={{ backgroundImage: bgImageA ? `url(${bgImageA})` : 'none' }}
                />
                {/* Layer B - Floating Shadow Effect */}
                <div
                    className={cn(
                        "absolute right-[-10%] top-1/2 -translate-y-1/2 h-[80%] w-[50%] bg-contain bg-center bg-no-repeat transition-all duration-[2000ms] ease-in-out blur-3xl opacity-30 saturate-200 contrast-125 mix-blend-lighten",
                        activeBg === 'B' ? "opacity-30 scale-100" : "opacity-0 scale-90"
                    )}
                    style={{ backgroundImage: bgImageB ? `url(${bgImageB})` : 'none' }}
                />

                {/* Global Overlay to keep text readable */}
                <div className="absolute inset-0 bg-black/60 z-10" />
            </div>

            {/* --- HEADER --- */}
            <div className="w-full p-12 flex justify-between items-center z-20 shrink-0 relative">
                <div className="flex items-center gap-6 animate-in slide-in-from-top-10 duration-1000">
                    {(settings?.branding?.logoUrl || settings?.branding?.logo || settings?.company?.logoUrl || settings?.company?.logo || settings?.logo || settings?.logoUrl) ? (
                        <img
                            src={settings?.branding?.logoUrl || settings?.branding?.logo || settings?.company?.logoUrl || settings?.company?.logo || settings?.logo || settings?.logoUrl}
                            className="h-32 w-auto object-contain drop-shadow-2xl"
                            alt="Logo"
                        />
                    ) : (
                        <div className="h-20 px-8 bg-indigo-600 rounded-2xl flex items-center justify-center text-3xl font-black tracking-widest uppercase shadow-lg shadow-indigo-500/30">
                            {settings?.branding?.appName || settings?.company?.name || 'STORE MODE'}
                        </div>
                    )}
                    <div className="flex flex-col gap-2">
                        <div className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-red-600 to-orange-600 rounded-full shadow-[0_0_30px_rgba(220,38,38,0.6)] animate-pulse">
                            <Zap className="w-5 h-5 text-white fill-white" />
                            <span className="text-lg font-black text-white uppercase tracking-widest">Oferta Relâmpago</span>
                        </div>
                    </div>
                </div>

                <div className="text-right group">
                    <p className="text-3xl font-black text-slate-200 tracking-tighter tabular-nums">
                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                        {new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    {!isFullscreen && (
                        <button onClick={toggleFullscreen} className="absolute top-12 right-12 opacity-0 group-hover:opacity-100 transition-opacity p-4 bg-white/10 rounded-full">
                            <Maximize className="w-6 h-6" />
                        </button>
                    )}
                </div>
            </div>

            {/* --- MAIN CONTENT --- */}
            <div className="relative z-20 w-full flex-1 px-16 pt-4 pb-32 flex flex-col justify-center">
                <div className="grid grid-cols-12 gap-16 items-center">

                    {/* LEFT: INFO */}
                    <div key={`info-${currentProduct.id}`} className="col-span-7 space-y-4 animate-in slide-in-from-left-10 fade-in duration-700">

                        {/* BADGES */}
                        <div className="flex flex-wrap gap-2">
                            {currentProduct.condition && (
                                <span className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-[0.2em] border shadow-lg backdrop-blur-md",
                                    ['novo', 'lacrado'].includes(currentProduct.condition.toLowerCase())
                                        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-emerald-500/20"
                                        : "bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-amber-500/20"
                                )}>
                                    {currentProduct.condition}
                                </span>
                            )}
                            {currentProduct.category && (
                                <span className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                                    {currentProduct.category}
                                </span>
                            )}
                        </div>

                        {/* TITLE & SPECS */}
                        <div>
                            <h1 className={cn(
                                "font-black tracking-tighter leading-[0.9] text-white drop-shadow-2xl mb-2",
                                currentProduct.name.length > 30 ? "text-5xl" : "text-6xl"
                            )}>
                                {currentProduct.name}
                            </h1>

                            {/* Tech Specs or Description */}
                            {isTech ? (
                                <div className="flex flex-wrap gap-3">
                                    {currentProduct.color && (
                                        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-2xl border border-white/10">
                                            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-slate-200 to-slate-400 shadow-inner" />
                                            <span className="text-xl font-bold text-slate-200">{currentProduct.color}</span>
                                        </div>
                                    )}
                                    {(currentProduct.storage || currentProduct.capacity) && (
                                        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-2xl border border-white/10">
                                            <Box className="w-5 h-5 text-indigo-400" />
                                            <span className="text-xl font-bold text-slate-200">
                                                {currentProduct.storage || currentProduct.capacity}
                                                <span className="text-xs text-slate-500 ml-1 font-black">GB</span>
                                            </span>
                                        </div>
                                    )}
                                    {(currentProduct.battery || currentProduct.batteryHealth) && (
                                        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-2xl border border-white/10">
                                            <Zap className={cn("w-5 h-5", parseInt(currentProduct.battery || 0) > 80 ? "text-emerald-400" : "text-amber-400")} />
                                            <span className="text-xl font-bold text-slate-200">
                                                {currentProduct.battery || currentProduct.batteryHealth}%
                                                <span className="text-xs text-slate-500 ml-1 font-black">SAÚDE</span>
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                (currentProduct.description || currentProduct.technicalNotes) &&
                                !((currentProduct.description || currentProduct.technicalNotes).toLowerCase().includes('importado via')) && (
                                    <p className="text-xl font-medium text-slate-400 max-w-2xl leading-relaxed">
                                        {currentProduct.description || currentProduct.technicalNotes}
                                    </p>
                                )
                            )}
                        </div>

                        {/* TRUST BADGES */}
                        <div className="flex gap-6 py-3 border-y border-white/5 opacity-80">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="w-6 h-6 text-emerald-500" />
                                <div>
                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Garantia</p>
                                    <p className="text-xs font-bold text-white">Loja Verificada</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
                                <div>
                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Qualidade</p>
                                    <p className="text-xs font-bold text-white">Premium</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Truck className="w-6 h-6 text-blue-500" />
                                <div>
                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Entrega</p>
                                    <p className="text-xs font-bold text-white">Imediata</p>
                                </div>
                            </div>
                        </div>

                        {/* PRICING */}
                        <div className="space-y-4 mt-2">
                            {/* Main Price Ribbon */}
                            <div className="relative inline-block transform transition-transform hover:scale-105 duration-300">
                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-green-500 -skew-x-12 rounded-xl shadow-[0_0_50px_rgba(16,185,129,0.4)]" />
                                <div className="relative z-10 px-6 py-2 flex flex-col items-start -skew-x-0">
                                    <span className="text-emerald-100 text-xs font-black uppercase tracking-[0.3em] mb-0.5 pl-1">Valor à Vista</span>
                                    <p className="text-6xl font-black text-white tracking-tighter leading-none drop-shadow-lg">
                                        {formatBRL(pixPrice)}
                                    </p>
                                </div>
                            </div>

                            {/* Installments */}
                            <div className="flex items-center gap-4 pl-2 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
                                <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/5">
                                    <CreditCard className="w-6 h-6 text-indigo-300" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-2xl font-bold text-white tracking-tight leading-none">
                                        12x {formatBRL(installmentPrice12x)}
                                    </span>
                                    <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest mt-0.5">
                                        Sem juros no cartão
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: IMAGE */}
                    {/* RIGHT: IMAGE */}
                    <div className="col-span-5 relative flex items-center justify-center -mt-20">
                        {/* Stronger Glow Effect */}
                        <div className="absolute w-[600px] h-[600px] bg-gradient-to-tr from-indigo-500/30 to-emerald-500/30 blur-[120px] rounded-full animate-pulse" />

                        {currentProduct.imageUrl ? (
                            <img
                                key={`img-${currentProduct.id}`}
                                src={currentProduct.imageUrl}
                                className="relative z-10 w-full h-[55vh] object-contain drop-shadow-[0_40px_80px_rgba(0,0,0,0.8)] animate-in zoom-in-90 fade-in duration-1000 slide-in-from-bottom-10"
                            />
                        ) : (
                            <div className="relative z-10 w-full h-[50vh] aspect-square bg-white/5 rounded-[4rem] border-4 border-white/10 flex flex-col items-center justify-center text-slate-600 animate-pulse">
                                <ShoppingBag className="w-32 h-32 mb-8 opacity-20" />
                                <ShieldCheck className="w-16 h-16 opacity-10 absolute top-10 right-10" />
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* --- TICKER (Absolute Bottom) --- */}
            <div className="absolute bottom-0 left-0 w-full h-12 bg-slate-950/90 backdrop-blur-md border-t border-white/10 flex items-center overflow-hidden z-[50]">
                {/* Siren Light Effect Overlay */}
                <div className="absolute left-0 top-0 bottom-0 w-2 bg-red-500 blur-[8px] animate-pulse" />
                <div className="absolute right-0 top-0 bottom-0 w-2 bg-blue-500 blur-[8px] animate-pulse delay-75" />

                <div className="whitespace-nowrap flex animate-[ticker_40s_linear_infinite] w-max">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex items-center gap-12 px-8">
                            {/* New Array Format Support */}
                            {(settings?.branding?.tickerItems && settings?.branding?.tickerItems.length > 0) ? (
                                settings.branding.tickerItems.map((item, idx) => (
                                    <span key={idx} className="text-lg font-bold text-slate-200 tracking-widest flex items-center gap-3 uppercase mr-12">
                                        {/* Siren Icon next to each item or just using the emoji */}
                                        <Siren className="w-5 h-5 text-red-500 animate-[ping_1.5s_ease-in-out_infinite] opacity-75" />
                                        {item.emoji && <span className="text-xl">{item.emoji}</span>}
                                        {item.text}
                                    </span>
                                ))
                            ) : (
                                /* Fallback / Legacy String Format */
                                (settings?.branding?.tvTickerText || settings?.showcase?.tvTickerText) ? (
                                    <span className="text-lg font-bold text-slate-200 tracking-widest flex items-center gap-4 uppercase">
                                        <Siren className="w-5 h-5 text-red-500 animate-pulse" />
                                        {settings?.branding?.tvTickerText || settings?.showcase?.tvTickerText}
                                        <span className="text-emerald-500">•</span>
                                    </span>
                                ) : null
                            )}
                        </div>
                    ))}
                </div>
            </div>
            {/* --- PROGRESS BAR --- */}
            <div key={currentIndex} className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 z-50 animate-[progress_30s_linear]" style={{ width: '100%' }} />

            <style>{`
                @keyframes progress { from { width: 0%; } to { width: 100%; } }
                @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
            `}</style>
        </div>
    );
}
