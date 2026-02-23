# Zara - AI Voice Booking Platform

A sophisticated Next.js application with Zara's luxury black and gold aesthetic for AI voice booking agents.

## 🎨 Design System

### Colors
- **Black Tones**: `#080808` (black), `#0f0f0f` (surface), `#141414` (card), `#1e1e1e` (border)
- **Gold Accents**: `#c9a84c` (primary), `#e8c97a` (light), `#8a6b2a` (dark)
- **Text**: `#f5f0e8` (white), `#d4d4d4` (text), `#4a4a4a` (muted)

### Typography
- **Display Font**: Cormorant Garamond (serif) - For headings with italic emphasis
- **Body Font**: Outfit (sans-serif) - For UI elements and body text
- **Mono Font**: DM Mono (monospace) - For labels and badges

### Effects
- Grain texture overlay  
- Floating gold orbs with animations
- Grid background with radial mask
- Gold glow on hover states
- Minimalist borders and cards

## 📁 Project Structure

```
frontend/
├── app/
│   ├── page.tsx                 # Landing page (zara-landing.html)
│   ├── login/
│   │   └── page.tsx            # Login page
│   ├── register/
│   │   └── page.tsx            # Registration page
│   ├── dashboard/
│   │   └── page.tsx            # Dashboard (zara-dashboard.html)
│   ├── wizard/
│   │   └── page.tsx            # Setup wizard (zara-wizard.html)
│   ├── layout.tsx              # Root layout
│   └── globals.css             # Global styles with Zara design system
├── zara-landing.html           # Original HTML reference
├── zara-dashboard.html         # Original HTML reference
└── zara-wizard.html            # Original HTML reference
```

## 🚀 Pages

### 1. **Landing Page** (`/`)
- Hero section with animated background
- Features grid (6 cards)
- "How it works" process steps
- Stats showcasing platform capabilities
- Call-to-action sections
- **Routes to**: `/dashboard`

### 2. **Login Page** (`/login`)
- Elegant form with validation
- Social login (Google, GitHub)
- "Remember me" and "Forgot password" options
- Error handling with animations
- **Routes to**: `/dashboard` (after login)

### 3. **Register Page** (`/register`)
- Full registration form with validation
- Password strength indicator
- Terms acceptance
- Social signup options
- **Routes to**: `/login` or `/dashboard`

### 4. **Dashboard** (`/dashboard`)
- Sidebar navigation with logo and user profile
- Project cards grid showing AI agents
- Statistics overview (agents, bookings, calls, conversion rate)
- Modal for creating new agents
- Project status indicators (live/draft)
- **Routes to**: `/wizard` (when creating new agent)

### 5. **Wizard** (`/wizard`)
- Multi-step agent setup process (5 steps):
  1. **Identity**: Agent name, voice persona, language, greeting
  2. **Business Details**: Business name, industry, phone, website
  3. **Services**: Add/remove services with duration and price
  4. **Schedule**: Set working hours for each day with toggles
  5. **Review & Launch**: Summary of all settings
- Interactive stepper navigation with progress tracking
- Form validation and state management
- Success screen after launch
- **Routes to**: `/dashboard` (after completion)

## 🔗 Navigation Flow

```
Landing (/) 
  → Login (/login) → Dashboard (/dashboard) → Wizard (/wizard)
  → Register (/register) → Dashboard (/dashboard)
  → Dashboard (direct access)
```

## 🎯key Features

- **Fully Responsive**: Works on desktop, tablet, and mobile
- **Type-Safe**: Built with TypeScript
- **Client Components**: Interactive forms and modals
- **Next.js App Router**: Modern routing with layouts
- **Consistent Design**: Zara aesthetic across all pages
- **Smooth Animations**: Fade-ins, orb floats, and hover effects

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 📝 Code Highlights

### Global CSS Classes
- `.btn-primary` - Gold gradient button
- `.btn-secondary` - Outlined button
- `.glass-container` - Card with gold glow
- `.form-input` - Styled input fields
- `.auth-background` - Animated background with orbs

### Color Variables
```css
--black: #080808
--gold: #c9a84c
--gold-lt: #e8c97a
--gold-dk: #8a6b2a
--font-display: 'Cormorant Garamond', serif
--font-body: 'Outfit', sans-serif
--font-mono: 'DM Mono', monospace
```

## 🎨 Design Principles

1. **Luxury & Minimalism**: Black backgrounds with gold accents
2. **Typography Hierarchy**: Display for headings, body for text, mono for labels
3. **Subtle Animations**: Orbs, fade-ins, glow effects
4. **Clear CTAs**: Gold gradient buttons stand out
5. **Consistent Spacing**: Grid-based layouts with 1px borders

## 📦 Dependencies

- **Next.js 15+**: React framework
- **React 18+**: UI library
- **TypeScript**: Type safety
- **Google Fonts**: Cormorant Garamond, Outfit, DM Mono

## 🌐 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 📄 License

Proprietary - All rights reserved

---

**Built with precision and luxury aesthetics** ✨
