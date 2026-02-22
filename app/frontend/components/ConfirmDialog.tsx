import { useEffect, RefObject } from "react";
import { ViewContext } from "../context";

interface ConfirmDialogProps {
	ctx: ViewContext;
	dialogRef: RefObject<HTMLDialogElement | null>;
	confirmMessage: string;
	onConfirm: () => void;
	onCancel: () => void;
	confirmLabel?: string;
	cancelLabel?: string;
	confirmButtonFirst?: boolean;
	confirmIcon?: React.ReactNode;
	cancelIcon?: React.ReactNode;
	title?: string;
}

export function ConfirmDialog({
	ctx,
	dialogRef,
	confirmMessage,
	onConfirm,
	onCancel,
	confirmLabel,
	cancelLabel,
	confirmButtonFirst = true,
	confirmIcon,
	cancelIcon,
	title,
}: ConfirmDialogProps) {
	confirmLabel = confirmLabel ?? ctx.t({ code: "common.yes", msg: "Yes" });
	cancelLabel = cancelLabel ?? ctx.t({ code: "common.no", msg: "No" });

	useEffect(() => {
		let dialog = dialogRef.current;
		if (!dialog) return;
		function handleBackdropClick(e: MouseEvent) {
			if (dialog && e.target === dialog) dialog.close();
		}
		dialog.addEventListener("click", handleBackdropClick);
		return () => dialog.removeEventListener("click", handleBackdropClick);
	}, [dialogRef]);

	return (
		<dialog ref={dialogRef} className="dts-dialog">
			<div className="dts-dialog__content">
				<div
					className="dts-dialog__header"
					style={{ justifyContent: "flex-end" }}
				>
					<button
						type="button"
						autoFocus
						onClick={onCancel}
						aria-label="Close dialog"
						className="dts-dialog-close-button"
					>
						<svg
							aria-hidden="true"
							focusable="false"
							role="img"
							className="dts-svg-24"
						>
							<use href="/assets/icons/close.svg#close" />
						</svg>
					</button>
				</div>
				<div className="dts-form__intro">
					<h2>{title}</h2>
				</div>
				<div className="dts-form__body">
					<p>{confirmMessage}</p>
				</div>
				<div className="dts-form__actions">
					{confirmButtonFirst ? (
						<>
							{/* Confirm button first (primary) */}
							<button
								onClick={onConfirm}
								className="mg-button mg-button-primary"
								style={{ display: "flex", alignItems: "center", gap: "8px" }}
							>
								{confirmLabel}
								{confirmIcon && <span>{confirmIcon}</span>}
							</button>
							{/* Cancel button second (secondary) */}
							<button
								onClick={onCancel}
								className="mg-button mg-button-outline"
								style={{ display: "flex", alignItems: "center", gap: "8px" }}
							>
								{cancelLabel}
								{cancelIcon && <span>{cancelIcon}</span>}
							</button>
						</>
					) : (
						<>
							{/* Cancel button first (then cancel is primary action see #296) */}
							<button
								onClick={onCancel}
								className="mg-button mg-button-primary"
								style={{ display: "flex", alignItems: "center", gap: "8px" }}
							>
								{cancelLabel}
								{cancelIcon && <span>{cancelIcon}</span>}
							</button>
							{/* Confirm button second (then outline see #296) */}
							<button
								onClick={onConfirm}
								className="mg-button mg-button-outline"
								style={{ display: "flex", alignItems: "center", gap: "8px" }}
							>
								{confirmLabel}
								{confirmIcon && <span>{confirmIcon}</span>}
							</button>
						</>
					)}
				</div>
			</div>
		</dialog>
	);
}
