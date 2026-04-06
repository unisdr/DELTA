import { Button } from "primereact/button";
import { Link } from "react-router";


export default function NotFoundPage() {

	return (
		<div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">

			{/* Icon */}
			<div className="flex items-center justify-center w-28 h-28 rounded-full bg-blue-50 mb-6">
				<i className="pi pi-exclamation-triangle text-blue-500 text-5xl"></i>
			</div>

			{/* Title */}
			<h1 className="text-5xl font-semibold text-gray-800 mb-3">
				404
			</h1>

			{/* Subtitle */}
			<h2 className="text-xl font-medium text-gray-700 mb-2">
				{"Page not found"}
			</h2>

			{/* Description */}
			<p className="text-gray-500 max-w-md mb-8">
				{"The page you are looking for might have been removed, renamed, or is temporarily unavailable."}
			</p>

			{/* Buttons */}
			<div className="flex gap-3">
				<Link to="/">
					<Button
						label={"Go to Home"}
						icon="pi pi-home"
					/>
				</Link>

				<Button
					label={"Go Back"}
					icon="pi pi-arrow-left"
					outlined
					onClick={() => window.history.back()}
				/>
			</div>
		</div>
	);
}