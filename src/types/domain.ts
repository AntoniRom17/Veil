export type EntityId = string;
export type ISODate = string;
export type ISODateTime = string;

export type ThemePreference = "system" | "light" | "dark";
export type RoutinePeriod = "am" | "pm" | "anytime";
export type ProductStatus =
  | "active"
  | "unopened"
  | "finished"
  | "paused"
  | "discontinued";
export type ProductCategoryName =
  | "Cleanser"
  | "Toner"
  | "Essence"
  | "Serum"
  | "Ampoule"
  | "Treatment"
  | "Retinoid"
  | "Exfoliant"
  | "Moisturizer"
  | "Eye Care"
  | "Sunscreen"
  | "Mask"
  | "Lip Care"
  | "Other"
  | string;

export interface TimestampedEntity {
  id: EntityId;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Product extends TimestampedEntity {
  name: string;
  brand: string;
  categoryId: EntityId;
  categoryName: ProductCategoryName;
  photoId?: EntityId;
  datePurchased?: ISODate;
  dateOpened?: ISODate;
  printedExpirationDate?: ISODate;
  paoMonths?: number;
  size?: string;
  notes: string;
  ingredients: string;
  activeIngredients: string;
  intendedFrequency: string;
  amAllowed: boolean;
  pmAllowed: boolean;
  status: ProductStatus;
  favorite: boolean;
}

export interface Routine extends TimestampedEntity {
  name: string;
  period: RoutinePeriod;
  notes: string;
  favorite: boolean;
  archived: boolean;
  priority: number;
}

export interface RoutineStep extends TimestampedEntity {
  routineId: EntityId;
  order: number;
  name: string;
  productId?: EntityId;
  categoryName: ProductCategoryName;
  instructions: string;
  waitSeconds?: number;
  amountGuidance: string;
  notes: string;
  required: boolean;
}

export type ScheduleKind = "daily" | "weekdays" | "interval" | "manual";

export interface RoutineSchedule extends TimestampedEntity {
  routineId: EntityId;
  kind: ScheduleKind;
  weekdays: number[];
  intervalDays?: number;
  anchorDate?: ISODate;
  enabled: boolean;
}

export type SessionStatus = "in-progress" | "complete";
export type SessionStepState = "pending" | "complete" | "skipped";

export interface RoutineSession extends TimestampedEntity {
  routineId?: EntityId;
  routineName: string;
  period: RoutinePeriod;
  localDate: ISODate;
  startedAt: ISODateTime;
  completedAt?: ISODateTime;
  status: SessionStatus;
  completedCount: number;
  skippedCount: number;
  totalCount: number;
  productIds: EntityId[];
  notes: string;
}

export interface SessionStep extends TimestampedEntity {
  sessionId: EntityId;
  sourceStepId?: EntityId;
  order: number;
  name: string;
  productId?: EntityId;
  productName?: string;
  categoryName: ProductCategoryName;
  instructions: string;
  waitSeconds?: number;
  amountGuidance: string;
  required: boolean;
  state: SessionStepState;
  resolvedAt?: ISODateTime;
}

export interface QuickNote extends TimestampedEntity {
  localDate: ISODate;
  capturedAt: ISODateTime;
  text: string;
  sessionId?: EntityId;
}

export type SkinFeel = "calm" | "balanced" | "dry" | "oily" | "sensitive";

export interface JournalEntry extends TimestampedEntity {
  localDate: ISODate;
  capturedAt: ISODateTime;
  title: string;
  notes: string;
  skinFeel: SkinFeel;
  tags: string[];
  photoIds: EntityId[];
  productIds: EntityId[];
}

export interface ProgressPhoto extends TimestampedEntity {
  localDate: ISODate;
  capturedAt: ISODateTime;
  mediaId: EntityId;
  area: string;
  caption: string;
  tags: string[];
}

export type ObservationType =
  | "dryness"
  | "redness"
  | "irritation"
  | "breakout"
  | "stinging"
  | "pilling"
  | "positive"
  | "other";

export interface ReactionLog extends TimestampedEntity {
  localDate: ISODate;
  capturedAt: ISODateTime;
  productIds: EntityId[];
  observationType: ObservationType;
  severity: 1 | 2 | 3 | 4 | 5;
  notes: string;
}

export interface Category extends TimestampedEntity {
  name: ProductCategoryName;
  builtIn: boolean;
  order: number;
}

export type IncompatibilityTargetKind = "product" | "routine-step";

export interface Incompatibility extends TimestampedEntity {
  leftKind: IncompatibilityTargetKind;
  leftId: EntityId;
  rightKind: IncompatibilityTargetKind;
  rightId: EntityId;
  note: string;
}

export type MediaPurpose = "product" | "journal" | "progress";

export interface MediaAsset extends TimestampedEntity {
  purpose: MediaPurpose;
  blob: Blob;
  thumbnail: Blob;
  mimeType: string;
  width: number;
  height: number;
  byteSize: number;
}

export interface VeilPreferences {
  id: "preferences";
  morningStart: string;
  eveningStart: string;
  defaultTodayView: "automatic" | "am" | "pm";
  expirationWarningDays: number;
  onboardingComplete: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface RoutineWithDetails extends Routine {
  steps: RoutineStep[];
  schedule?: RoutineSchedule;
}

export interface SessionWithSteps extends RoutineSession {
  steps: SessionStep[];
}

export interface StorageSummary {
  productCount: number;
  routineCount: number;
  sessionCount: number;
  journalEntryCount: number;
  progressPhotoCount: number;
  mediaCount: number;
  recordCount: number;
  mediaBytes: number;
  usageBytes?: number;
  quotaBytes?: number;
}
