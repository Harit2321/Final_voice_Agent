'use client';

import { useState, useEffect } from 'react';
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
    createdAt: string;
}

export default function AdminPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [filter, setFilter] = useState<string>('all');

    useEffect(() => {
        fetchUser();
        fetchConversations();
    }, []);

    const fetchUser = async () => {
        try {
            const res = await fetch('/api/auth/me', { credentials: 'include' });
            if (!res.ok) { router.push('/login'); return; }
            const data = await res.json();
            setUser(data.data);
        } catch {
            router.push('/login');
        }
    };

    const fetchConversations = async () => {
        try {
            const res = await fetch('/api/conversations?limit=100', { credentials: 'include' });
            if (!res.ok) return;
            const data = await res.json();
            setConversations(data.data?.conversations || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };                  

    const filtered = filter === 'all'
        ? conversations
        : conversations.filter(c => c.outcome === filter);

    const outcomeColor = (outcome?: string) => {
        if (outcome === 'booked') return '#52b788';
        if (outcome === 'cancelled') return '#e07070';
        if (outcome === 'rescheduled') return '#c9a84c';
        if (outcome === 'enquiry') return '#7ba7bc';
        return '#4a4a4a';
    };

    const upsellColor = (upsell?: string) => {
        if (upsell === 'accepted') return '#52b788';
        if (upsell === 'declined') return '#e07070';
        return '#4a4a4a';
    };

    const formatDuration = (secs?: number) => {
        if (!secs) return '—';
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return m > 0 ? `${m}m ${s}s` : `${s}s`;
    };

    const formatPhone = (phone?: string) => {
        if (!phone) return '—';
        const digits = phone.replace(/\D/g, '');
        if (digits.length >= 10) {
            const last10 = digits.slice(-10);
            return `${last10.slice(0, 3)} ${last10.slice(3, 6)} ${last10.slice(6)}`;
        }
        return phone;
    };

    return (
        <>
            <style jsx global>{`
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
                .call-card {
                    background: var(--card);
                    border: 1px solid var(--border);
                    margin-bottom: 1px;
                    transition: border-color 0.2s;
                }
                .call-card:hover { border-color: #2a2a2a; }
                .outcome-badge {
                    padding: 3px 10px;
                    border-radius: 2px;
                    font-size: 10px;
                    font-family: var(--font-mono);
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                    font-weight: 600;
                }
                .filter-btn {
                    padding: 6px 16px; background: transparent;
                    border: 1px solid var(--border); color: var(--muted);
                    font-size: 11px; font-family: var(--font-mono);
                    letter-spacing: 0.08em; text-transform: uppercase;
                    cursor: pointer; transition: all 0.2s;
                }
                .filter-btn.active { border-color: var(--gold); color: var(--gold); background: rgba(201,168,76,0.06); }
                .filter-btn:hover:not(.active) { border-color: #333; color: var(--text); }
                .transcript-msg {
                    display: flex; gap: 12px; margin-bottom: 8px;
                }
            `}</style>

            <div style={{ display: 'flex', minHeight: '100vh' }}>

                {/* Sidebar */}
                <aside className="admin-sidebar">
                    <Link href="/" style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '0 24px 28px',
                        borderBottom: '1px solid var(--border)',
                        fontFamily: 'var(--font-display)', fontSize: '26px',
                        fontWeight: '600', letterSpacing: '0.1em',
                        color: 'var(--white)', textDecoration: 'none',
                    }}>
                        <div style={{ width: '8px', height: '8px', background: 'var(--gold)', borderRadius: '50%' }}></div>
                        Zara
                    </Link>

                    <nav style={{ padding: '20px 0', flex: 1 }}>
                        <div style={{
                            padding: '6px 24px 4px',
                            fontFamily: 'var(--font-mono)', fontSize: '9px',
                            letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--muted)',
                        }}>Workspace</div>

                        <Link href="/dashboard" className="admin-nav-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: '15px', height: '15px' }}>
                                <rect x="3" y="3" width="7" height="7" rx="1" />
                                <rect x="14" y="3" width="7" height="7" rx="1" />
                                <rect x="3" y="14" width="7" height="7" rx="1" />
                                <rect x="14" y="14" width="7" height="7" rx="1" />
                            </svg>
                            Projects
                        </Link>

                        <Link href="/admin" className="admin-nav-item active">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: '15px', height: '15px' }}>
                                <path d="M3 5h18M3 10h18M3 15h18M3 20h18" />
                            </svg>
                            Call Logs
                        </Link>
                    </nav>

                    {/* User */}
                    <div
                        onClick={() => router.push('/admin')}
                        style={{ padding: '20px 24px', borderTop: '1px solid var(--border)', cursor: 'pointer' }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(201,168,76,0.04)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '32px', height: '32px', borderRadius: '50%',
                                background: 'linear-gradient(135deg, var(--gold-dk), var(--gold))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '12px', fontWeight: '600', color: 'var(--black)',
                            }}>
                                {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'A'}
                            </div>
                            <div>
                                <div style={{ fontSize: '12px', color: 'var(--text)', fontWeight: '500' }}>
                                    {user?.name || user?.email || 'Admin'}
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--muted)' }}>Pro Plan</div>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main */}
                <main style={{ flex: 1, marginLeft: '240px', minHeight: '100vh' }}>

                    {/* Topbar */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '20px 40px', borderBottom: '1px solid var(--border)',
                        background: 'rgba(8,8,8,0.8)', backdropFilter: 'blur(12px)',
                        position: 'sticky', top: 0, zIndex: 40,
                    }}>
                        <div>
                            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: '400', color: 'var(--white)' }}>
                                Call Logs
                            </h1>
                            <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                                {user ? `Viewing as ${user.name || user.email}` : 'Loading...'}
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '20px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--muted)' }}>
                            <span>{conversations.length} total</span>
                            <span style={{ color: '#52b788' }}>{conversations.filter(c => c.outcome === 'booked').length} booked</span>
                        </div>
                    </div>

                    <div style={{ padding: '32px 40px' }}>

                        {/* Stats */}
                        <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
                            gap: '1px', background: 'var(--border)',
                            border: '1px solid var(--border)', marginBottom: '32px',
                        }}>
                            {[
                                { label: 'Total Calls', value: conversations.length, color: 'var(--white)' },
                                { label: 'Booked', value: conversations.filter(c => c.outcome === 'booked').length, color: '#52b788' },
                                { label: 'Cancelled', value: conversations.filter(c => c.outcome === 'cancelled').length, color: '#e07070' },
                                { label: 'Upsells', value: conversations.filter(c => c.upsellStatus === 'accepted').length, color: 'var(--gold)' },
                                {
                                    label: 'Avg Duration',
                                    value: conversations.length
                                        ? formatDuration(Math.round(conversations.reduce((a, c) => a + (c.durationSeconds || 0), 0) / conversations.length))
                                        : '—',
                                    color: 'var(--white)',
                                },
                            ].map((stat, i) => (
                                <div key={i} style={{ background: 'var(--card)', padding: '20px 24px' }}>
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '8px' }}>
                                        {stat.label}
                                    </div>
                                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: '300', color: stat.color }}>
                                        {stat.value}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Filters */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                            {['all', 'booked', 'cancelled', 'rescheduled', 'enquiry', 'dropped'].map(f => (
                                <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                                    {f}
                                </button>
                            ))}
                        </div>

                        {/* List */}
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                                Loading calls...
                            </div>
                        ) : filtered.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                                No calls found
                            </div>
                        ) : (
                            filtered.map(call => (
                                <div key={call.id} className="call-card">

                                    {/* Row */}
                                    <div
                                        onClick={() => setExpandedId(expandedId === call.id ? null : call.id)}
                                        style={{
                                            padding: '20px 24px', cursor: 'pointer',
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto',
                                            alignItems: 'center', gap: '16px',
                                        }}
                                    >
                                        {/* Outcome */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <span className="outcome-badge" style={{
                                                background: `${outcomeColor(call.outcome)}18`,
                                                color: outcomeColor(call.outcome),
                                                border: `1px solid ${outcomeColor(call.outcome)}40`,
                                                width: 'fit-content',
                                            }}>
                                                {call.outcome || 'unknown'}
                                            </span>
                                            <span style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                                                {call.callType || '—'}
                                            </span>
                                        </div>

                                        {/* Phone */}
                                        <div>
                                            <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '3px', fontFamily: 'var(--font-mono)' }}>PHONE</div>
                                            <div style={{ fontSize: '13px', color: 'var(--white)', fontFamily: 'var(--font-mono)' }}>{formatPhone(call.phone)}</div>
                                        </div>

                                        {/* Service */}
                                        <div>
                                            <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '3px', fontFamily: 'var(--font-mono)' }}>SERVICE</div>
                                            <div style={{ fontSize: '13px', color: 'var(--white)' }}>{call.service || '—'}</div>
                                            {call.bookedDate && (
                                                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                                                    {call.bookedDate}{call.bookedTime ? ` @ ${call.bookedTime}` : ''}
                                                </div>
                                            )}
                                        </div>

                                        {/* Upsell */}
                                        <div>
                                            <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '3px', fontFamily: 'var(--font-mono)' }}>UPSELL</div>
                                            <span className="outcome-badge" style={{
                                                background: `${upsellColor(call.upsellStatus)}18`,
                                                color: upsellColor(call.upsellStatus),
                                                border: `1px solid ${upsellColor(call.upsellStatus)}40`,
                                            }}>
                                                {call.upsellStatus || 'not offered'}
                                            </span>
                                        </div>

                                        {/* Duration + Amount + Time */}
                                        <div>
                                            <div style={{ fontSize: '13px', color: 'var(--white)', fontFamily: 'var(--font-mono)' }}>
                                                {formatDuration(call.durationSeconds)}
                                            </div>
                                            {call.amount && (
                                                <div style={{ fontSize: '12px', color: 'var(--gold)', marginTop: '3px' }}>₹{call.amount}</div>
                                            )}
                                            <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '3px' }}>
                                                {call.createdAt
                                                    ? new Date(call.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                                                    : '—'}
                                            </div>
                                        </div>

                                        {/* Toggle */}
                                        <div style={{ color: 'var(--muted)', fontSize: '14px' }}>
                                            {expandedId === call.id ? '▲' : '▼'}
                                        </div>
                                    </div>

                                    {/* Expanded */}
                                    {expandedId === call.id && (
                                        <div style={{ borderTop: '1px solid var(--border)', padding: '24px', background: '#0f0f0f' }}>

                                            {call.summary && (
                                                <div style={{ marginBottom: '20px', padding: '12px 16px', background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.1)' }}>
                                                    <div style={{ fontSize: '10px', color: 'var(--gold)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: '6px' }}>SUMMARY</div>
                                                    <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: '1.6' }}>{call.summary}</p>
                                                </div>
                                            )}

                                            <div style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: '12px' }}>
                                                TRANSCRIPT
                                            </div>

                                            <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {(call.transcript?.messages || []).map((msg, i) => (
                                                    <div key={i} className="transcript-msg" style={{ justifyContent: msg.role === 'user' ? 'flex-start' : 'flex-end' }}>
                                                        <div style={{
                                                            maxWidth: '70%', padding: '8px 12px',
                                                            background: msg.role === 'user' ? '#1a1a1a' : 'rgba(201,168,76,0.06)',
                                                            border: `1px solid ${msg.role === 'user' ? '#222' : 'rgba(201,168,76,0.15)'}`,
                                                        }}>
                                                            <div style={{ fontSize: '9px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginBottom: '4px', textTransform: 'uppercase' }}>
                                                                {msg.role === 'user' ? '👤 Customer' : '🤖 Agent'}
                                                            </div>
                                                            <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: '1.5' }}>{msg.content}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {(!call.transcript?.messages || call.transcript.messages.length === 0) && (
                                                    <div style={{ color: 'var(--muted)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>No transcript available</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </main>
            </div>
        </>
    );
}