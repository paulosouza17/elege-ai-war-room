import React from 'react';

/* ═══════════════════════════════════════════════════════
   SVG Icon System — Animated CSS Icons for Presentation
   ═══════════════════════════════════════════════════════ */

type IP = { size?: number; color?: string; className?: string };

export const IconShield: React.FC<IP> = ({ size = 24, color = 'currentColor', className }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
);

export const IconActivity: React.FC<IP> = ({ size = 24, color = 'currentColor', className }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
);

export const IconEye: React.FC<IP> = ({ size = 24, color = 'currentColor', className }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
);

export const IconTarget: React.FC<IP> = ({ size = 24, color = 'currentColor', className }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
);

export const IconAlertTriangle: React.FC<IP> = ({ size = 24, color = 'currentColor', className }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);

export const IconMonitor: React.FC<IP> = ({ size = 24, color = 'currentColor', className }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
    </svg>
);

export const IconMessageCircle: React.FC<IP> = ({ size = 24, color = 'currentColor', className }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
    </svg>
);

export const IconTrendingUp: React.FC<IP> = ({ size = 24, color = 'currentColor', className }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
    </svg>
);

export const IconSearch: React.FC<IP> = ({ size = 24, color = 'currentColor', className }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);

export const IconRadio: React.FC<IP> = ({ size = 24, color = 'currentColor', className }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="2" /><path d="M16.24 7.76a6 6 0 010 8.49m-8.48-.01a6 6 0 010-8.49m11.31-2.82a10 10 0 010 14.14m-14.14 0a10 10 0 010-14.14" />
    </svg>
);

export const IconGlobe: React.FC<IP> = ({ size = 24, color = 'currentColor', className }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
);

export const IconUsers: React.FC<IP> = ({ size = 24, color = 'currentColor', className }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
);

export const IconBarChart: React.FC<IP> = ({ size = 24, color = 'currentColor', className }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" />
    </svg>
);

export const IconZap: React.FC<IP> = ({ size = 24, color = 'currentColor', className }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
);

export const IconClock: React.FC<IP> = ({ size = 24, color = 'currentColor', className }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
);

export const IconBrain: React.FC<IP> = ({ size = 24, color = 'currentColor', className }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.5 2A5.5 5.5 0 005 7.5c0 .98.26 1.9.71 2.69L3 13l2.71 2.81A5.5 5.5 0 009.5 22h1a5.5 5.5 0 003.79-6.19L17 13l-2.71-2.81A5.5 5.5 0 0014.5 2h-5z" />
        <path d="M12 2v20" />
    </svg>
);

export const IconPlay: React.FC<IP> = ({ size = 24, color = 'currentColor', className }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
        <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
);

export const IconScissors: React.FC<IP> = ({ size = 24, color = 'currentColor', className }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
);

export const IconDownload: React.FC<IP> = ({ size = 24, color = 'currentColor', className }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);

export const IconChevronRight: React.FC<IP> = ({ size = 24, color = 'currentColor', className }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
    </svg>
);

export const IconChevronLeft: React.FC<IP> = ({ size = 24, color = 'currentColor', className }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
    </svg>
);

export const IconCheck: React.FC<IP> = ({ size = 24, color = 'currentColor', className }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

export const IconLock: React.FC<IP> = ({ size = 24, color = 'currentColor', className }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
);

/* ═══ Design Tokens ═══ */
export const T = {
    bg: '#0f172a',
    surface: '#1e293b',
    surfaceLight: '#334155',
    border: 'rgba(51,65,85,0.5)',
    borderSolid: '#334155',
    primary: '#3b82f6',
    accent: '#f59e0b',
    danger: '#ef4444',
    success: '#22c55e',
    warning: '#eab308',
    cyan: '#06b6d4',
    purple: '#a855f7',
    pink: '#ec4899',
    teal: '#14b8a6',
    white: '#f8fafc',
    muted: '#94a3b8',
    dim: '#64748b',
    font: "'Inter', sans-serif",
    mono: "'JetBrains Mono', monospace",
};

/* ═══ CSS Animations (inject once) ═══ */
export const GLOBAL_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap');

/* Base keyframes */
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
@keyframes pulse-soft { 0%,100% { opacity:1; } 50% { opacity:0.7; } }
@keyframes scan { 0% { left:-30%; } 100% { left:130%; } }
@keyframes typing { from { width:0; } to { width:100%; } }
@keyframes blink { 0%,100% { border-color:transparent; } 50% { border-color:#94a3b8; } }
@keyframes bar-fill { from { width:0; } }

/* Mockup floating — sensação de leveza */
@keyframes mockup-float {
  0%,100% { transform: translateY(0px) rotate(0deg); }
  25% { transform: translateY(-5px) rotate(0.15deg); }
  50% { transform: translateY(-8px) rotate(0deg); }
  75% { transform: translateY(-3px) rotate(-0.15deg); }
}

/* Entry animations */
@keyframes slide-up { from { opacity:0; transform:translateY(32px); } to { opacity:1; transform:translateY(0); } }
@keyframes slide-right { from { opacity:0; transform:translateX(-32px); } to { opacity:1; transform:translateX(0); } }
@keyframes scale-in { from { opacity:0; transform:scale(0.92); } to { opacity:1; transform:scale(1); } }
@keyframes fade-up { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }

/* Crossfade for rotating content */
@keyframes crossfade-in { from { opacity:0; transform:translateY(12px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
@keyframes crossfade-out { from { opacity:1; transform:translateY(0) scale(1); } to { opacity:0; transform:translateY(-12px) scale(0.97); } }

/* Line chart animated draw */
@keyframes line-draw-anim { from { stroke-dashoffset: 600; } to { stroke-dashoffset: 0; } }
@keyframes fade-in { from { opacity:0; } to { opacity:1; } }

/* Glow pulse */
@keyframes glow-pulse { 0%,100% { box-shadow:0 0 8px rgba(59,130,246,0.3); } 50% { box-shadow:0 0 20px rgba(59,130,246,0.6); } }
@keyframes glow-danger { 0%,100% { box-shadow:0 0 8px rgba(239,68,68,0.2); } 50% { box-shadow:0 0 20px rgba(239,68,68,0.5); } }

/* Waveform for radio audio */
@keyframes wave-1 { 0%,100% { height:30%; } 50% { height:90%; } }
@keyframes wave-2 { 0%,100% { height:60%; } 50% { height:20%; } }
@keyframes wave-3 { 0%,100% { height:45%; } 50% { height:80%; } }
@keyframes wave-4 { 0%,100% { height:70%; } 50% { height:35%; } }
@keyframes wave-5 { 0%,100% { height:25%; } 50% { height:65%; } }

/* Utility classes */
.anim-pulse { animation: pulse 2s ease-in-out infinite; }
.anim-pulse-soft { animation: pulse-soft 3s ease-in-out infinite; }
.anim-float { animation: mockup-float 5s ease-in-out infinite; }
.anim-spin { animation: spin 8s linear infinite; }
.anim-spin-fast { animation: spin 2s linear infinite; }
.anim-glow { animation: glow-pulse 2s ease-in-out infinite; }
.anim-glow-danger { animation: glow-danger 2s ease-in-out infinite; }
.anim-entry { animation: slide-up 0.7s cubic-bezier(0.16,1,0.3,1) both; }
.anim-entry-right { animation: slide-right 0.7s cubic-bezier(0.16,1,0.3,1) both; }
.anim-scale-in { animation: scale-in 0.5s cubic-bezier(0.16,1,0.3,1) both; }
.anim-crossfade-in { animation: crossfade-in 0.6s ease-out both; }
.anim-crossfade-out { animation: crossfade-out 0.4s ease-in both; }

/* Ensure presentation fits within viewport — designed for 1440x670 minimum */
.slide-content-scaler {
  max-width: 1100px;
  max-height: calc(100vh - 80px);
  width: 100%;
}
`;

/* ═══ Badge Component ═══ */
export const Badge: React.FC<{ label: string; color: string; filled?: boolean }> = ({ label, color, filled }) => (
    <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
        color: filled ? '#fff' : color,
        background: filled ? color : `${color}15`,
        border: `1px solid ${color}30`,
        padding: '3px 10px', borderRadius: 6,
    }}>{label}</span>
);
