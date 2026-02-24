// SwimEx EDGE — Shared Data Models

export enum UserRole {
  SUPER_ADMINISTRATOR = 'SUPER_ADMINISTRATOR',
  ADMINISTRATOR = 'ADMINISTRATOR',
  MAINTENANCE = 'MAINTENANCE',
  USER = 'USER',
}

export enum Theme {
  LIGHT = 'LIGHT',
  DARK = 'DARK',
}

export enum FitnessLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
}

export enum DeviceType {
  TABLET = 'TABLET',
  BROWSER = 'BROWSER',
  OTHER = 'OTHER',
}

export enum WorkoutType {
  CUSTOM = 'CUSTOM',
  INTERVAL = 'INTERVAL',
  DISTANCE_PRESET = 'DISTANCE_PRESET',
  SPRINT_PRESET = 'SPRINT_PRESET',
}

export enum WorkoutState {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  SAFETY_STOP = 'SAFETY_STOP',
}

export enum TerminationType {
  TABLET_END = 'TABLET_END',
  TABLET_PAUSE = 'TABLET_PAUSE',
  AIR_BUTTON_STOP = 'AIR_BUTTON_STOP',
  TIMER_COMPLETE = 'TIMER_COMPLETE',
  SAFETY_STOP = 'SAFETY_STOP',
}

export enum CommissioningOrg {
  SWIMEX = 'SWIMEX',
  BSC_INDUSTRIES = 'BSC_INDUSTRIES',
}

export enum Protocol {
  MQTT = 'MQTT',
  MODBUS_TCP = 'MODBUS_TCP',
  HTTP = 'HTTP',
}

export enum ModbusMode {
  SERVER = 'SERVER',
  CLIENT = 'CLIENT',
}

export enum RegisterType {
  COIL = 'COIL',
  DISCRETE_INPUT = 'DISCRETE_INPUT',
  HOLDING_REGISTER = 'HOLDING_REGISTER',
  INPUT_REGISTER = 'INPUT_REGISTER',
}

export enum DataType {
  INT16 = 'INT16',
  UINT16 = 'UINT16',
  INT32 = 'INT32',
  UINT32 = 'UINT32',
  FLOAT32 = 'FLOAT32',
  FLOAT64 = 'FLOAT64',
  BOOLEAN = 'BOOLEAN',
  STRING = 'STRING',
}

export enum ByteOrder {
  BIG_ENDIAN = 'BIG_ENDIAN',
  LITTLE_ENDIAN = 'LITTLE_ENDIAN',
  BIG_ENDIAN_WORD_SWAP = 'BIG_ENDIAN_WORD_SWAP',
  LITTLE_ENDIAN_WORD_SWAP = 'LITTLE_ENDIAN_WORD_SWAP',
}

export enum AccessMode {
  READ = 'READ',
  WRITE = 'WRITE',
  READ_WRITE = 'READ_WRITE',
}

export enum AuthType {
  NONE = 'NONE',
  BASIC = 'BASIC',
  API_KEY = 'API_KEY',
  BEARER = 'BEARER',
}

export enum GraphicFormat {
  SVG = 'SVG',
  PNG = 'PNG',
  JPEG = 'JPEG',
  WEBP = 'WEBP',
  GIF = 'GIF',
  DXF = 'DXF',
}

export enum AnimationProperty {
  FILL_COLOR = 'FILL_COLOR',
  FILL_LEVEL = 'FILL_LEVEL',
  STROKE_COLOR = 'STROKE_COLOR',
  STROKE_WIDTH = 'STROKE_WIDTH',
  OPACITY = 'OPACITY',
  VISIBILITY = 'VISIBILITY',
  ROTATION = 'ROTATION',
  SCALE_X = 'SCALE_X',
  SCALE_Y = 'SCALE_Y',
  POSITION_X = 'POSITION_X',
  POSITION_Y = 'POSITION_Y',
  TEXT_CONTENT = 'TEXT_CONTENT',
  FONT_SIZE = 'FONT_SIZE',
  SHADOW = 'SHADOW',
  CLIP_PATH = 'CLIP_PATH',
  STROKE_DASH = 'STROKE_DASH',
  PATH_MORPH = 'PATH_MORPH',
  BLINK = 'BLINK',
}

export enum MappingType {
  LINEAR_SCALE = 'LINEAR_SCALE',
  THRESHOLD = 'THRESHOLD',
  BOOLEAN_TOGGLE = 'BOOLEAN_TOGGLE',
  COLOR_GRADIENT = 'COLOR_GRADIENT',
  STRING_FORMAT = 'STRING_FORMAT',
  EXPRESSION = 'EXPRESSION',
  LOOKUP_TABLE = 'LOOKUP_TABLE',
  CLAMP = 'CLAMP',
}

export enum EasingFunction {
  LINEAR = 'LINEAR',
  EASE_IN = 'EASE_IN',
  EASE_OUT = 'EASE_OUT',
  EASE_IN_OUT = 'EASE_IN_OUT',
  SPRING = 'SPRING',
}

export enum EventType {
  TAP = 'TAP',
  LONG_PRESS = 'LONG_PRESS',
  SWIPE = 'SWIPE',
  DOUBLE_TAP = 'DOUBLE_TAP',
}

export enum EventAction {
  WRITE_TAG = 'WRITE_TAG',
  NAVIGATE = 'NAVIGATE',
  TOGGLE_TAG = 'TOGGLE_TAG',
  INCREMENT_TAG = 'INCREMENT_TAG',
  DECREMENT_TAG = 'DECREMENT_TAG',
  SHOW_POPUP = 'SHOW_POPUP',
}

export enum WidgetType {
  BUTTON = 'BUTTON',
  SLIDER = 'SLIDER',
  GAUGE = 'GAUGE',
  NUMERIC_DISPLAY = 'NUMERIC_DISPLAY',
  TIMER = 'TIMER',
  CHART = 'CHART',
  LABEL = 'LABEL',
  IMAGE = 'IMAGE',
  TANK_LEVEL = 'TANK_LEVEL',
  LED = 'LED',
  STATUS_BADGE = 'STATUS_BADGE',
  POOL_DIAGRAM = 'POOL_DIAGRAM',
  CUSTOM_SVG = 'CUSTOM_SVG',
  CONTAINER = 'CONTAINER',
  TAB_BAR = 'TAB_BAR',
  TOGGLE = 'TOGGLE',
  KNOB = 'KNOB',
  ALARM_BANNER = 'ALARM_BANNER',
  ARC_GAUGE = 'ARC_GAUGE',
  SPARKLINE = 'SPARKLINE',
  DONUT_CHART = 'DONUT_CHART',
  VIDEO_EMBED = 'VIDEO_EMBED',
}

// --- Core interfaces ---

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  displayName: string;
  email: string | null;
  role: UserRole;
  profilePhoto: Buffer | null;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface UserPreferences {
  userId: string;
  theme: Theme;
  defaultSpeed: number;
  fitnessLevel: FitnessLevel;
  activeTemplate: string;
}

export interface CommissioningCodeStore {
  id: string;
  organization: CommissioningOrg;
  codeHash: string;
  failedResetAttempts: number;
  lastFailedAttemptAt: string | null;
  lockoutUntil: string | null;
  lastSuccessfulResetAt: string | null;
  lastResetBy: string | null;
  commissionedAt: string;
}

export interface RegisteredDevice {
  id: string;
  macAddress: string;
  deviceName: string;
  deviceType: DeviceType;
  isRegistered: boolean;
  registeredBy: string | null;
  registeredAt: string;
  lastSeenAt: string;
}

export interface WorkoutStep {
  order: number;
  minutes: number;
  seconds: number;
  speed: number;
}

export interface WorkoutProgram {
  id: string;
  ownerId: string;
  name: string;
  type: WorkoutType;
  sets: number;
  steps: WorkoutStep[];
  level: FitnessLevel | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SpeedSample {
  timestamp: string;
  speed: number;
}

export interface WorkoutSession {
  id: string;
  userId: string | null;
  programId: string | null;
  deviceMAC: string;
  startedAt: string;
  endedAt: string | null;
  terminatedBy: TerminationType | null;
  stepsCompleted: number;
  totalDuration: number;
  speedLog: SpeedSample[];
}

export interface ObjectTagMapping {
  id: string;
  objectId: string;
  objectName: string;
  tagAddress: string;
  protocol: Protocol;
  dataType: DataType;
  accessMode: AccessMode;
  scaleFactor: number;
  offset: number;
  createdBy: string;
  updatedAt: string;
}

export interface FeatureFlag {
  id: string;
  featureKey: string;
  displayName: string;
  description: string;
  isEnabled: boolean;
  isVisible: boolean;
  enabledBy: string | null;
  enabledAt: string | null;
  updatedAt: string;
}

export interface GraphicAsset {
  id: string;
  name: string;
  category: string;
  tags: string[];
  format: GraphicFormat;
  sourceFile: Buffer;
  svgContent: string | null;
  thumbnail: Buffer | null;
  isBuiltIn: boolean;
  version: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GraphicElement {
  elementId: string;
  elementType: string;
  displayName: string;
  bindable: boolean;
}

export interface AnimationBinding {
  id: string;
  targetElement: string;
  targetProperty: AnimationProperty;
  sourceTagId: string;
  mappingType: MappingType;
  mappingConfig: Record<string, unknown>;
  transitionMs: number;
  easingFunction: EasingFunction;
  pivotX: number | null;
  pivotY: number | null;
}

export interface EventBinding {
  eventType: EventType;
  action: EventAction;
  targetTagId: string | null;
  writeValue: unknown;
  targetPage: string | null;
}

export interface WidgetPlacement {
  id: string;
  graphicId: string | null;
  widgetType: WidgetType;
  x: number;
  y: number;
  width: number;
  height: number;
  zOrder: number;
  rotation: number;
  locked: boolean;
  groupId: string | null;
  properties: Record<string, unknown>;
  animations: AnimationBinding[];
  tagMappingId: string | null;
  events: EventBinding[];
}

export interface UILayout {
  id: string;
  name: string;
  templateId: string;
  isActive: boolean;
  createdBy: string;
  widgets: WidgetPlacement[];
  version: number;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  actorId: string | null;
  actorUsername: string | null;
  targetType: string;
  targetId: string | null;
  details: Record<string, unknown>;
  sourceIp: string | null;
  timestamp: string;
}
