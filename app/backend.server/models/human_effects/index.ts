// Database operations for human direct effects (deaths, injured, missing, affected, displaced).
// Handles CRUD operations across multiple tables with shared disaggregation structure.
// See _docs/human-direct-effects.md for overview.

export { create, update, deleteRows, clearData, get, validate } from "./crud";
export type { Res, GetRes } from "./crud";
export {
	categoryPresenceGet,
	categoryPresenceSet,
	categoryPresenceDeleteAll,
} from "./category_presence";
export {
	totalGroupGet,
	totalGroupSet,
	setTotal,
	setTotalPresenceTable,
	getTotalPresenceTable,
	setTotalDsgTable,
	getTotalDsgTable,
	calcTotalForGroup,
} from "./totals";
export type { TotalGroup, CalcTotalForGroupRes } from "./totals";
export {
	sharedDefsAll,
	sharedDefs,
	defsForTable,
	defsForTableGlobal,
	splitDefsByShared,
} from "./defs";
export type { SplitRes } from "./defs";
export {
	builtinDsgColumns,
	getUsedBuiltinColumns,
	getUsedCustomColumnsAndValues,
	validateCustomConfigChanges,
} from "./custom_config";
export type {
	UsedCustomColumnsAndValues,
	ValidateCustomConfigError,
} from "./custom_config";
