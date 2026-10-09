
export const DIVISION_DISTRICT_COUNTS = {
  Dhaka: 13,
  Chattogram: 11,
  Khulna: 10,
  Rajshahi: 8,
  Rangpur: 8,
  Barishal: 6,
  Sylhet: 4,
  Mymensingh: 4,
} as const;

export type DivisionName =
  keyof typeof DIVISION_DISTRICT_COUNTS;

export const DIVISION_NAMES = Object.keys(
  DIVISION_DISTRICT_COUNTS
) as DivisionName[];

export function normalizeDivisionName(
  value: string
): string {
  const name = value.trim();

  const aliases: Record<string, string> = {
    chittagong: 'Chattogram',
    chattagram: 'Chattogram',
    chattogram: 'Chattogram',
    barisal: 'Barishal',
    barishal: 'Barishal',
  };

  return aliases[name.toLowerCase()] ?? name;
}

export function normalizeDistrictName(
  value: string
): string {
  const name = value.trim();

  const aliases: Record<string, string> = {
    chittagong: 'Chattogram',
    comilla: 'Cumilla',
    barisal: 'Barishal',
    bogra: 'Bogura',
    jessore: 'Jashore',
  };

  return aliases[name.toLowerCase()] ?? name;
}
