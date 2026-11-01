import React from 'react';

// Precision hairline SVG wireframe vectors matching Mobile
function ShoppingBagIcon({ className }) {
  return (
    <svg className={className} width="36" height="36" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 8V6.5C6 4.567 7.567 3 9.5 3h5C16.433 3 18 4.567 18 6.5V8"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M4.5 8.5h15l-1.2 11.2c-.1.9-.9 1.6-1.8 1.6H7.5c-.9 0-1.7-.7-1.8-1.6L4.5 8.5z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M10 12a2 2 0 104 0"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StoreCartIcon({ className }) {
  return (
    <svg className={className} width="36" height="36" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 4h2.5l2 10.5h10l2-8H6.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM16.5 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}

function StorefrontIcon({ className }) {
  return (
    <svg className={className} width="36" height="36" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 9l1.5-5h15L21 9M3 9v10a1.5 1.5 0 001.5 1.5h15a1.5 1.5 0 001.5-1.5V9M3 9h18"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 14h6v6.5H9V14z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ParcelBoxIcon({ className }) {
  return (
    <svg className={className} width="36" height="36" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3l9 4.8v8.4L12 21l-9-4.8V7.8L12 3z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M12 3v9M21 7.8l-9 4.2M3 7.8l9 4.2"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SparkleIcon({ className }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
}

export function AnimatedAuthBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden select-none z-0">
      {/* Central Ambient Breathing Aura */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full bg-emerald-500/5 dark:bg-emerald-400/8 blur-3xl animate-pulse duration-1000" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full bg-sky-500/5 dark:bg-sky-400/6 blur-2xl" />

      {/* Floating Hairline Vector Wireframes */}
      {/* Top Left: Shopping Bag */}
      <div
        className="absolute top-16 left-[10%] text-emerald-600 dark:text-emerald-400 opacity-[0.08] dark:opacity-[0.14] animate-bounce"
        style={{ animationDuration: '6s' }}
      >
        <ShoppingBagIcon />
      </div>

      {/* Top Right: Cart */}
      <div
        className="absolute top-24 right-[12%] text-emerald-600 dark:text-emerald-400 opacity-[0.07] dark:opacity-[0.12] animate-bounce"
        style={{ animationDuration: '5.2s' }}
      >
        <StoreCartIcon />
      </div>

      {/* Mid Left: Sparkle */}
      <div
        className="absolute top-1/2 left-[14%] text-slate-500 dark:text-slate-300 opacity-[0.09] dark:opacity-[0.15] animate-pulse"
        style={{ animationDuration: '4.5s' }}
      >
        <SparkleIcon />
      </div>

      {/* Mid Right: Sparkle */}
      <div
        className="absolute top-[48%] right-[15%] text-slate-500 dark:text-slate-300 opacity-[0.08] dark:opacity-[0.14] animate-pulse"
        style={{ animationDuration: '5s' }}
      >
        <SparkleIcon />
      </div>

      {/* Bottom Left: Storefront */}
      <div
        className="absolute bottom-20 left-[12%] text-emerald-600 dark:text-emerald-400 opacity-[0.08] dark:opacity-[0.13] animate-bounce"
        style={{ animationDuration: '6.4s' }}
      >
        <StorefrontIcon />
      </div>

      {/* Bottom Right: Parcel */}
      <div
        className="absolute bottom-28 right-[10%] text-emerald-600 dark:text-emerald-400 opacity-[0.07] dark:opacity-[0.12] animate-bounce"
        style={{ animationDuration: '5.6s' }}
      >
        <ParcelBoxIcon />
      </div>
    </div>
  );
}

export default AnimatedAuthBackground;
