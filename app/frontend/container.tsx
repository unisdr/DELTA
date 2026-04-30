import React from "react";

interface MainContainerProps {
	title: string;
	children: React.ReactNode;
	showHeader?: boolean;
	headerExtra?: React.ReactNode;
	headerAfter?: React.ReactNode;
}

export function MainContainer(props: MainContainerProps) {
	const { showHeader = true } = props;

	return (
		<>
			{showHeader ? (
				<div className="mg-container dts-page-header">
					<header className="dts-page-title">
						<div className="mg-container">
							<h1 className="dts-heading-1">{props.title}</h1>
						</div>
					</header>
					{props.headerExtra}
				</div>
			) : null}
			{props.headerAfter}
			<div className="mg-container">{props.children}</div>
		</>
	);
}
