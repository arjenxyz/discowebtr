'use client';

import { useLayoutEffect } from 'react';

export default function ThemeBootstrap() {
  useLayoutEffect(() => {
    try {
      const stored = localStorage.getItem('mailSectionTheme') || localStorage.getItem('uiTheme');
      if (stored === 'dark') {
        document.body.classList.add('mail-theme-dark');
      } else {
        document.body.classList.remove('mail-theme-dark');
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      // ignore
    }
  }, []);

  return null;
}
