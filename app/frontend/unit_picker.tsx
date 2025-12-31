import { useState } from "react";
import {
	Field
} from "~/frontend/form";
import { ViewContext } from "./context";


interface UnitPickerProps {
	ctx: ViewContext;
	labelPrefix?: string
	name: string
	defaultValue?: string
	onChange?: (unitKey: string) => void
}

export const unitsEnum = [
	{ key: "number_count", label: "Count" },
	{ key: "area_m2", label: "Square Meters (m²)" },
	{ key: "area_km2", label: "Square Kilometers (km²)" },
	{ key: "area_ha", label: "Hectares" },
	{ key: "area_mi2", label: "Square Miles (mi²)" },
	{ key: "area_ac", label: "Acres" },
	{ key: "area_ft2", label: "Square Feet (ft²)" },
	{ key: "area_yd2", label: "Square Yards (yd²)" },
	{ key: "volume_l", label: "Liters (L)" },
	{ key: "volume_m3", label: "Cubic Meters (m³)" },
	{ key: "volume_ft3", label: "Cubic Feet (ft³)" },
	{ key: "volume_yd3", label: "Cubic Yards (yd³)" },
	{ key: "volume_gal", label: "Gallons (gal)" },
	{ key: "volume_bbl", label: "Barrels (bbl)" },
	{ key: "duration_days", label: "Days" },
	{ key: "duration_hours", label: "Hours" }
]

export function unitName(key: string): string {
	const unit = unitsEnum.find((u) => u.key === key);
	return unit ? unit.label : key;
}

export function UnitPicker(props: UnitPickerProps) {
	const ctx = props.ctx;

	const unitTypes = [
		{ key: "number", label: ctx.t({ "code": "unit.number", "msg": "Number" }) },
		{ key: "area", label: ctx.t({ "code": "unit.area", "msg": "Area" }) },
		{ key: "volume", label: ctx.t({ "code": "unit.volume", "msg": "Volume" }) },
		{ key: "duration", label: ctx.t({ "code": "unit.duration", "msg": "Duration" }) }
	]

	let unitsMap: Record<string, { key: string; label: string }[]> = {
		number: [
			{ key: "number_count", label: ctx.t({ "code": "unit.count", "msg": "Count" }) }
		],
		area: [
			{ key: "area_m2", label: ctx.t({ "code": "unit.square_meters", "msg": "Square Meters (m²)" }) },
			{ key: "area_km2", label: ctx.t({ "code": "unit.square_kilometers", "msg": "Square Kilometers (km²)" }) },
			{ key: "area_ha", label: ctx.t({ "code": "unit.hectares", "msg": "Hectares" }) },
			{ key: "area_mi2", label: ctx.t({ "code": "unit.square_miles", "msg": "Square Miles (mi²)" }) },
			{ key: "area_ac", label: ctx.t({ "code": "unit.acres", "msg": "Acres" }) },
			{ key: "area_ft2", label: ctx.t({ "code": "unit.square_feet", "msg": "Square Feet (ft²)" }) },
			{ key: "area_yd2", label: ctx.t({ "code": "unit.square_yards", "msg": "Square Yards (yd²)" }) },
		],
		volume: [
			{ key: "volume_l", label: ctx.t({ "code": "unit.liters", "msg": "Liters (L)" }) },
			{ key: "volume_m3", label: ctx.t({ "code": "unit.cubic_meters", "msg": "Cubic Meters (m³)" }) },
			{ key: "volume_ft3", label: ctx.t({ "code": "unit.cubic_feet", "msg": "Cubic Feet (ft³)" }) },
			{ key: "volume_yd3", label: ctx.t({ "code": "unit.cubic_yards", "msg": "Cubic Yards (yd³)" }) },
			{ key: "volume_gal", label: ctx.t({ "code": "unit.gallons", "msg": "Gallons (gal)" }) },
			{ key: "volume_bbl", label: ctx.t({ "code": "unit.barrels", "msg": "Barrels (bbl)" }) },
		],
		duration: [
			{ key: "duration_days", label: ctx.t({ "code": "unit.days", "msg": "Days" }) },
			{ key: "duration_hours", label: ctx.t({ "code": "unit.hours", "msg": "Hours" }) }
		]
	}

	let findTypeByUnit = (unit: string) => {
		for (let type in unitsMap) {
			if (unitsMap[type].some((u) => u.key == unit)) return type
		}
		return "number"
	}

	let initialType = props.defaultValue ? findTypeByUnit(props.defaultValue) : "number"

	let [selectedType, setSelectedType] = useState(initialType)
	let [selectedUnit, setSelectedUnit] = useState(props.defaultValue || unitsMap[initialType][0].key)

	let handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		let newType = e.target.value
		setSelectedType(newType)
		let unit = unitsMap[newType][0]
		setSelectedUnit(unit.key)
		if (props.onChange) props.onChange(unit.key)
	}

	let handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		setSelectedUnit(e.target.value)
		if (props.onChange) props.onChange(e.target.value)
	}

	let prefix = props.labelPrefix ? props.labelPrefix + " " : ""

	return (
		<>
			<div className="dts-form-component">
				<Field label={prefix + ctx.t({ "code": "unit.unit_type", "msg": "Unit Type" })}>
				<select name={props.name + "Type"} value={selectedType} onChange={handleTypeChange}>
					{unitTypes.map((ut) => (
						<option key={ut.key} value={ut.key}>
							{ut.label}
						</option>
					))}
				</select>
			</Field>
		</div >
			<div className="dts-form-component">
				<Field label={prefix + ctx.t({ "code": "unit.unit", "msg": "Unit" })}>
					<select name={props.name} value={selectedUnit} onChange={handleUnitChange}>
						{unitsMap[selectedType].map((u) => (
							<option key={u.key} value={u.key}>
								{u.label}
							</option>
						))}
					</select>
				</Field>
			</div>
		</>
	)
}

