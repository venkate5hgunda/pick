export interface WheelOption {
  id: string;
  label: string;
  color: string;
  weight: number;
}

export interface WheelSlice extends WheelOption {
  sourceIndex: number;
  setIndex: number;
}

export interface WheelPreset {
  label: string;
  inputSets: number;
  options: string[];
}

export const PALETTE = [
  '#ff6546',
  '#ffc33d',
  '#4eb7aa',
  '#8668e8',
  '#f789c5',
  '#65bce9',
];

export const PRESETS: Record<string, WheelPreset> = {
  yesno: { label: 'Yes / No', inputSets: 5, options: ['Yes', 'No'] },
  maybe: {
    label: 'Yes / No / Maybe',
    inputSets: 3,
    options: ['Yes', 'No', 'Maybe'],
  },
  coin: { label: 'Coin flip', inputSets: 4, options: ['Heads', 'Tails'] },
  rps: {
    label: 'Rock / Paper / Scissors',
    inputSets: 3,
    options: ['Rock', 'Paper', 'Scissors'],
  },
  meals: {
    label: 'What should we eat?',
    inputSets: 1,
    options: ['Pizza', 'Tacos', 'Noodles', 'Salad', 'Burgers', 'Surprise me'],
  },
  order: {
    label: 'Player order',
    inputSets: 1,
    options: ['Player 1', 'Player 2', 'Player 3', 'Player 4'],
  },
};

export function makeOptions(labels: string[]): WheelOption[] {
  return labels.map((label, index) => ({
    id: globalThis.crypto.randomUUID(),
    label,
    color: PALETTE[index % PALETTE.length],
    weight: 1,
  }));
}

export function committedWeight(value: string | number): number {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 ? number : 1;
}

export function expandInputSets(
  options: WheelOption[],
  inputSets: number,
  weightsEnabled: boolean,
): WheelSlice[] {
  const count = Math.min(5, Math.max(1, Math.trunc(inputSets) || 1));
  return Array.from({ length: count }, (_, setIndex) =>
    options.map((option, sourceIndex) => ({
      ...option,
      weight: weightsEnabled ? committedWeight(option.weight) : 1,
      sourceIndex,
      setIndex,
    })),
  ).flat();
}

export function weightedIndex(
  options: WheelOption[],
  weightsEnabled: boolean,
  random = cryptoFloat,
): number {
  if (!options.length) throw new Error('The wheel needs at least one option.');
  const weights = options.map((option) =>
    weightsEnabled ? committedWeight(option.weight) : 1,
  );
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let target = random() * total;
  for (let index = 0; index < weights.length; index += 1) {
    target -= weights[index];
    if (target < 0) return index;
  }
  return weights.length - 1;
}

export function cryptoFloat(): number {
  const buffer = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buffer);
  return buffer[0] / 0x100000000;
}

export function presetKeyFor(
  options: WheelOption[],
  inputSets: number,
  weightsEnabled: boolean,
): string {
  if (
    weightsEnabled ||
    options.some((option) => committedWeight(option.weight) !== 1)
  )
    return '';
  return (
    Object.entries(PRESETS).find(
      ([, preset]) =>
        preset.inputSets === inputSets &&
        preset.options.length === options.length &&
        preset.options.every((label, index) => options[index]?.label === label),
    )?.[0] ?? ''
  );
}

export function contrastColor(hexColor: string): '#fffdf7' | '#211c18' {
  const hex = hexColor.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(hex)) return '#fffdf7';
  const [red, green, blue] = [0, 2, 4].map((offset) =>
    Number.parseInt(hex.slice(offset, offset + 2), 16),
  );
  return (red * 299 + green * 587 + blue * 114) / 1000 > 150
    ? '#211c18'
    : '#fffdf7';
}
