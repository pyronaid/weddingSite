import { DEFAULT_MONOGRAM, type MonogramDesign } from './monogram';

/** Colour schemes of the ready-made logo files: the site's plum and pink, one colour, for dark backgrounds. */
export const LOGO_SCHEMES = {
  color: { colors: ['#6d3350', '#c24f78'], separatorColor: '#c24f78', borderColor: '#6d3350' },
  mono: { colors: ['#4a2537', '#4a2537'], separatorColor: '#4a2537', borderColor: '#4a2537' },
  light: { colors: ['#fff7f2', '#ffc2d6'], separatorColor: '#ffc2d6', borderColor: '#fff7f2' },
} satisfies Record<string, Pick<MonogramDesign, 'colors' | 'separatorColor' | 'borderColor'>>;
export type LogoScheme = keyof typeof LOGO_SCHEMES;

/** The couple's logos ready in public/brand/ (npm run brand): G and V crossed, in script, and as a seal. */
export const LOGO_PRESETS = {
  'gv-script': DEFAULT_MONOGRAM,
  'gv-seal': { ...DEFAULT_MONOGRAM, font: 'serif', border: 'stile_01' },
} satisfies Record<string, MonogramDesign>;

export const withScheme = (design: MonogramDesign, scheme: LogoScheme): MonogramDesign => ({
  ...design,
  ...LOGO_SCHEMES[scheme],
  colors: [...LOGO_SCHEMES[scheme].colors] as [string, string],
});
