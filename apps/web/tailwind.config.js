/** Studio Ledger design tokens, master prompt §9.2. Warm paper editorial. */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FAF8F4',
        raised: '#FFFFFF',
        sunken: '#F1EDE6',
        ink: { DEFAULT: '#2B2B2B', muted: '#6E6A64', faint: '#8A8A8A' },
        line: '#D9D4CC',
        accent: '#3D5A4C',
        positive: '#4E7A52',
        caution: '#B98A2E',
        critical: '#A5432E',
        info: '#3E5C7A',
        // 8-step categorical data series, AA against paper, greyscale-distinguishable (§9.2)
        data: {
          1: '#3D5A4C', 2: '#3E5C7A', 3: '#8A5A2E', 4: '#6B4A7A',
          5: '#2E6E66', 6: '#98572E', 7: '#4A5A2E', 8: '#7A3E50',
        },
      },
      fontFamily: {
        display: ['"Iowan Old Style"', '"Palatino Linotype"', 'Palatino', 'Georgia', 'serif'],
        ui: ['"Avenir Next"', 'Avenir', '"Segoe UI"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        // §9.2 scale 12 / 13 / 15 / 17 / 21 / 28 / 36
        xs: ['12px', '16px'], sm: ['13px', '18px'], base: ['15px', '22px'],
        md: ['17px', '24px'], lg: ['21px', '28px'], xl: ['28px', '34px'], '2xl': ['36px', '42px'],
      },
      borderRadius: {
        personal: '8px',   // §9.2 personal surfaces run warmer and rounder
        financial: '4px',  // financial surfaces tighter and cooler
      },
      maxWidth: { content: '1360px' },
      transitionDuration: { settle: '200ms' }, // §9.2 150-250ms settle; nothing bounces
    },
  },
  plugins: [],
};
