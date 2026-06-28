import type { LinguiConfig } from "@lingui/conf";

export const locales = [
  "ar",
  "da",
  "de",
  "en",
  "es",
  "fr",
  "id",
  "ja",
  "ko",
  "pl",
  "pt",
  "ru",
  "tr",
  "vi",
  "zh",
  "fi",
  "hi"
] as const;

const config: LinguiConfig = {
  fallbackLocales: {
    default: "en",
  },
  "sourceLocale": "en",
  // @ts-ignore string[]
  locales,
};

export default config;
