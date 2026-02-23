'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

interface Service {
    name: string;
    duration: string;
    price: string;
}

interface DaySchedule {
    day: string;
    enabled: boolean;
    start: string;
    end: string;
}

export default function WizardPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [currentStep, setCurrentStep] = useState(1);
    const [isGoingBack, setIsGoingBack] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [playingVoice, setPlayingVoice] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Form data
    const [agentName, setAgentName] = useState(searchParams.get('name') || '');
    const [language, setLanguage] = useState('English (US)');
    const [greeting, setGreeting] = useState('');
    const [selectedVoice, setSelectedVoice] = useState('aria');

    const [businessName, setBusinessName] = useState('');
    const [industry, setIndustry] = useState('');
    const [phone, setPhone] = useState('');
    const [website, setWebsite] = useState('');

    const [services, setServices] = useState<Service[]>([
        { name: '', duration: '30', price: '' }
    ]);

    const [schedule, setSchedule] = useState<DaySchedule[]>([
        { day: 'Monday', enabled: true, start: '09:00', end: '17:00' },
        { day: 'Tuesday', enabled: true, start: '09:00', end: '17:00' },
        { day: 'Wednesday', enabled: true, start: '09:00', end: '17:00' },
        { day: 'Thursday', enabled: true, start: '09:00', end: '17:00' },
        { day: 'Friday', enabled: true, start: '09:00', end: '17:00' },
        { day: 'Saturday', enabled: false, start: '09:00', end: '17:00' },
        { day: 'Sunday', enabled: false, start: '09:00', end: '17:00' },
    ]);

    const voices = [
        { id: '6303e5fb-a0a7-48f9-bb1a-dd42c216dc5d', emoji: '👩', name: 'Sagar', style: 'Warm · Professional', audioFile: '/voices/Sagar.wav' },
        { id: 'fd2ada67-c2d9-4afe-b474-6386b87d8fc3', emoji: '👱‍♀️', name: 'Ishan', style: 'Crisp · Confident', audioFile: '/voices/Ishan.wav' },
        { id: 'faf0731e-dfb9-4cfc-8119-259a79b27e12', emoji: '👨', name: 'Riya', style: 'Deep · Trustworthy', audioFile: '/voices/Riya.wav' },
        { id: '95d51f79-c397-46f9-b49a-23763d3eaa2d', emoji: '🧑', name: 'Jia', style: 'Energetic · Friendly', audioFile: '/voices/Jia.wav' },
    ];

    const playVoice = (voiceId: string, audioFile: string) => {
        if (playingVoice === voiceId) {
            audioRef.current?.pause();
            audioRef.current = null;
            setPlayingVoice(null);
            return;
        }

        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }

        const audio = new Audio(audioFile);
        audioRef.current = audio;
        setPlayingVoice(voiceId);

        audio.play();

        audio.onended = () => {
            setPlayingVoice(null);
            audioRef.current = null;
        };

        audio.onerror = () => {
            console.error('Error playing audio file:', audioFile);
            setPlayingVoice(null);
            audioRef.current = null;
        };
    };

    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const addService = () => {
        setServices([...services, { name: '', duration: '30', price: '' }]);
    };

    const removeService = (index: number) => {
        setServices(services.filter((_, i) => i !== index));
    };

    const updateService = (index: number, field: keyof Service, value: string) => {
        const newServices = [...services];
        newServices[index][field] = value;
        setServices(newServices);
    };

    const toggleDay = (index: number) => {
        const newSchedule = [...schedule];
        newSchedule[index].enabled = !newSchedule[index].enabled;
        setSchedule(newSchedule);
    };

    const updateSchedule = (index: number, field: 'start' | 'end', value: string) => {
        const newSchedule = [...schedule];
        newSchedule[index][field] = value;
        setSchedule(newSchedule);
    };

    const nextStep = () => {
        setError(null);

        // Validation based on step
        if (currentStep === 1) {
            if (!agentName.trim()) {
                setError('Please provide an Agent Name.');
                return;
            }
            if (!greeting.trim()) {
                setError('Please provide an Opening Greeting.');
                return;
            }
        }

        if (currentStep === 2) {
            if (!businessName.trim()) {
                setError('Please provide a Business Name.');
                return;
            }
            if (!industry) {
                setError('Please select an Industry.');
                return;
            }
            if (!phone.trim()) {
                setError('Please provide a Phone Number.');
                return;
            }
        }

        if (currentStep === 3) {
            const hasService = services.some(s => s.name.trim());
            if (!hasService) {
                setError('Please add at least one service offered.');
                return;
            }
        }

        if (currentStep < 5) {
            setIsGoingBack(false);
            setCurrentStep(currentStep + 1);
            // Clear error when successfully moving to next step
            setError(null);
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setIsGoingBack(true);
            setCurrentStep(currentStep - 1);
            setError(null);
        }
    };

    const jumpTo = (step: number) => {
        if (step < currentStep) {
            setIsGoingBack(true);
            setCurrentStep(step);
        } else if (step === currentStep + 1) {
            nextStep();
        }
    };

    const handleLaunch = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const projectData = {
                agentName,
                language,
                greeting,
                voiceId: selectedVoice,
                businessName,
                industry,
                phone,
                website,
                schedule,
                services: services.filter(s => s.name.trim() !== ''),
            };

            console.log('Creating project...', projectData);

            const response = await fetch('/api/projects', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(projectData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to save project');
            }

            // Log Cal.com sync status
            if (data.data?.calComSync) {
                console.log('📅 Cal.com Sync Status:', data.data.calComSync);

                if (data.data.calComSync.synced) {
                    console.log('✅ Services synced to Cal.com:', data.data.calComSync.message);
                } else {
                    console.warn('⚠️ Cal.com sync issue:', data.data.calComSync.message);
                }
            }

            setShowSuccess(true);
        } catch (err: any) {
            console.error('Launch error:', err);
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <style jsx global>{`
        .stepper-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          position: relative;
          cursor: pointer;
        }
        .step-bubble {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 1px solid var(--border);
          background: var(--card);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--muted);
          transition: all 0.35s;
          position: relative;
          z-index: 1;
        }
        .stepper-step.active .step-bubble {
          border-color: var(--gold);
          color: var(--gold);
          background: rgba(201, 168, 76, 0.08);
          box-shadow: 0 0 0 4px rgba(201, 168, 76, 0.08), 0 0 20px rgba(201, 168, 76, 0.12);
        }
        .stepper-step.done .step-bubble {
          border-color: var(--gold-dk);
          background: var(--gold-dk);
          color: var(--black);
          font-size: 14px;
        }
        .step-name {
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--muted);
          white-space: nowrap;
          transition: color 0.3s;
        }
        .stepper-step.active .step-name {
          color: var(--gold);
        }
        .stepper-step.done .step-name {
          color: var(--text);
        }
        .stepper-connector {
          flex: 1;
          height: 1px;
          background: var(--border);
          margin: 0 4px;
          margin-bottom: 22px;
          position: relative;
          overflow: hidden;
        }
        .stepper-connector.filled::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          width: 100%;
          background: linear-gradient(90deg, var(--gold-dk), var(--gold));
        }
        .toggle {
          position: relative;
          width: 40px;
          height: 22px;
          cursor: pointer;
          display: inline-block;
        }
        .toggle input {
          opacity: 0;
          width: 0;
          height: 0;
          position: absolute;
        }
        .track {
          position: absolute;
          inset: 0;
          background: var(--border);
          border-radius: 22px;
          transition: background 0.3s;
        }
        .thumb {
          position: absolute;
          top: 4px;
          left: 4px;
          width: 14px;
          height: 14px;
          background: var(--muted);
          border-radius: 50%;
          transition: all 0.3s;
        }
        .toggle input:checked ~ .track {
          background: var(--gold-dk);
        }
        .toggle input:checked ~ .thumb {
          transform: translateX(18px);
          background: var(--gold);
        }
        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(0,0,0,0.1);
          border-top-color: currentColor;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .play-button {
            position: absolute;
            top: 8px;
            right: 8px;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: rgba(0, 0, 0, 0.7);
            border: 1px solid var(--border);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.25s;
            z-index: 2;
            }
            .play-button:hover {
            background: rgba(0, 0, 0, 0.9);
            border-color: var(--gold);
            transform: scale(1.05);
            }
            .play-button.playing {
            background: var(--gold-dk);
            border-color: var(--gold);
            }
            .play-icon {
            width: 0;
            height: 0;
            border-left: 8px solid var(--white);
            border-top: 5px solid transparent;
            border-bottom: 5px solid transparent;
            margin-left: 2px;
            }
            .pause-icon {
            width: 10px;
            height: 12px;
            position: relative;
            }
            .pause-icon::before,
            .pause-icon::after {
            content: '';
            position: absolute;
            width: 3px;
            height: 12px;
            background: var(--black);
            }
            .pause-icon::before {
            left: 0;
            }
            .pause-icon::after {
            right: 0;
            }
      `}</style>

            {!showSuccess ? (
                <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
                    {/* Nav */}
                    <nav style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '20px 48px',
                        borderBottom: '1px solid var(--border)',
                        background: 'rgba(8, 8, 8, 0.9)',
                        backdropFilter: 'blur(16px)',
                        position: 'sticky',
                        top: 0,
                        zIndex: 50,
                    }}>
                        <Link href="/dashboard" style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            fontFamily: 'var(--font-display)',
                            fontSize: '22px',
                            fontWeight: '600',
                            letterSpacing: '0.1em',
                            color: 'var(--white)',
                            textDecoration: 'none',
                        }}>
                            <div style={{
                                width: '7px',
                                height: '7px',
                                background: 'var(--gold)',
                                borderRadius: '50%',
                            }}></div>
                            Zara
                        </Link>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '11px',
                            letterSpacing: '0.1em',
                            color: 'var(--muted)',
                        }}>
                            Setting up agent: <strong style={{
                                color: 'var(--gold)',
                                fontSize: '14px',
                                fontFamily: 'var(--font-display)',
                                fontWeight: '400',
                            }}>{agentName || '—'}</strong>
                        </div>

                        <Link href="/dashboard" style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '12px',
                            color: 'var(--muted)',
                            textDecoration: 'none',
                            letterSpacing: '0.06em',
                        }}>
                            ← Dashboard
                        </Link>
                    </nav>

                    {/* Stepper */}
                    <div style={{
                        padding: '28px 48px',
                        borderBottom: '1px solid var(--border)',
                        background: 'var(--surface)',
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            maxWidth: '760px',
                            margin: '0 auto',
                        }}>
                            {[
                                { num: 1, name: 'Identity' },
                                { num: 2, name: 'Business' },
                                { num: 3, name: 'Services' },
                                { num: 4, name: 'Schedule' },
                                { num: 5, name: 'Review' },
                            ].map((step, i) => (
                                <div key={step.num} style={{ display: 'flex', alignItems: 'center', flex: i < 4 ? 1 : 'initial' }}>
                                    <div
                                        className={`stepper-step ${currentStep === step.num ? 'active' : ''} ${currentStep > step.num ? 'done' : ''}`}
                                        onClick={() => jumpTo(step.num)}
                                    >
                                        <div className="step-bubble">
                                            {currentStep > step.num ? '✓' : `0${step.num}`}
                                        </div>
                                        <div className="step-name">{step.name}</div>
                                    </div>
                                    {i < 4 && (
                                        <div className={`stepper-connector ${currentStep > step.num ? 'filled' : ''}`}></div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Step Body */}
                    <div style={{
                        flex: 1,
                        padding: '52px 48px 80px',
                        maxWidth: '800px',
                        margin: '0 auto',
                        width: '100%',
                    }}>
                        {/* Step 1: Identity */}
                        {currentStep === 1 && (
                            <div className={isGoingBack ? 'going-back' : ''}>
                                <div style={{ marginBottom: '36px' }}>
                                    <div style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: '10px',
                                        letterSpacing: '0.18em',
                                        textTransform: 'uppercase',
                                        color: 'var(--gold)',
                                        marginBottom: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                    }}>
                                        <div style={{ width: '20px', height: '1px', background: 'var(--gold)' }}></div>
                                        Step 1 of 5
                                    </div>
                                    <h2 style={{
                                        fontFamily: 'var(--font-display)',
                                        fontSize: '42px',
                                        fontWeight: '300',
                                        color: 'var(--white)',
                                        lineHeight: '1.05',
                                        marginBottom: '8px',
                                    }}>
                                        Agent <em style={{ fontStyle: 'italic', color: 'var(--gold-lt)' }}>Identity</em>
                                    </h2>
                                    <p style={{ fontSize: '14px', color: 'var(--muted)', maxWidth: '520px' }}>
                                        Your agent's name and voice persona — this is what customers will experience on every call.
                                    </p>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '22px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{
                                            fontFamily: 'var(--font-mono)',
                                            fontSize: '10px',
                                            letterSpacing: '0.16em',
                                            textTransform: 'uppercase',
                                            color: 'var(--gold-dk)',
                                        }}>Agent Name</label>
                                        <input
                                            type="text"
                                            value={agentName}
                                            onChange={(e) => setAgentName(e.target.value)}
                                            placeholder="e.g. Aria, Nova, James…"
                                            className="form-input"
                                        />
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{
                                            fontFamily: 'var(--font-mono)',
                                            fontSize: '10px',
                                            letterSpacing: '0.16em',
                                            textTransform: 'uppercase',
                                            color: 'var(--gold-dk)',
                                        }}>Call Language</label>
                                        <select
                                            value={language}
                                            onChange={(e) => setLanguage(e.target.value)}
                                            className="form-input"
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <option>English (US)</option>
                                            <option>English (UK)</option>
                                            <option>Hindi</option>
                                            <option>Spanish</option>
                                            <option>French</option>
                                            <option>Arabic</option>
                                        </select>
                                    </div>

                                    <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{
                                            fontFamily: 'var(--font-mono)',
                                            fontSize: '10px',
                                            letterSpacing: '0.16em',
                                            textTransform: 'uppercase',
                                            color: 'var(--gold-dk)',
                                        }}>Opening Greeting</label>
                                        <textarea
                                            value={greeting}
                                            onChange={(e) => setGreeting(e.target.value)}
                                            placeholder="e.g. Hi! I'm Aria from Luxe Studio. How can I help you today?"
                                            style={{
                                                background: 'var(--surface)',
                                                border: '1px solid var(--border)',
                                                color: 'var(--white)',
                                                fontFamily: 'var(--font-body)',
                                                fontSize: '14px',
                                                padding: '12px 16px',
                                                outline: 'none',
                                                resize: 'vertical',
                                                minHeight: '90px',
                                                width: '100%',
                                            }}
                                        />
                                    </div>

                                    <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{
                                            fontFamily: 'var(--font-mono)',
                                            fontSize: '10px',
                                            letterSpacing: '0.16em',
                                            textTransform: 'uppercase',
                                            color: 'var(--gold-dk)',
                                        }}>Voice Persona</label>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                                            {voices.map((voice) => (
                                                <div
                                                    key={voice.id}
                                                    onClick={() => setSelectedVoice(voice.id)}
                                                    style={{
                                                        padding: '20px 16px',
                                                        border: `1px solid ${selectedVoice === voice.id ? 'var(--gold)' : 'var(--border)'}`,
                                                        background: selectedVoice === voice.id ? 'rgba(201, 168, 76, 0.06)' : 'var(--surface)',
                                                        cursor: 'pointer',
                                                        textAlign: 'center',
                                                        position: 'relative',
                                                        transition: 'all 0.25s',
                                                    }}
                                                >
                                                    <div
                                                        className={`play-button ${playingVoice === voice.id ? 'playing' : ''}`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            playVoice(voice.id, voice.audioFile);
                                                        }}
                                                    >
                                                        {playingVoice === voice.id ? (
                                                            <div className="pause-icon"></div>
                                                        ) : (
                                                            <div className="play-icon"></div>
                                                        )}
                                                    </div>

                                                    {selectedVoice === voice.id && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: '8px',
                                                            left: '10px',
                                                            fontSize: '11px',
                                                            color: 'var(--gold)',
                                                        }}>✓</div>
                                                    )}
                                                    <div style={{
                                                        width: '44px',
                                                        height: '44px',
                                                        borderRadius: '50%',
                                                        margin: '0 auto 10px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '20px',
                                                        background: 'var(--card)',
                                                        border: '1px solid var(--border)',
                                                    }}>{voice.emoji}</div>
                                                    <div style={{ fontSize: '13px', color: 'var(--white)', fontWeight: '500' }}>{voice.name}</div>
                                                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '3px' }}>{voice.style}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Business */}
                        {currentStep === 2 && (
                            <div className={isGoingBack ? 'going-back' : ''}>
                                <div style={{ marginBottom: '36px' }}>
                                    <div style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: '10px',
                                        letterSpacing: '0.18em',
                                        textTransform: 'uppercase',
                                        color: 'var(--gold)',
                                        marginBottom: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                    }}>
                                        <div style={{ width: '20px', height: '1px', background: 'var(--gold)' }}></div>
                                        Step 2 of 5
                                    </div>
                                    <h2 style={{
                                        fontFamily: 'var(--font-display)',
                                        fontSize: '42px',
                                        fontWeight: '300',
                                        color: 'var(--white)',
                                        lineHeight: '1.05',
                                        marginBottom: '8px',
                                    }}>
                                        Business <em style={{ fontStyle: 'italic', color: 'var(--gold-lt)' }}>Details</em>
                                    </h2>
                                    <p style={{ fontSize: '14px', color: 'var(--muted)', maxWidth: '520px' }}>
                                        Help your agent understand your business so it can answer customer questions correctly.
                                    </p>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '22px' }}>
                                    <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{
                                            fontFamily: 'var(--font-mono)',
                                            fontSize: '10px',
                                            letterSpacing: '0.16em',
                                            textTransform: 'uppercase',
                                            color: 'var(--gold-dk)',
                                        }}>Business Name</label>
                                        <input
                                            type="text"
                                            value={businessName}
                                            onChange={(e) => setBusinessName(e.target.value)}
                                            placeholder="e.g. Luxe Hair Studio"
                                            className="form-input"
                                        />
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{
                                            fontFamily: 'var(--font-mono)',
                                            fontSize: '10px',
                                            letterSpacing: '0.16em',
                                            textTransform: 'uppercase',
                                            color: 'var(--gold-dk)',
                                        }}>Industry</label>
                                        <select
                                            value={industry}
                                            onChange={(e) => setIndustry(e.target.value)}
                                            className="form-input"
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <option value="">Select industry...</option>
                                            <option>Salon & Barbershop</option>
                                            <option>Medical Clinic</option>
                                            <option>Dental Office</option>
                                            <option>Yoga Studio</option>
                                            <option>Law Firm</option>
                                            <option>Veterinary</option>
                                            <option>Gym & Fitness</option>
                                            <option>Spa & Wellness</option>
                                            <option>Photography</option>
                                            <option>Other</option>
                                        </select>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{
                                            fontFamily: 'var(--font-mono)',
                                            fontSize: '10px',
                                            letterSpacing: '0.16em',
                                            textTransform: 'uppercase',
                                            color: 'var(--gold-dk)',
                                        }}>Phone Number</label>
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="+1 (555) 123-4567"
                                            className="form-input"
                                        />
                                    </div>

                                    <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{
                                            fontFamily: 'var(--font-mono)',
                                            fontSize: '10px',
                                            letterSpacing: '0.16em',
                                            textTransform: 'uppercase',
                                            color: 'var(--gold-dk)',
                                        }}>Website (Optional)</label>
                                        <input
                                            type="url"
                                            value={website}
                                            onChange={(e) => setWebsite(e.target.value)}
                                            placeholder="https://yourbusiness.com"
                                            className="form-input"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Services */}
                        {currentStep === 3 && (
                            <div className={isGoingBack ? 'going-back' : ''}>
                                <div style={{ marginBottom: '36px' }}>
                                    <div style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: '10px',
                                        letterSpacing: '0.18em',
                                        textTransform: 'uppercase',
                                        color: 'var(--gold)',
                                        marginBottom: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                    }}>
                                        <div style={{ width: '20px', height: '1px', background: 'var(--gold)' }}></div>
                                        Step 3 of 5
                                    </div>
                                    <h2 style={{
                                        fontFamily: 'var(--font-display)',
                                        fontSize: '42px',
                                        fontWeight: '300',
                                        color: 'var(--white)',
                                        lineHeight: '1.05',
                                        marginBottom: '8px',
                                    }}>
                                        <em style={{ fontStyle: 'italic', color: 'var(--gold-lt)' }}>Services</em> Offered
                                    </h2>
                                    <p style={{ fontSize: '14px', color: 'var(--muted)', maxWidth: '520px' }}>
                                        Add every service your business provides. Your agent will quote these to customers.
                                    </p>
                                </div>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '2fr 1fr 1fr 36px',
                                    gap: '10px',
                                    padding: '0 0 8px 16px',
                                    marginBottom: '4px',
                                }}>
                                    {['Service Name', 'Duration (min)', 'Price ($)', ''].map((label) => (
                                        <span key={label} style={{
                                            fontFamily: 'var(--font-mono)',
                                            fontSize: '9px',
                                            letterSpacing: '0.14em',
                                            textTransform: 'uppercase',
                                            color: 'var(--muted)',
                                        }}>{label}</span>
                                    ))}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                                    {services.map((service, i) => (
                                        <div key={i} style={{
                                            display: 'grid',
                                            gridTemplateColumns: '2fr 1fr 1fr 36px',
                                            gap: '10px',
                                            alignItems: 'center',
                                            padding: '12px 16px',
                                            background: 'var(--surface)',
                                            border: '1px solid var(--border)',
                                        }}>
                                            <input
                                                type="text"
                                                value={service.name}
                                                onChange={(e) => updateService(i, 'name', e.target.value)}
                                                placeholder="e.g. Haircut, Massage, Consultation"
                                                className="form-input"
                                                style={{ padding: '8px 12px', fontSize: '13px' }}
                                            />
                                            <input
                                                type="number"
                                                value={service.duration}
                                                onChange={(e) => updateService(i, 'duration', e.target.value)}
                                                placeholder="30"
                                                className="form-input"
                                                style={{ padding: '8px 12px', fontSize: '13px' }}
                                            />
                                            <input
                                                type="text"
                                                value={service.price}
                                                onChange={(e) => updateService(i, 'price', e.target.value)}
                                                placeholder="50"
                                                className="form-input"
                                                style={{ padding: '8px 12px', fontSize: '13px' }}
                                            />
                                            <button
                                                onClick={() => removeService(i)}
                                                style={{
                                                    width: '36px',
                                                    height: '36px',
                                                    background: 'transparent',
                                                    border: '1px solid var(--border)',
                                                    color: 'var(--muted)',
                                                    cursor: 'pointer',
                                                    fontSize: '14px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >✕</button>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={addService}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '11px 22px',
                                        background: 'transparent',
                                        border: '1px dashed var(--border)',
                                        color: 'var(--muted)',
                                        fontFamily: 'var(--font-body)',
                                        fontSize: '12px',
                                        letterSpacing: '0.08em',
                                        cursor: 'pointer',
                                    }}
                                >
                                    + Add Service
                                </button>
                            </div>
                        )}

                        {/* Step 4: Schedule */}
                        {currentStep === 4 && (
                            <div className={isGoingBack ? 'going-back' : ''}>
                                <div style={{ marginBottom: '36px' }}>
                                    <div style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: '10px',
                                        letterSpacing: '0.18em',
                                        textTransform: 'uppercase',
                                        color: 'var(--gold)',
                                        marginBottom: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                    }}>
                                        <div style={{ width: '20px', height: '1px', background: 'var(--gold)' }}></div>
                                        Step 4 of 5
                                    </div>
                                    <h2 style={{
                                        fontFamily: 'var(--font-display)',
                                        fontSize: '42px',
                                        fontWeight: '300',
                                        color: 'var(--white)',
                                        lineHeight: '1.05',
                                        marginBottom: '8px',
                                    }}>
                                        Business <em style={{ fontStyle: 'italic', color: 'var(--gold-lt)' }}>Schedule</em>
                                    </h2>
                                    <p style={{ fontSize: '14px', color: 'var(--muted)', maxWidth: '520px' }}>
                                        Set your working hours. Your agent will only accept bookings during these times.
                                    </p>
                                </div>

                                <div style={{ border: '1px solid var(--border)', overflow: 'hidden' }}>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '120px 1fr 1fr 64px',
                                        gap: 0,
                                        background: 'var(--surface)',
                                        borderBottom: '1px solid var(--border)',
                                        padding: '10px 20px',
                                    }}>
                                        {['Day', 'Start Time', 'End Time', 'Open'].map((label) => (
                                            <span key={label} style={{
                                                fontFamily: 'var(--font-mono)',
                                                fontSize: '9px',
                                                letterSpacing: '0.14em',
                                                textTransform: 'uppercase',
                                                color: 'var(--muted)',
                                                textAlign: label === 'Open' ? 'center' : 'left',
                                            }}>{label}</span>
                                        ))}
                                    </div>

                                    {schedule.map((day, i) => (
                                        <div key={day.day} style={{
                                            display: 'grid',
                                            gridTemplateColumns: '120px 1fr 1fr 64px',
                                            gap: 0,
                                            alignItems: 'center',
                                            padding: '10px 20px',
                                            borderBottom: i < schedule.length - 1 ? '1px solid var(--border)' : 'none',
                                        }}>
                                            <div style={{ fontSize: '13px', color: 'var(--text)' }}>{day.day}</div>
                                            <input
                                                type="time"
                                                value={day.start}
                                                onChange={(e) => updateSchedule(i, 'start', e.target.value)}
                                                disabled={!day.enabled}
                                                className="form-input"
                                                style={{ padding: '8px 10px', fontSize: '13px', marginRight: '12px' }}
                                            />
                                            <input
                                                type="time"
                                                value={day.end}
                                                onChange={(e) => updateSchedule(i, 'end', e.target.value)}
                                                disabled={!day.enabled}
                                                className="form-input"
                                                style={{ padding: '8px 10px', fontSize: '13px' }}
                                            />
                                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                <label className="toggle">
                                                    <input
                                                        type="checkbox"
                                                        checked={day.enabled}
                                                        onChange={() => toggleDay(i)}
                                                    />
                                                    <span className="track"></span>
                                                    <span className="thumb"></span>
                                                </label>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Step 5: Review */}
                        {currentStep === 5 && (
                            <div className={isGoingBack ? 'going-back' : ''}>
                                <div style={{ marginBottom: '36px' }}>
                                    <div style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: '10px',
                                        letterSpacing: '0.18em',
                                        textTransform: 'uppercase',
                                        color: 'var(--gold)',
                                        marginBottom: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                    }}>
                                        <div style={{ width: '20px', height: '1px', background: 'var(--gold)' }}></div>
                                        Step 5 of 5
                                    </div>
                                    <h2 style={{
                                        fontFamily: 'var(--font-display)',
                                        fontSize: '42px',
                                        fontWeight: '300',
                                        color: 'var(--white)',
                                        lineHeight: '1.05',
                                        marginBottom: '8px',
                                    }}>
                                        Review & <em style={{ fontStyle: 'italic', color: 'var(--gold-lt)' }}>Launch</em>
                                    </h2>
                                    <p style={{ fontSize: '14px', color: 'var(--muted)', maxWidth: '520px' }}>
                                        Everything looks good? Hit launch and your agent will go live immediately.
                                    </p>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div style={{
                                        background: 'var(--surface)',
                                        border: '1px solid var(--border)',
                                        padding: '24px 26px',
                                        position: 'relative',
                                    }}>
                                        <div style={{
                                            fontFamily: 'var(--font-mono)',
                                            fontSize: '9px',
                                            letterSpacing: '0.18em',
                                            textTransform: 'uppercase',
                                            color: 'var(--gold)',
                                            marginBottom: '16px',
                                        }}>Agent Identity</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '7px', borderBottom: '1px solid rgba(30,30,30,0.7)' }}>
                                                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Name</span>
                                                <span style={{ fontSize: '13px', color: 'var(--white)', fontWeight: '500', textAlign: 'right' }}>{agentName || '—'}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '7px', borderBottom: '1px solid rgba(30,30,30,0.7)' }}>
                                                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Language</span>
                                                <span style={{ fontSize: '13px', color: 'var(--white)', fontWeight: '500', textAlign: 'right' }}>{language}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '7px' }}>
                                                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Voice</span>
                                                <span style={{ fontSize: '13px', color: 'var(--white)', fontWeight: '500', textAlign: 'right' }}>{voices.find(v => v.id === selectedVoice)?.name}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{
                                        background: 'var(--surface)',
                                        border: '1px solid var(--border)',
                                        padding: '24px 26px',
                                    }}>
                                        <div style={{
                                            fontFamily: 'var(--font-mono)',
                                            fontSize: '9px',
                                            letterSpacing: '0.18em',
                                            textTransform: 'uppercase',
                                            color: 'var(--gold)',
                                            marginBottom: '16px',
                                        }}>Business Info</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '7px', borderBottom: '1px solid rgba(30,30,30,0.7)' }}>
                                                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Business</span>
                                                <span style={{ fontSize: '13px', color: 'var(--white)', fontWeight: '500', textAlign: 'right' }}>{businessName || '—'}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '7px', borderBottom: '1px solid rgba(30,30,30,0.7)' }}>
                                                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Industry</span>
                                                <span style={{ fontSize: '13px', color: 'var(--white)', fontWeight: '500', textAlign: 'right' }}>{industry || '—'}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '7px' }}>
                                                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Phone</span>
                                                <span style={{ fontSize: '13px', color: 'var(--white)', fontWeight: '500', textAlign: 'right' }}>{phone || '—'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{
                                        background: 'var(--surface)',
                                        border: '1px solid var(--border)',
                                        padding: '24px 26px',
                                        gridColumn: '1 / -1',
                                    }}>
                                        <div style={{
                                            fontFamily: 'var(--font-mono)',
                                            fontSize: '9px',
                                            letterSpacing: '0.18em',
                                            textTransform: 'uppercase',
                                            color: 'var(--gold)',
                                            marginBottom: '16px',
                                        }}>Services ({services.filter(s => s.name).length})</div>
                                        <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                                            {services.filter(s => s.name).map(s => s.name).join(', ') || 'No services added'}
                                        </div>
                                    </div>

                                    <div style={{
                                        background: 'var(--surface)',
                                        border: '1px solid var(--border)',
                                        padding: '24px 26px',
                                        gridColumn: '1 / -1',
                                    }}>
                                        <div style={{
                                            fontFamily: 'var(--font-mono)',
                                            fontSize: '9px',
                                            letterSpacing: '0.18em',
                                            textTransform: 'uppercase',
                                            color: 'var(--gold)',
                                            marginBottom: '16px',
                                        }}>Schedule ({schedule.filter(d => d.enabled).length} days)</div>
                                        <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                                            {schedule.filter(d => d.enabled).map(d => d.day).join(', ')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div style={{
                        position: 'sticky',
                        bottom: 0,
                        background: 'rgba(8, 8, 8, 0.95)',
                        backdropFilter: 'blur(12px)',
                        borderTop: '1px solid var(--border)',
                        padding: '20px 48px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        zIndex: 40,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                            {currentStep > 1 && (
                                <button
                                    onClick={prevStep}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        background: 'transparent',
                                        border: '1px solid var(--border)',
                                        color: 'var(--muted)',
                                        fontFamily: 'var(--font-body)',
                                        fontSize: '12px',
                                        letterSpacing: '0.06em',
                                        padding: '10px 20px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    ← Back
                                </button>
                            )}
                            <div style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '11px',
                                color: 'var(--muted)',
                                letterSpacing: '0.1em',
                            }}>
                                STEP <strong style={{ color: 'var(--gold)' }}>{currentStep}</strong> / 5
                            </div>
                        </div>

                        {error && (
                            <div style={{
                                marginBottom: '24px',
                                padding: '12px 16px',
                                border: '1px solid rgba(255, 80, 80, 0.3)',
                                background: 'rgba(255, 80, 80, 0.05)',
                                color: '#ff8080',
                                fontSize: '13px',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                            }}>
                                <span>⚠️</span> {error}
                            </div>
                        )}

                        {currentStep < 5 ? (
                            <button
                                onClick={nextStep}
                                className="btn btn-primary"
                                style={{ gap: '12px' }}
                                disabled={isLoading}
                            >
                                Continue →
                            </button>
                        ) : (
                            <button
                                onClick={handleLaunch}
                                className="btn btn-primary"
                                style={{ gap: '12px', position: 'relative' }}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <span className="spinner"></span>
                                        Deploying...
                                    </>
                                ) : (
                                    <>🚀 Launch Agent</>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                /* Success Screen */
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '70vh',
                    textAlign: 'center',
                    padding: '60px 48px',
                }}>
                    <div style={{
                        width: '90px',
                        height: '90px',
                        borderRadius: '50%',
                        border: '1px solid var(--gold-dk)',
                        background: 'rgba(201, 168, 76, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '36px',
                        marginBottom: '28px',
                    }}>✓</div>

                    <h1 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '54px',
                        fontWeight: '300',
                        color: 'var(--white)',
                        lineHeight: '1.05',
                        marginBottom: '12px',
                    }}>
                        Agent <em style={{ fontStyle: 'italic', color: 'var(--gold-lt)' }}>deployed!</em>
                    </h1>
                    <p style={{ fontSize: '15px', color: 'var(--muted)', maxWidth: '420px', margin: '0 auto 36px', lineHeight: '1.7' }}>
                        {agentName} is now live and ready to handle calls. Configure your number to start receiving bookings.
                    </p>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link href="/dashboard" className="btn btn-primary">
                            View Dashboard →
                        </Link>
                        <Link href="/dashboard" className="btn btn-secondary">
                            Configure Number
                        </Link>
                    </div>
                </div>
            )}
        </>
    );
}
