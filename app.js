const { useState, useEffect, useMemo } = React;

// Componente de Ícone Lucide
const Icon = ({ name, size = 20, className = "" }) => {
    useEffect(() => {
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }, [name]);
    return <i data-lucide={name} style={{ width: size, height: size }} className={className}></i>;
};

const App = () => {
    const [user, setUser] = useState(null);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('acompanhamento');
    const [currentTime, setCurrentTime] = useState('');
    const [formData, setFormData] = useState({
        customerName: '', phone: '', sku: '', ticketNumber: '', url: '', reminderTime: '09:00', category: 'acompanhamento'
    });

    const { auth, db, collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, query, signInAnonymously, signInWithCustomToken, onAuthStateChanged, appId } = window.FB_SDK;

    // Lógica de Autenticação
    useEffect(() => {
        const initAuth = async () => {
            try {
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await signInWithCustomToken(auth, __initial_auth_token);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (err) { console.error("Erro Auth:", err); }
        };
        initAuth();
        const unsubscribe = onAuthStateChanged(auth, setUser);
        return () => unsubscribe();
    }, []);

    // Escuta em tempo real do Firestore
    useEffect(() => {
        if (!user) return;
        const recordsRef = collection(db, 'artifacts', appId, 'public', 'data', 'records');
        const unsubscribe = onSnapshot(query(recordsRef), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRecords(data.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));
            setLoading(false);
        }, (error) => {
            console.error("Erro Firestore:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    // Atualização do Relógio
    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const filteredRecords = useMemo(() => records.filter(r => r.category === activeTab), [records, activeTab]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) return;
        try {
            const recordsRef = collection(db, 'artifacts', appId, 'public', 'data', 'records');
            await addDoc(recordsRef, {
                ...formData,
                status: formData.category === 'venda' ? 'Concluído' : 'Pendente',
                createdAt: new Date().toISOString()
            });
            setFormData({ ...formData, customerName: '', phone: '', sku: '', ticketNumber: '', url: '' });
        } catch (err) { console.error("Erro Save:", err); }
    };

    const deleteRecord = async (id) => {
        try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'records', id)); } catch (e) {}
    };

    const moveToVendas = async (record) => {
        try {
            const recordRef = doc(db, 'artifacts', appId, 'public', 'data', 'records', record.id);
            await updateDoc(recordRef, { category: 'venda', status: 'Concluído', soldAt: new Date().toISOString() });
        } catch (e) {}
    };

    const exportCSV = () => {
        const headers = "Categoria,Ticket,Cliente,WhatsApp,SKU,Status\n";
        const content = filteredRecords.map(l => `${l.category},${l.ticketNumber},${l.customerName},${l.phone},${l.sku},${l.status}`).join("\n");
        const blob = new Blob([headers + content], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `planilha_samsung_${activeTab}.csv`;
        a.click();
    };

    if (loading || !user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-[#034EA2]"></div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Sincronizando Nuvem Samsung...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen text-slate-900 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4 text-left">
                        <div className="bg-[#034EA2] p-3 rounded-2xl text-white">
                            <Icon name="database" size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-tighter leading-none mb-1">Samsung Cloud Manager</h1>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Sistema Unificado de Planilhas</p>
                        </div>
                    </div>
                    
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
                        {['acompanhamento', 'venda', 'estoque'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === tab ? 'bg-white text-[#034EA2] shadow-sm' : 'text-slate-400'}`}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>

                    <button onClick={exportCSV} className="hidden md:flex items-center gap-2 bg-[#034EA2] text-white font-black px-6 py-3 rounded-2xl text-xs transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-100">
                        <Icon name="download" size={16} /> Exportar {activeTab}
                    </button>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
                    {/* Formulário lateral e Lista permanecem aqui (conforme código original) */}
                    {/* ... (O restante do JSX do componente App vai aqui) ... */}
                </div>
            </div>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
