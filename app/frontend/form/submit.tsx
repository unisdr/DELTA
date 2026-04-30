import React from "react";

interface SubmitButtonProps {
	label: string;
	id?: React.HTMLProps<HTMLButtonElement>["id"];
	className?: string;
	disabled?: boolean;
	style?: React.CSSProperties; // Allow inline styles
}

export function SubmitButton({
	label,
	id = undefined,
	disabled = false,
	className = "mg-button mg-button-primary",
	style = {}, // Default to an empty style object
}: SubmitButtonProps) {
	return (
		<button
			id={id}
			disabled={disabled}
			className={className}
			style={{
				...style, // Use passed styles
				flex: "none", // Prevent stretching within flex containers
			}}
			type="submit"
		>
			{label}
		</button>
	);
}
