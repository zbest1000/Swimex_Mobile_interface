"use strict";
// SwimEx EDGE — Shared Data Models
Object.defineProperty(exports, "__esModule", { value: true });
exports.WidgetType = exports.EventAction = exports.EventType = exports.EasingFunction = exports.MappingType = exports.AnimationProperty = exports.GraphicFormat = exports.AuthType = exports.AccessMode = exports.ByteOrder = exports.DataType = exports.RegisterType = exports.ModbusMode = exports.Protocol = exports.CommissioningOrg = exports.TerminationType = exports.WorkoutState = exports.WorkoutType = exports.DeviceType = exports.FitnessLevel = exports.Theme = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["SUPER_ADMINISTRATOR"] = "SUPER_ADMINISTRATOR";
    UserRole["ADMINISTRATOR"] = "ADMINISTRATOR";
    UserRole["MAINTENANCE"] = "MAINTENANCE";
    UserRole["USER"] = "USER";
})(UserRole || (exports.UserRole = UserRole = {}));
var Theme;
(function (Theme) {
    Theme["LIGHT"] = "LIGHT";
    Theme["DARK"] = "DARK";
})(Theme || (exports.Theme = Theme = {}));
var FitnessLevel;
(function (FitnessLevel) {
    FitnessLevel["BEGINNER"] = "BEGINNER";
    FitnessLevel["INTERMEDIATE"] = "INTERMEDIATE";
    FitnessLevel["ADVANCED"] = "ADVANCED";
})(FitnessLevel || (exports.FitnessLevel = FitnessLevel = {}));
var DeviceType;
(function (DeviceType) {
    DeviceType["TABLET"] = "TABLET";
    DeviceType["BROWSER"] = "BROWSER";
    DeviceType["OTHER"] = "OTHER";
})(DeviceType || (exports.DeviceType = DeviceType = {}));
var WorkoutType;
(function (WorkoutType) {
    WorkoutType["CUSTOM"] = "CUSTOM";
    WorkoutType["INTERVAL"] = "INTERVAL";
    WorkoutType["DISTANCE_PRESET"] = "DISTANCE_PRESET";
    WorkoutType["SPRINT_PRESET"] = "SPRINT_PRESET";
})(WorkoutType || (exports.WorkoutType = WorkoutType = {}));
var WorkoutState;
(function (WorkoutState) {
    WorkoutState["IDLE"] = "IDLE";
    WorkoutState["RUNNING"] = "RUNNING";
    WorkoutState["PAUSED"] = "PAUSED";
    WorkoutState["SAFETY_STOP"] = "SAFETY_STOP";
})(WorkoutState || (exports.WorkoutState = WorkoutState = {}));
var TerminationType;
(function (TerminationType) {
    TerminationType["TABLET_END"] = "TABLET_END";
    TerminationType["TABLET_PAUSE"] = "TABLET_PAUSE";
    TerminationType["AIR_BUTTON_STOP"] = "AIR_BUTTON_STOP";
    TerminationType["TIMER_COMPLETE"] = "TIMER_COMPLETE";
    TerminationType["SAFETY_STOP"] = "SAFETY_STOP";
})(TerminationType || (exports.TerminationType = TerminationType = {}));
var CommissioningOrg;
(function (CommissioningOrg) {
    CommissioningOrg["SWIMEX"] = "SWIMEX";
    CommissioningOrg["BSC_INDUSTRIES"] = "BSC_INDUSTRIES";
})(CommissioningOrg || (exports.CommissioningOrg = CommissioningOrg = {}));
var Protocol;
(function (Protocol) {
    Protocol["MQTT"] = "MQTT";
    Protocol["MODBUS_TCP"] = "MODBUS_TCP";
    Protocol["HTTP"] = "HTTP";
})(Protocol || (exports.Protocol = Protocol = {}));
var ModbusMode;
(function (ModbusMode) {
    ModbusMode["SERVER"] = "SERVER";
    ModbusMode["CLIENT"] = "CLIENT";
})(ModbusMode || (exports.ModbusMode = ModbusMode = {}));
var RegisterType;
(function (RegisterType) {
    RegisterType["COIL"] = "COIL";
    RegisterType["DISCRETE_INPUT"] = "DISCRETE_INPUT";
    RegisterType["HOLDING_REGISTER"] = "HOLDING_REGISTER";
    RegisterType["INPUT_REGISTER"] = "INPUT_REGISTER";
})(RegisterType || (exports.RegisterType = RegisterType = {}));
var DataType;
(function (DataType) {
    DataType["INT16"] = "INT16";
    DataType["UINT16"] = "UINT16";
    DataType["INT32"] = "INT32";
    DataType["UINT32"] = "UINT32";
    DataType["FLOAT32"] = "FLOAT32";
    DataType["FLOAT64"] = "FLOAT64";
    DataType["BOOLEAN"] = "BOOLEAN";
    DataType["STRING"] = "STRING";
})(DataType || (exports.DataType = DataType = {}));
var ByteOrder;
(function (ByteOrder) {
    ByteOrder["BIG_ENDIAN"] = "BIG_ENDIAN";
    ByteOrder["LITTLE_ENDIAN"] = "LITTLE_ENDIAN";
    ByteOrder["BIG_ENDIAN_WORD_SWAP"] = "BIG_ENDIAN_WORD_SWAP";
    ByteOrder["LITTLE_ENDIAN_WORD_SWAP"] = "LITTLE_ENDIAN_WORD_SWAP";
})(ByteOrder || (exports.ByteOrder = ByteOrder = {}));
var AccessMode;
(function (AccessMode) {
    AccessMode["READ"] = "READ";
    AccessMode["WRITE"] = "WRITE";
    AccessMode["READ_WRITE"] = "READ_WRITE";
})(AccessMode || (exports.AccessMode = AccessMode = {}));
var AuthType;
(function (AuthType) {
    AuthType["NONE"] = "NONE";
    AuthType["BASIC"] = "BASIC";
    AuthType["API_KEY"] = "API_KEY";
    AuthType["BEARER"] = "BEARER";
})(AuthType || (exports.AuthType = AuthType = {}));
var GraphicFormat;
(function (GraphicFormat) {
    GraphicFormat["SVG"] = "SVG";
    GraphicFormat["PNG"] = "PNG";
    GraphicFormat["JPEG"] = "JPEG";
    GraphicFormat["WEBP"] = "WEBP";
    GraphicFormat["GIF"] = "GIF";
    GraphicFormat["DXF"] = "DXF";
})(GraphicFormat || (exports.GraphicFormat = GraphicFormat = {}));
var AnimationProperty;
(function (AnimationProperty) {
    AnimationProperty["FILL_COLOR"] = "FILL_COLOR";
    AnimationProperty["FILL_LEVEL"] = "FILL_LEVEL";
    AnimationProperty["STROKE_COLOR"] = "STROKE_COLOR";
    AnimationProperty["STROKE_WIDTH"] = "STROKE_WIDTH";
    AnimationProperty["OPACITY"] = "OPACITY";
    AnimationProperty["VISIBILITY"] = "VISIBILITY";
    AnimationProperty["ROTATION"] = "ROTATION";
    AnimationProperty["SCALE_X"] = "SCALE_X";
    AnimationProperty["SCALE_Y"] = "SCALE_Y";
    AnimationProperty["POSITION_X"] = "POSITION_X";
    AnimationProperty["POSITION_Y"] = "POSITION_Y";
    AnimationProperty["TEXT_CONTENT"] = "TEXT_CONTENT";
    AnimationProperty["FONT_SIZE"] = "FONT_SIZE";
    AnimationProperty["SHADOW"] = "SHADOW";
    AnimationProperty["CLIP_PATH"] = "CLIP_PATH";
    AnimationProperty["STROKE_DASH"] = "STROKE_DASH";
    AnimationProperty["PATH_MORPH"] = "PATH_MORPH";
    AnimationProperty["BLINK"] = "BLINK";
})(AnimationProperty || (exports.AnimationProperty = AnimationProperty = {}));
var MappingType;
(function (MappingType) {
    MappingType["LINEAR_SCALE"] = "LINEAR_SCALE";
    MappingType["THRESHOLD"] = "THRESHOLD";
    MappingType["BOOLEAN_TOGGLE"] = "BOOLEAN_TOGGLE";
    MappingType["COLOR_GRADIENT"] = "COLOR_GRADIENT";
    MappingType["STRING_FORMAT"] = "STRING_FORMAT";
    MappingType["EXPRESSION"] = "EXPRESSION";
    MappingType["LOOKUP_TABLE"] = "LOOKUP_TABLE";
    MappingType["CLAMP"] = "CLAMP";
})(MappingType || (exports.MappingType = MappingType = {}));
var EasingFunction;
(function (EasingFunction) {
    EasingFunction["LINEAR"] = "LINEAR";
    EasingFunction["EASE_IN"] = "EASE_IN";
    EasingFunction["EASE_OUT"] = "EASE_OUT";
    EasingFunction["EASE_IN_OUT"] = "EASE_IN_OUT";
    EasingFunction["SPRING"] = "SPRING";
})(EasingFunction || (exports.EasingFunction = EasingFunction = {}));
var EventType;
(function (EventType) {
    EventType["TAP"] = "TAP";
    EventType["LONG_PRESS"] = "LONG_PRESS";
    EventType["SWIPE"] = "SWIPE";
    EventType["DOUBLE_TAP"] = "DOUBLE_TAP";
})(EventType || (exports.EventType = EventType = {}));
var EventAction;
(function (EventAction) {
    EventAction["WRITE_TAG"] = "WRITE_TAG";
    EventAction["NAVIGATE"] = "NAVIGATE";
    EventAction["TOGGLE_TAG"] = "TOGGLE_TAG";
    EventAction["INCREMENT_TAG"] = "INCREMENT_TAG";
    EventAction["DECREMENT_TAG"] = "DECREMENT_TAG";
    EventAction["SHOW_POPUP"] = "SHOW_POPUP";
})(EventAction || (exports.EventAction = EventAction = {}));
var WidgetType;
(function (WidgetType) {
    WidgetType["BUTTON"] = "BUTTON";
    WidgetType["SLIDER"] = "SLIDER";
    WidgetType["GAUGE"] = "GAUGE";
    WidgetType["NUMERIC_DISPLAY"] = "NUMERIC_DISPLAY";
    WidgetType["TIMER"] = "TIMER";
    WidgetType["CHART"] = "CHART";
    WidgetType["LABEL"] = "LABEL";
    WidgetType["IMAGE"] = "IMAGE";
    WidgetType["TANK_LEVEL"] = "TANK_LEVEL";
    WidgetType["LED"] = "LED";
    WidgetType["STATUS_BADGE"] = "STATUS_BADGE";
    WidgetType["POOL_DIAGRAM"] = "POOL_DIAGRAM";
    WidgetType["CUSTOM_SVG"] = "CUSTOM_SVG";
    WidgetType["CONTAINER"] = "CONTAINER";
    WidgetType["TAB_BAR"] = "TAB_BAR";
    WidgetType["TOGGLE"] = "TOGGLE";
    WidgetType["KNOB"] = "KNOB";
    WidgetType["ALARM_BANNER"] = "ALARM_BANNER";
    WidgetType["ARC_GAUGE"] = "ARC_GAUGE";
    WidgetType["SPARKLINE"] = "SPARKLINE";
    WidgetType["DONUT_CHART"] = "DONUT_CHART";
    WidgetType["VIDEO_EMBED"] = "VIDEO_EMBED";
})(WidgetType || (exports.WidgetType = WidgetType = {}));
//# sourceMappingURL=models.js.map