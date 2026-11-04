import type { Context, ReactNode } from 'react';

interface ThemeState {
  theme: string;
  isDark: boolean;
  toggleTheme: (mode?: string) => void;
}
export const ThemeContext: Context<ThemeState | null>;
export function ThemeProvider(props: { children: ReactNode }): ReactNode;
export function useTheme(): ThemeState;
export default ThemeContext;