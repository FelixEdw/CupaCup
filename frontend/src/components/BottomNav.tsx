'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Home, Search, PlusSquare, MessageCircle, User } from 'lucide-react';
import { useAuthStore } from '@/store';
import { motion } from 'framer-motion';

const navItems = [
  { href: '/',         icon: Home,          label: 'Home'     },
  { href: '/explore',  icon: Search,        label: 'Explore'  },
  { href: '/create',   icon: PlusSquare,    label: 'Create'   },
  { href: '/messages', icon: MessageCircle, label: 'Messages' },
  { href: '/profile',  icon: User,          label: 'Profile'  },
];

// Pages where the bottom nav should NOT appear
const HIDDEN_ON: RegExp[] = [
  /^\/login(\/.*)?$/,
  /^\/create(\/.*)?$/,
  /^\/settings(\/.*)?$/,
  /^\/messages\/.+/,      // individual chat — /messages/123
  /^\/post\/.+/,          // post detail
];

export default function BottomNav() {
  const pathname = usePathname();
  const router   = useRouter();
  const { isAuthenticated } = useAuthStore();

  // Hide on certain pages
  if (HIDDEN_ON.some(re => re.test(pathname))) return null;

  const handleNav = (href: string) => {
    if (!isAuthenticated && ['/create', '/messages', '/profile'].includes(href)) {
      router.push('/login');
      return;
    }
    router.push(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-t border-white/10">
      <div className="flex items-center justify-center gap-0 w-full px-0 py-2">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
          const isCreate = label === 'Create';

          return (
            <motion.button
              key={href}
              onClick={() => handleNav(href)}
              whileTap={{ scale: 0.88 }}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 min-w-0"
              style={{ flexBasis: '20%' }}
            >
              {isCreate ? (
                /* TikTok-style create button */
                <div className="relative flex items-center justify-center">
                  <div className="w-14 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm">
                    <div className="w-10 h-7 rounded-lg bg-[#FE2C55] flex items-center justify-center">
                      <Icon size={18} className="text-white" strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Icon
                      size={26}
                      className={`transition-colors ${isActive ? 'text-white' : 'text-white/40'}`}
                      strokeWidth={isActive ? 2.5 : 1.8}
                    />
                    {/* Active dot indicator */}
                    {isActive && (
                      <motion.div
                        layoutId="nav-dot"
                        className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full"
                      />
                    )}
                  </div>
                  <span
                    className={`text-[11px] font-medium leading-none transition-colors ${
                      isActive ? 'text-white' : 'text-white/40'
                    }`}
                  >
                    {label}
                  </span>
                </>
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
