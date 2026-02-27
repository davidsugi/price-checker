export type CardType = "pokemon" | "ygo" | "digi" | "onepiece" | "mtg";

export const VALID_CARD_TYPES: CardType[] = [
  "pokemon",
  "ygo",
  "digi",
  "onepiece",
  "mtg",
];

export type NameMapping = Record<CardType, Record<string, string>>;

export function isValidCardType(value: string): value is CardType {
  return VALID_CARD_TYPES.includes(value as CardType);
}

export function createEmptyMapping(): NameMapping {
  return {
    pokemon: {},
    ygo: {},
    digi: {},
    onepiece: {},
    mtg: {},
  };
}
