import type {
  ProductCategoryName,
  ProductStatus,
  ThemePreference,
  VeilPreferences,
} from "@/src/types/domain";

export const APP_NAME = "Veil";
export const APP_VERSION = "1.0.0";
export const DATABASE_NAME = "veil-database";
export const DATABASE_SCHEMA_VERSION = 1;
export const BACKUP_FORMAT_VERSION = 1;
export const THEME_STORAGE_KEY = "veil.theme";
export const ONBOARDING_STORAGE_KEY = "veil.onboarding";

export const DEFAULT_CATEGORY_NAMES: ProductCategoryName[] = [
  "Cleanser",
  "Toner",
  "Essence",
  "Serum",
  "Ampoule",
  "Treatment",
  "Retinoid",
  "Exfoliant",
  "Moisturizer",
  "Eye Care",
  "Sunscreen",
  "Mask",
  "Lip Care",
  "Other",
];

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  active: "Active",
  unopened: "Unopened",
  finished: "Finished",
  paused: "Paused",
  discontinued: "Discontinued",
};

export const THEME_OPTIONS: Array<{
  value: ThemePreference;
  label: string;
}> = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function createDefaultPreferences(now = new Date()): VeilPreferences {
  const timestamp = now.toISOString();
  return {
    id: "preferences",
    morningStart: "05:00",
    eveningStart: "17:00",
    defaultTodayView: "automatic",
    expirationWarningDays: 30,
    onboardingComplete: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
