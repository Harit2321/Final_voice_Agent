'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Project {
    id: string;
    agentName: string;
    businessName?: string;
    language: string;
    services?: any[];
    schedule?: any;
    createdAt: string;
    updatedAt: string;
}

interface ProjectStats {
    calls: number;
    bookings: number;
    bookingRate: number;
    loading: boolean;
}

export default function DashboardPage() {
    const router = useRouter();
    const [modalOpen, setModalOpen] = useState(false);
    const [newAgentName, setNewAgentName] = useState('');
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [projectStats, setProjectStats] = useState<Record<string, ProjectStats>>({});

    // Fetch projects on component mount
    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch('/api/projects', {
                credentials: 'include',
            });

            if (!response.ok) {
                if (response.status === 401) {
                    router.push('/');
                    return;
                }
                throw new Error('Failed to fetch projects');
            }

            const data = await response.json();
            const fetched: Project[] = data.data || [];
            setProjects(fetched);

            // Phase 6: kick off stats fetches in parallel
            fetchAllStats(fetched);
        } catch (err: any) {
            console.error('Error fetching projects:', err);
            setError(err.message || 'Failed to load projects');
        } finally {
            setLoading(false);
        }
    };

    /** Phase 6: fetch call + booking stats for every project in parallel */
    const fetchAllStats = async (projs: Project[]) => {
        if (!projs.length) return;

        // Mark all as loading immediately
        const initial: Record<string, ProjectStats> = {};
        projs.forEach((p) => {
            initial[p.id] = { calls: 0, bookings: 0, bookingRate: 0, loading: true };
        });
        setProjectStats(initial);

        // Fetch in parallel
        await Promise.all(
            projs.map(async (p) => {
                try {
                    const res = await fetch(`/api/internal/stats?projectId=${p.id}`, {
                        credentials: 'include',
                    });
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const json = await res.json();
                    const s = json.data ?? json;
                    setProjectStats((prev) => ({
                        ...prev,
                        [p.id]: {
                            calls: s.calls ?? 0,
                            bookings: s.bookings ?? 0,
                            bookingRate: s.bookingRate ?? 0,
                            loading: false,
                        },
                    }));
                } catch {
                    setProjectStats((prev) => ({
                        ...prev,
                        [p.id]: { calls: 0, bookings: 0, bookingRate: 0, loading: false },
                    }));
                }
            })
        );
    };

    const getProjectIcon = (businessName?: string): string => {
        if (!businessName) return '🤖';
        const name = businessName.toLowerCase();
        if (name.includes('hair') || name.includes('salon') || name.includes('beauty')) return '💈';
        if (name.includes('fitness') || name.includes('gym')) return '🏋️';
        if (name.includes('restaurant') || name.includes('cafe') || name.includes('food')) return '🍽️';
        if (name.includes('hotel') || name.includes('resort')) return '🏨';
        if (name.includes('spa')) return '💆';
        if (name.includes('dental') || name.includes('doctor') || name.includes('medical')) return '🏥';
        return '🤖';
    };

    const getScheduleDisplay = (schedule?: any): string => {
        if (!schedule) return 'Not set';
        if (typeof schedule === 'string') return schedule;
        // Handle JSON schedule object if needed
        return 'Custom schedule';
    };

    const handleCreateProject = () => {
        if (newAgentName.trim()) {
            router.push(`/wizard?name=${encodeURIComponent(newAgentName)}`);
        }
    };

    return (
        <>
            <style jsx global>{`
        .sidebar {
          width: 240px;
          flex-shrink: 0;
          background: var(--surface);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          padding: 28px 0;
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          z-index: 50;
        }
        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 24px 28px;
          border-bottom: 1px solid var(--border);
          font-family: var(--font-display);
          font-size: 26px;
          font-weight: 600;
          letter-spacing: 0.1em;
          color: var(--white);
          text-decoration: none;
        }
        .logo-dot {
          width: 8px;
          height: 8px;
          background: var(--gold);
          border-radius: 50%;
        }
        .sidebar-nav {
          padding: 20px 0;
          flex: 1;
        }
        .nav-section-label {
          padding: 6px 24px 4px;
          font-family: var(--font-mono);
          font-size: 9px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--muted);
        }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 10px 24px;
          color: var(--muted);
          font-size: 13px;
          text-decoration: none;
          letter-spacing: 0.02em;
          cursor: pointer;
          transition: all 0.2s;
          border-left: 2px solid transparent;
        }
        .nav-item:hover {
          color: var(--text);
          background: rgba(255, 255, 255, 0.02);
        }
        .nav-item.active {
          color: var(--gold);
          border-left-color: var(--gold);
          background: rgba(201, 168, 76, 0.04);
        }
        .main-content {
          flex: 1;
          margin-left: 240px;
          min-height: 100vh;
        }
        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 40px;
          border-bottom: 1px solid var(--border);
          background: rgba(8, 8, 8, 0.8);
          backdrop-filter: blur(12px);
          position: sticky;
          top: 0;
          z-index: 40;
        }
        .content-area {
          padding: 40px;
        }
      `}</style>

            <div style={{ display: 'flex', minHeight: '100vh' }}>
                {/* Sidebar */}
                <aside className="sidebar">
                    <Link href="/" className="sidebar-logo">
                        <div className="logo-dot"></div> Zara
                    </Link>
                    <nav className="sidebar-nav">
                        <div className="nav-section-label">Workspace</div>
                        <Link href="/dashboard" className="nav-item active">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: '15px', height: '15px' }}>
                                <rect x="3" y="3" width="7" height="7" rx="1" />
                                <rect x="14" y="3" width="7" height="7" rx="1" />
                                <rect x="3" y="14" width="7" height="7" rx="1" />
                                <rect x="14" y="14" width="7" height="7" rx="1" />
                            </svg>
                            Projects
                        </Link>
                    </nav>

                    <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, var(--gold-dk), var(--gold))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: 'var(--black)',
                            }}>A</div>
                            <div>
                                <div style={{ fontSize: '12px', color: 'var(--text)', fontWeight: '500' }}>Admin</div>
                                <div style={{ fontSize: '10px', color: 'var(--muted)' }}>Pro Plan</div>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="main-content">
                    <div className="topbar">
                        <div>
                            <h1 style={{
                                fontFamily: 'var(--font-display)',
                                fontSize: '24px',
                                fontWeight: '400',
                                color: 'var(--white)',
                                letterSpacing: '0.02em',
                            }}>Projects</h1>
                            <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '1px' }}>
                                Manage your AI voice booking agents
                            </p>
                        </div>
                        <button
                            onClick={() => setModalOpen(true)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 24px',
                                background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-dk) 100%)',
                                color: 'var(--black)',
                                fontFamily: 'var(--font-body)',
                                fontSize: '12px',
                                fontWeight: '700',
                                letterSpacing: '0.1em',
                                textTransform: 'uppercase',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.3s',
                            }}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            New Project
                        </button>
                    </div>

                    <div className="content-area">
                        {/* Stats Row */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '1px',
                            background: 'var(--border)',
                            border: '1px solid var(--border)',
                            marginBottom: '40px',
                        }}>
                            <div style={{ background: 'var(--card)', padding: '24px 28px', position: 'relative' }}>
                                <div style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '10px',
                                    letterSpacing: '0.14em',
                                    textTransform: 'uppercase',
                                    color: 'var(--muted)',
                                    marginBottom: '8px',
                                }}>Total Agents</div>
                                <div style={{
                                    fontFamily: 'var(--font-display)',
                                    fontSize: '34px',
                                    fontWeight: '300',
                                    color: 'var(--white)',
                                    letterSpacing: '-0.02em',
                                    lineHeight: '1',
                                }}>{projects.length}</div>
                                <div style={{ fontSize: '11px', color: 'var(--green-lt)', marginTop: '6px' }}>
                                    {loading ? '...' : `${projects.length} total`}
                                </div>
                            </div>

                            <div style={{ background: 'var(--card)', padding: '24px 28px' }}>
                                <div style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '10px',
                                    letterSpacing: '0.14em',
                                    textTransform: 'uppercase',
                                    color: 'var(--muted)',
                                    marginBottom: '8px',
                                }}>Bookings Today</div>
                                <div style={{
                                    fontFamily: 'var(--font-display)',
                                    fontSize: '34px',
                                    fontWeight: '300',
                                    color: 'var(--white)',
                                    letterSpacing: '-0.02em',
                                    lineHeight: '1',
                                }}>0</div>
                            </div>

                            <div style={{ background: 'var(--card)', padding: '24px 28px' }}>
                                <div style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '10px',
                                    letterSpacing: '0.14em',
                                    textTransform: 'uppercase',
                                    color: 'var(--muted)',
                                    marginBottom: '8px',
                                }}>Calls This Month</div>
                                <div style={{
                                    fontFamily: 'var(--font-display)',
                                    fontSize: '34px',
                                    fontWeight: '300',
                                    color: 'var(--white)',
                                    letterSpacing: '-0.02em',
                                    lineHeight: '1',
                                }}>0</div>
                            </div>

                            <div style={{ background: 'var(--card)', padding: '24px 28px' }}>
                                <div style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '10px',
                                    letterSpacing: '0.14em',
                                    textTransform: 'uppercase',
                                    color: 'var(--muted)',
                                    marginBottom: '8px',
                                }}>Conversion Rate</div>
                                <div style={{
                                    fontFamily: 'var(--font-display)',
                                    fontSize: '34px',
                                    fontWeight: '300',
                                    color: 'var(--white)',
                                    letterSpacing: '-0.02em',
                                    lineHeight: '1',
                                }}>--<span style={{ fontSize: '18px', color: 'var(--gold)' }}>%</span></div>
                            </div>
                        </div>

                        {/* Projects Grid */}
                        <div style={{ marginBottom: '20px' }}>
                            <h2 style={{
                                fontFamily: 'var(--font-display)',
                                fontSize: '22px',
                                fontWeight: '400',
                                color: 'var(--white)',
                                marginBottom: '8px',
                            }}>Your Agents</h2>
                            <p style={{ fontSize: '12px', color: 'var(--muted)' }}>Click any agent to configure or view its dashboard</p>
                        </div>

                        {/* Loading State */}
                        {loading && (
                            <div style={{
                                textAlign: 'center',
                                padding: '60px 20px',
                                color: 'var(--muted)',
                            }}>
                                Loading your projects...
                            </div>
                        )}

                        {/* Error State */}
                        {error && !loading && (
                            <div style={{
                                textAlign: 'center',
                                padding: '40px 20px',
                                color: 'var(--error, #ff6b6b)',
                                border: '1px solid var(--border)',
                                background: 'var(--card)',
                            }}>
                                <p>{error}</p>
                                <button
                                    onClick={fetchProjects}
                                    style={{
                                        marginTop: '16px',
                                        padding: '10px 24px',
                                        background: 'var(--gold)',
                                        color: 'var(--black)',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    Retry
                                </button>
                            </div>
                        )}

                        {/* Projects Grid */}
                        {!loading && !error && (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                                gap: '1px',
                                background: 'var(--border)',
                                border: '1px solid var(--border)',
                            }}>
                                {projects.map((project) => {
                                    const servicesCount = project.services?.length || 0;
                                    const icon = getProjectIcon(project.businessName);
                                    const scheduleDisplay = getScheduleDisplay(project.schedule);

                                    return (
                                        <div
                                            key={project.id}
                                            style={{
                                                background: 'var(--card)',
                                                padding: '28px 30px',
                                                cursor: 'pointer',
                                                transition: 'background 0.25s',
                                                position: 'relative',
                                            }}
                                            onClick={() => router.push(`/agents/${project.id}`)}
                                        >
                                            <div style={{ position: 'absolute', top: '15px', right: '15px', display: 'flex', gap: '8px' }}>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // Navigate to wizard with project data to edit (assuming wizard supports edit mode or pre-fill)
                                                        // For now, simpler to just edit via wizard query params or dedicated edit page
                                                        // Since we don't have dedicated edit page, we might just re-use wizard with param?
                                                        // Or maybe just link to agent details page which should have edit?
                                                        // User asked for "Edit" button
                                                        router.push(`/agents/${project.id}?edit=true`);
                                                    }}
                                                    style={{
                                                        background: 'transparent',
                                                        border: '1px solid var(--border)',
                                                        color: 'var(--muted)',
                                                        padding: '4px 8px',
                                                        fontSize: '10px',
                                                        cursor: 'pointer',
                                                        borderRadius: '4px',
                                                    }}
                                                >
                                                    EDIT
                                                </button>
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        if (confirm('Are you sure you want to delete this agent? This action cannot be undone.')) {
                                                            try {
                                                                const response = await fetch(`/api/projects/${project.id}`, {
                                                                    method: 'DELETE',
                                                                });
                                                                if (response.ok) {
                                                                    fetchProjects(); // Refresh list
                                                                } else {
                                                                    alert('Failed to delete project');
                                                                }
                                                            } catch (err) {
                                                                console.error('Error deleting project:', err);
                                                                alert('Error deleting project');
                                                            }
                                                        }
                                                    }}
                                                    style={{
                                                        background: 'rgba(255, 80, 80, 0.1)',
                                                        border: '1px solid rgba(255, 80, 80, 0.3)',
                                                        color: '#ff8080',
                                                        padding: '4px 8px',
                                                        fontSize: '10px',
                                                        cursor: 'pointer',
                                                        borderRadius: '4px',
                                                    }}
                                                >
                                                    DELETE
                                                </button>
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', marginTop: '10px' }}>
                                                <div style={{
                                                    width: '44px',
                                                    height: '44px',
                                                    background: 'rgba(201, 168, 76, 0.08)',
                                                    border: '1px solid var(--gold-dk)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '18px',
                                                }}>{icon}</div>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    fontFamily: 'var(--font-mono)',
                                                    fontSize: '10px',
                                                    letterSpacing: '0.1em',
                                                    textTransform: 'uppercase',
                                                    color: '#52b788',
                                                }}>
                                                    <div style={{
                                                        width: '6px',
                                                        height: '6px',
                                                        borderRadius: '50%',
                                                        background: '#52b788',
                                                    }}></div>
                                                    active
                                                </div>
                                            </div>

                                            <div style={{
                                                fontFamily: 'var(--font-display)',
                                                fontSize: '20px',
                                                fontWeight: '400',
                                                color: 'var(--white)',
                                                marginBottom: '4px',
                                            }}>{project.agentName}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '16px' }}>
                                                {project.businessName || 'No business name'}
                                            </div>

                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
                                                <span style={{ padding: '3px 10px', border: '1px solid var(--border)', fontSize: '11px', color: 'var(--muted)' }}>
                                                    {project.language || 'English'}
                                                </span>
                                                <span style={{ padding: '3px 10px', border: '1px solid var(--border)', fontSize: '11px', color: 'var(--muted)' }}>
                                                    {servicesCount} service{servicesCount !== 1 ? 's' : ''}
                                                </span>
                                                <span style={{ padding: '3px 10px', border: '1px solid var(--border)', fontSize: '11px', color: 'var(--muted)' }}>
                                                    {scheduleDisplay}
                                                </span>
                                            </div>

                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                paddingTop: '16px',
                                                borderTop: '1px solid var(--border)',
                                            }}>
                                                {/* Calls */}
                                                <div style={{ textAlign: 'center' }}>
                                                    <div style={{
                                                        fontFamily: 'var(--font-display)',
                                                        fontSize: '22px',
                                                        color: 'var(--white)',
                                                        fontWeight: '300',
                                                        minWidth: '32px',
                                                        opacity: projectStats[project.id]?.loading ? 0.35 : 1,
                                                        transition: 'opacity 0.4s',
                                                    }}>
                                                        {projectStats[project.id]?.loading
                                                            ? '·'
                                                            : (projectStats[project.id]?.calls ?? 0)}
                                                    </div>
                                                    <div style={{
                                                        fontSize: '9px',
                                                        letterSpacing: '0.12em',
                                                        textTransform: 'uppercase',
                                                        color: 'var(--muted)',
                                                    }}>Calls</div>
                                                </div>
                                                {/* Bookings */}
                                                <div style={{ textAlign: 'center' }}>
                                                    <div style={{
                                                        fontFamily: 'var(--font-display)',
                                                        fontSize: '22px',
                                                        color: 'var(--white)',
                                                        fontWeight: '300',
                                                        minWidth: '32px',
                                                        opacity: projectStats[project.id]?.loading ? 0.35 : 1,
                                                        transition: 'opacity 0.4s',
                                                    }}>
                                                        {projectStats[project.id]?.loading
                                                            ? '·'
                                                            : (projectStats[project.id]?.bookings ?? 0)}
                                                    </div>
                                                    <div style={{
                                                        fontSize: '9px',
                                                        letterSpacing: '0.12em',
                                                        textTransform: 'uppercase',
                                                        color: 'var(--muted)',
                                                    }}>Bookings</div>
                                                </div>
                                                {/* Booking Rate */}
                                                <div style={{ textAlign: 'center' }}>
                                                    <div style={{
                                                        fontFamily: 'var(--font-display)',
                                                        fontSize: '22px',
                                                        color: projectStats[project.id]?.bookingRate
                                                            ? 'var(--gold-lt)'
                                                            : 'var(--white)',
                                                        fontWeight: '300',
                                                        minWidth: '40px',
                                                        opacity: projectStats[project.id]?.loading ? 0.35 : 1,
                                                        transition: 'opacity 0.4s',
                                                    }}>
                                                        {projectStats[project.id]?.loading
                                                            ? '·'
                                                            : projectStats[project.id]?.calls
                                                                ? `${projectStats[project.id]?.bookingRate}%`
                                                                : '--'}
                                                    </div>
                                                    <div style={{
                                                        fontSize: '9px',
                                                        letterSpacing: '0.12em',
                                                        textTransform: 'uppercase',
                                                        color: 'var(--muted)',
                                                    }}>Rate</div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* New Project Card */}
                                <div
                                    onClick={() => setModalOpen(true)}
                                    style={{
                                        background: 'var(--card)',
                                        border: '1px dashed var(--border)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '14px',
                                        padding: '48px 30px',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s',
                                        textAlign: 'center',
                                        minHeight: '220px',
                                    }}
                                >
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        border: '1px solid var(--border)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '22px',
                                        color: 'var(--muted)',
                                    }}>+</div>
                                    <div>
                                        <span style={{
                                            fontFamily: 'var(--font-mono)',
                                            fontSize: '11px',
                                            letterSpacing: '0.12em',
                                            textTransform: 'uppercase',
                                            color: 'var(--muted)',
                                        }}>New Agent</span>
                                        <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '6px' }}>
                                            Set up a new AI voice booking agent
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Modal */}
            {modalOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(8, 8, 8, 0.88)',
                        backdropFilter: 'blur(12px)',
                        zIndex: 200,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setModalOpen(false);
                    }}
                >
                    <div style={{
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        width: '100%',
                        maxWidth: '520px',
                        padding: '48px',
                        position: 'relative',
                    }}>
                        <button
                            onClick={() => setModalOpen(false)}
                            style={{
                                position: 'absolute',
                                top: '18px',
                                right: '18px',
                                width: '32px',
                                height: '32px',
                                background: 'transparent',
                                border: '1px solid var(--border)',
                                color: 'var(--muted)',
                                fontSize: '14px',
                                cursor: 'pointer',
                            }}
                        >✕</button>

                        <div style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10px',
                            letterSpacing: '0.18em',
                            textTransform: 'uppercase',
                            color: 'var(--gold)',
                            marginBottom: '14px',
                        }}>New Project</div>

                        <h2 style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '36px',
                            fontWeight: '300',
                            color: 'var(--white)',
                            lineHeight: '1.1',
                            marginBottom: '8px',
                        }}>
                            Name your <em style={{ fontStyle: 'italic', color: 'var(--gold-lt)' }}>agent</em>
                        </h2>
                        <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '32px' }}>
                            Choose a name your customers will hear when they call.
                        </p>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{
                                display: 'block',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '10px',
                                letterSpacing: '0.16em',
                                textTransform: 'uppercase',
                                color: 'var(--gold-dk)',
                                marginBottom: '8px',
                            }}>Agent Name</label>
                            <input
                                type="text"
                                value={newAgentName}
                                onChange={(e) => setNewAgentName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newAgentName.trim()) {
                                        handleCreateProject();
                                    }
                                }}
                                placeholder="e.g. Aria, Nova, James…"
                                maxLength={24}
                                autoFocus
                                style={{
                                    width: '100%',
                                    background: 'var(--surface)',
                                    border: '1px solid var(--border)',
                                    color: 'var(--white)',
                                    fontFamily: 'var(--font-body)',
                                    fontSize: '22px',
                                    fontWeight: '300',
                                    padding: '14px 18px',
                                    outline: 'none',
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={handleCreateProject}
                                disabled={!newAgentName.trim()}
                                style={{
                                    flex: 1,
                                    padding: '13px 24px',
                                    background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-dk) 100%)',
                                    color: 'var(--black)',
                                    fontFamily: 'var(--font-body)',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    letterSpacing: '0.1em',
                                    textTransform: 'uppercase',
                                    border: 'none',
                                    cursor: newAgentName.trim() ? 'pointer' : 'not-allowed',
                                    opacity: newAgentName.trim() ? 1 : 0.4,
                                }}
                            >
                                Continue
                            </button>
                            <button
                                onClick={() => setModalOpen(false)}
                                style={{
                                    padding: '13px 20px',
                                    background: 'transparent',
                                    border: '1px solid var(--border)',
                                    color: 'var(--muted)',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
