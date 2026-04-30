import React from "react";
import { MainContainer } from "../container";
import { LangLink } from "~/utils/link";
import { DeleteButton } from "../components/delete-dialog";
import { ViewContext } from "../context";
import { approvalStatusIds } from "~/frontend/approval";

interface ViewComponentProps {
	ctx: ViewContext;
	isPublic?: boolean;
	path: string;
	listUrl?: string;
	id: any;
	title: string;
	extraActions?: React.ReactNode;
	extraInfo?: React.ReactNode;
	children?: React.ReactNode;
	approvalStatus?: approvalStatusIds;
}

export function ViewComponent(props: ViewComponentProps) {
	const ctx = props.ctx;
	return (
		<MainContainer title={props.title}>
			<>
				<form className="dts-form">
					<p>
						<LangLink lang={ctx.lang} to={props.listUrl || props.path}>
							{props.title}
						</LangLink>
					</p>
					{!props.isPublic && (
						<>
							<div>
								<LangLink
									lang={ctx.lang}
									to={`${props.path}/edit/${String(props.id)}`}
									className="mg-button mg-button-secondary"
									style={{ margin: "5px" }}
								>
									{ctx.t({
										code: "common.edit",
										msg: "Edit",
									})}
								</LangLink>
								<DeleteButton
									ctx={ctx}
									useIcon={true}
									action={ctx.url(`${props.path}/delete/${String(props.id)}`)}
								/>
							</div>
							{props.extraActions}
						</>
					)}
					<h2>{props.title}</h2>
					<p>
						{ctx.t({
							code: "common.id",
							msg: "ID",
						})}
						: {String(props.id)}
					</p>
					{props.extraInfo}
					{props.children}
				</form>
			</>
		</MainContainer>
	);
}

