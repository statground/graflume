export interface Tick {
  readonly value: number | string;
  readonly label: string;
  readonly position: number;
}

export interface Scale {
  readonly kind: 'linear' | 'time' | 'band';
  readonly bandwidth: number;
  map(value: number | string | Date): number;
  ticks(count: number, locale?: string): readonly Tick[];
}
