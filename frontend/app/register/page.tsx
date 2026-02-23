'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api-client';

export default function RegisterPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [acceptTerms, setAcceptTerms] = useState(false);

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error for this field when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};

        if (!formData.fullName.trim()) {
            newErrors.fullName = 'Full name is required';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters';
        }

        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        if (!acceptTerms) {
            newErrors.terms = 'You must accept the terms and conditions';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);

        try {
            const response = await authApi.register({
                name: formData.fullName,
                email: formData.email,
                password: formData.password,
            });

            if (response.success) {
                console.log('Registration successful', response.data);
                // Automatically login or redirect to login
                const loginResponse = await authApi.login({
                    email: formData.email,
                    password: formData.password,
                });

                if (loginResponse.success) {
                    router.push('/dashboard');
                } else {
                    router.push('/login');
                }
            } else {
                if (response.error?.includes('unique')) {
                    setErrors(prev => ({ ...prev, email: 'Email already registered' }));
                } else {
                    setErrors(prev => ({ ...prev, form: response.error || 'Registration failed' }));
                }
            }
        } catch (err) {
            console.error('Registration error:', err);
            setErrors(prev => ({ ...prev, form: 'An unexpected error occurred' }));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Animated background */}
            <div className="auth-background">
                <div className="grid-bg"></div>
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
            </div>

            {/* Main container */}
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem',
            }}>
                <div className="glass-container fade-in" style={{
                    width: '100%',
                    maxWidth: '520px',
                }}>
                    {/* Header */}
                    <div className="text-center mb-4">
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '10px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '11px',
                            letterSpacing: '0.2em',
                            color: 'var(--gold)',
                            textTransform: 'uppercase',
                            marginBottom: '1.5rem',
                        }}>
                            <div style={{
                                width: '6px',
                                height: '6px',
                                background: 'var(--gold)',
                                borderRadius: '50%',
                            }}></div>
                            Create Account
                        </div>

                        <h1 style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
                            fontWeight: '300',
                            lineHeight: '1.0',
                            letterSpacing: '-0.02em',
                            color: 'var(--white)',
                            marginBottom: '1rem',
                        }}>
                            Join <em style={{ fontStyle: 'italic', color: 'var(--gold-lt)' }}>Zara</em>
                        </h1>
                        <p style={{
                            color: 'var(--muted)',
                            fontSize: '15px',
                        }}>
                            Begin your journey with refined authentication
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit}>
                        {/* Full Name field */}
                        <div className="form-group">
                            <label htmlFor="fullName" className="form-label">
                                Full Name
                            </label>
                            <input
                                id="fullName"
                                type="text"
                                className="form-input"
                                placeholder="John Doe"
                                value={formData.fullName}
                                onChange={(e) => handleChange('fullName', e.target.value)}
                                disabled={isLoading}
                            />
                            {errors.fullName && (
                                <div className="error-message">
                                    ⚠ {errors.fullName}
                                </div>
                            )}
                        </div>

                        {/* Email field */}
                        <div className="form-group">
                            <label htmlFor="email" className="form-label">
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                className="form-input"
                                placeholder="you@example.com"
                                value={formData.email}
                                onChange={(e) => handleChange('email', e.target.value)}
                                disabled={isLoading}
                            />
                            {errors.email && (
                                <div className="error-message">
                                    ⚠ {errors.email}
                                </div>
                            )}
                        </div>

                        {/* Password field */}
                        <div className="form-group">
                            <label htmlFor="password" className="form-label">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                className="form-input"
                                placeholder="Create a strong password"
                                value={formData.password}
                                onChange={(e) => handleChange('password', e.target.value)}
                                disabled={isLoading}
                            />
                            {errors.password && (
                                <div className="error-message">
                                    ⚠ {errors.password}
                                </div>
                            )}
                            {!errors.password && formData.password && (
                                <div style={{ marginTop: '0.5rem', fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
                                    Strength: {formData.password.length < 8 ? 'WEAK' : formData.password.length < 12 ? 'MEDIUM' : 'STRONG'}
                                </div>
                            )}
                        </div>

                        {/* Confirm Password field */}
                        <div className="form-group">
                            <label htmlFor="confirmPassword" className="form-label">
                                Confirm Password
                            </label>
                            <input
                                id="confirmPassword"
                                type="password"
                                className="form-input"
                                placeholder="Confirm your password"
                                value={formData.confirmPassword}
                                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                                disabled={isLoading}
                            />
                            {errors.confirmPassword && (
                                <div className="error-message">
                                    ⚠ {errors.confirmPassword}
                                </div>
                            )}
                        </div>

                        {/* Terms and conditions */}
                        <div style={{ marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                <input
                                    type="checkbox"
                                    id="terms"
                                    checked={acceptTerms}
                                    onChange={(e) => {
                                        setAcceptTerms(e.target.checked);
                                        if (errors.terms) {
                                            setErrors(prev => ({ ...prev, terms: '' }));
                                        }
                                    }}
                                    style={{
                                        width: '16px',
                                        height: '16px',
                                        marginTop: '2px',
                                        accentColor: 'var(--gold)',
                                        cursor: 'pointer',
                                    }}
                                />
                                <label htmlFor="terms" style={{ color: 'var(--muted)', fontSize: '13px', cursor: 'pointer', lineHeight: '1.6' }}>
                                    I agree to the{' '}
                                    <Link href="#" className="text-link">
                                        Terms of Service
                                    </Link>
                                    {' '}and{' '}
                                    <Link href="#" className="text-link">
                                        Privacy Policy
                                    </Link>
                                </label>
                            </div>
                            {errors.terms && (
                                <div className="error-message">
                                    ⚠ {errors.terms}
                                </div>
                            )}
                        </div>

                        {/* Submit button */}
                        <button
                            type="submit"
                            className="btn btn-primary btn-full"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <span className="spinner"></span>
                                    Creating account...
                                </>
                            ) : (
                                'Create Account'
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="divider">
                        <span>Or sign up with</span>
                    </div>

                    {/* Social signup buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '2.5rem' }}>
                        <button className="social-btn">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Google
                        </button>

                        <button className="social-btn">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                            </svg>
                            GitHub
                        </button>
                    </div>

                    {/* Sign in link */}
                    <div className="text-center" style={{ color: 'var(--muted)', fontSize: '13px' }}>
                        Already have an account?{' '}
                        <Link href="/login" className="text-link">
                            Sign in
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}
