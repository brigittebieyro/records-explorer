export interface AgeGroup {
  id: string;
  name: string;
  usawDisplayKey: string;
  minimum_lifter_age: string;
  maximum_lifter_age: string;
  disabled: boolean;
  customWeightClasses: boolean;
}

export interface WeightClassAnalog {
  name: string;
  sport80Id: number;
  gender: 'male' | 'female';
  start: string;
  end?: string;
}

export interface WeightClass {
  id: string;
  name: string;
  sport80Id: number;
  minBodyweight: string;
  maxBodyweight: string;
  gender: 'male' | 'female';
  start: string;
  end?: string;
  previousAnalogs?: WeightClassAnalog[]; //TODO, remove when historic is fully implemented
  ageGroups?: string[]; // Simplifying historic
}

export interface LifterAction {
  url: string;
}

export interface LifterRankingData {
  name: string;
  total: number;
  lifter_age: string;
  lift_date: string;
  club?: string | null;
  action: LifterAction[];
  bodyweight?: number;
  classData?: WeightClassAnalog;
}

export interface MeetRecord {
  date: string;
  total: number;
  best_snatch?: number;
  'best_c&j'?: number;
  'body_weight_(kg)'?: string | number;
  meet?: string;
}

export type CombinedLiftData = LifterRankingData & Partial<MeetRecord>;

export type SortKey = 'total' | 'best_snatch' | 'best_c&j' | 'lift_date';

export interface StandardRecord {
  weight: string;
  lifter: string;
  event: string | null;
  date: string | null;
}
export interface PriorRecord {
  ageGroup: string;
  gender: string;
  ageMin: number;
  ageMax: number;
  bodyWeightMin: number;
  bodyWeightMax: number;
  lift: string;
  weight: string;
  lifter: string;
  event: string | null;
  date: string | null;
  yearSpan: string;
}

export interface AgeGroupRecordSet {
  ageGroup: string;
  weightClass: string;
  records: Record<string, StandardRecord>;
}

export type StandardsResult = Record<string, AgeGroupRecordSet>;

export interface LocalMeetGeolocation {
  lat: number;
  lng: number;
}

export interface LocalMeet {
  id: string;
  is_event: boolean;
  name: string;
  subtitle: string;
  subtitle_icon: string;
  address: string;
  geolocation: LocalMeetGeolocation | null;
  telephone: string;
  email: string;
  info: string;
  actions: unknown;
  img_url: string;
}

export interface MeetResult {
  age_category: string;
  'best_c&j': number;
  best_snatch: number;
  'body_weight_(kg)': number;
  'c&j_lift_1': number;
  'c&j_lift_2': number;
  'c&j_lift_3': number;
  date: string;
  lifter: string;
  meet: string;
  snatch_lift_1: number;
  snatch_lift_2: number;
  snatch_lift_3: number;
  total: number;
}

export interface AllCurrentRecordsGroup {
  ageGroup: AgeGroup;
  records: Record<string, StandardRecord>;
}

export interface AllCurrentRecordsEntry {
  weightClass: WeightClass;
  groups: AllCurrentRecordsGroup[];
}
