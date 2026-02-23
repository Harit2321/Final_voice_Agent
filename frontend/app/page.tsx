import Link from "next/link";

export default function Home() {
  return (
    <>
      {/* Nav */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '22px 60px',
        background: 'linear-gradient(to bottom, rgba(8,8,8,0.96) 0%, transparent 100%)',
        backdropFilter: 'blur(16px)',
      }}>
        <Link href="/" style={{
          fontFamily: 'var(--font-display)',
          fontSize: '28px',
          fontWeight: '600',
          letterSpacing: '0.1em',
          color: 'var(--white)',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            background: 'var(--gold)',
            borderRadius: '50%',
          }}></div>
          Zara
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '36px' }}>
          <Link href="#features" style={{
            color: 'var(--muted)',
            textDecoration: 'none',
            fontSize: '12px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            transition: 'color 0.2s',
          }}>Features</Link>
          <Link href="#how" style={{
            color: 'var(--muted)',
            textDecoration: 'none',
            fontSize: '12px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            transition: 'color 0.2s',
          }}>How it works</Link>
          <Link href="/login" style={{
            color: 'var(--muted)',
            textDecoration: 'none',
            fontSize: '12px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            transition: 'color 0.2s',
          }}>Sign In</Link>
          <Link href="/register" style={{
            padding: '9px 24px',
            border: '1px solid var(--gold-dk)',
            background: 'transparent',
            color: 'var(--gold)',
            fontFamily: 'var(--font-body)',
            fontSize: '12px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'all 0.3s',
            textDecoration: 'none',
            display: 'inline-block',
          }}>Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        padding: '140px 60px 100px',
      }}>
        {/* Background effects */}
        <div style={{
          position: 'absolute',
          top: '-5%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '1000px',
          height: '700px',
          background: 'radial-gradient(ellipse, rgba(201,168,76,0.08) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}></div>

        <div className="grid-bg"></div>
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>

        <div style={{
          position: 'relative',
          zIndex: 2,
          textAlign: 'center',
          maxWidth: '900px',
        }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            padding: '7px 18px',
            border: '1px solid rgba(201,168,76,0.2)',
            background: 'rgba(201,168,76,0.04)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            letterSpacing: '0.18em',
            color: 'var(--gold)',
            textTransform: 'uppercase',
            marginBottom: '36px',
          }}>
            <div style={{
              width: '6px',
              height: '6px',
              background: 'var(--gold)',
              borderRadius: '50%',
            }}></div>
            AI Voice Booking Platform
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(58px, 8vw, 108px)',
            fontWeight: '300',
            lineHeight: '1.0',
            letterSpacing: '-0.02em',
            color: 'var(--white)',
            marginBottom: '14px',
          }}>
            Your business,<br />always <em style={{ fontStyle: 'italic', color: 'var(--gold-lt)' }}>answering</em>
          </h1>

          <p style={{
            fontSize: '17px',
            color: 'var(--muted)',
            maxWidth: '540px',
            margin: '0 auto 52px',
            fontWeight: '300',
            lineHeight: '1.7',
          }}>
            Build a custom AI voice agent for any business in minutes. Handles calls, qualifies customers, and confirms bookings — 24 hours a day.
          </p>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
            flexWrap: 'wrap',
          }}>
            <Link href="/register" className="btn btn-primary">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none" />
              </svg>
              Start Building Free
            </Link>
            <Link href="#how" className="btn btn-secondary">
              See how it works →
            </Link>
          </div>

          {/* Stats bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '72px',
            marginTop: '80px',
            paddingTop: '44px',
            borderTop: '1px solid var(--border)',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '40px',
                fontWeight: '300',
                color: 'var(--white)',
                letterSpacing: '-0.02em',
                lineHeight: '1',
              }}>40<sup style={{ fontSize: '22px', color: 'var(--gold)' }}>+</sup></div>
              <div style={{
                fontSize: '11px',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
                marginTop: '6px',
              }}>Industries</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '40px',
                fontWeight: '300',
                color: 'var(--white)',
                letterSpacing: '-0.02em',
                lineHeight: '1',
              }}>24<sup style={{ fontSize: '22px', color: 'var(--gold)' }}>/7</sup></div>
              <div style={{
                fontSize: '11px',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
                marginTop: '6px',
              }}>Availability</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '40px',
                fontWeight: '300',
                color: 'var(--white)',
                letterSpacing: '-0.02em',
                lineHeight: '1',
              }}>3<sup style={{ fontSize: '22px', color: 'var(--gold)' }}>min</sup></div>
              <div style={{
                fontSize: '11px',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
                marginTop: '6px',
              }}>Setup Time</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '40px',
                fontWeight: '300',
                color: 'var(--white)',
                letterSpacing: '-0.02em',
                lineHeight: '1',
              }}>98<sup style={{ fontSize: '22px', color: 'var(--gold)' }}>%</sup></div>
              <div style={{
                fontSize: '11px',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
                marginTop: '6px',
              }}>Booking Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{
        padding: '100px 60px',
        maxWidth: '1240px',
        margin: '0 auto',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--gold)',
          marginBottom: '18px',
        }}>
          <div style={{ width: '28px', height: '1px', background: 'var(--gold)' }}></div>
          What you get
        </div>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(38px, 4.5vw, 60px)',
          fontWeight: '300',
          color: 'var(--white)',
          lineHeight: '1.08',
          marginBottom: '60px',
        }}>
          Everything your agent <em style={{ fontStyle: 'italic', color: 'var(--gold-lt)' }}>needs</em>
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1px',
          background: 'var(--border)',
          border: '1px solid var(--border)',
        }}>
          {[
            { icon: '🎙', title: 'Natural Voice AI', desc: 'Ultra-realistic voices with custom persona names, tones, and accents.' },
            { icon: '📅', title: 'Smart Scheduling', desc: 'Real-time slot management, conflict detection, and calendar sync.' },
            { icon: '🏢', title: 'Any Industry', desc: 'Salons, clinics, studios, legal offices, gyms — works universally.' },
            { icon: '🔧', title: 'Custom Services', desc: 'Define every service with duration, price, and availability.' },
            { icon: '🌍', title: 'Multilingual', desc: 'Speaks 30+ languages with native fluency.' },
            { icon: '📊', title: 'Live Dashboard', desc: 'Real-time booking feed, call transcripts, conversion rates.' },
          ].map((feat, i) => (
            <div key={i} style={{
              background: 'var(--card)',
              padding: '44px 38px',
              position: 'relative',
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--border)',
                fontSize: '20px',
                marginBottom: '26px',
              }}>{feat.icon}</div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '22px',
                color: 'var(--white)',
                marginBottom: '10px',
              }}>{feat.title}</div>
              <div style={{
                fontSize: '13px',
                color: 'var(--muted)',
                lineHeight: '1.75',
              }}>{feat.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, var(--border), transparent)', margin: '0 60px' }}></div>

      <section id="how" style={{
        padding: '100px 60px',
        maxWidth: '1240px',
        margin: '0 auto',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--gold)',
          marginBottom: '18px',
        }}>
          <div style={{ width: '28px', height: '1px', background: 'var(--gold)' }}></div>
          Process
        </div>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(38px, 4.5vw, 60px)',
          fontWeight: '300',
          color: 'var(--white)',
          lineHeight: '1.08',
          marginBottom: '64px',
        }}>
          Live in <em style={{ fontStyle: 'italic', color: 'var(--gold-lt)' }}>four</em> steps
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '0',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute',
            top: '27px',
            left: '8%',
            right: '8%',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, var(--gold-dk), var(--gold), var(--gold-dk), transparent)',
          }}></div>

          {[
            { num: '01', title: 'Name Your Agent', desc: 'Choose a persona, voice style, and define your business identity.' },
            { num: '02', title: 'Define Services', desc: 'Add every offering, price, and duration your business provides.' },
            { num: '03', title: 'Set Schedule', desc: 'Configure working hours, buffer times, and booking advance limits.' },
            { num: '04', title: 'Go Live', desc: 'Your agent receives calls and books appointments instantly.' },
          ].map((step, i) => (
            <div key={i} style={{
              textAlign: 'center',
              padding: '0 24px',
              position: 'relative',
              zIndex: 1,
            }}>
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                border: '1px solid var(--gold-dk)',
                background: 'var(--card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--gold)',
                margin: '0 auto 22px',
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute',
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  border: '1px solid rgba(201,168,76,0.12)',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                }}></div>
                {step.num}
              </div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '20px',
                color: 'var(--white)',
                marginBottom: '8px',
              }}>{step.title}</div>
              <div style={{
                fontSize: '12.5px',
                color: 'var(--muted)',
                lineHeight: '1.7',
              }}>{step.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div style={{
        margin: '80px 60px',
        padding: '72px 80px',
        background: 'var(--card)',
        border: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '40px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, var(--gold), transparent)',
        }}></div>
        <div>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(32px, 3.5vw, 48px)',
            fontWeight: '300',
            color: 'var(--white)',
            lineHeight: '1.1',
            marginBottom: '10px',
          }}>
            Ready to let Zara<br /><em style={{ fontStyle: 'italic', color: 'var(--gold-lt)' }}>handle the calls?</em>
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--muted)' }}>No credit card required. Live in under 3 minutes.</p>
        </div>
        <Link href="/dashboard" className="btn btn-primary">
          Create Your Agent →
        </Link>
      </div>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '36px 60px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: '22px',
          letterSpacing: '0.08em',
          color: 'var(--white)',
        }}>Zara</div>
        <p style={{ fontSize: '12px', color: 'var(--muted)' }}>© 2026 Zara AI — All rights reserved</p>
      </footer>
    </>
  );
}
