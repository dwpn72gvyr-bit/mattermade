/** OuterEdit brand tokens (Brand Guidelines v1.0) on the Studio Ledger
 *  structure. Colours resolve through CSS variables so light and dark modes
 *  share one vocabulary; triplet form keeps Tailwind's opacity modifiers. */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: v('surface-paper'),
        raised: v('surface-raised'),
        sunken: v('surface-sunken'),
        ink: { DEFAULT: v('ink-primary'), muted: v('ink-muted'), faint: v('ink-faint') },
        line: v('line'),
        accent: v('accent'),
        'accent-contrast': v('accent-contrast'),
        positive: v('positive'),
        caution: v('caution'),
        critical: v('critical'),
        info: v('info'),
        'brand-blue': v('brand-blue'),
        'brand-green': v('brand-green'),
        'brand-lilac': v('brand-lilac'),
        // 8-step categorical data series, AA against paper, greyscale-distinguishable
        data: {
          1: '#FC712B', 2: '#3337FF', 3: '#168A49', 4: '#8A5A2E',
          5: '#6B4A7A', 6: '#2E6E66', 7: '#B4642F', 8: '#7A3E50',
        },
      },
      fontFamily: {
        display: ['"Source Serif 4"', 'Georgia', 'serif'],
        ui: ['Manrope', '"Segoe UI"', 'system-ui', 'sans-serif'],
        mono: ['"Roboto Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        xs: ['12px', '16px'], sm: ['13px', '18px'], base: ['15px', '22px'],
        md: ['17px', '24px'], lg: ['21px', '28px'], xl: ['28px', '34px'], '2xl': ['36px', '42px'],
      },
      borderRadius: {
        personal: '8px',
        financial: '4px',
      },
      maxWidth: { content: '1360px' },
      transitionDuration: { settle: '200ms' },
    },
  },
  plugins: [],
};
