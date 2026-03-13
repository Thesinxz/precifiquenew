import { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { useToast, ToastContainer } from '../ui/Toast';
import { db } from '../../lib/firebase';
import { getSmartImage } from '../../data/smartAssets';
import { collection, query, where, getDocs, onSnapshot, doc, getDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import {
    ShoppingCart,
    Search,
    Menu,
    X,
    ChevronDown,
    ChevronUp,
    Filter,
    Instagram,
    MessageCircle,
    Phone,
    MapPin,
    Share2,
    Check,
    CreditCard,
    Smartphone,
    Laptop,
    Watch,
    Headphones,
    ArrowRight,
    Star,
    Sparkles,
    ShieldCheck,
    Truck,
    Clock,
    Zap,
    Tags,
    Info,
    AlertCircle,
    Trash2,
    Plus,
    Minus,
    Camera,
    Battery,
    Bell,
    Sun,
    Moon,
    Award,
    Loader2,
    Mail,
    Facebook,
    SmartphoneNfc,
    Tablet,
    Package,
    ShoppingBag,
    CheckCircle2,
    ListChecks,
    Lock,
    Crown,
    ChevronLeft,
    ChevronRight,
    UserCircle,
    ArrowUpRight,
    Heart
} from 'lucide-react';
import { formatCurrency, cn, generateReferenceCode } from '../../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Lazy Load Chatbot for performance
const SalesChatbot = lazy(() => import('./SalesChatbot').then(m => ({ default: m.SalesChatbot })));


export function PublicCatalog({ organizationId, sellerId, userProfile }) {
    const { toast, showToast, setToast } = useToast();
    const [items, setItems] = useState([]);
    const [orgProfile, setOrgProfile] = useState(null);
    const [sellerProfile, setSellerProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('Todos');

    const searchParams = new window.URLSearchParams(window.location.search);
    const initialProductId = searchParams.get('product');
    const [hasAutoOpened, setHasAutoOpened] = useState(false);

    const [selectedModel, setSelectedModel] = useState(null);
    // Notify "Avise-me" State
    const [notifyModalOpen, setNotifyModalOpen] = useState(false);
    const [notifyProduct, setNotifyProduct] = useState(null);

    const handleNotifySubmit = async (e) => {
        e.preventDefault();
        const form = e.target;
        const name = form.name.value;
        const phone = form.phone.value;

        if (name.length < 3 || phone.length < 10) return showToast("Preencha seus dados corretamente.", "error");

        try {
            await addDoc(collection(db, 'product_requests'), {
                name,
                phone,
                productName: notifyProduct.name,
                variantId: notifyProduct.id || null,
                color: notifyProduct.color || 'N/A',
                storage: notifyProduct.storage || 'N/A',
                organizationId,
                status: 'pending',
                createdAt: serverTimestamp()
            });
            setNotifyModalOpen(false);
            setNotifyProduct(null);
            showToast("🔔 Solicitação recebida! Avisaremos você no WhatsApp.", "success");
        } catch (error) {
            console.error(error);
            showToast("Erro ao registrar solicitação.", "error");
        }
    };

    // Checkout States
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isPixStep, setIsPixStep] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [upsellData, setUpsellData] = useState(null); // New Upsell State
    const [orderLoading, setOrderLoading] = useState(false);
    const [customerData, setCustomerData] = useState(() => {
        try {
            const saved = localStorage.getItem('catalog_customer');
            if (saved) return JSON.parse(saved);
        } catch (e) { console.error("LS Error", e); }
        if (userProfile) return {
            name: userProfile.name || '',
            phone: userProfile.phone || '',
            email: userProfile.email || '',
            cpf: userProfile.cpf || '',
            address: userProfile.address || '',
            city: userProfile.city || '',
            state: userProfile.state || '',
            zip: userProfile.zip || ''
        };
        return {
            name: '', phone: '', email: '', cpf: '', address: '', city: '', state: '', zip: ''
        };
    });

    const [selectedVariant, setSelectedVariant] = useState(null);
    const [selectedColor, setSelectedColor] = useState(null);
    const [selectedStorage, setSelectedStorage] = useState(null);
    const [showInstallmentTable, setShowInstallmentTable] = useState(false);

    const [settings, setSettings] = useState(null);
    const [customStyles, setCustomStyles] = useState({
        primaryColor: '#4f46e5',
        logoUrl: null,
        title: null,
        bannerText: null,
        showOutOfStock: false,
        hidePrices: false
    });

    const [darkMode, setDarkMode] = useState(() => {
        try {
            const saved = localStorage.getItem('catalog_dark_mode');
            return saved !== null ? JSON.parse(saved) : true;
        } catch {
            return true;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('catalog_dark_mode', JSON.stringify(darkMode));
        } catch (e) { console.error(e); }
    }, [darkMode]);

    const [cart, setCart] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('catalog_cart')) || [];
        } catch { return []; }
    });

    useEffect(() => {
        try {
            localStorage.setItem('catalog_cart', JSON.stringify(cart));
        } catch (e) { console.error(e); }
    }, [cart]);

    // Pagination
    const [visibleCount, setVisibleCount] = useState(12);
    const observerTarget = useRef(null);
    const [isCartOpen, setIsCartOpen] = useState(false);

    // Sort & Filter
    const [sortBy, setSortBy] = useState('featured'); // featured, priceAsc, priceDesc, newest
    const [activeCondition, setActiveCondition] = useState('all');

    // Wishlist
    const [wishlist, setWishlist] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('catalog_wishlist')) || [];
        } catch { return []; }
    });

    // Recently Viewed
    const [recentlyViewed, setRecentlyViewed] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('catalog_recent')) || [];
        } catch { return []; }
    });

    useEffect(() => {
        try {
            localStorage.setItem('catalog_wishlist', JSON.stringify(wishlist));
        } catch (e) { console.error(e); }
    }, [wishlist]);

    const toggleWishlist = (e, modelKey) => {
        e.stopPropagation();
        setWishlist(prev =>
            prev.includes(modelKey) ? prev.filter(k => k !== modelKey) : [...prev, modelKey]
        );
        showToast(settings?.whatsapp ? "Adicionado aos Favoritos" : "Lista atualizada", "success");
    };

    const [currentBanner, setCurrentBanner] = useState(0);
    const [selectedInstallments, setSelectedInstallments] = useState(1);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('pix');
    const [isSharing, setIsSharing] = useState(false);

    const bannerRef = useRef(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const [showLeadModal, setShowLeadModal] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [showVerifiedModal, setShowVerifiedModal] = useState(false);

    // Legal Modals
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    const [timeLeft, setTimeLeft] = useState('');

    // Countdown Timer logic
    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date();
            const target = new Date();
            target.setHours(24, 0, 0, 0); // Next Midnight

            const diff = target - now;
            if (diff <= 0) return "00:00:00";

            const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const m = Math.floor((diff / (1000 * 60)) % 60);
            const s = Math.floor((diff / 1000) % 60);

            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        };

        setTimeLeft(calculateTimeLeft());
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // Função para encontrar produtos relacionados para upsell
    const getUpsellProducts = (baseModel) => {
        if (!baseModel) return [];
        const currentCategory = (baseModel.category || '').toLowerCase();
        const currentName = (baseModel.name || '').toLowerCase();

        return items.filter(i => {
            if (i.id === baseModel.id || i.name === baseModel.name) return false;
            if ((i.quantity || 0) <= 0) return false;
            const itemCategory = (i.category || '').toLowerCase();
            const itemName = (i.name || '').toLowerCase();
            const isAccessory = itemCategory.match(/acess|capa|fone|carregador|cabo|pelicula|película|smartwatch|watch|pulseira|magsafe|tag|headphone|airpod|bud|ear/) ||
                               itemName.match(/fone|capa|pelicula|película|carregador|cabo|smartwatch|band|pulseira|magsafe|airtag|airpod|bud|ear|headphone|case|fonte|power|protetor/);
            const isSameCategory = itemCategory === currentCategory && !itemName.includes(currentName);
            return isAccessory || isSameCategory;
        })
            .sort(() => 0.5 - Math.random())
            .slice(0, 4);
    };

    useEffect(() => {
        if (customStyles.title) {
            document.title = `${customStyles.title} | Catálogo Oficial`;

            // Basic Meta Tags Update for Sharing
            const updateMeta = (name, content) => {
                let element = document.querySelector(`meta[property="${name}"]`) || document.querySelector(`meta[name="${name}"]`);
                if (!element) {
                    element = document.createElement('meta');
                    element.setAttribute('property', name);
                    document.head.appendChild(element);
                }
                element.setAttribute('content', content);
            };

            updateMeta('og:title', selectedModel ? `${selectedModel.name} - ${customStyles.title}` : `${customStyles.title} | Catálogo Oficial`);
            updateMeta('og:description', selectedModel ? `Confira ${selectedModel.name} e outros produtos incríveis.` : `Acesse nosso catálogo completo.`);
            if (selectedModel?.image) updateMeta('og:image', selectedModel.image);
        }
    }, [customStyles.title, selectedModel]);

    useEffect(() => {
        try {
            const hasLead = localStorage.getItem('lead_captured');
            if (!hasLead) {
                const timer = setTimeout(() => setShowLeadModal(true), 15000); // 15 seconds delay
                return () => clearTimeout(timer);
            }
        } catch (e) { console.error(e); }
    }, []);

    const handleLeadSubmit = async (e) => {
        e.preventDefault();
        const form = e.target;
        const name = form.name.value;
        const phone = form.phone.value;

        if (name.length < 3 || phone.length < 10) {
            showToast("Por favor, preencha nome e WhatsApp corretamente.", "error");
            return;
        }

        try {
            await addDoc(collection(db, 'leads'), {
                name,
                phone,
                organizationId,
                origin: 'catalog_vip_modal',
                createdAt: serverTimestamp()
            });
            try {
                localStorage.setItem('lead_captured', 'true');
            } catch (e) { console.error(e); }
            setShowLeadModal(false);
            showToast("🎉 Cadastrado na Lista VIP com sucesso!", "success");
        } catch (err) {
            console.error(err);
            showToast("Erro ao cadastrar. Tente novamente.", "error");
        }
    };

    // Get all unique images for the current model
    const modelImages = useMemo(() => {
        if (!selectedModel) return [];
        const imgs = new Set();
        if (selectedModel.image) imgs.add(selectedModel.image);

        selectedModel.variants?.forEach(v => {
            if (v.imageUrl) {
                imgs.add(v.imageUrl);
            } else {
                // Try to get smart image for this variant
                const smart = getSmartImage(selectedModel.name, v.color);
                if (smart) imgs.add(smart);
            }
        });

        return [...imgs];
    }, [selectedModel]);

    // Carousel Auto-play Logic
    useEffect(() => {
        if (!selectedModel || isHovered || modelImages.length <= 1 || selectedVariant) return;
        const interval = setInterval(() => {
            setCurrentImageIndex(prev => (prev + 1) % modelImages.length);
        }, 4000);
        return () => clearInterval(interval);
    }, [selectedModel, modelImages, isHovered, !!selectedVariant]);

    // Pin image on variant change
    useEffect(() => {
        if (!selectedVariant || !selectedModel) return;

        // Try to find exact smart URL for this color
        const smartUrl = getSmartImage(selectedModel.name, selectedColor);

        // Find image that belongs to this variant color
        const variantImageIndex = modelImages.findIndex(img =>
            img.toLowerCase().includes(selectedColor.toLowerCase()) ||
            (selectedVariant.image && img === selectedVariant.image) ||
            (selectedVariant.imageUrl && img === selectedVariant.imageUrl) ||
            (smartUrl && img === smartUrl)
        );

        if (variantImageIndex !== -1) {
            setCurrentImageIndex(variantImageIndex);
        } else if (selectedVariant.image) {
            // If not found in modelImages by name, but variant has specific image
            const specificIndex = modelImages.indexOf(selectedVariant.image);
            if (specificIndex !== -1) setCurrentImageIndex(specificIndex);
        }
    }, [selectedVariant, selectedColor, selectedModel, modelImages]);

    // Reset index and set default variant when model changes
    useEffect(() => {
        setCurrentImageIndex(0);
        if (selectedModel && selectedModel.variants?.length > 0) {
            const first = selectedModel.variants[0];
            setSelectedVariant(first);
            setSelectedColor(first.color);
            setSelectedStorage(first.storage);
        }
    }, [selectedModel]);

    // Removida função de auto-scroll - carrossel agora é estático e manual

    const banners = useMemo(() => {
        const dynamicBanners = settings?.featured?.banners?.filter(b => b.active !== false);

        if (dynamicBanners && dynamicBanners.length > 0) {
            return dynamicBanners.map(b => ({
                text: <>
                    {b.title}<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500 font-black">
                        {b.subtitle}
                    </span>
                </>,
                image: b.imageUrl,
                link: b.link
            }));
        }

        // Fallback Default Banners
        return [
            {
                text: customStyles.bannerText || <>Importação Direta USA.<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-red-500 font-black">Qualidade e Procedência.</span></>,
                image: "https://images.unsplash.com/photo-1485738422979-f5c462d49f74?q=80&w=2099&auto=format&fit=crop"
            },
            {
                text: <>Seu Usado Vale Muito.<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 font-black">Troca Inteligente</span></>,
                image: "https://images.unsplash.com/photo-1616348436168-de43ad0db179?auto=format&fit=crop&q=80"
            },
            {
                text: <>Qualidade Garantida.<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-300 font-black">Seminovos Premium</span></>,
                image: "https://images.unsplash.com/photo-1603539947673-c827b588302d?auto=format&fit=crop&q=80"
            }
        ];
    }, [settings, customStyles.bannerText]);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentBanner(prev => (prev + 1) % banners.length);
        }, 6000);
        return () => clearInterval(timer);
    }, [banners]);

    const addToCart = (variant, model) => {
        if (!variant) return;

        // Strict Stock Check
        if ((variant.quantity || 0) < 1) {
            showToast("Produto esgotado.", "error");
            return;
        }

        setCart(prev => {
            const existing = prev.find(item => item.variant.id === variant.id);
            if (existing) {
                if (existing.quantity >= variant.quantity) {
                    showToast("Limite de estoque atingido disponível para este item.", "error");
                    return prev;
                }
                return prev.map(item => item.variant.id === variant.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { variant, model, quantity: 1 }];
        });

        // UPSELL LOGIC
        // Check if we should suggest accessories
        const category = (model.category || '').toLowerCase();
        const triggers = ['iphone', 'celular', 'samsung', 'xiaomi', 'smartphone', 'ipad', 'android'];

        if (triggers.some(t => category.includes(t))) {
            // Search for accessories in raw 'items'
            const accessories = items.filter(i => {
                const c = (i.category || '').toLowerCase();
                const n = (i.name || '').toLowerCase();
                // Avoid suggesting the same main product
                if (i.id === variant.id || i.name === model.name) return false;
                // Stock check
                if ((i.quantity || 0) <= 0) return false;
                // Accessory keywords
                return c.includes('acess') || c.includes('capa') || c.includes('película') || c.includes('carregador') || c.includes('fone') ||
                    n.includes('capa') || n.includes('película') || n.includes('carregador') || n.includes('fone');
            });

            if (accessories.length > 0) {
                // Group by Name to avoid duplicate products with diff variants
                const uniqueAccessories = [];
                const seen = new Set();
                accessories.forEach(acc => {
                    if (!seen.has(acc.name)) {
                        seen.add(acc.name);
                        // Mock the 'model' structure expected by the UI
                        // FIX: Ensure finalPrice is calculated for the mock variant to avoid NaN in cart
                        const price = parseFloat(acc.price || acc.sellingPrice || (acc.cost * 1.2) || 0);
                        uniqueAccessories.push({
                            ...acc,
                            minPrice: price,
                            image: acc.imageUrl || acc.image,
                            variants: [{ ...acc, finalPrice: price }] // Treat itself as the variant for quick add
                        });
                    }
                });

                // Sort by LOWEST price to encourage quick adds (Cheaper items first)
                const suggestions = uniqueAccessories
                    .sort((a, b) => (parseFloat(a.minPrice) || 0) - (parseFloat(b.minPrice) || 0))
                    .slice(0, 3);

                if (suggestions.length > 0) {
                    // small delay for UX so user sees the "added to cart" feedback first
                    setTimeout(() => setUpsellData({ mainItem: model, suggestions }), 500);
                }
                // Do NOT open cart drawer if showing upsell
                return;
            }
        }

        setIsCartOpen(true);
        setSelectedModel(null);
    };

    const cartTotal = cart.reduce((acc, item) => acc + (item.variant.finalPrice * item.quantity), 0);

    useEffect(() => {
        if (organizationId) {
            // 1. Fetch Static Data (Org & Settings)
            const loadStaticData = async () => {
                try {
                    const fetchOps = [
                        getDoc(doc(db, 'users', organizationId)),
                        getDoc(doc(db, 'settings', organizationId))
                    ];

                    // Removed direct ID fetch here to move to separate async loading

                    const [orgSnap, settingsSnap] = await Promise.all(fetchOps);

                    if (orgSnap.exists()) setOrgProfile(orgSnap.data());



                    if (settingsSnap.exists()) {
                        const s = settingsSnap.data();
                        setSettings(s);
                        const showcase = s.gifts?.showcase || {};
                        const branding = s.branding || {};

                        setCustomStyles({
                            primaryColor: branding.primaryColor || showcase.color || '#4f46e5',
                            logoUrl: branding.logoUrl || showcase.logoUrl || s.company?.logoUrl || s.company?.logo || orgSnap.data()?.logo || null,
                            title: branding.showcaseTitle || showcase.title || s.company?.name || orgSnap.data()?.name || null,
                            bannerText: branding.bannerText || showcase.bannerText || null,
                            bannerImage: branding.bannerImage || showcase.bannerImage || null,
                            showOutOfStock: branding.showOutOfStock ?? showcase.showOutOfStock ?? false,
                            hidePrices: branding.hidePrices ?? showcase.hidePrices ?? false
                        });
                    }
                } catch (e) {
                    console.error("Error loading static data:", e);
                    setError("Falha ao carregar informações da loja.");
                }
            };
            loadStaticData();

            // 1.5 Fetch Seller Dynamic (ID or Name)
            const loadSeller = async () => {
                if (!sellerId) return;
                try {
                    // Try by ID first
                    const docRef = doc(db, 'users', sellerId);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        setSellerProfile({ id: sellerId, ...docSnap.data() });
                        return;
                    }

                    // Try by exact name (fallback)
                    const q = query(collection(db, 'users'), where('name', '==', sellerId), limit(1));
                    const querySnap = await getDocs(q);
                    if (!querySnap.empty) {
                        const sellerDoc = querySnap.docs[0];
                        setSellerProfile({ id: sellerDoc.id, ...sellerDoc.data() });
                    }
                } catch (e) {
                    console.error("Error loading seller:", e);
                }
            };
            loadSeller();

            // 2. Real-time Stock Listener
            setLoading(true);
            const q = query(
                collection(db, 'stock'),
                where('organizationId', '==', organizationId)
            );
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const items = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })).filter(item => item.showInCatalog !== false);
                setItems(items);
                setLoading(false);
            }, (error) => {
                console.error("Stock listener error:", error);
                setLoading(false);
            });
            return () => unsubscribe();
        } else {
            setLoading(false);
        }
    }, [organizationId]);

    const groupedModels = useMemo(() => {
        const filtered = items.filter(item => {
            // 1. Condition Filter
            const itemCond = (item.condition || '').toLowerCase();
            const matchesCondition = activeCondition === 'all' ||
                (activeCondition === 'lacrado' && itemCond === 'lacrado') ||
                (activeCondition === 'novo' && itemCond === 'novo') ||
                (activeCondition === 'seminovo' && (itemCond === 'seminovo' || itemCond === 'vitrine')) ||
                (activeCondition === 'usado' && itemCond === 'usado');

            if (!matchesCondition) return false;

            if (!searchTerm.trim()) {
                const matchesCategory = activeCategory === 'Todos' || item.category === activeCategory;
                return matchesCategory;
            }

            // Advanced Search: Split by spaces and check if all parts exist in item properties
            const searchParts = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);

            // Fields to search in
            const itemString = `
                ${item.name || ''} 
                ${item.model || ''} 
                ${item.category || ''} 
                ${item.color || ''} 
                ${item.storage || ''} 
                ${item.capacity || ''}
            `.toLowerCase();

            const matchesSearch = searchParts.every(part => itemString.includes(part));
            const matchesCategory = activeCategory === 'Todos' || item.category === activeCategory;
            return matchesSearch && matchesCategory;
        });

        const groups = {};
        filtered.forEach(item => {
            // FIX: Smart Grouping
            // Safely handle missing name/model to prevent crashes
            const rawName = item.model || item.name || 'Produto Sem Nome';
            let name = String(rawName).trim();

            if (!item.model) {
                // Remove storage (64GB, 128GB, 1TB) case insensitive to group by base model
                name = name.replace(/\s+\d+\s*(gb|tb)/gi, '').trim();
                // Remove colors if they appear at the end (optional but good for grouping)
            }

            const condition = (item.condition || 'lacrado').toLowerCase();
            const groupKey = `${name}|${condition}`;

            if (!groups[groupKey]) {
                groups[groupKey] = {
                    name,
                    condition,
                    category: item.category || 'Outros',
                    variants: [],
                    minPrice: Infinity,
                    image: item.imageUrl,
                    isFeatured: item.isFeatured || false,
                    colors: new Set(),
                    storages: new Set(),
                    totalQuantity: 0,
                    status: 'unavailable' // Default
                };
            }
            const price = parseFloat(item.price || item.sellingPrice || (item.cost * 1.2) || 0);

            // Standardize Color Casing (Title Case)
            let formattedColor = item.color ? item.color.trim() : null;
            if (formattedColor) {
                formattedColor = formattedColor.charAt(0).toUpperCase() + formattedColor.slice(1).toLowerCase();
                groups[groupKey].colors.add(formattedColor);
            }

            // Standardize Storage
            let formattedStorage = item.storage ? item.storage.trim() : null;
            if (formattedStorage) {
                formattedStorage = formattedStorage.toUpperCase(); // GB, TB
                groups[groupKey].storages.add(formattedStorage);
            }

            const variantWithPrice = {
                ...item,
                finalPrice: price,
                color: formattedColor || item.color,
                storage: formattedStorage || item.storage
            };

            const qty = parseInt(item.quantity || 0);

            // Aggregation: Check if an identical variant (same color + storage) already exists in this group
            // This prevents showing '1 unit' when you have 2 identical units as separate records
            const existingIdx = groups[groupKey].variants.findIndex(v =>
                v.color === variantWithPrice.color &&
                v.storage === variantWithPrice.storage
            );

            if (existingIdx !== -1) {
                // If found, we sum the quantity. 
                // We keep the first one found as the primary reference (price, etc)
                groups[groupKey].variants[existingIdx].quantity = (parseInt(groups[groupKey].variants[existingIdx].quantity) || 0) + qty;
                // If this one has an image and the previous didn't, we can update it? 
                // For now, simple sum is what the user requested.
            } else {
                groups[groupKey].variants.push(variantWithPrice);
            }

            groups[groupKey].totalQuantity += qty;

            // Status Logic:
            if (qty > 0) {
                groups[groupKey].status = 'available';
            } else if (item.status === 'incoming' && groups[groupKey].status !== 'available') {
                groups[groupKey].status = 'incoming';
            } else if (groups[groupKey].status !== 'available' && groups[groupKey].status !== 'incoming') {
                groups[groupKey].status = 'unavailable';
            }

            if (item.isFeatured) groups[groupKey].isFeatured = true;
            groups[groupKey].minPrice = Math.min(groups[groupKey].minPrice, price);

            // Image Logic: Prioritize image from an Available item -> fallback to Smart Image
            const hasImage = !!item.imageUrl;
            const hasStock = (item.quantity || 0) > 0;
            const smartImage = getSmartImage(name, item.color); // Try to get smart image

            if (hasImage) {
                // If no image set yet, take this one
                if (!groups[groupKey].image) {
                    groups[groupKey].image = item.imageUrl;
                    groups[groupKey].hasStockImage = hasStock;
                }
                // If current image is from out-of-stock item, but THIS item has stock, overwrite it
                else if (hasStock && !groups[groupKey].hasStockImage) {
                    groups[groupKey].image = item.imageUrl;
                    groups[groupKey].hasStockImage = true;
                }
            } else if (smartImage && !groups[groupKey].image) {
                // If group has NO image yet, use smart image as fallback
                groups[groupKey].image = smartImage;
            }
        });

        return Object.values(groups).sort((a, b) => {
            // 0. Manual Sort Actions
            if (sortBy === 'priceAsc') return a.minPrice - b.minPrice;
            if (sortBy === 'priceDesc') return b.minPrice - a.minPrice;

            // Default "Smart / Featured" Sort

            // Helper to get Category Priority Score
            const getCatScore = (group) => {
                const catName = (group.category || '').toLowerCase();
                const prodName = (group.name || '').toLowerCase();

                // Detect accessories first - they should ALWAYS have the lowest priority score (0)
                // even if they belong to a brand like Xiaomi or Samsung
                const isAccessory = catName.match(/acess|capa|fone|carregador|cabo|pelicula|película|smartwatch|watch|pulseira|magsafe|tag|headphone|airpod|bud|ear/) ||
                                   prodName.match(/fone|capa|pelicula|película|carregador|cabo|smartwatch|band|pulseira|magsafe|airtag|airpod|bud|ear|headphone|case|fonte/);
                
                if (isAccessory) return 0;

                // Priority 1: iPhones (Highest)
                if (catName.includes('iphone') || prodName.includes('iphone')) return 100;

                // Priority 2: Other Phones (Androids)
                if (catName.match(/samsung|xiaomi|motorola|realme|asus|lg|poco|pixel|google|tecno|oukitel|celular|smartphone|android/) ||
                    prodName.match(/samsung|xiaomi|motorola|realme|asus|lg|poco|pixel|google|tecno|oukitel/)) return 80;

                // Priority 3: MacBooks/iPads (High Value Electronics)
                if (catName.match(/macbook|ipad|tablet|notebook/) || prodName.match(/macbook|ipad/)) return 60;

                // Priority 4: Perfumes
                if (catName.match(/perfume|fragranc|cosmet/) || prodName.match(/perfume|parfum|fragranc|coloni|eau de|toilette/)) return 50;

                return 0; // Others
            };

            // Priority 0: Has Stock (Strict Requirement: Esgotado vem por último)
            // Available(3) > Incoming(2) > Unavailable(1)
            const getStatusScore = (g) => {
                if (g.totalQuantity > 0) return 3;
                if (g.status === 'incoming') return 2;
                return 1;
            };

            // To fulfill "esgotado deve aparecer por ultimo para nao atrapalhar os modelos",
            // we apply this sort logic FIRST.
            const aStatus = getStatusScore(a);
            const bStatus = getStatusScore(b);
            if (aStatus !== bStatus) return bStatus - aStatus; // Higher status first

            // Priority 1: Category Score
            const aScore = getCatScore(a);
            const bScore = getCatScore(b);

            if (aScore !== bScore) return bScore - aScore; // Higher score first

            // Priority 1.5: Condition Score (NEW)
            // Lacrado (100) > Novo (90) > Vitrine (80) > Seminovo (50) > Usado (10)
            const getConditionScore = (condition) => {
                const c = (condition || '').toLowerCase();
                if (c === 'lacrado') return 100;
                if (c === 'novo') return 90;
                if (c === 'vitrine') return 80;
                if (c === 'seminovo') return 50;
                return 10;
            };

            const aCond = getConditionScore(a.condition);
            const bCond = getConditionScore(b.condition);

            // If both are iPhones, sort strictly by Condition THEN Model
            if (aScore === 100) {
                if (aCond !== bCond) return bCond - aCond; // Higher condition first (Lacrado first)

                const extractNumber = (str) => {
                    const match = str.match(/iphone\s*(\d+)/i);
                    return match ? parseInt(match[1]) : 0;
                };
                const extractSuffix = (str) => {
                    str = str.toLowerCase();
                    if (str.includes('pro max')) return 4;
                    if (str.includes('pro')) return 3;
                    if (str.includes('plus')) return 2;
                    return 1;
                };

                const aNum = extractNumber(a.name);
                const bNum = extractNumber(b.name);

                if (aNum !== bNum) return bNum - aNum; // High to Low (15, 14, 13...) AS REQUESTED: "celulares... lacrados" usually implies newest

                const aSuf = extractSuffix(a.name);
                const bSuf = extractSuffix(b.name);
                if (aSuf !== bSuf) return bSuf - aSuf; // Pro Max > Pro > Plus > Standard
            } else {
                // For non-iPhones, still respect condition
                if (aCond !== bCond) return bCond - aCond;
            }

            // Priority 2: Is Featured (Tie-breaker for items with same stock status and category)
            if (b.isFeatured !== a.isFeatured) {
                return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
            }

            // Priority 3: Is Featured
            return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
        });
    }, [items, searchTerm, activeCategory, customStyles.showOutOfStock, sortBy]);

    // Group items into sections for nicer display
    const groupedSections = useMemo(() => {
        // If searching or filtering by category, show flat list
        if (searchTerm || activeCategory !== 'Todos') {
            return [{ id: 'results', title: 'Resultados da Pesquisa', items: groupedModels }];
        }

        const sections = [
            { id: 'iphones_new', title: '✨ iPhones Lacrados', items: [] },
            { id: 'iphones_used', title: '📱 iPhones Seminovos', items: [] },
            { id: 'androids', title: '🚀 Smartphones Android', items: [] },
            { id: 'tablets', title: '📂 Tablets & iPads', items: [] },
            { id: 'perfumes', title: '🌬️ Perfumes Importados', items: [] },
            { id: 'accessories', title: '🔌 Acessórios & Wearables', items: [] },
            { id: 'others', title: '💎 Outros Produtos', items: [] }
        ];

        groupedModels.forEach(model => {
            const name = (model.name || '').toLowerCase();
            const cat = (model.category || '').toLowerCase();
            const cond = (model.condition || '').toLowerCase();

            // 1. Check for Accessories / Wearables FIRST
            const isAccessory = cat.match(/acess|capa|fone|carregador|cabo|pelicula|película|smartwatch|watch|pulseira|magsafe|tag|caixa de som|caixa som|tablet case|ipad case|iphone case|headphone|airpod|bud|ear/) ||
                               name.match(/fone|capa|pelicula|película|carregador|cabo|smartwatch|band|pulseira|magsafe|airtag|airpod|bud|ear|headphone|case|fonte|power|protetor/);

            if (isAccessory) {
                sections[5].items.push(model);
            } else if (name.includes('iphone') || cat.includes('iphone')) {
                // Split iPhone by Condition
                if (cond === 'lacrado' || cond === 'novo') {
                    sections[0].items.push(model);
                } else {
                    sections[1].items.push(model);
                }
            } else if (name.match(/ipad|tablet|tab/) || cat.match(/ipad|tablet/)) {
                sections[3].items.push(model);
            } else if (name.match(/perfume|parfum|fragranc|coloni|colônia|eau de|toilette|scent|quasar|malbec|lily|elysee|hidratante|creme/) || cat.match(/perfume|fragranc|cosmet/)) {
                sections[4].items.push(model);
            } else if (name.match(/samsung|xiaomi|motorola|asus|lg|realme|infinix|poco|pixel|google|tecno|oukitel/) || cat.match(/celular|smartphone|android/)) {
                sections[2].items.push(model);
            } else {
                sections[6].items.push(model);
            }
        });

        return sections.filter(s => s.items.length > 0);
    }, [groupedModels, searchTerm, activeCategory]);

    // Deep Linking: Auto-open product if 'product' param exists
    useEffect(() => {
        if (loading || items.length === 0 || !initialProductId || hasAutoOpened) return;

        // Force find the item in the loaded list
        const targetItem = items.find(i => i.id === initialProductId || i.barcode === initialProductId);

        if (targetItem) {
            // We need to reconstruct the "Group" object that handleOpenModel expects
            // We can either find it in groupedModels OR build a temporary one if groupedModels isn't ready
            const groupName = (targetItem.model || targetItem.name).trim().replace(/\s+\d+\s*(gb|tb)/gi, '').trim();
            const groupCondition = (targetItem.condition || 'lacrado').toLowerCase();

            // Try to find the full group to show siblings (colors/storage)
            let modelToOpen = groupedModels.find(g =>
                g.name === groupName && g.condition === groupCondition
            );

            // Fallback: If group not found in current view (e.g. filtered out?), construct a partial group
            if (!modelToOpen) {
                // Find all siblings in the raw list
                const siblings = items.filter(i => {
                    const iName = (i.model || i.name).trim().replace(/\s+\d+\s*(gb|tb)/gi, '').trim();
                    const iCond = (i.condition || 'lacrado').toLowerCase();
                    return iName === groupName && iCond === groupCondition;
                });

                modelToOpen = {
                    name: groupName,
                    condition: groupCondition,
                    category: targetItem.category,
                    item: targetItem, // Helper
                    image: targetItem.imageUrl,
                    variants: siblings.map(s => ({
                        ...s,
                        finalPrice: parseFloat(s.price || s.sellingPrice || (s.cost * 1.2) || 0),
                        color: s.color ? s.color.charAt(0).toUpperCase() + s.color.slice(1).toLowerCase() : 'Padrão',
                        storage: s.storage ? s.storage.toUpperCase() : null
                    })),
                    colors: new Set(siblings.map(s => s.color).filter(Boolean)),
                    storages: new Set(siblings.map(s => s.storage).filter(Boolean)),
                };
            }

            if (modelToOpen) {
                // Open Modal
                setSelectedModel(modelToOpen);

                // Select specific variant
                const variant = modelToOpen.variants.find(v => v.id === targetItem.id);
                if (variant) {
                    setSelectedVariant(variant);
                    setSelectedColor(variant.color);
                    setSelectedStorage(variant.storage);
                }

                setHasAutoOpened(true);
            }
        }
    }, [loading, items, initialProductId, hasAutoOpened, groupedModels]);

    // Reset pagination
    useEffect(() => {
        setVisibleCount(12);
    }, [searchTerm, activeCategory]);

    // Scroll to top ONLY on category change
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [activeCategory]);

    // Infinite Scroll
    useEffect(() => {
        // Disconnect previous observer
        if (!observerTarget.current) return;

        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting) {
                    setVisibleCount(prev => prev + 12);
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(observerTarget.current);

        return () => observer.disconnect();
    }, [groupedModels.length, loading, searchTerm, activeCategory]); // Re-run when list changes or loading finishes

    const handleOpenModel = (model) => {
        // Add to Recent
        setRecentlyViewed(prev => {
            // Simple deduplication by name + condition
            const filtered = prev.filter(p => !(p.name === model.name && p.condition === model.condition));
            const updated = [model, ...filtered].slice(0, 8);
            try {
                localStorage.setItem('catalog_recent', JSON.stringify(updated));
            } catch (e) { console.error(e); }
            return updated;
        });

        setSelectedModel(model);
        const sorted = [...model.variants].sort((a, b) => a.finalPrice - b.finalPrice);

        // Priority: Cheapest IN STOCK variant
        let bestVariant = sorted.find(v => v.quantity > 0);

        // Fallback: Cheapest variant (even if out of stock)
        if (!bestVariant) bestVariant = sorted[0];

        setSelectedVariant(bestVariant);
        setSelectedColor(bestVariant.color);
        setSelectedStorage(bestVariant.storage);
    };


    // Action: Quick WhatsApp Negotiation directly from card
    const handleQuickWhatsapp = (e, model) => {
        e.stopPropagation();
        const contact = settings?.whatsapp;

        if (!contact) {
            handleOpenModel(model); // fallback to open modal if no whatsapp
            return;
        }

        const message = `Olá! Vi o *${model.name}* (${model.condition}) no catálogo por *${formatCurrency(model.minPrice)}*. Está disponível?`;
        // Ensure proper format
        const phone = String(contact).replace(/\D/g, '');
        // If phone starts with 55, use it, otherwise assume BR
        const fullPhone = phone.startsWith('55') ? phone : `55${phone}`;
        const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    const calculateInstallment = (price, count, categoryName) => {
        if (!price || isNaN(price)) return { total: 0, value: 0 };
        if (!settings) return { total: price, value: price / count };

        // 1. Find Category to get gatewayId (Case insensitive for safety)
        const category = settings?.categories?.find(c =>
            c.name?.toLowerCase() === categoryName?.toLowerCase() ||
            c.id === categoryName
        ) || settings?.categories?.[0];

        const gatewayId = category?.gatewayId || settings?.financial?.activeGatewayId;

        // 2. Find Gateway to get rates
        const gateway = settings?.financial?.gateways?.find(g => g.id === gatewayId) || settings?.financial?.gateways?.[0];

        const rates = gateway?.rates || {};
        const pixRate = parseFloat(rates.pix || 0);
        const nfRate = (category?.requiresNotaFiscal || category?.requiresNf) ? (parseFloat(settings?.financial?.notaFiscalRate) || 0) : 0;

        const rateKey = `credit${count}x`;
        let targetRate = rates[rateKey];

        // Fallback for custom counts or missing rates (Simple interpolation if needed)
        const rate1x = parseFloat(rates.credit1x || 2);
        const rate12x = parseFloat(rates.credit12x || 15);
        if (targetRate === undefined || targetRate === null || targetRate === '') {
            const max = gateway?.rates?.maxInstallments || 12;
            const rateStep = max > 1 ? (rate12x - rate1x) / (max - 1) : 0;
            targetRate = rate1x + (rateStep * (count - 1));
        } else {
            targetRate = parseFloat(targetRate);
        }

        // Smart Pricing Logic: Total Load (Taxes + Bank Fees)
        // Back-calculate from the target net (which we assume the Pix price preserves well)
        const totalPixLoad = (pixRate + nfRate) / 100;
        const baseReceiveAmount = price * (1 - totalPixLoad);

        const totalTargetLoad = (targetRate + nfRate) / 100;

        let total = 0;
        if (totalTargetLoad < 1) {
            total = baseReceiveAmount / (1 - totalTargetLoad);
        } else {
            // Fallback to simple markup if rates are strangely high (>100%)
            total = price * (1 + (targetRate / 100));
        }

        return {
            total,
            value: total / count
        };
    };

    const getCartTotalForPayment = (paymentMethod, installments) => {
        if (paymentMethod === 'pix') return cartTotal;

        return cart.reduce((acc, item) => {
            const { total } = calculateInstallment(item.variant.finalPrice * item.quantity, installments, item.model.category);
            return acc + total;
        }, 0);
    };

    const validateCheckout = () => {
        if (!customerData.name || customerData.name.trim().length < 3) {
            showToast("Informe seu nome completo.", "error");
            return false;
        }
        if (!customerData.phone || customerData.phone.replace(/\D/g, '').length < 10) {
            showToast("WhatsApp inválido (informe DDD + número).", "error");
            return false;
        }
        if (!customerData.email || !customerData.email.includes('@')) {
            showToast("Informe um email válido.", "error");
            return false;
        }
        if (!customerData.cpf || customerData.cpf.replace(/\D/g, '').length < 11) {
            showToast("CPF deve ter pelo menos 11 dígitos.", "error");
            return false;
        }
        if (cart.length === 0) {
            showToast("Sua sacola está vazia.", "error");
            return false;
        }
        if (cart.some(i => i.quantity <= 0)) {
            showToast("A quantidade mínima é 1.", "error");
            return false;
        }
        return true;
    };

    const confirmPayment = async () => {
        if (!validateCheckout()) return;
        setOrderLoading(true);
        try {
            const cartInstallmentTotal = getCartTotalForPayment(selectedPaymentMethod, selectedInstallments);
            const finalTotal = selectedPaymentMethod === 'pix' ? cartTotal : cartInstallmentTotal;

            const orderData = {
                organizationId,
                code: generateReferenceCode('ORD'),
                customer: {
                    name: customerData.name || 'Cliente',
                    phone: customerData.phone || '(00) 00000-0000',
                    email: customerData.email || 'nao-informado@email.com',
                    cpf: customerData.cpf || '000.000.000-00',
                    birthDate: customerData.birthDate || '',
                    address: customerData.address || '',
                    number: customerData.number || '', // Assuming number is part of address string or separate
                    neighborhood: customerData.neighborhood || '',
                    city: customerData.city || '',
                    state: customerData.state || '',
                    cep: customerData.cep || ''
                },
                items: cart.map(i => ({
                    id: i.variant.id, // stockId
                    name: i.model.name,
                    category: i.model.category || 'Outros',
                    variant: { id: i.variant.id, color: i.variant.color, storage: i.variant.storage },
                    quantity: i.quantity,
                    price: i.variant.finalPrice, // Price customer paid
                    unitPrice: i.variant.finalPrice,
                    cost: i.variant.cost || i.model.cost || 0, // Critical for profit
                    totalCost: (i.variant.cost || i.model.cost || 0) * i.quantity,
                    imei: i.variant.imei || ''
                })),
                subtotal: cartTotal,
                total: finalTotal,
                installmentInterest: finalTotal - cartTotal,
                installments: selectedPaymentMethod === 'pix' ? 1 : selectedInstallments,
                status: 'pending',
                sellerId: sellerId || null,
                sellerName: sellerProfile?.name || settings?.salesperson?.name || null,
                paymentMethod: selectedPaymentMethod,
                createdAt: serverTimestamp(),
                settings: settings // IMPORTANT: Pass settings for accurate fee calculation on approval
            };
            await addDoc(collection(db, 'orders'), orderData);

            // Persist customer data for future visits
            localStorage.setItem('catalog_customer', JSON.stringify(customerData));

            const wpPhone = (settings?.company?.phone || orgProfile?.phone || '').replace(/\D/g, '');
            if (wpPhone) {
                const methodLabel = selectedPaymentMethod === 'pix' ? 'PIX/DINHEIRO' : `${selectedInstallments}x no Cartão`;

                let itemsList = cart.map(i => `• ${i.quantity}x ${i.model.name} (${i.variant.storage} - ${i.variant.color})`).join('\n');

                const msg = `🚀 *NOVO PEDIDO RECEBIDO*\n\n` +
                    `👤 *Cliente:* ${customerData.name}\n` +
                    `📱 *WhatsApp:* ${customerData.phone}\n` +
                    `📄 *CPF:* ${customerData.cpf}\n\n` +
                    `📦 *Produtos:*\n${itemsList}\n\n` +
                    `💳 *Forma de Pagamento:* ${methodLabel}\n` +
                    `💰 *Total:* ${formatCurrency(finalTotal)}\n\n` +
                    `_Favor entrar em contato para confirmar o pagamento!_`;

                window.open(`https://wa.me/55${wpPhone}?text=${encodeURIComponent(msg)}`, '_blank');
            }

            setOrderSuccess(true);
            setCart([]);
            setIsCheckoutOpen(false);
            setIsCartOpen(false);
            setSelectedModel(null);
            showToast("📦 Pedido enviado! Verifique seu WhatsApp para os detalhes.", "success");
        } catch (e) {
            console.error(e);
            alert("Erro no checkout.");
        } finally {
            setOrderLoading(false);
        }
    };

    const getColorHex = (name) => {
        const n = name?.toLowerCase() || '';
        // Titanium / Natural - Adjusted for visibility
        if (n.includes('natural') || n.includes('titânio natural') || n.includes('titanium')) return '#bfae9e';

        if (n.includes('preto') || n.includes('black') || n.includes('midnight') || n.includes('grafite')) return '#1a1a1a';
        if (n.includes('branco') || n.includes('white') || n.includes('estelar')) return '#edede9';
        if (n.includes('cinza') || n.includes('gray') || n.includes('silver') || n.includes('prata')) return '#adb5bd';
        if (n.includes('dourado') || n.includes('gold')) return '#d4af37';
        if (n.includes('azul') || n.includes('blue')) return '#344e41';
        if (n.includes('roxo') || n.includes('purple') || n.includes('deep purple')) return '#5a189a';
        if (n.includes('verde') || n.includes('green')) return '#004b23';
        if (n.includes('vermelho') || n.includes('red')) return '#9b2226';
        if (n.includes('rosa') || n.includes('pink')) return '#ff85a1';
        return '#6c757d'; // Default Grey
    };

    if (loading) {
        return (
            <div className={cn("min-h-screen font-inter p-6 space-y-8 animate-in fade-in duration-500", darkMode ? "bg-[#050505]" : "bg-slate-50")}>
                {/* Navbar Skeleton */}
                <div className="flex justify-between items-center">
                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/5 animate-pulse" />
                        <div className="w-32 h-10 rounded-xl bg-slate-200 dark:bg-white/5 animate-pulse" />
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/5 animate-pulse" />
                </div>

                {/* Hero Skeleton */}
                <div className="h-[400px] w-full bg-slate-200 dark:bg-white/5 rounded-[3rem] animate-pulse" />

                {/* Grid Skeleton */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <div key={i} className="aspect-[3/5] bg-slate-200 dark:bg-white/5 rounded-[2rem] animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={cn("min-h-screen font-inter pb-20 transition-all duration-500", darkMode ? "dark bg-[#050505] text-white" : "bg-slate-50 text-slate-900")}>
            <style>{`.bg-primary { background-color: ${customStyles.primaryColor} } .text-primary { color: ${customStyles.primaryColor} }`}</style>

            {/* Top Bar - Smart Banner */}
            <div className="fixed top-0 inset-x-0 h-8 z-[101] flex items-center justify-center text-[9px] md:text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white overflow-hidden">
                <div className="flex items-center animate-in slide-in-from-top duration-500 delay-300">
                    <Sparkles className="w-3 h-3 mr-2 animate-pulse" />
                    Frete Grátis acima de R$ 2.000
                    <span className="mx-2 opacity-50">|</span>
                    <Clock className="w-3 h-3 mr-1" /> Ofertas expiram em {timeLeft}
                </div>
            </div>

            {/* Navbar */}
            <nav className={cn("fixed top-8 inset-x-0 z-[100] transition-all duration-300 border-b", darkMode ? "bg-black/60 border-white/5" : "bg-white/80 border-slate-200", "backdrop-blur-xl")}>
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {customStyles.logoUrl ? (
                            <div className="flex items-center gap-4 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                                <div className="relative">
                                    <img
                                        src={customStyles.logoUrl}
                                        className="h-12 md:h-16 w-auto object-contain transition-all duration-500 group-hover:scale-105"
                                        alt="Logo"
                                        style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <h1 className="text-lg md:text-xl font-black tracking-tighter uppercase text-slate-800 dark:text-white leading-none">
                                        {customStyles.title || orgProfile?.name}
                                    </h1>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[8px] font-black uppercase tracking-[0.3em] text-blue-600">Premium Store</span>
                                        {sellerProfile && (
                                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full animate-in fade-in slide-in-from-left duration-700">
                                                <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                                                <span className="text-[7px] font-black uppercase text-emerald-600 tracking-wider">Atendido por {sellerProfile.name.split(' ')[0]}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-blue-600 shadow-sm relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
                                    <Zap className="h-7 w-7 stroke-[2.5px] relative z-10" />
                                </div>
                                <div className="flex flex-col">
                                    <h1 className="text-xl font-black tracking-tighter uppercase text-slate-800 dark:text-white">
                                        {customStyles.title || orgProfile?.name}
                                    </h1>
                                    {sellerProfile && (
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full w-fit">
                                            <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                                            <span className="text-[7px] font-black uppercase text-emerald-600 tracking-wider">Atendido por {sellerProfile.name.split(' ')[0]}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3 md:gap-4">
                        <button
                            onClick={() => setDarkMode(!darkMode)}
                            className={cn(
                                "p-3 rounded-2xl transition-all duration-300 active:scale-95",
                                darkMode ? "bg-white/5 text-yellow-400 border border-white/10 hover:bg-white/10" : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                            )}
                        >
                            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
                        <button onClick={() => setIsCartOpen(true)} className="p-3 rounded-2xl bg-blue-600 text-white relative shadow-lg shadow-blue-600/20 group active:scale-95 transition-all">
                            <ShoppingCart className="w-5 h-5" />
                            {cart.length > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-black flex items-center justify-center border-2 border-slate-900">{cart.length}</span>}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero / Banner Slider */}
            <header className="relative h-[400px] md:h-[600px] w-full overflow-hidden">
                {banners.map((banner, idx) => (
                    <div
                        key={idx}
                        className={cn("absolute inset-0 transition-opacity duration-1000", idx === currentBanner ? "opacity-100" : "opacity-0")}
                    >
                        <img src={banner.image} className="w-full h-full object-cover animate-pulse-slow" />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent" />
                        <div className="absolute inset-0 flex flex-col items-center md:items-start justify-center p-6 md:pl-24 text-center md:text-left">
                            <h1 className="text-4xl md:text-7xl font-black text-white leading-none tracking-tighter mb-6 max-w-3xl drop-shadow-xl">{banner.text}</h1>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => {
                                        if (banner.link) {
                                            if (banner.link.startsWith('#')) {
                                                const sectionId = banner.link.substring(1);
                                                // Try to set category or condition based on link
                                                if (['iphones', 'androids', 'accessories'].includes(sectionId)) {
                                                    // Scroll to specific section if visible
                                                    const target = document.getElementById(sectionId);
                                                    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                } else if (['lacrado', 'novo', 'seminovo'].includes(sectionId)) {
                                                    setActiveCondition(sectionId);
                                                    document.querySelector('main')?.scrollIntoView({ behavior: 'smooth' });
                                                } else {
                                                    // Default link behavior
                                                    window.location.href = banner.link;
                                                }
                                            } else {
                                                window.location.href = banner.link;
                                            }
                                        } else {
                                            const productsSection = document.querySelector('main');
                                            productsSection?.scrollIntoView({ behavior: 'smooth' });
                                        }
                                    }}
                                    className="px-6 py-3 md:px-8 md:py-4 bg-white dark:bg-white text-blue-900 font-black uppercase tracking-widest rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all text-xs md:text-sm"
                                >
                                    Conferir Ofertas
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </header>

            {/* Stories-style Categories - Modern & Professional */}
            <div className="max-w-7xl mx-auto px-6 py-8 relative z-20 -mt-10">
                <div className="flex items-center gap-4 md:gap-8 overflow-x-auto no-scrollbar pb-4 mask-linear-fade">
                    {(() => {
                        const rawCategories = [...new Set(items.map(i => i.category))].filter(Boolean);
                        const categoryPriority = (name) => {
                            const n = name.toLowerCase();
                            if (n.includes('iphone lacrado')) return 1000;
                            if (n.includes('iphone seminovo')) return 900;
                            if (n.includes('iphone')) return 800;
                            if (n.includes('celular') || n.includes('smartphone')) return 700;
                            if (n.includes('android') || n.includes('samsung') || n.includes('xiaomi')) return 600;
                            if (n.includes('tablet') || n.includes('ipad')) return 500;
                            if (n.includes('perfume')) return 450;
                            if (n.includes('watch') || n.includes('relogio')) return 400;
                            if (n.includes('mac') || n.includes('notebook')) return 300;
                            if (n.includes('acessorio') || n.includes('capa') || n.includes('fone')) return 100;
                            return 200;
                        };

                        const sorted = ['Todos', ...rawCategories.sort((a, b) => categoryPriority(b) - categoryPriority(a))];

                        return sorted.map((cat, i) => {
                            let Icon = Sparkles;
                            const c = cat.toLowerCase();
                            if (c.includes('iphone') || c.includes('celular') || c.includes('android')) Icon = Smartphone;
                            if (c.includes('mac') || c.includes('notebook') || c.includes('laptop')) Icon = Laptop;
                            if (c.includes('pad') || c.includes('tablet')) Icon = Tablet;
                            if (c.includes('watch') || c.includes('relogio')) Icon = Watch;
                            if (c.includes('fone') || c.includes('airpod')) Icon = Headphones;

                            const isActive = activeCategory === cat;

                            return (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className="flex flex-col items-center gap-2 group min-w-[70px] cursor-pointer"
                                >
                                    <div className={cn(
                                        "w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all duration-300 relative p-0.5",
                                        isActive ? "bg-gradient-to-tr from-blue-500 to-fuchsia-500 scale-110 shadow-lg shadow-blue-500/20" : "bg-transparent hover:scale-105"
                                    )}>
                                        <div className={cn(
                                            "w-full h-full rounded-full flex items-center justify-center border-2",
                                            darkMode ? "bg-slate-900 border-white/10" : "bg-white border-slate-100",
                                            isActive && "border-transparent bg-clip-padding"
                                        )}>
                                            <Icon className={cn("w-6 h-6 md:w-8 md:h-8 transition-colors", isActive ? "text-blue-500" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200")} />
                                        </div>
                                    </div>
                                    <span className={cn(
                                        "text-[10px] font-bold uppercase tracking-widest transition-colors text-center w-full truncate px-1",
                                        isActive ? "text-blue-500" : "text-slate-500 dark:text-slate-400"
                                    )}>{cat}</span>
                                </button>
                            );
                        });
                    })()}
                </div>

                {/* Search Bar & Visual Search */}
                <div className="mt-6 max-w-lg mx-auto relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                        placeholder="Buscar iPhone, Mac, AirPods..."
                        className={cn(
                            "w-full py-4 pl-12 pr-6 rounded-3xl font-medium transition-all outline-none border-2",
                            darkMode
                                ? "bg-white/5 border-white/5 focus:border-blue-500/50 focus:bg-white/10 text-white placeholder:text-slate-500"
                                : "bg-white border-slate-100 focus:border-blue-500/50 focus:shadow-xl text-slate-900 placeholder:text-slate-400"
                        )}
                    />
                    {/* Visual Search Suggestions */}
                    {isSearchFocused && !searchTerm && (
                        <div className={cn("absolute top-full left-0 right-0 mt-2 p-4 rounded-3xl shadow-xl border animate-in slide-in-from-top-2 z-30", darkMode ? "bg-[#101010] border-white/10" : "bg-white border-slate-100")}>
                            <p className="text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-3 ml-2">Em Alta 🔥</p>
                            <div className="grid grid-cols-2 gap-2">
                                {items.filter(i => i.isFeatured).slice(0, 4).map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => setSearchTerm(item.name)}
                                        className={cn("flex items-center gap-3 p-2 rounded-xl text-left transition-colors", darkMode ? "hover:bg-white/5" : "hover:bg-slate-50")}
                                    >
                                        <img src={item.imageUrl} className="w-10 h-10 object-contain bg-white rounded-lg p-1" />
                                        <div>
                                            <p className={cn("text-xs font-bold truncate", darkMode ? "text-white" : "text-slate-800")}>{item.name}</p>
                                            <p className="text-[10px] text-blue-500 font-black">{formatCurrency(item.price || item.sellingPrice)}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Condition Filters */}
                <div className="flex justify-center gap-2 mt-6 flex-wrap px-4">
                    {[
                        { id: 'all', label: 'Todos', icon: null },
                        { id: 'lacrado', label: 'Lacrados', icon: '✨' },
                        { id: 'novo', label: 'Novos', icon: '🆕' },
                        { id: 'vitrine', label: 'Vitrine', icon: '💎' },
                        { id: 'seminovo', label: 'Seminovos', icon: '📱' },
                        { id: 'usado', label: 'Usados', icon: '♻️' }
                    ].map(cond => (
                        <button
                            key={cond.id}
                            onClick={() => setActiveCondition(cond.id)}
                            className={cn(
                                "px-3 py-1 md:px-4 md:py-2 rounded-full text-[10px] md:text-xs font-black uppercase tracking-wider transition-all border",
                                activeCondition === cond.id
                                    ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/25 scale-105"
                                    : darkMode ? "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white" : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                            )}
                        >
                            {cond.icon && <span className="mr-1.5">{cond.icon}</span>}
                            {cond.label}
                        </button>
                    ))}
                </div>

                {/* Sort Bar */}
                <div className="flex justify-end mt-4 px-2">
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                        <button onClick={() => setSortBy('featured')} className={cn("px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all", sortBy === 'featured' ? "bg-blue-600 text-white shadow-lg" : "text-slate-500 hover:text-white")}>Destaques</button>
                        <button onClick={() => setSortBy('priceAsc')} className={cn("px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all", sortBy === 'priceAsc' ? "bg-blue-600 text-white shadow-lg" : "text-slate-500 hover:text-white")}>Menor Preço</button>
                        <button onClick={() => setSortBy('priceDesc')} className={cn("px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all", sortBy === 'priceDesc' ? "bg-blue-600 text-white shadow-lg" : "text-slate-500 hover:text-white")}>Maior Preço</button>
                    </div>
                </div>
            </div>

            {/* Grid */}
            {/* Grid */}
            <main className="max-w-7xl mx-auto px-4 md:px-6 py-12 space-y-16">
                {groupedSections.map(section => (
                    <section key={section.id} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="flex items-center gap-4 mb-6 md:mb-8">
                            <h2 className={cn("text-xl md:text-3xl font-black tracking-tighter uppercase", darkMode ? "text-white" : "text-slate-900")}>
                                {section.title}
                            </h2>
                            <div className={cn("h-px flex-1 rounded-full", darkMode ? "bg-white/10" : "bg-slate-200")} />
                            <span className={cn("text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full", darkMode ? "bg-white/5 text-white/50" : "bg-slate-100 text-slate-400")}>
                                {section.items.length} itens
                            </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-8">
                            {section.items.map(model => (
                                <div
                                    key={`${model.name}-${model.condition}`}
                                    onClick={() => handleOpenModel(model)}
                                    className={cn(
                                        "group p-4 md:p-6 rounded-3xl md:rounded-[2.5rem] border transition-all hover:-translate-y-1 cursor-pointer flex flex-col h-full",
                                        darkMode ? "bg-slate-900/40 border-white/5 hover:bg-slate-900 border-blue-500/30" : "bg-white border-slate-200 hover:shadow-2xl",
                                        model.isFeatured && (darkMode ? "ring-1 ring-amber-500/50" : "ring-1 ring-amber-500/50 shadow-lg shadow-amber-50")
                                    )}
                                >
                                    {/* Badges Overlay */}
                                    <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 pointer-events-none">
                                        {model.condition?.toLowerCase() === 'lacrado' && (
                                            <span className="px-2.5 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-[8px] md:text-[9px] font-black text-white uppercase tracking-wider rounded-lg shadow-lg shadow-purple-500/20 backdrop-blur-md">
                                                ✨ Lacrado
                                            </span>
                                        )}
                                        {model.condition?.toLowerCase() === 'novo' && (
                                            <span className="px-2.5 py-1 bg-gradient-to-r from-blue-600 to-cyan-500 text-[8px] md:text-[9px] font-black text-white uppercase tracking-wider rounded-lg shadow-lg shadow-blue-500/20 backdrop-blur-md">
                                                🆕 Novo
                                            </span>
                                        )}
                                        {model.condition?.toLowerCase() === 'vitrine' && (
                                            <span className="px-2.5 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-[8px] md:text-[9px] font-black text-white uppercase tracking-wider rounded-lg shadow-lg shadow-amber-500/20 backdrop-blur-md">
                                                💎 Vitrine
                                            </span>
                                        )}
                                        {model.isFeatured && (
                                            <span className="px-2.5 py-1 bg-gradient-to-r from-amber-400 to-yellow-400 text-[8px] md:text-[9px] font-black text-black uppercase tracking-wider rounded-lg shadow-lg shadow-yellow-400/20 backdrop-blur-md">
                                                ⭐ Destaque
                                            </span>
                                        )}
                                    </div>
                                    {/* Image Area */}
                                    <div className="aspect-[4/5] bg-black/5 rounded-2xl md:rounded-3xl mb-3 overflow-hidden flex items-center justify-center relative">
                                        {model.image ? (
                                            <img src={model.image} loading="lazy" className="w-full h-full object-contain p-2 md:p-4 transition-transform group-hover:scale-110" />
                                        ) : (
                                            <Smartphone className="w-12 h-12 md:w-16 md:h-16 text-slate-700 opacity-20" />
                                        )}
                                        {model.isFeatured && (
                                            <div className="absolute top-2 left-2 bg-amber-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1 animate-pulse">
                                                <Sparkles className="w-2 h-2" />
                                                DESTAQUE
                                            </div>
                                        )}
                                        <div className="absolute top-2 md:top-4 right-2 md:right-4 bg-black/40 backdrop-blur px-2 md:px-3 py-1 md:py-1.5 rounded-full flex items-center gap-1">
                                            <Star className="w-2 md:w-3 h-2 md:h-3 text-yellow-400 fill-yellow-400" />
                                            <span className="text-[8px] md:text-[10px] font-black text-white">4.9</span>
                                        </div>
                                        <button
                                            onClick={(e) => toggleWishlist(e, `${model.name}|${model.condition}`)}
                                            className="absolute bottom-2 right-2 p-2 rounded-full bg-black/10 hover:bg-black/20 backdrop-blur-md transition-all active:scale-95 z-20"
                                        >
                                            <Heart className={cn("w-5 h-5 transition-colors drop-shadow-sm", wishlist.includes(`${model.name}|${model.condition}`) ? "fill-red-500 text-red-500" : "text-white")} />
                                        </button>
                                        {model.status === 'incoming' ? (
                                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                                                <div className="bg-sky-500 text-white text-[10px] md:text-xs font-black px-4 py-2 rounded-xl shadow-2xl rotate-[-5deg]">
                                                    A CHEGAR
                                                </div>
                                            </div>
                                        ) : model.totalQuantity <= 0 && (
                                            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-10 rounded-2xl md:rounded-3xl">
                                                <div className="bg-red-600 text-white text-[10px] md:text-xs font-black px-4 py-2 rounded-xl shadow-2xl rotate-[-5deg] border-2 border-white/20">
                                                    ESGOTADO
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 flex flex-col">
                                        {/* Condition Badge & Category - Moved Below Image */}
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={cn("px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider",
                                                model.condition === 'lacrado' || model.condition === 'novo' ? "bg-white text-slate-900 border border-slate-200" :
                                                    model.condition === 'vitrine' ? "bg-slate-800 text-white border border-slate-700" :
                                                        "bg-slate-100 text-slate-500"
                                            )}>
                                                {model.condition === 'vitrine' ? 'Seminovo' : model.condition}
                                            </span>
                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{model.category}</span>
                                        </div>

                                        {/* Verified Badge */}
                                        {(model.condition === 'vitrine' || model.condition === 'usado' || model.condition === 'seminovo') && (
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[9px] font-black uppercase tracking-wider mb-2 cursor-pointer hover:bg-emerald-500/20 w-fit">
                                                <ShieldCheck className="w-3 h-3" />
                                                {customStyles.title ? `Selo ${customStyles.title}` : 'Selo Aprovado'}
                                            </div>
                                        )}

                                        <div className="flex justify-between items-start mb-1 md:mb-2 min-h-[40px] md:min-h-[48px]">
                                            <h3 className="text-sm md:text-lg font-black tracking-tighter uppercase leading-tight line-clamp-2 pr-2 overflow-hidden text-ellipsis display-box box-orient-vertical">{model.name}</h3>
                                            {model.status === 'incoming' ? (
                                                <span className="text-[8px] font-black text-sky-500 flex items-center gap-1 shrink-0">
                                                    <div className="w-1 h-1 bg-sky-500 rounded-full animate-pulse" />
                                                    EM TRÂNSITO
                                                </span>
                                            ) : model.totalQuantity > 0 ? (
                                                <span className="text-[8px] font-black text-emerald-500 flex items-center gap-1 shrink-0">
                                                    <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                                                    DISPONÍVEL
                                                </span>
                                            ) : (
                                                <span className="text-[8px] font-black text-red-500 flex items-center gap-1 shrink-0">
                                                    <div className="w-1 h-1 bg-red-500 rounded-full" />
                                                    ESGOTADO
                                                </span>
                                            )}
                                        </div>

                                        {/* Storage Options */}
                                        {model.storages && model.storages.size > 0 && (
                                            <div className="flex flex-wrap gap-1 mb-2">
                                                {[...model.storages]
                                                    .sort((a, b) => parseInt(String(a).replace(/\D/g, '')) - parseInt(String(b).replace(/\D/g, '')))
                                                    .slice(0, 3)
                                                    .map(s => (
                                                        <span key={s} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/5 uppercase">
                                                            {s}
                                                        </span>
                                                    ))}
                                                {model.storages.size > 3 && (
                                                    <span className="text-[9px] text-slate-400 dark:text-slate-600 font-bold px-1">+</span>
                                                )}
                                            </div>
                                        )}

                                        {/* Color Indicators on Card */}
                                        <div className="flex gap-1.5 mb-4">
                                            {[...model.colors].slice(0, 5).map(c => (
                                                <div
                                                    key={c}
                                                    className={cn(
                                                        "w-3.5 h-3.5 rounded-full border shadow-sm ring-1",
                                                        darkMode ? "border-black/20 ring-white/5" : "border-black/5 ring-black/5"
                                                    )}
                                                    style={{ backgroundColor: getColorHex(c) }}

                                                    title={c}
                                                />
                                            ))}
                                            {model.colors.size > 5 && (
                                                <span className="text-[8px] font-black text-slate-500 flex items-center">+{model.colors.size - 5}</span>
                                            )}
                                        </div>
                                        {/* Price Display */}
                                        <div className="mt-auto pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">A partir de</p>
                                                {model.status === 'incoming' ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xl md:text-2xl font-black text-slate-500 tracking-tighter">Em Breve</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col">
                                                        <span className={cn("text-xl md:text-2xl font-black tracking-tighter", darkMode ? "text-white" : "text-slate-900")}>
                                                            {formatCurrency(model.minPrice)}
                                                        </span>
                                                        {(() => {
                                                            const catInfo = settings?.categories?.find(c => c.name === model.category || c.id === model.category);
                                                            const gatewayId = catInfo?.gatewayId || settings?.financial?.activeGatewayId;
                                                            const gateway = settings?.financial?.gateways?.find(g => g.id === gatewayId) || settings?.financial?.gateways?.[0];
                                                            const maxInst = gateway?.rates?.maxInstallments || 12;
                                                            const instVal = calculateInstallment(model.minPrice, maxInst, model.category).value;

                                                            return (
                                                                <span className="text-[9px] text-slate-400 font-bold mt-0.5">
                                                                    ou em até {maxInst}x de {formatCurrency(instVal)}
                                                                </span>
                                                            );
                                                        })()}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                {settings?.whatsapp && (
                                                    <button
                                                        onClick={(e) => handleQuickWhatsapp(e, model)}
                                                        className="p-2 md:p-3 bg-emerald-500 text-white rounded-xl md:rounded-2xl shadow-lg shadow-emerald-500/20 group-hover:scale-105 active:scale-95 transition-all z-20"
                                                        title="Negociar no WhatsApp"
                                                    >
                                                        <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
                                                    </button>
                                                )}
                                                <button className="p-2 md:p-3 bg-blue-600 text-white rounded-xl md:rounded-2xl shadow-lg shadow-blue-600/20 group-hover:scale-105 active:scale-95 transition-all">
                                                    <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ))}

                {groupedSections.length === 1 && groupedSections[0].id === 'results' && visibleCount < groupedModels.length && (
                    <div ref={observerTarget} className="h-24 flex items-center justify-center w-full">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                )}
            </main>

            {/* Product Detail Modal */}
            {selectedModel && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => { setSelectedModel(null); setShowInstallmentTable(false); }} />
                    <div className={cn("w-full max-w-5xl rounded-[3rem] shadow-2xl relative flex flex-col md:flex-row max-h-[90vh] overflow-hidden animate-in zoom-in-95", darkMode ? "bg-slate-900 text-white" : "bg-white text-slate-900")}>
                        <button
                            onClick={() => { setSelectedModel(null); setShowInstallmentTable(false); }}
                            className={cn(
                                "absolute top-8 right-8 z-[210] p-4 rounded-full transition-all active:scale-95",
                                darkMode ? "bg-white/5 hover:bg-white/10 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-900"
                            )}
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div
                            className={cn("md:w-1/2 p-4 md:p-12 flex items-center justify-center relative overflow-hidden group/gallery min-h-[300px] md:min-h-0", darkMode ? "bg-black/20" : "bg-slate-50")}
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                        >
                            {/* Stories Indicators */}
                            {modelImages.length > 1 && (
                                <div className="absolute top-4 left-4 right-4 flex gap-1 z-[210]">
                                    {modelImages.map((_, i) => (
                                        <div key={i} className="h-0.5 md:h-1 flex-1 bg-black/10 rounded-full overflow-hidden">
                                            <div
                                                className={cn(
                                                    "h-full bg-blue-600 transition-all duration-[4000ms] ease-linear",
                                                    i < currentImageIndex ? "w-full" : i === currentImageIndex && !isHovered ? "w-full" : "w-0"
                                                )}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Carousel Navigation */}
                            {modelImages.length > 1 && (
                                <>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev - 1 + modelImages.length) % modelImages.length); }}
                                        className="absolute left-0 top-0 bottom-0 w-1/4 z-[205] cursor-w-resize"
                                    />
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev + 1) % modelImages.length); }}
                                        className="absolute right-0 top-0 bottom-0 w-3/4 z-[205] cursor-e-resize"
                                    />
                                </>
                            )}

                            <img
                                src={modelImages[currentImageIndex] || selectedModel.image}
                                className="max-h-[250px] md:max-h-[400px] object-contain animate-float transition-all duration-300"
                                style={{ transform: `scale(${isHovered ? 1.05 : 1})` }}
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                }}
                            />

                            {/* Image Counter */}
                            {modelImages.length > 1 && (
                                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black text-white/80 uppercase tracking-widest border border-white/10">
                                    {currentImageIndex + 1} / {modelImages.length}
                                </div>
                            )}
                        </div>

                        <div className={cn("md:w-1/2 flex-1 md:flex-none flex flex-col min-h-0 relative", darkMode ? "bg-[#050505]" : "bg-white")}>
                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto p-6 md:p-8 no-scrollbar">
                                <span className="px-3 py-1 bg-blue-100/50 text-blue-600 rounded-lg text-[9px] font-bold uppercase tracking-widest mb-4 inline-block">{selectedModel.category}</span>
                                <h2 className="text-3xl md:text-4xl font-black tracking-tighter mb-2 leading-none">{selectedModel.name}</h2>

                                <div className="flex flex-col mb-6 mt-4">
                                    <div className="flex items-baseline gap-2">
                                        <span className={cn("text-3xl font-black tracking-tighter", darkMode ? "text-white" : "text-slate-900")}>
                                            {formatCurrency(selectedVariant?.finalPrice || 0)}
                                        </span>
                                        {selectedVariant?.oldPrice && (
                                            <span className="text-sm text-slate-400 line-through font-bold">
                                                {formatCurrency(selectedVariant.oldPrice)}
                                            </span>
                                        )}
                                    </div>
                                    {(() => {
                                        const cat = settings?.categories?.find(c => c.name === selectedModel?.category || c.id === selectedModel?.category);
                                        const gId = cat?.gatewayId || settings?.financial?.activeGatewayId;
                                        const gway = settings?.financial?.gateways?.find(g => g.id === gId) || settings?.financial?.gateways?.[0];
                                        const maxInst = gway?.rates?.maxInstallments || 12;
                                        const instData = calculateInstallment(selectedVariant?.finalPrice || 0, maxInst, selectedModel?.category);
                                        return (
                                            <p className="text-[11px] font-bold text-blue-500 mt-1">
                                                ou em até <span className="underline">{maxInst}x de {formatCurrency(instData.value)}</span> no cartão
                                            </p>
                                        );
                                    })()}
                                </div>

                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-8 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                                    <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                        Disponibilidade imediata
                                    </div>
                                    {selectedVariant?.quantity > 0 && selectedVariant?.quantity < 10 && (
                                        <div className="flex items-center gap-1.5 text-amber-600 text-[10px] font-bold uppercase tracking-wider">
                                            <div className="w-1 h-1 bg-amber-500 rounded-full animate-pulse" />
                                            Restam {selectedVariant.quantity} unidades
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                                        <ShieldCheck className="w-3 h-3 text-blue-500" />
                                        Garantia de {(selectedModel.condition === 'lacrado' || selectedModel.condition === 'novo') ? '1 ano' : '6 meses'} ({selectedModel.condition === 'vitrine' ? 'Seminovo' : selectedModel.condition})
                                    </div>
                                </div>

                                {/* Battery Health */}
                                {(selectedModel.category.toLowerCase().includes('iphone') || selectedModel.category.toLowerCase().includes('celular')) && (selectedModel.condition !== 'novo' && selectedModel.condition !== 'lacrado') && (
                                    <div className="space-y-4 mb-6 animate-in slide-in-from-left-2 duration-500 delay-100">
                                        <div className={cn("px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border w-fit",
                                            (selectedVariant?.batteryHealth && selectedVariant?.batteryHealth < 85) ? "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                                        )}>
                                            <Battery className="w-4 h-4" />
                                            {selectedVariant?.batteryHealth ? `Bateria deste item: ${selectedVariant.batteryHealth}%` : "Garantia de Bateria 80%+"}
                                        </div>

                                        <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 border border-slate-100 dark:border-white/5">
                                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 flex items-center gap-2">
                                                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Inspecionado e Aprovado
                                            </h4>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Face ID
                                                </div>
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Tela TrueTone
                                                </div>
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Câmeras
                                                </div>
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> iCloud Limpo
                                                </div>
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Som & Mic
                                                </div>
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Rede/Chip
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Colors */}
                                {selectedModel.colors.size > 0 && (
                                    <div className="space-y-4 mb-6">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Cores Disponíveis</label>
                                        <div className="flex flex-wrap gap-3">
                                            {[...selectedModel.colors].map(color => {
                                                const hasAnyStock = selectedModel.variants.some(v => v.color === color && v.quantity > 0);
                                                return (
                                                    <button
                                                        key={color}
                                                        disabled={!hasAnyStock}
                                                        onClick={() => {
                                                            if (!hasAnyStock) return;
                                                            setSelectedColor(color);
                                                            let bestVariant = selectedModel.variants.find(v => v.color === color && v.storage === selectedStorage && v.quantity > 0);
                                                            if (!bestVariant) bestVariant = selectedModel.variants.find(v => v.color === color && v.storage === selectedStorage);
                                                            if (!bestVariant) bestVariant = selectedModel.variants.find(v => v.color === color && v.quantity > 0);
                                                            if (!bestVariant) bestVariant = selectedModel.variants.find(v => v.color === color);

                                                            if (bestVariant) {
                                                                setSelectedVariant(bestVariant);
                                                                if (bestVariant.storage !== selectedStorage) setSelectedStorage(bestVariant.storage);
                                                                if (bestVariant.imageUrl) {
                                                                    const imgIndex = modelImages.indexOf(bestVariant.imageUrl);
                                                                    if (imgIndex !== -1) setCurrentImageIndex(imgIndex);
                                                                }
                                                            }
                                                        }}
                                                        className={cn(
                                                            "group flex flex-col items-center gap-2 transition-all duration-300 relative",
                                                            // State Styling
                                                            selectedColor === color
                                                                ? "scale-110 opacity-100 z-10"
                                                                : (hasAnyStock ? "opacity-100 hover:scale-110 cursor-pointer" : "opacity-20 grayscale cursor-not-allowed contrast-50 brightness-50")
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "w-8 h-8 md:w-10 md:h-10 rounded-full shadow-lg relative transition-all",
                                                            selectedColor === color ? "ring-2 ring-offset-2 ring-blue-600 dark:ring-offset-slate-900 border-2 border-white" : "border border-slate-200 dark:border-white/10",
                                                            !hasAnyStock && "border-slate-800 bg-slate-800"
                                                        )} style={{ backgroundColor: getColorHex(color) }}>
                                                            {selectedColor === color && (
                                                                <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in spin-in-90 duration-300">
                                                                    <Check className="w-5 h-5 text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)] stroke-[3px]" />
                                                                </div>
                                                            )}
                                                            {!hasAnyStock && (
                                                                <div className="absolute inset-0 flex items-center justify-center">
                                                                    <div className="w-[120%] h-[2px] bg-red-500/50 rotate-45 absolute" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className={cn(
                                                            "text-[9px] font-black uppercase tracking-wider transition-colors",
                                                            selectedColor === color ? "text-blue-600 dark:text-blue-400 scale-110" : "text-slate-500",
                                                            !hasAnyStock && "text-slate-700 line-through"
                                                        )}>{color}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Storage */}
                                {selectedModel.storages.size > 0 && (
                                    <div className="space-y-4 mb-8">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Capacidade</label>
                                        <div className="flex flex-wrap gap-2">
                                            {[...selectedModel.storages].map(storage => {
                                                const isCompatibleWithColor = selectedModel.variants.some(v => v.storage === storage && v.color === selectedColor);
                                                const hasStockInColor = selectedModel.variants.some(v => v.storage === storage && v.color === selectedColor && v.quantity > 0);
                                                return (
                                                    <button
                                                        key={storage}
                                                        onClick={() => {
                                                            setSelectedStorage(storage);
                                                            let bestVariant = selectedModel.variants.find(v => v.storage === storage && v.color === selectedColor && v.quantity > 0);
                                                            if (!bestVariant) bestVariant = selectedModel.variants.find(v => v.storage === storage && v.color === selectedColor);
                                                            if (!bestVariant) bestVariant = selectedModel.variants.find(v => v.storage === storage && v.quantity > 0);
                                                            if (!bestVariant) bestVariant = selectedModel.variants.find(v => v.storage === storage);

                                                            if (bestVariant) {
                                                                setSelectedVariant(bestVariant);
                                                                if (bestVariant.color !== selectedColor) {
                                                                    setSelectedColor(bestVariant.color);
                                                                    if (bestVariant.imageUrl) {
                                                                        const imgIndex = modelImages.indexOf(bestVariant.imageUrl);
                                                                        if (imgIndex !== -1) setCurrentImageIndex(imgIndex);
                                                                    }
                                                                }
                                                            }
                                                        }}
                                                        className={cn(
                                                            "px-3 py-2 rounded-lg text-xs font-bold border-2 transition-all",
                                                            selectedStorage === storage
                                                                ? "bg-blue-600 border-blue-600 text-white shadow-md"
                                                                : cn("bg-transparent hover:border-blue-200", darkMode ? "border-white/10 text-slate-400" : "border-slate-200 text-slate-600"),
                                                            !isCompatibleWithColor && "opacity-50 dashed border-slate-300",
                                                            (!hasStockInColor && isCompatibleWithColor) && "opacity-70"
                                                        )}
                                                    >
                                                        {storage}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                            </div>

                            {/* Sticky Footer */}
                            <div className={cn("px-4 py-4 border-t z-20 shrink-0 flex items-center justify-between gap-2 md:gap-4", darkMode ? "bg-[#050505] border-white/5" : "bg-white border-slate-100")}>
                                {/* Combined Interactive Price Section */}
                                <button
                                    onClick={() => setShowInstallmentTable(true)}
                                    className={cn("flex-1 max-w-[180px] text-left group p-1.5 rounded-2xl transition-all", darkMode ? "hover:bg-white/5" : "hover:bg-slate-50")}
                                >
                                    <div className="flex flex-col">
                                        <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-0.5">Opções de Pagamento</p>
                                        <div className="flex items-center gap-1">
                                            <p className={cn("text-lg font-black tracking-tighter", darkMode ? "text-white" : "text-slate-900")}>
                                                {formatCurrency(selectedVariant?.finalPrice || 0)}
                                            </p>
                                            <ChevronUp className="w-3 h-3 text-blue-500 group-hover:-translate-y-0.5 transition-transform" />
                                        </div>
                                        {(() => {
                                            const cat = settings?.categories?.find(c => c.name === selectedModel?.category || c.id === selectedModel?.category);
                                            const gId = cat?.gatewayId || settings?.financial?.activeGatewayId;
                                            const gway = settings?.financial?.gateways?.find(g => g.id === gId) || settings?.financial?.gateways?.[0];
                                            const maxInst = gway?.rates?.maxInstallments || 12;
                                            const instData = calculateInstallment(selectedVariant?.finalPrice || 0, maxInst, selectedModel?.category);
                                            return <p className="text-[10px] font-bold text-blue-500">ou {maxInst}x de {formatCurrency(instData.value)}</p>;
                                        })()}
                                    </div>
                                </button>


                                <div className="flex items-center gap-2">
                                    {/* Action Icon Buttons */}
                                    <button
                                        disabled={isSharing}
                                        onClick={async () => {
                                            if (isSharing) return;
                                            const text = `Olha só o que eu encontrei! 🤩\n\n*${selectedModel.name}*\n📦 ${selectedVariant?.storage || 'Várias opções'} - ${selectedVariant?.color || 'Cores disponíveis'}\n💰 ${formatCurrency(selectedVariant?.finalPrice || selectedModel.minPrice)}\n\nConfira em: ${window.location.href}`;

                                            if (navigator.share) {
                                                setIsSharing(true);
                                                try {
                                                    await navigator.share({
                                                        title: selectedModel.name,
                                                        text: text,
                                                        url: window.location.href
                                                    });
                                                } catch (err) {
                                                    if (err.name !== 'AbortError') {
                                                        console.error('Erro ao compartilhar:', err);
                                                        // Fallback to WhatsApp if share fails for reasons other than user canceling
                                                        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                                                    }
                                                } finally {
                                                    setIsSharing(false);
                                                }
                                            } else {
                                                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                                            }
                                        }}
                                        className={cn(
                                            "h-11 w-11 shrink-0 rounded-xl border flex items-center justify-center transition-all active:scale-95 disabled:opacity-50",
                                            darkMode ? "border-white/20 text-white hover:bg-white/5" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                        )}
                                    >
                                        {isSharing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Share2 className="w-5 h-5" />}
                                    </button>

                                    {selectedVariant?.quantity > 0 && (
                                        <button
                                            onClick={() => {
                                                const message = `Olá! Tenho interesse neste aparelho:\n\n📱 *${selectedModel.name}*\n✨ ${selectedVariant?.color} • ${selectedVariant?.storage}\n💎 ${selectedModel?.condition}\n💰 *${formatCurrency(selectedVariant?.finalPrice)}*\n\nPodemos negociar?`;
                                                window.open(`https://wa.me/55${(settings?.company?.phone || orgProfile?.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
                                            }}
                                            className={cn("h-11 w-11 shrink-0 rounded-xl border flex items-center justify-center transition-all hover:bg-slate-50 dark:hover:bg-white/5", darkMode ? "border-white/20 text-white" : "border-slate-200 text-slate-600")}
                                        >
                                            <MessageCircle className="w-5 h-5" />
                                        </button>
                                    )}

                                    <button
                                        disabled={!selectedVariant}
                                        onClick={() => {
                                            if (selectedVariant && selectedVariant.quantity <= 0) {
                                                setNotifyProduct({ ...selectedVariant, name: selectedModel.name });
                                                setNotifyModalOpen(true);
                                            } else {
                                                addToCart(selectedVariant, selectedModel);
                                                // Start checkout
                                                setTimeout(() => setIsCartOpen(true), 150);
                                            }
                                        }}
                                        className={cn(
                                            "h-12 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2",
                                            !selectedVariant
                                                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                                                : selectedVariant.quantity <= 0
                                                    ? "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20"
                                                    : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/25"
                                        )}
                                    >
                                        {selectedVariant?.quantity > 0 ? "Comprar" : "Avise-me"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Installment Table Overlay Card */}
            {
                showInstallmentTable && selectedModel && (
                    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowInstallmentTable(false)} />
                        <div className={cn("w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative", darkMode ? "bg-[#0A0A0A] border border-white/10" : "bg-white")}>
                            {/* Header */}
                            <div className="p-6 border-b border-white/5 flex justify-between items-center">
                                <div>
                                    <h3 className="font-black uppercase tracking-widest text-sm">Opções de Parcelamento</h3>
                                    <p className="text-[10px] text-slate-500 font-bold mt-1">{selectedModel.name}</p>
                                </div>
                                <button onClick={() => setShowInstallmentTable(false)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>

                            {/* Table */}
                            <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2 no-scrollbar">
                                {(() => {
                                    const cat = settings?.categories?.find(c => c.name === selectedModel?.category || c.id === selectedModel?.category);
                                    const gId = cat?.gatewayId || settings?.financial?.activeGatewayId;
                                    const gway = settings?.financial?.gateways?.find(g => g.id === gId) || settings?.financial?.gateways?.[0];
                                    const maxInst = gway?.rates?.maxInstallments || 12;

                                    return Array.from({ length: maxInst }, (_, i) => i + 1).map(count => {
                                        const data = calculateInstallment(selectedVariant?.finalPrice || 0, count, selectedModel?.category);
                                        return (
                                            <button
                                                key={count}
                                                onClick={() => {
                                                    addToCart(selectedVariant, selectedModel);
                                                    setShowInstallmentTable(false);
                                                    // Trigger checkout with a small delay
                                                    setTimeout(() => setIsCartOpen(true), 200);
                                                }}
                                                className={cn(
                                                    "w-full flex items-center justify-between p-3 rounded-2xl transition-all border text-left active:scale-[0.98]",
                                                    count === maxInst ? "bg-blue-500/10 border-blue-500/20" : "bg-transparent border-transparent",
                                                    darkMode ? "hover:bg-white/5" : "hover:bg-slate-50"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs", count === maxInst ? "bg-blue-600 text-white" : "bg-white/5 text-slate-400")}>
                                                        {count}x
                                                    </div>
                                                    <p className={cn("text-xs font-bold", darkMode ? "text-slate-300" : "text-slate-600")}>
                                                        {formatCurrency(data.value)}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-blue-500">{formatCurrency(data.total)}</p>
                                                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Selecionar</p>
                                                </div>
                                            </button>
                                        );
                                    });
                                })()}
                            </div>

                            {/* Footer Info */}
                            <div className="p-6 bg-blue-600 flex items-center gap-4">
                                <CreditCard className="w-8 h-8 text-white/50" />
                                <div>
                                    <p className="text-[10px] font-black uppercase text-white/60 tracking-widest">Cartão de Crédito</p>
                                    <p className="text-xs font-bold text-white">Aceitamos as principais bandeiras</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Cart Drawer */}
            {
                isCartOpen && (
                    <div className="fixed inset-0 z-[300] flex justify-end">
                        <div className="absolute inset-0 bg-black/60" onClick={() => setIsCartOpen(false)} />
                        <div className={cn("w-full h-full max-w-6xl md:h-[85vh] shadow-2xl flex flex-col md:flex-row relative animate-in zoom-in-95 duration-500 overflow-hidden", darkMode ? "bg-[#050505] border border-white/5" : "bg-white")}>
                            <div className="p-8 border-b border-white/5 flex justify-between items-center">
                                <h2 className="text-xl font-black uppercase tracking-widest">{isCheckoutOpen ? "Confirmar Dados" : "Carrinho"}</h2>
                                <button onClick={() => { setIsCartOpen(false); setIsCheckoutOpen(false); }} className="p-2 hover:bg-white/5 rounded-xl transition-colors"><X className="w-6 h-6" /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-6">
                                {orderSuccess ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center py-20">
                                        <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-8 border-2 border-emerald-500/30 animate-bounce">
                                            <Check className="w-10 h-10" />
                                        </div>
                                        <h3 className="text-3xl font-black mb-4">Sucesso!</h3>
                                        <p className="text-slate-400 font-medium mb-10">Obrigado pela preferência. Verifique seu WhatsApp para o link do Pix e confirmação.</p>
                                        <button onClick={() => { setOrderSuccess(false); setIsCartOpen(false); setIsCheckoutOpen(false); }} className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase">Voltar à Vitrine</button>
                                    </div>
                                ) : !isCheckoutOpen ? (
                                    cart.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-500 py-20 animate-in fade-in duration-500">
                                            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6">
                                                <ShoppingBag className="w-10 h-10 opacity-30" />
                                            </div>
                                            <h3 className="text-xl font-black text-white mb-2">Seu carrinho está vazio</h3>
                                            <p className="font-medium text-xs tracking-widest uppercase opacity-60 max-w-[200px] text-center mb-8">Navegue pela loja e adicione itens incríveis</p>
                                            <button onClick={() => setIsCartOpen(false)} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-500 transition-colors">
                                                Começar a Comprar
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            {cart.map((item, idx) => (
                                                <div key={idx} className="bg-black/20 p-4 rounded-3xl flex gap-4 border border-white/5 group">
                                                    <div className="w-20 h-20 bg-white/5 rounded-2xl overflow-hidden p-2 flex items-center justify-center">
                                                        <img src={item.variant.imageUrl || item.model.image} className="w-full h-full object-contain" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <h4 className="font-black text-sm truncate">{item.model.name}</h4>
                                                            <button onClick={() => setCart(prev => prev.filter((_, i) => i !== idx))} className="text-slate-600 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                                        </div>
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase">{item.variant.storage} | {item.variant.color}</p>
                                                        <div className="flex justify-between items-end mt-2">
                                                            <div className="flex items-center gap-3 bg-black/40 rounded-xl px-2 py-1">
                                                                <button onClick={() => {
                                                                    const newCart = [...cart];
                                                                    newCart[idx].quantity = Math.max(1, newCart[idx].quantity - 1);
                                                                    setCart(newCart);
                                                                }} className="p-1 hover:text-white transition-colors"><Minus className="w-3 h-3" /></button>
                                                                <span className="text-xs font-black">{item.quantity}</span>
                                                                <button onClick={() => {
                                                                    // STRICT STOCK CHECK ON INCREMENT
                                                                    if (item.quantity >= item.variant.quantity) {
                                                                        showToast("Limite de estoque atingido para este item.", "error");
                                                                        return;
                                                                    }
                                                                    const newCart = [...cart];
                                                                    newCart[idx].quantity += 1;
                                                                    setCart(newCart);
                                                                }} className="p-1 hover:text-white transition-colors"><Plus className="w-3 h-3" /></button>
                                                            </div>
                                                            <span className="text-sm font-black text-blue-500">{formatCurrency(item.variant.finalPrice * item.quantity)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {(() => {
                                                const lastItemInCart = cart[cart.length - 1];
                                                const upsellProducts = getUpsellProducts(lastItemInCart?.model);

                                                if (upsellProducts.length === 0) return null;

                                                return (
                                                    <div className="mt-12 pt-8 border-t border-white/5">
                                                        <div className="flex items-center justify-between mb-6">
                                                            <div className="flex items-center gap-2">
                                                                <Sparkles className="w-4 h-4 text-amber-500" />
                                                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-300">Complete seu pedido</h3>
                                                            </div>
                                                            <span className="text-[10px] font-bold text-blue-500">OFERTAS EXCLUSIVAS</span>
                                                        </div>

                                                        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                                                            {upsellProducts.map((product) => {
                                                                const price = parseFloat(product.price || product.sellingPrice || 0);
                                                                return (
                                                                    <button
                                                                        key={product.id}
                                                                        onClick={() => {
                                                                            const variant = product.variants?.[0] || product;
                                                                            addToCart({ ...variant, finalPrice: price }, product);
                                                                            showToast("📦 Adicionado!", "success");
                                                                        }}
                                                                        className={cn(
                                                                            "min-w-[140px] max-w-[140px] p-4 rounded-3xl border transition-all hover:border-blue-500/50 text-left flex flex-col group",
                                                                            darkMode ? "bg-white/5 border-white/5" : "bg-slate-50 border-slate-100"
                                                                        )}
                                                                    >
                                                                        <div className="aspect-square bg-white rounded-2xl mb-3 p-2 flex items-center justify-center overflow-hidden">
                                                                            {product.imageUrl || product.image ? (
                                                                                <img src={product.imageUrl || product.image} className="w-full h-full object-contain group-hover:scale-110 transition-transform" loading="lazy" />
                                                                            ) : (
                                                                                <Package className="w-8 h-8 text-slate-300" />
                                                                            )}
                                                                        </div>
                                                                        <p className="text-[10px] font-bold line-clamp-1 mb-1">{product.name}</p>
                                                                        <p className="text-xs font-black text-blue-500 mb-3">{formatCurrency(price)}</p>
                                                                        <div className="mt-auto w-full py-2 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest text-center group-hover:bg-blue-500 transition-colors">
                                                                            + Adicionar
                                                                        </div>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </>
                                    )
                                ) : (
                                    /* Checkout Form */
                                    <div className="space-y-6 animate-in fade-in duration-300">
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black uppercase text-slate-500 ml-4">Nome completo *</label>
                                                    <input value={customerData.name} onChange={e => setCustomerData({ ...customerData, name: e.target.value })} placeholder="Ex: João Silva" className={cn("w-full p-4 border-2 border-transparent focus:border-blue-500 rounded-2xl font-bold transition-all outline-none", darkMode ? "bg-white/5 text-white" : "bg-slate-100 text-slate-800")} />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black uppercase text-slate-500 ml-4">Data de Nascimento *</label>
                                                    <input type="date" value={customerData.birthDate} onChange={e => setCustomerData({ ...customerData, birthDate: e.target.value })} className={cn("w-full p-4 border-2 border-transparent focus:border-blue-500 rounded-2xl font-bold transition-all outline-none", darkMode ? "bg-white/5 text-white" : "bg-slate-100 text-slate-800")} />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black uppercase text-slate-500 ml-4">WhatsApp (DDD) *</label>
                                                    <input value={customerData.phone} onChange={e => setCustomerData({ ...customerData, phone: e.target.value })} placeholder="(00) 00000-0000" className={cn("w-full p-4 border-2 border-transparent focus:border-blue-500 rounded-2xl font-bold transition-all outline-none", darkMode ? "bg-white/5 text-white" : "bg-slate-100 text-slate-800")} />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black uppercase text-slate-500 ml-4">Email *</label>
                                                    <input type="email" value={customerData.email} onChange={e => setCustomerData({ ...customerData, email: e.target.value })} placeholder="email@exemplo.com" className={cn("w-full p-4 border-2 border-transparent focus:border-blue-500 rounded-2xl font-bold transition-all outline-none", darkMode ? "bg-white/5 text-white" : "bg-slate-100 text-slate-800")} />
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase text-slate-500 ml-4">CPF (Obrigatório) *</label>
                                                <input value={customerData.cpf} onChange={e => setCustomerData({ ...customerData, cpf: e.target.value })} placeholder="000.000.000-00" className={cn("w-full p-4 border-2 border-transparent focus:border-blue-500 rounded-2xl font-bold transition-all outline-none", darkMode ? "bg-white/5 text-white" : "bg-slate-100 text-slate-800")} />
                                            </div>

                                            <div className="space-y-4 pt-4 border-t border-white/5">
                                                <h4 className="text-xs font-black uppercase text-blue-400 tracking-widest">Endereço de Entrega</h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-black uppercase text-slate-500 ml-4">CEP</label>
                                                        <input value={customerData.cep || ''} onChange={e => setCustomerData({ ...customerData, cep: e.target.value })} placeholder="00000-000" className={cn("w-full p-4 border-2 border-transparent focus:border-blue-500 rounded-2xl font-bold transition-all outline-none", darkMode ? "bg-white/5 text-white" : "bg-slate-100 text-slate-800")} />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-black uppercase text-slate-500 ml-4">Cidade</label>
                                                        <input value={customerData.city || ''} onChange={e => setCustomerData({ ...customerData, city: e.target.value })} placeholder="Cidade" className={cn("w-full p-4 border-2 border-transparent focus:border-blue-500 rounded-2xl font-bold transition-all outline-none", darkMode ? "bg-white/5 text-white" : "bg-slate-100 text-slate-800")} />
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black uppercase text-slate-500 ml-4">Endereço e Número</label>
                                                    <input value={customerData.address || ''} onChange={e => setCustomerData({ ...customerData, address: e.target.value })} placeholder="Rua Exemplo, 123" className={cn("w-full p-4 border-2 border-transparent focus:border-blue-500 rounded-2xl font-bold transition-all outline-none", darkMode ? "bg-white/5 text-white" : "bg-slate-100 text-slate-800")} />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black uppercase text-slate-500 ml-4">Bairro / Estado</label>
                                                    <div className="flex gap-2">
                                                        <input value={customerData.neighborhood || ''} onChange={e => setCustomerData({ ...customerData, neighborhood: e.target.value })} placeholder="Bairro" className={cn("w-full p-4 border-2 border-transparent focus:border-blue-500 rounded-2xl font-bold transition-all outline-none", darkMode ? "bg-white/5 text-white" : "bg-slate-100 text-slate-800")} />
                                                        <input value={customerData.state || ''} onChange={e => setCustomerData({ ...customerData, state: e.target.value })} placeholder="UF" className={cn("w-20 p-4 border-2 border-transparent focus:border-blue-500 rounded-2xl font-bold transition-all outline-none", darkMode ? "bg-white/5 text-white" : "bg-slate-100 text-slate-800")} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-blue-600/10 p-6 rounded-[2rem] border border-blue-500/20">
                                            <h4 className="flex items-center gap-2 text-xs font-black uppercase text-blue-400 mb-4 tracking-widest"><Info className="w-4 h-4" /> Escolha como Pagar</h4>
                                            <div className="space-y-2">
                                                <button
                                                    onClick={() => { setSelectedPaymentMethod('pix'); setSelectedInstallments(1); }}
                                                    className={cn(
                                                        "w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all",
                                                        selectedPaymentMethod === 'pix' ? "bg-white/5 border-emerald-500 shadow-lg" : "bg-transparent border-white/5 hover:border-white/10"
                                                    )}
                                                >
                                                    <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center font-black text-[10px]">PIX</div>
                                                    <div className="flex-1 text-left">
                                                        <p className="text-sm font-bold">Pix ou Dinheiro</p>
                                                        <p className="text-[10px] text-emerald-500 font-black uppercase italic">Economize {formatCurrency(getCartTotalForPayment('credit', 12) - cartTotal)}</p>
                                                    </div>
                                                    {selectedPaymentMethod === 'pix' && <Check className="w-5 h-5 text-emerald-500" />}
                                                </button>

                                                <div className={cn(
                                                    "p-4 rounded-2xl border-2 transition-all space-y-4",
                                                    (selectedPaymentMethod === 'credit' || selectedPaymentMethod === 'installments') ? "bg-white/5 border-blue-600 shadow-lg" : "bg-transparent border-white/5"
                                                )}>
                                                    <button
                                                        onClick={() => { setSelectedPaymentMethod('credit'); setSelectedInstallments(12); }}
                                                        className="w-full flex items-center gap-4"
                                                    >
                                                        <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-[10px]"><CreditCard className="w-5 h-5" /></div>
                                                        <div className="flex-1 text-left">
                                                            <p className="text-sm font-bold">Cartão de Crédito</p>
                                                            <p className="text-[10px] text-slate-500 font-black uppercase">Até {settings?.financial?.gateways?.[0]?.rates?.maxInstallments || 21}x na máquina</p>
                                                        </div>
                                                        {(selectedPaymentMethod === 'credit' || selectedPaymentMethod === 'installments') && <Check className="w-5 h-5 text-blue-500" />}
                                                    </button>

                                                    {(selectedPaymentMethod === 'credit' || selectedPaymentMethod === 'installments') && (
                                                        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/5">
                                                            {[1, 3, 6, 12, 18, 21, 24].filter(n => n <= (settings?.financial?.gateways?.[0]?.rates?.maxInstallments || 21)).map(n => (
                                                                <button
                                                                    key={n}
                                                                    onClick={() => {
                                                                        setSelectedInstallments(n);
                                                                        setSelectedPaymentMethod(n > 12 ? 'installments' : 'credit');
                                                                    }}
                                                                    className={cn(
                                                                        "py-2 rounded-lg text-[10px] font-black border transition-all",
                                                                        selectedInstallments === n ? "bg-blue-600 border-blue-600 text-white" : "border-white/5 text-slate-500"
                                                                    )}
                                                                >
                                                                    {n}x
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {!orderSuccess && cart.length > 0 && (
                                <div className="p-8 bg-black/40 border-t border-white/5">
                                    <div className="flex justify-between items-center mb-6">
                                        <span className="font-bold text-slate-400 uppercase text-xs tracking-widest">Total do Pedido</span>
                                        <div className="text-right">
                                            <span className="text-3xl font-black text-blue-500">
                                                {formatCurrency(getCartTotalForPayment(selectedPaymentMethod, selectedInstallments))}
                                            </span>
                                            {selectedPaymentMethod !== 'pix' && (
                                                <p className="text-[10px] font-black text-slate-500 uppercase">{selectedInstallments}x de {formatCurrency(getCartTotalForPayment(selectedPaymentMethod, selectedInstallments) / selectedInstallments)}</p>
                                            )}
                                        </div>
                                    </div>
                                    {!isCheckoutOpen ? (
                                        <button onClick={() => setIsCheckoutOpen(true)} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-500 active:scale-95 transition-all">Finalizar Agora</button>
                                    ) : (
                                        <button
                                            onClick={confirmPayment}
                                            disabled={orderLoading || !customerData.name || !customerData.phone || !customerData.cpf}
                                            className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50"
                                        >
                                            {orderLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Confirmar Pedido <ArrowRight className="w-5 h-5" /></>}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )
            }


            {/* Installments Simulation Modal */}
            <div id="installments-modal" className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-md hidden items-center justify-center p-4" onClick={(e) => e.target.id === 'installments-modal' && (e.target.style.display = 'none')}>
                <div className={cn("w-full max-w-lg rounded-[2.5rem] overflow-hidden animate-in zoom-in-95 duration-300 shadow-2xl flex flex-col h-[80vh]", darkMode ? "bg-slate-900 border border-white/5" : "bg-white border border-slate-100")}>
                    <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-blue-600 text-white">
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-widest">Simulação de Parcelas</h3>
                            <p className="text-white/70 text-[10px] font-bold uppercase mt-1">{selectedModel?.name}</p>
                        </div>
                        <button onClick={() => document.getElementById('installments-modal').style.display = 'none'} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"><X className="w-5 h-5" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                                    <th className="pb-4">Parcelas</th>
                                    <th className="pb-4">Valor da Parcela</th>
                                    <th className="pb-4 text-right">Total Final</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {[1, 2, 3, 4, 5, 6, 9, 12, 18, 21].map(n => {
                                    const { total, value } = calculateInstallment(selectedVariant?.finalPrice || 0, n, selectedModel?.category);
                                    return (
                                        <tr key={n} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-4 font-black text-slate-700">{n}x</td>
                                            <td className="py-4 font-bold text-slate-500">{formatCurrency(value)}</td>
                                            <td className="py-4 font-black text-blue-600 text-right">{formatCurrency(total)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                            <p className="text-[10px] font-medium text-slate-400 uppercase leading-relaxed text-center">
                                * Valores sujeitos a alteração conforme taxas da operadora do cartão no momento da compra física. Simulação baseada em taxas médias de mercado.
                            </p>
                        </div>
                    </div>
                    <div className="p-6 bg-slate-50 border-t border-slate-100">
                        <button
                            onClick={() => {
                                document.getElementById('installments-modal').style.display = 'none';
                                addToCart(selectedVariant, selectedModel);
                            }}
                            className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            Comprar Agora
                        </button>
                    </div>
                </div>
            </div>

            {/* Upsell Modal */}
            {
                upsellData && (
                    <div className="fixed inset-0 z-[600] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className={cn("w-full max-w-lg rounded-t-[2.5rem] md:rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300", darkMode ? "bg-[#101010] border border-white/10" : "bg-white")}>
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />

                            <div className="relative z-10 text-center mb-8">
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-blue-500/30 animate-pulse">
                                    <Sparkles className="w-8 h-8 text-white" />
                                </div>
                                <h3 className={cn("text-2xl font-black mb-2 tracking-tight", darkMode ? "text-white" : "text-slate-900")}>Turbine seu {upsellData.mainItem.name}!</h3>
                                <p className="text-slate-400 font-medium text-sm">Leve também esses itens essenciais com condições especiais.</p>
                            </div>

                            <div className="space-y-3 mb-8 max-h-[40vh] overflow-y-auto">
                                {upsellData.suggestions.map((item, idx) => (
                                    <div key={idx} className={cn("p-4 rounded-2xl flex items-center gap-4 transition-all group border border-transparent", darkMode ? "bg-white/5 hover:bg-white/10" : "bg-slate-50 hover:bg-slate-100")}>
                                        <div className="w-14 h-14 bg-white rounded-xl overflow-hidden p-1 shrink-0 border border-slate-100">
                                            <img src={item.image} className="w-full h-full object-contain" />
                                        </div>
                                        <div className="flex-1 text-left min-w-0">
                                            <h4 className={cn("font-bold text-sm truncate uppercase tracking-tight", darkMode ? "text-white" : "text-slate-800")}>{item.name}</h4>
                                            <div className="flex items-center gap-2">
                                                <p className="text-emerald-500 font-black text-xs">{formatCurrency(item.minPrice)}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                // Quick Add
                                                const v = item.variants.find(v => v.quantity > 0);
                                                if (v) {
                                                    addToCart(v, item);
                                                    setUpsellData(null); // Close modal immediately after selection
                                                }
                                            }}
                                            className="p-3 bg-blue-600 hover:scale-105 active:scale-95 transition-all rounded-xl text-white shadow-lg shadow-blue-500/20"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => setUpsellData(null)}
                                className={cn("w-full py-4 rounded-2xl font-bold uppercase text-xs tracking-widest transition-colors", darkMode ? "bg-white/5 hover:bg-white/10 text-slate-400" : "bg-slate-100 hover:bg-slate-200 text-slate-500")}
                            >
                                Não, obrigado, ir para sacola
                            </button>
                        </div>
                    </div>
                )
            }



            {/* Client Capture / Lead Modal */}
            {
                showLeadModal && (
                    <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-500">
                        <div className={cn("relative w-full max-w-md rounded-3xl p-8 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300", darkMode ? "bg-[#101010] border border-white/10" : "bg-white")}>
                            <button
                                onClick={() => { setShowLeadModal(false); localStorage.setItem('lead_captured', 'skipped'); }}
                                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="text-center mb-8 relative z-10">
                                <div className="w-16 h-16 bg-gradient-to-tr from-amber-400 to-orange-500 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-orange-500/20 rotate-3">
                                    <Crown className="w-8 h-8 text-white" />
                                </div>
                                <h3 className={cn("text-2xl font-black mb-2 tracking-tight", darkMode ? "text-white" : "text-slate-900")}>
                                    Entre na Lista VIP 👑
                                </h3>
                                <p className="text-slate-400 font-medium text-sm max-w-[280px] mx-auto">
                                    Receba ofertas relâmpago, cupons exclusivos e novidades antes de todo mundo.
                                </p>
                            </div>

                            <form onSubmit={handleLeadSubmit} className="space-y-4 relative z-10">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Seu Nome</label>
                                    <input
                                        name="name"
                                        placeholder="Ex: João Silva"
                                        className={cn("w-full py-3 px-4 rounded-xl border-2 outline-none font-bold transition-all", darkMode ? "bg-black/40 border-slate-800 focus:border-blue-500 text-white" : "bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-800")}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Seu WhatsApp</label>
                                    <input
                                        name="phone"
                                        placeholder="(00) 00000-0000"
                                        className={cn("w-full py-3 px-4 rounded-xl border-2 outline-none font-bold transition-all", darkMode ? "bg-black/40 border-slate-800 focus:border-blue-500 text-white" : "bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-800")}
                                    />
                                </div>
                                <button className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95 mt-2">
                                    Quero Participar
                                </button>
                            </form>

                            {/* Background Decor */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] -ml-32 -mb-32 pointer-events-none" />
                        </div>
                    </div>
                )
            }

            {/* Notify Modal */}
            {
                notifyModalOpen && (
                    <div className="fixed inset-0 z-[800] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className={cn("w-full max-w-md rounded-3xl p-8 shadow-2xl relative animate-in zoom-in-95", darkMode ? "bg-[#101010] border border-white/10" : "bg-white")}>
                            <button onClick={() => setNotifyModalOpen(false)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-slate-400"><X className="w-5 h-5" /></button>

                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-amber-500/20 text-amber-500 rounded-2xl mx-auto mb-4 flex items-center justify-center border border-amber-500/30">
                                    <Bell className="w-8 h-8" />
                                </div>
                                <h3 className={cn("text-xl font-black mb-1", darkMode ? "text-white" : "text-slate-900")}>Produto Indisponível</h3>
                                <p className="text-sm text-slate-400 font-medium">Deixe seu contato para ser avisado quando o <strong>{notifyProduct?.name} ({notifyProduct?.color})</strong> chegar.</p>
                            </div>

                            <form onSubmit={handleNotifySubmit} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Seu Nome</label>
                                    <input name="name" placeholder="Nome Completo" className={cn("w-full p-4 rounded-xl border-2 font-bold outline-none transition-all", darkMode ? "bg-black/30 border-white/10 focus:border-amber-500 text-white" : "bg-slate-50 border-slate-100 focus:border-amber-500 text-slate-900")} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Seu WhatsApp</label>
                                    <input name="phone" placeholder="(00) 00000-0000" className={cn("w-full p-4 rounded-xl border-2 font-bold outline-none transition-all", darkMode ? "bg-black/30 border-white/10 focus:border-amber-500 text-white" : "bg-slate-50 border-slate-100 focus:border-amber-500 text-slate-900")} />
                                </div>
                                <button className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 active:scale-95 transition-all">
                                    Avise-me Quando Chegar
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* About Us Video Section */}
            <section className="py-20 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center gap-12">
                    <div className="flex-1 space-y-6 text-center md:text-left">
                        <span className="text-blue-500 font-black uppercase tracking-[0.3em] text-[10px]">Quem Somos</span>
                        <h2 className={cn("text-3xl md:text-5xl font-black tracking-tighter", darkMode ? "text-white" : "text-slate-900")}>
                            Apaixonados por <span className="text-blue-500">Tecnologia</span>.
                        </h2>
                        <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-lg mx-auto md:mx-0">
                            Na {customStyles.title || orgProfile?.name || 'Phone Smart'}, não vendemos apenas produtos. Entregamos sonhos, qualidade garantida e uma experiência premium do início ao fim. Cada aparelho é rigorosamente testado por nossos especialistas.
                        </p>
                        <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                <span className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500"><Check className="w-4 h-4" /></span>
                                Procedência Garantida
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                <span className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500"><Award className="w-4 h-4" /></span>
                                Especialistas Apple
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 relative group w-full max-w-lg">
                        <div className="absolute inset-0 bg-blue-500 rounded-[2rem] rotate-3 opacity-20 group-hover:rotate-6 transition-all duration-500 blur-xl" />
                        <div className={cn("relative aspect-video rounded-[2rem] overflow-hidden border-2 shadow-2xl flex items-center justify-center group-hover:scale-[1.02] transition-all duration-500", darkMode ? "bg-slate-900 border-white/10" : "bg-white border-slate-100")}>
                            {/* Placeholder for Video/Image */}
                            <div className="text-center">
                                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md border border-white/20">
                                    <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[16px] border-l-white border-b-[10px] border-b-transparent ml-1" />
                                </div>
                                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Conheça nossa loja</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Checklist Modal */}
            {
                showVerifiedModal && (
                    <div className="fixed inset-0 z-[900] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                        <div className={cn("w-full max-w-md rounded-[2.5rem] p-8 relative animate-in zoom-in-95", darkMode ? "bg-[#101010] border border-white/10" : "bg-white")}>
                            <button onClick={() => setShowVerifiedModal(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 text-slate-400"><X className="w-5 h-5" /></button>

                            <div className="text-center mb-8">
                                <div className="w-20 h-20 bg-blue-500 text-white rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-blue-500/30 rotate-3">
                                    <ShieldCheck className="w-10 h-10" />
                                </div>
                                <h3 className={cn("text-2xl font-black mb-2", darkMode ? "text-white" : "text-slate-900")}>Certificado {customStyles.title || 'Phone Smart'}</h3>
                                <p className="text-slate-400 font-medium text-sm">Garantia de qualidade e procedência. Todos os nossos seminovos passam por inspeção técnica.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {['Tela Original', 'FaceID', 'Bateria', 'Câmeras', 'Microfones', 'iCloud Limpo', 'Sinal Rede', 'Carregamento'].map(check => (
                                    <div key={check} className={cn("p-3 rounded-xl flex items-center gap-3", darkMode ? "bg-white/5" : "bg-slate-50")}>
                                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                                            <Check className="w-3 h-3" />
                                        </div>
                                        <span className={cn("text-xs font-bold", darkMode ? "text-slate-300" : "text-slate-700")}>{check}</span>
                                    </div>
                                ))}
                            </div>

                            <button onClick={() => setShowVerifiedModal(false)} className="w-full mt-8 py-4 bg-blue-600 text-white font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-blue-500/20">
                                Entendi, é seguro!
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Legal Modals */}
            {
                (showTermsModal || showPrivacyModal) && (
                    <div className="fixed inset-0 z-[950] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
                        <div className={cn("w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-[2.5rem] p-8 relative animate-in zoom-in-95", darkMode ? "bg-[#101010] border border-white/10" : "bg-white")}>
                            <button onClick={() => { setShowTermsModal(false); setShowPrivacyModal(false); }} className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 text-slate-400"><X className="w-5 h-5" /></button>
                            <h2 className={cn("text-2xl font-black mb-6", darkMode ? "text-white" : "text-slate-900")}>{showTermsModal ? "Termos de Uso" : "Política de Privacidade"}</h2>
                            <div className="prose prose-sm prose-invert text-slate-400">
                                <p>Esta é uma versão resumida das políticas da {customStyles.title || 'loja'}.</p>
                                <p>1. <strong>Garantia:</strong> Todos os produtos possuem garantia legal de 90 dias, estendida conforme condição do produto (novo ou usado).</p>
                                <p>2. <strong>Trocas e Devoluções:</strong> Aceitamos devoluções em até 7 dias após o recebimento, conforme o Código de Defesa do Consumidor.</p>
                                <p>3. <strong>Privacidade:</strong> Seus dados são utilizados apenas para processamento do pedido e contato sobre o mesmo. Não compartilhamos com terceiros.</p>
                                <p>Para o texto completo, entre em contato com nosso suporte.</p>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Recently Viewed */}
            {
                recentlyViewed.length > 0 && (
                    <div className="max-w-7xl mx-auto px-6 py-8 border-t border-slate-100 dark:border-white/5">
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                            <Clock className="w-4 h-4" /> Vistos Recentemente
                        </h3>
                        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar mask-linear-fade">
                            {recentlyViewed.map((item, idx) => (
                                <button
                                    key={`${item.name}-${idx}`}
                                    onClick={() => handleOpenModel(item)}
                                    className={cn("min-w-[140px] md:min-w-[160px] p-4 rounded-3xl border flex flex-col items-center text-center group transition-all", darkMode ? "bg-white/5 border-white/5 hover:bg-white/10" : "bg-white border-slate-100 hover:border-blue-200")}
                                >
                                    {item.image ? (
                                        <img src={item.image} className="w-20 h-20 object-contain mb-3 drop-shadow-md group-hover:scale-110 transition-transform" loading="lazy" />
                                    ) : (
                                        <Smartphone className="w-12 h-12 text-slate-700 opacity-20 mb-3" />
                                    )}
                                    <p className={cn("text-xs font-bold line-clamp-1 mb-1", darkMode ? "text-white" : "text-slate-900")}>{item.name}</p>
                                    <p className="text-[10px] text-slate-500 uppercase font-black">{item.condition}</p>
                                    <p className="text-sm font-black text-blue-500 mt-2">{formatCurrency(item.minPrice)}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                )
            }

            {/* Professional Footer */}
            <footer className={cn("mt-20 py-16 border-t", darkMode ? "bg-[#020202] border-white/5" : "bg-slate-100 border-slate-200")}>
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
                    <div className="space-y-6">
                        <h2 className={cn("text-2xl font-black uppercase tracking-tighter", darkMode ? "text-white" : "text-slate-900")}>
                            {customStyles.title || orgProfile?.name}
                        </h2>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Sua loja de confiança para produtos premium. Qualidade, garantia e procedência em primeiro lugar.
                        </p>
                        <div className="flex gap-4">
                            {settings?.company?.instagram && <a href={`https://instagram.com/${settings.company.instagram.replace('@', '')}`} target="_blank" className="p-2 bg-white/5 rounded-full hover:bg-blue-600 hover:text-white transition-all text-slate-400"><Instagram className="w-5 h-5" /></a>}
                            {settings?.company?.facebook && <a href={settings.company.facebook} target="_blank" className="p-2 bg-white/5 rounded-full hover:bg-blue-600 hover:text-white transition-all text-slate-400"><Facebook className="w-5 h-5" /></a>}
                        </div>
                    </div>

                    <div>
                        <h3 className="font-bold text-slate-200 uppercase tracking-widest text-xs mb-6">Links Rápidos</h3>
                        <ul className="space-y-4 text-sm text-slate-400">
                            <li><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-blue-500 transition-colors">Início</button></li>
                            <li><a href={`https://wa.me/55${(settings?.company?.phone || orgProfile?.phone || '').replace(/\D/g, '')}?text=Quero consultar meus pedidos`} target="_blank" className="hover:text-blue-500 transition-colors">Meus Pedidos</a></li>
                            <li><button onClick={() => setShowTermsModal(true)} className="hover:text-blue-500 transition-colors">Termos de Uso</button></li>
                            <li><button onClick={() => setShowPrivacyModal(true)} className="hover:text-blue-500 transition-colors">Política de Privacidade</button></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-bold text-slate-200 uppercase tracking-widest text-xs mb-6">Atendimento</h3>
                        <ul className="space-y-4 text-sm text-slate-400">
                            <li className="flex items-center gap-2"><Phone className="w-4 h-4 text-blue-500" /> {settings?.company?.phone || orgProfile?.phone || '(11) 99999-9999'}</li>
                            <li className="flex items-center gap-2"><Mail className="w-4 h-4 text-blue-500" /> {settings?.company?.email || orgProfile?.email || 'contato@loja.com'}</li>
                            <li className="flex items-center gap-2"><Clock className="w-4 h-4 text-blue-500" /> Seg à Sex: 9h às 18h</li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-bold text-slate-200 uppercase tracking-widest text-xs mb-6">Segurança</h3>
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                                <ShieldCheck className="w-8 h-8 text-emerald-500" />
                                <div>
                                    <p className="font-bold text-white text-xs">Compra Segura</p>
                                    <p className="text-[10px] text-slate-500">Seus dados protegidos</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                                <Truck className="w-8 h-8 text-blue-500" />
                                <div>
                                    <p className="font-bold text-white text-xs">Entrega Rápida</p>
                                    <p className="text-[10px] text-slate-500">Para todo Brasil</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-white/5 text-center">
                    <p className="text-slate-500 text-xs text-center">© 2026 {customStyles.title || orgProfile?.name}. Todos os direitos reservados. Desenvolvido por <span className="text-blue-500 font-bold">Phone Smart</span>.</p>
                </div>
            </footer>

            <ToastContainer toast={toast} onClose={() => setToast(null)} />

            <Suspense fallback={null}>
                <SalesChatbot products={items} storeName={settings?.company?.name || "Phone Smart"} contactPhone={settings?.company?.phone || settings?.whatsapp} organizationId={organizationId} />
            </Suspense>
        </div >
    );
}

function getColorHex(colorName) {
    if (!colorName) return '#e2e8f0';
    const c = colorName.toLowerCase().trim();
    if (c.includes('preto') || c.includes('mid') || c.includes('black') || c.includes('grafite') || c.includes('gray')) return '#171717';
    if (c.includes('branco') || c.includes('white') || c.includes('starlight') || c.includes('prata') || c.includes('silver')) return '#f8fafc';
    if (c.includes('tit') || c.includes('natural')) return '#a8a29e';
    if (c.includes('azul') || c.includes('blue') || c.includes('sierra')) return '#3b82f6';
    if (c.includes('vere') || c.includes('green') || c.includes('alpine')) return '#22c55e';
    if (c.includes('roxo') || c.includes('purple') || c.includes('deep')) return '#7e22ce';
    if (c.includes('dourado') || c.includes('gold')) return '#fcd34d';
    if (c.includes('rosa') || c.includes('pink') || c.includes('rose')) return '#f472b6';
    if (c.includes('red') || c.includes('vermelho')) return '#ef4444';
    return '#94a3b8';
}
