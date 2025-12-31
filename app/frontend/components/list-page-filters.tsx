import {
	Form,
} from "@remix-run/react";

import { Field } from "~/frontend/form"
import { ViewContext } from "../context";

interface FiltersProps {
	ctx: ViewContext
	search: string
	clearFiltersUrl: string
	formStartElement?: React.ReactNode;
}

export function Filters(props: FiltersProps) {
	const ctx = props.ctx;
	return <>
		<section className="dts-page-section">
			<div className="dts-filter">
				<h3>{ctx.t({ "code": "common.filters", "msg": "Filters" })}</h3>
				<Form className="dts-form">
					{props.formStartElement}
					<div className="dts-form-component">
						<Field label={ctx.t({ "code": "common.search", "msg": "Search" })}>
							<input
								name="search"
								type="text"
								defaultValue={props.search}
							/>
						</Field>
					</div>
					<div className="dts-form__actions">
						<input
							type="submit"
							value={ctx.t({ "code": "common.apply_filters", "msg": "Apply filters" })}
							className="mg-button mg-button-primary"
						/>
						<a href={props.clearFiltersUrl} className="mg-button mg-button-outline">
						{ctx.t({ "code": "common.clear", "msg": "Clear" })}
						</a>
					</div>
				</Form>
			</div>
		</section>
	</>
}

