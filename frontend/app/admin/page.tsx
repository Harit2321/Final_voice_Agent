'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
    id: string;
    name?: string;
    email: string;
}

interface Conversation {
    id: string;
    phone?: string;
    service?: string;
    bookedDate?: string;
    bookedTime?: string;
    callType?: string;
    upsellStatus?: string;
    upsellSuggestion?: string;
    amount?: number;
    outcome?: string;
    direction?: string;
    durationSeconds?: number;
    callStartedAt?: string;
    summary?: string;
    transcript?: { messages: { role: string; content: string }[] };
    metadata?: Record<string, any>;
    createdAt: string;
}

interface Stats {
    total: number;
    booked: number;
    cancelled: number;
    rescheduled: number;
    enquiry: number;
    dropped: number;
    upsellsAccepted: number;
    avgDuration: number;
    totalRevenue: number;
    conversionRate: number;
}

type OutcomeFilter = 'all' | 'booked' | 'cancelled' | 'rescheduled' | 'enquiry' | 'dropped';
type SortField = 'createdAt' | 'durationSeconds' | 'amount' | 'callStartedAt';
type SortDir = 'asc' | 'desc';

function computeStats(conversations: Conversation[]): Stats {
    const total = conversations.length;
    const booked = conversations.filter(c => c.outcome === 'booked').length;
    const cancelled = conversations.filter(c => c.outcome === 'cancelled').length;
    const rescheduled = conversations.filter(c => c.outcome === 'rescheduled').length;
    const enquiry = conversations.filter(c => c.outcome === 'enquiry').length;
    const dropped = conversations.filter(c => c.outcome === 'dropped').length;
    const upsellsAccepted = conversations.filter(c => c.upsellStatus === 'accepted').length;
    const totalDuration = conversations.reduce((a, c) => a + (c.durationSeconds || 0), 0);
    const avgDuration = total > 0 ? Math.round(totalDuration / total) : 0;
    const totalRevenue = conversations.reduce((a, c) => a + (c.amount || 0), 0);
    const conversionRate = total > 0 ? Math.round((booked / total) * 100) : 0;
    return { total, booked, cancelled, rescheduled, enquiry, dropped, upsellsAccepted, avgDuration, totalRevenue, conversionRate };
}

export default function AdminPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Filter & search state
    const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [serviceFilter, setServiceFilter] = useState('all');
    const [callTypeFilter, setCallTypeFilter] = useState('all');
    const [upsellFilter, setUpsellFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [minDuration, setMinDuration] = useState('');
    const [maxDuration, setMaxDuration] = useState('');

    // Sort state
    const [sortField, setSortField] = useState<SortField>('createdAt');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    // Pagination
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 20;

    useEffect(() => { fetchUser(); fetchConversations(); }, []);

    const fetchUser = async () => {
        try {
            const res = await fetch('/api/auth/me', { credentials: 'include' });
            if (!res.ok) { router.push('/login'); return; }
            const data = await res.json();
            setUser(data.data);
        } catch { router.push('/login'); }
    };

    const fetchConversations = async (isRefresh = false) => {
        try {
            isRefresh ? setRefreshing(true) : setLoading(true);
            const res = await fetch('/api/conversations?limit=500', { credentials: 'include' });
            if (!res.ok) return;
            const data = await res.json();
            setConversations(data.data?.conversations || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Derived: unique services + call types for filter dropdowns
    const uniqueServices = Array.from(new Set(conversations.map(c => c.service).filter(Boolean))) as string[];
    const uniqueCallTypes = Array.from(new Set(conversations.map(c => c.callType).filter(Boolean))) as string[];

    // Apply all filters + sort
    const filtered = useCallback(() => {
        let result = [...conversations];

        // Outcome filter
        if (outcomeFilter !== 'all') result = result.filter(c => c.outcome === outcomeFilter);

        // Service filter
        if (serviceFilter !== 'all') result = result.filter(c => c.service === serviceFilter);

        // Call type filter
        if (callTypeFilter !== 'all') result = result.filter(c => c.callType === callTypeFilter);

        // Upsell filter
        if (upsellFilter !== 'all') result = result.filter(c => c.upsellStatus === upsellFilter);

        // Date range filter
        if (dateFrom) result = result.filter(c => new Date(c.createdAt) >= new Date(dateFrom));
        if (dateTo) {
            const to = new Date(dateTo);
            to.setHours(23, 59, 59, 999);
            result = result.filter(c => new Date(c.createdAt) <= to);
        }

        // Duration filter
        if (minDuration) result = result.filter(c => (c.durationSeconds || 0) >= parseInt(minDuration) * 60);
        if (maxDuration) result = result.filter(c => (c.durationSeconds || 0) <= parseInt(maxDuration) * 60);

        // Search: phone, service, summary, transcript content
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(c =>
                c.phone?.toLowerCase().includes(q) ||
                c.service?.toLowerCase().includes(q) ||
                c.summary?.toLowerCase().includes(q) ||
                c.callType?.toLowerCase().includes(q) ||
                c.transcript?.messages?.some(m => m.content.toLowerCase().includes(q))
            );
        }

        // Sort
        result.sort((a, b) => {
            let aVal: number, bVal: number;
            if (sortField === 'durationSeconds') {
                aVal = a.durationSeconds || 0; bVal = b.durationSeconds || 0;
            } else if (sortField === 'amount') {
                aVal = a.amount || 0; bVal = b.amount || 0;
            } else if (sortField === 'callStartedAt') {
                aVal = a.callStartedAt ? new Date(a.callStartedAt).getTime() : 0;
                bVal = b.callStartedAt ? new Date(b.callStartedAt).getTime() : 0;
            } else {
                aVal = new Date(a.createdAt).getTime();
                bVal = new Date(b.createdAt).getTime();
            }
            return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
        });

        return result;
    }, [conversations, outcomeFilter, serviceFilter, callTypeFilter, upsellFilter, dateFrom, dateTo, minDuration, maxDuration, searchQuery, sortField, sortDir]);

    const filteredList = filtered();
    const totalPages = Math.ceil(filteredList.length / PAGE_SIZE);
    const paginated = filteredList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const stats = computeStats(conversations); // always full dataset stats
    const filteredStats = computeStats(filteredList); // filtered stats

    const resetFilters = () => {
        setOutcomeFilter('all'); setSearchQuery(''); setServiceFilter('all');
        setCallTypeFilter('all'); setUpsellFilter('all');
        setDateFrom(''); setDateTo(''); setMinDuration(''); setMaxDuration('');
        setPage(1);
    };

    const hasActiveFilters = outcomeFilter !== 'all' || searchQuery || serviceFilter !== 'all' ||
        callTypeFilter !== 'all' || upsellFilter !== 'all' || dateFrom || dateTo || minDuration || maxDuration;

    const handleSort = (field: SortField) => {
        if (sortField === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
        else { setSortField(field); setSortDir('desc'); }
        setPage(1);
    };

    // Helpers
    const outcomeColor = (outcome?: string) => {
        if (outcome === 'booked') return '#52b788';
        if (outcome === 'cancelled') return '#e07070';
        if (outcome === 'rescheduled') return '#c9a84c';
        if (outcome === 'enquiry') return '#7ba7bc';
        if (outcome === 'dropped') return '#666';
        return '#4a4a4a';
    };
    const upsellColor = (upsell?: string) => {
        if (upsell === 'accepted') return '#52b788';
        if (upsell === 'declined') return '#e07070';
        return '#555';
    };
    const formatDuration = (secs?: number) => {
        if (!secs) return '—';
        const m = Math.floor(secs / 60), s = secs % 60;
        return m > 0 ? `${m}m ${s}s` : `${s}s`;
    };
    const formatPhone = (phone?: string) => {
        if (!phone) return '—';
        const d = phone.replace(/\D/g, '');
        if (d.length >= 10) { const l = d.slice(-10); return `${l.slice(0,3)} ${l.slice(3,6)} ${l.slice(6)}`; }
        return phone;
    };
    const formatDate = (dt?: string) => {
        if (!dt) return '—';
        return new Date(dt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    };
    const sortIcon = (field: SortField) => {
        if (sortField !== field) return <span style={{ color: '#333', marginLeft: '4px' }}>↕</span>;
        return <span style={{ color: 'var(--gold)', marginLeft: '4px' }}>{sortDir === 'desc' ? '↓' : '↑'}</span>;
    };

    return (
        <>
            <style jsx global>{`
                :root {
                    --gold: #c9a84c; --gold-dk: #a8893a; --gold-lt: #e0c97a;
                    --white: #f5f5f0; --text: #c8c8c0; --muted: #666;
                    --black: #080808; --surface: #0f0f0f; --card: #111;
                    --border: #1e1e1e; --green: #52b788;
                    --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
                    --font-display: 'Playfair Display', Georgia, serif;
                    --font-body: 'DM Sans', system-ui, sans-serif;
                }
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { background: var(--black); color: var(--text); font-family: var(--font-body); }
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@300;400;500&display=swap');

                .admin-sidebar {
                    width: 240px; flex-shrink: 0;
                    background: var(--surface);
                    border-right: 1px solid var(--border);
                    display: flex; flex-direction: column;
                    padding: 28px 0; position: fixed;
                    top: 0; left: 0; height: 100vh; z-index: 50;
                }
                .admin-nav-item {
                    display: flex; align-items: center; gap: 11px;
                    padding: 10px 24px; color: var(--muted);
                    font-size: 13px; text-decoration: none;
                    cursor: pointer; transition: all 0.2s;
                    border-left: 2px solid transparent;
                }
                .admin-nav-item:hover { color: var(--text); background: rgba(255,255,255,0.02); }
                .admin-nav-item.active { color: var(--gold); border-left-color: var(--gold); background: rgba(201,168,76,0.04); }

                .outcome-badge {
                    padding: 3px 10px; border-radius: 2px;
                    font-size: 10px; font-family: var(--font-mono);
                    letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600;
                }
                .filter-btn {
                    padding: 6px 14px; background: transparent;
                    border: 1px solid var(--border); color: var(--muted);
                    font-size: 11px; font-family: var(--font-mono);
                    letter-spacing: 0.06em; text-transform: uppercase;
                    cursor: pointer; transition: all 0.2s; white-space: nowrap;
                }
                .filter-btn.active { border-color: var(--gold); color: var(--gold); background: rgba(201,168,76,0.06); }
                .filter-btn:hover:not(.active) { border-color: #2a2a2a; color: var(--text); }

                .search-input {
                    background: var(--surface); border: 1px solid var(--border);
                    color: var(--white); font-family: var(--font-mono);
                    font-size: 12px; padding: 8px 14px; outline: none;
                    transition: border-color 0.2s; width: 100%;
                }
                .search-input:focus { border-color: var(--gold); }
                .search-input::placeholder { color: #333; }

                .filter-select {
                    background: var(--surface); border: 1px solid var(--border);
                    color: var(--text); font-family: var(--font-mono);
                    font-size: 11px; padding: 7px 10px; outline: none;
                    cursor: pointer; transition: border-color 0.2s;
                }
                .filter-select:focus { border-color: var(--gold); }

                .call-card { background: var(--card); border: 1px solid var(--border); margin-bottom: 1px; transition: border-color 0.2s; }
                .call-card:hover { border-color: #2a2a2a; }

                .sort-th {
                    cursor: pointer; user-select: none;
                    font-family: var(--font-mono); font-size: 9px;
                    letter-spacing: 0.14em; text-transform: uppercase;
                    color: var(--muted); transition: color 0.2s;
                }
                .sort-th:hover { color: var(--text); }

                .stat-card { background: var(--card); padding: 20px 24px; }
                .stat-value { font-family: var(--font-display); font-size: 28px; font-weight: 300; line-height: 1; }
                .stat-label { font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }

                .pagination-btn {
                    padding: 5px 12px; background: transparent;
                    border: 1px solid var(--border); color: var(--muted);
                    font-family: var(--font-mono); font-size: 11px;
                    cursor: pointer; transition: all 0.2s;
                }
                .pagination-btn:hover:not(:disabled) { border-color: var(--gold); color: var(--gold); }
                .pagination-btn:disabled { opacity: 0.3; cursor: not-allowed; }
                .pagination-btn.current { border-color: var(--gold); color: var(--gold); background: rgba(201,168,76,0.06); }

                .transcript-msg { display: flex; gap: 12px; margin-bottom: 8px; }

                .refresh-btn {
                    display: flex; align-items: center; gap: 6px;
                    padding: 7px 16px; background: transparent;
                    border: 1px solid var(--border); color: var(--muted);
                    font-family: var(--font-mono); font-size: 11px;
                    letter-spacing: 0.06em; cursor: pointer; transition: all 0.2s;
                }
                .refresh-btn:hover { border-color: var(--gold); color: var(--gold); }

                @keyframes spin { to { transform: rotate(360deg); } }
                .spinning { animation: spin 1s linear infinite; display: inline-block; }

                .results-count {
                    font-family: var(--font-mono); font-size: 11px; color: var(--muted);
                    padding: 6px 0; letter-spacing: 0.05em;
                }
                .results-count span { color: var(--gold); }
            `}</style>

            <div style={{ display: 'flex', minHeight: '100vh' }}>

                {/* ── Sidebar ── */}
                <aside className="admin-sidebar">
                    <Link href="/" style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '0 24px 28px', borderBottom: '1px solid var(--border)',
                        fontFamily: 'var(--font-display)', fontSize: '26px',
                        fontWeight: '600', letterSpacing: '0.1em',
                        color: 'var(--white)', textDecoration: 'none',
                    }}>
                        <div style={{ width: '8px', height: '8px', background: 'var(--gold)', borderRadius: '50%' }} />
                        Zara
                    </Link>

                    <nav style={{ padding: '20px 0', flex: 1 }}>
                        <div style={{ padding: '6px 24px 4px', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted)' }}>Workspace</div>

                        <Link href="/dashboard" className="admin-nav-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 15, height: 15 }}>
                                <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                                <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                            </svg>
                            Projects
                        </Link>
                        <Link href="/admin" className="admin-nav-item active">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 15, height: 15 }}>
                                <path d="M3 5h18M3 10h18M3 15h18M3 20h18" />
                            </svg>
                            Call Logs
                        </Link>
                    </nav>

                    {/* User */}
                    <div onClick={() => router.push('/admin')} style={{ padding: '20px 24px', borderTop: '1px solid var(--border)', cursor: 'pointer' }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(201,168,76,0.04)'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--gold-dk), var(--gold))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: 'var(--black)' }}>
                                {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'A'}
                            </div>
                            <div>
                                <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>{user?.name || user?.email || 'Admin'}</div>
                                <div style={{ fontSize: 10, color: 'var(--muted)' }}>Pro Plan</div>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* ── Main ── */}
                <main style={{ flex: 1, marginLeft: 240, minHeight: '100vh' }}>

                    {/* Topbar */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', borderBottom: '1px solid var(--border)', background: 'rgba(8,8,8,0.85)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 40 }}>
                        <div>
                            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 400, color: 'var(--white)' }}>Call Logs</h1>
                            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                                {user ? `Viewing as ${user.name || user.email}` : 'Loading...'}
                            </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ display: 'flex', gap: 20, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>
                                <span>{stats.total} total</span>
                                <span style={{ color: '#52b788' }}>{stats.booked} booked</span>
                                <span style={{ color: 'var(--gold)' }}>{stats.conversionRate}% conv.</span>
                            </div>
                            <button className="refresh-btn" onClick={() => fetchConversations(true)} disabled={refreshing}>
                                <span className={refreshing ? 'spinning' : ''} style={{ fontSize: 13 }}>↻</span>
                                {refreshing ? 'Refreshing...' : 'Refresh'}
                            </button>
                        </div>
                    </div>

                    <div style={{ padding: '32px 40px' }}>

                        {/* ── Stats Grid ── */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1px', background: 'var(--border)', border: '1px solid var(--border)', marginBottom: 32 }}>
                            {[
                                { label: 'Total Calls', value: stats.total, color: 'var(--white)' },
                                { label: 'Booked', value: stats.booked, color: '#52b788' },
                                { label: 'Dropped', value: stats.dropped, color: '#666' },
                                { label: 'Upsells', value: stats.upsellsAccepted, color: 'var(--gold)' },
                                { label: 'Avg Duration', value: formatDuration(stats.avgDuration), color: 'var(--white)' },
                            ].map((s, i) => (
                                <div key={i} className="stat-card">
                                    <div className="stat-label">{s.label}</div>
                                    <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                                </div>
                            ))}
                        </div>

                        {/* ── Second stats row ── */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: 'var(--border)', border: '1px solid var(--border)', marginBottom: 32 }}>
                            {[
                                { label: 'Cancelled', value: stats.cancelled, color: '#e07070' },
                                { label: 'Rescheduled', value: stats.rescheduled, color: '#c9a84c' },
                                { label: 'Enquiry', value: stats.enquiry, color: '#7ba7bc' },
                                { label: 'Conversion Rate', value: `${stats.conversionRate}%`, color: stats.conversionRate > 30 ? '#52b788' : 'var(--white)' },
                            ].map((s, i) => (
                                <div key={i} className="stat-card">
                                    <div className="stat-label">{s.label}</div>
                                    <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                                </div>
                            ))}
                        </div>

                        {/* ── Filter Panel ── */}
                        <div style={{ border: '1px solid var(--border)', background: 'var(--surface)', padding: '20px 24px', marginBottom: 24 }}>

                            {/* Row 1: Search + quick outcome filters */}
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                                <div style={{ flex: '1', minWidth: 200, position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: 13 }}>⌕</span>
                                    <input
                                        className="search-input"
                                        style={{ paddingLeft: 32 }}
                                        placeholder="Search phone, service, transcript…"
                                        value={searchQuery}
                                        onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {(['all', 'booked', 'cancelled', 'rescheduled', 'enquiry', 'dropped'] as OutcomeFilter[]).map(f => (
                                        <button key={f} className={`filter-btn ${outcomeFilter === f ? 'active' : ''}`}
                                            onClick={() => { setOutcomeFilter(f); setPage(1); }}>
                                            {f}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Row 2: Advanced filters */}
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>Service</span>
                                    <select className="filter-select" value={serviceFilter} onChange={e => { setServiceFilter(e.target.value); setPage(1); }}>
                                        <option value="all">All services</option>
                                        {uniqueServices.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>Call Type</span>
                                    <select className="filter-select" value={callTypeFilter} onChange={e => { setCallTypeFilter(e.target.value); setPage(1); }}>
                                        <option value="all">All types</option>
                                        {uniqueCallTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>Upsell</span>
                                    <select className="filter-select" value={upsellFilter} onChange={e => { setUpsellFilter(e.target.value); setPage(1); }}>
                                        <option value="all">All</option>
                                        <option value="accepted">Accepted</option>
                                        <option value="declined">Declined</option>
                                        <option value="not_offered">Not offered</option>
                                    </select>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>Date From</span>
                                    <input type="date" className="filter-select" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} style={{ colorScheme: 'dark' }} />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>Date To</span>
                                    <input type="date" className="filter-select" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} style={{ colorScheme: 'dark' }} />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>Min Dur (min)</span>
                                    <input type="number" className="filter-select" placeholder="0" style={{ width: 80 }} value={minDuration} onChange={e => { setMinDuration(e.target.value); setPage(1); }} />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>Max Dur (min)</span>
                                    <input type="number" className="filter-select" placeholder="∞" style={{ width: 80 }} value={maxDuration} onChange={e => { setMaxDuration(e.target.value); setPage(1); }} />
                                </div>

                                {hasActiveFilters && (
                                    <button onClick={resetFilters} style={{ alignSelf: 'flex-end', padding: '7px 14px', background: 'transparent', border: '1px solid rgba(224,112,112,0.3)', color: '#e07070', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s' }}
                                        onMouseOver={e => e.currentTarget.style.background = 'rgba(224,112,112,0.06)'}
                                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                                        ✕ Clear filters
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* ── Sort bar + results count ── */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <div className="results-count">
                                Showing <span>{filteredList.length}</span> of <span>{conversations.length}</span> calls
                                {hasActiveFilters && <span style={{ color: 'var(--gold)', marginLeft: 8 }}>· filtered</span>}
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Sort:</span>
                                {([['createdAt', 'Date'], ['callStartedAt', 'Start time'], ['durationSeconds', 'Duration'], ['amount', 'Amount']] as [SortField, string][]).map(([field, label]) => (
                                    <button key={field} className={`filter-btn ${sortField === field ? 'active' : ''}`} onClick={() => handleSort(field)} style={{ padding: '4px 12px' }}>
                                        {label} {sortIcon(field)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ── Call List ── */}
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                                <div className="spinning" style={{ fontSize: 24, marginBottom: 16 }}>↻</div>
                                <div>Loading calls...</div>
                            </div>
                        ) : filteredList.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                                {hasActiveFilters ? (
                                    <div>
                                        <div style={{ fontSize: 24, marginBottom: 12 }}>∅</div>
                                        <div>No calls match your filters.</div>
                                        <button onClick={resetFilters} style={{ marginTop: 16, padding: '8px 20px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer' }}>
                                            Clear filters
                                        </button>
                                    </div>
                                ) : (
                                    <div>No calls found</div>
                                )}
                            </div>
                        ) : (
                            <>
                                {paginated.map(call => (
                                    <div key={call.id} className="call-card">

                                        {/* Row */}
                                        <div
                                            onClick={() => setExpandedId(expandedId === call.id ? null : call.id)}
                                            style={{ padding: '18px 24px', cursor: 'pointer', display: 'grid', gridTemplateColumns: '140px 1fr 1fr 1fr 1fr 1fr auto', alignItems: 'center', gap: 16 }}
                                        >
                                            {/* Outcome + call type */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                                <span className="outcome-badge" style={{ background: `${outcomeColor(call.outcome)}18`, color: outcomeColor(call.outcome), border: `1px solid ${outcomeColor(call.outcome)}40`, width: 'fit-content' }}>
                                                    {call.outcome || 'unknown'}
                                                </span>
                                                <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                                                    {call.callType || '—'}
                                                </span>
                                            </div>

                                            {/* Phone */}
                                            <div>
                                                <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2, fontFamily: 'var(--font-mono)' }}>PHONE</div>
                                                <div style={{ fontSize: 13, color: 'var(--white)', fontFamily: 'var(--font-mono)' }}>{formatPhone(call.phone)}</div>
                                            </div>

                                            {/* Service */}
                                            <div>
                                                <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2, fontFamily: 'var(--font-mono)' }}>SERVICE</div>
                                                <div style={{ fontSize: 13, color: 'var(--white)' }}>{call.service || '—'}</div>
                                                {call.bookedDate && (
                                                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                                                        {call.bookedDate}{call.bookedTime ? ` @ ${call.bookedTime}` : ''}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Upsell */}
                                            <div>
                                                <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2, fontFamily: 'var(--font-mono)' }}>UPSELL</div>
                                                <span className="outcome-badge" style={{ background: `${upsellColor(call.upsellStatus)}18`, color: upsellColor(call.upsellStatus), border: `1px solid ${upsellColor(call.upsellStatus)}40` }}>
                                                    {call.upsellStatus || 'not offered'}
                                                </span>
                                            </div>

                                            {/* Duration + amount */}
                                            <div>
                                                <div style={{ fontSize: 13, color: 'var(--white)', fontFamily: 'var(--font-mono)' }}>{formatDuration(call.durationSeconds)}</div>
                                                {call.amount ? <div style={{ fontSize: 12, color: 'var(--gold)', marginTop: 3 }}>₹{call.amount}</div> : null}
                                            </div>

                                            {/* Date */}
                                            <div>
                                                <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{formatDate(call.createdAt)}</div>
                                                {call.callStartedAt && (
                                                    <div style={{ fontSize: 10, color: '#333', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                                                        started {formatDate(call.callStartedAt)}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Toggle */}
                                            <div style={{ color: 'var(--muted)', fontSize: 12 }}>{expandedId === call.id ? '▲' : '▼'}</div>
                                        </div>

                                        {/* Expanded panel */}
                                        {expandedId === call.id && (
                                            <div style={{ borderTop: '1px solid var(--border)', padding: 24, background: '#0d0d0d' }}>

                                                {/* Metadata chips */}
                                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                                                    {[
                                                        { k: 'Agent', v: call.metadata?.agentName },
                                                        { k: 'Business', v: call.metadata?.businessName },
                                                        { k: 'Direction', v: call.direction },
                                                        { k: 'Project', v: call.metadata?.projectId?.slice(0, 8) + '…' },
                                                    ].filter(x => x.v).map(x => (
                                                        <div key={x.k} style={{ padding: '4px 12px', border: '1px solid var(--border)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                                                            <span style={{ color: 'var(--muted)' }}>{x.k}: </span>
                                                            <span style={{ color: 'var(--text)' }}>{x.v}</span>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Summary */}
                                                {call.summary && (
                                                    <div style={{ marginBottom: 20, padding: '12px 16px', background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.1)' }}>
                                                        <div style={{ fontSize: 10, color: 'var(--gold)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 6 }}>SUMMARY</div>
                                                        <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>{call.summary}</p>
                                                    </div>
                                                )}

                                                {/* Transcript */}
                                                <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 12 }}>
                                                    TRANSCRIPT
                                                    {call.transcript?.messages?.length ? (
                                                        <span style={{ color: 'var(--gold)', marginLeft: 8 }}>{call.transcript.messages.length} messages</span>
                                                    ) : null}
                                                </div>

                                                <div style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                    {(call.transcript?.messages || []).map((msg, i) => (
                                                        <div key={i} className="transcript-msg" style={{ justifyContent: msg.role === 'user' ? 'flex-start' : 'flex-end' }}>
                                                            <div style={{ maxWidth: '70%', padding: '8px 12px', background: msg.role === 'user' ? '#1a1a1a' : 'rgba(201,168,76,0.06)', border: `1px solid ${msg.role === 'user' ? '#222' : 'rgba(201,168,76,0.15)'}` }}>
                                                                <div style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginBottom: 4, textTransform: 'uppercase' }}>
                                                                    {msg.role === 'user' ? '👤 Customer' : '🤖 Agent'}
                                                                </div>
                                                                <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{msg.content}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {(!call.transcript?.messages || call.transcript.messages.length === 0) && (
                                                        <div style={{ color: 'var(--muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>No transcript available</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* ── Pagination ── */}
                                {totalPages > 1 && (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, padding: '16px 0', borderTop: '1px solid var(--border)' }}>
                                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
                                            Page <span style={{ color: 'var(--gold)' }}>{page}</span> of {totalPages} &nbsp;·&nbsp; {filteredList.length} results
                                        </div>
                                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                            <button className="pagination-btn" onClick={() => setPage(1)} disabled={page === 1}>«</button>
                                            <button className="pagination-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹ Prev</button>
                                            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                                                const pg = page <= 4 ? i + 1 : page + i - 3;
                                                if (pg < 1 || pg > totalPages) return null;
                                                return (
                                                    <button key={pg} className={`pagination-btn ${pg === page ? 'current' : ''}`} onClick={() => setPage(pg)}>
                                                        {pg}
                                                    </button>
                                                );
                                            })}
                                            <button className="pagination-btn" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>Next ›</button>
                                            <button className="pagination-btn" onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </main>
            </div>
        </>
    );
}