/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_WS_URL?: string;
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  readonly VITE_AI_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.jsx' {
  const component: any;
  export default component;
  export const ThemeProvider: any;
  export const useTheme: any;
  export const themeConfig: any;
  export const ThemeSwitcher: any;
}

declare module './theme/ThemeContext' {
  export const ThemeProvider: any;
  export const useTheme: any;
}

declare module '../theme/ThemeSwitcher' {
  const ThemeSwitcher: any;
  export default ThemeSwitcher;
}

declare module './pages/vitals/VitalsPage' {
  const VitalsPage: any;
  export default VitalsPage;
}
