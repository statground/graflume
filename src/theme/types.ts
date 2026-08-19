export interface ThemeTokens {
  readonly name: string;
  readonly mode: 'light' | 'dark';
  readonly colors: {
    readonly background: string;
    readonly surface: string;
    readonly text: string;
    readonly mutedText: string;
    readonly axis: string;
    readonly grid: string;
    readonly focus: string;
    readonly palette: readonly string[];
    readonly sequential: readonly string[];
    readonly diverging: readonly string[];
  };
  readonly typography: {
    readonly fontFamily: string;
    readonly fontSize: number;
    readonly titleSize: number;
    readonly subtitleSize: number;
    readonly lineHeight: number;
  };
  readonly spacing: {
    readonly xs: number;
    readonly sm: number;
    readonly md: number;
    readonly lg: number;
    readonly xl: number;
  };
  readonly axis: {
    readonly lineWidth: number;
    readonly tickLength: number;
    readonly labelPadding: number;
    readonly gridLineWidth: number;
  };
  readonly mark: {
    readonly lineWidth: number;
    readonly pointRadius: number;
    readonly barRadius: number;
    readonly opacity: number;
  };
  readonly motion: {
    readonly duration: number;
    readonly easing: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
  };
}
