import { Link } from "react-router";

export default function Home() {

	return (
		<div className="min-h-screen">

			{/* HERO SECTION */}
			<div className="relative w-full min-h-[700px] py-16 md:py-24 ">
				<img
					src="/assets/images/hero.png"
					className="absolute inset-0 w-full h-full object-cover"
				/>

				<div className="relative bg-sky-950/95 md:bg-sky-950 max-w-xl lg:max-w-2xl px-6 sm:px-10 md:px-16 py-16 md:py-24 flex flex-col justify-start gap-8">
					<div>
						<span className="text-white text-2xl font-bold leading-tight block mb-8">
							DELTA Resilience
						</span>

						<span className="text-sky-500 text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
							Disaster & Hazardous Events, Losses and Damages Tracking & Analysis
						</span>
					</div>

					<p className="text-stone-50 text-base max-w-md leading-6">
						A toolkit to collect, manage and analyze hazardous events and losses
						and damages data to support disaster risk reduction.
					</p>

					<div className="flex flex-wrap gap-4">
						<Link
							to="/en/user/login"
							className="px-6 py-2 bg-white text-sky-800 rounded-md text-sm font-medium cursor-pointer inline-block"
						>
							Log in
						</Link>

						<Link
							to="/en/about/technical-specifications"
							className="px-6 py-2 border border-zinc-300 text-white rounded-md text-sm font-medium cursor-pointer inline-block"
						>
							View documentation
						</Link>
					</div>
				</div>
			</div>

			{/* HOW IT WORKS */}
			<section className="w-full bg-white py-16 md:py-24">
				<div className="max-w-7xl mx-auto px-6 lg:px-6">

					{/* Header */}
					<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-12">
						<h2 className="text-3xl font-bold text-sky-950">
							How it works
						</h2>

						<Link
							to="/en/about/about-the-system"
							className="px-4 py-2 border border-sky-950 rounded-md text-sky-950 text-sm font-medium w-fit cursor-pointer inline-block"
						>
							Learn more
						</Link>
					</div>

					{/* Cards */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

						{/* Card 1 */}
						<div className="bg-[#F9F9F9] rounded-xl p-8 flex flex-col gap-4">
							<span className="text-sm font-bold text-black/90">Data</span>

							<img
								src="/assets/images/how-it-works-collect.png"
								className="w-full h-44 object-contain ltr:object-left rtl:object-right"
							/>

							<h3 className="text-2xl font-bold text-black/90">
								Collect
							</h3>

							<p className="text-base text-black/90 leading-6">
								Record and link hazardous events with disaster losses and damages
								data. Systematically track disaster effects across sectors,
								social groups and geographic areas.
							</p>
						</div>

						{/* Card 2 */}
						<div className="bg-[#F9F9F9] rounded-xl p-8 flex flex-col gap-4">
							<span className="text-sm font-bold text-black/90">Analysis</span>

							<img
								src="/assets/images/how-it-works-analyze.png"
								className="w-full h-44 object-contain ltr:object-left rtl:object-right"
							/>

							<h3 className="text-2xl font-bold text-black/90">
								Analyze
							</h3>

							<p className="text-base text-black/90 leading-6">
								Analyze links between hazardous events and losses and damages
								to reveal patterns, trends, and hotspots. Compare across hazards,
								sectors, events, and locations.
							</p>
						</div>

						{/* Card 3 */}
						<div className="bg-[#F9F9F9] rounded-xl p-8 flex flex-col gap-4">
							<span className="text-sm font-bold text-black/90">
								Insights for action
							</span>

							<img
								src="/assets/images/how-it-works-insights-for-action.png"
								className="w-full h-44 object-contain ltr:object-left rtl:object-right"
							/>

							<h3 className="text-2xl font-bold text-black/90">
								Insights for action
							</h3>

							<p className="text-base text-black/90 leading-6">
								Turn raw data into insight. Produce analytical outputs to
								support decision-making for prevention, risk reduction,
								preparedness, recovery, financing and adaptation.
							</p>
						</div>

					</div>
				</div>
			</section>

			{/* KEY FEATURES */}
			<section className="w-full bg-[#F9F9F9] py-16 md:py-24">
				<div className="max-w-7xl mx-auto px-6 lg:px-8">

					{/* Header */}
					<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-12">
						<h2 className="text-3xl font-bold text-[#025091]">
							Key Features
						</h2>

						<Link
							to="/en/about/about-the-system"
							className="px-4 py-2 border border-sky-950 rounded-md text-sky-950 text-sm font-medium w-fit cursor-pointer inline-block"
						>
							Learn more
						</Link>
					</div>

					{/* Grid */}
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">

						{/* Feature */}
						<div className="bg-white rounded-xl border-2 border-[#DE7C32] p-8 flex flex-col gap-4">
							<div className="w-16 h-16 bg-[#DE7C32]/30 rounded-2xl flex items-center justify-center">
								<i className="pi pi-chart-line text-2xl text-[#DE7C32]" style={{ fontSize: "1.5rem" }} aria-hidden="true"></i>
							</div>

							<h3 className="text-xl font-medium text-neutral-950">
								Analytics
							</h3>

							<p className="text-neutral-950 text-base leading-6">
								From data to decisions - analysis that drives multiple DRR
								applications including recovery planning, financing,
								early warning and risk-informed planning.
							</p>
						</div>

						<div className="bg-white rounded-xl border-2 border-[#8D3386] p-8 flex flex-col gap-4">
							<div className="w-16 h-16 bg-[#8D3386]/30 rounded-2xl flex items-center justify-center">
								<i className="pi pi-wave-pulse text-2xl text-[#8D3386]" style={{ fontSize: "1.5rem" }} aria-hidden="true"></i>
							</div>

							<h3 className="text-xl font-medium text-neutral-950">
								Monitoring
							</h3>

							<p className="text-neutral-950 text-base leading-6">
								Continuous monitoring and tracking of hazardous and disaster
								events and their effects across human, socio-economic and
								ecosystem dimensions.
							</p>
						</div>

						<div className="bg-white rounded-xl border-2 border-[#45AAAB] p-8 flex flex-col gap-4">
							<div className="w-16 h-16 bg-[#45AAAB]/30 rounded-2xl flex items-center justify-center">
								<i className="pi pi-database text-2xl text-[#45AAAB]" style={{ fontSize: "1.5rem" }} aria-hidden="true"></i>
							</div>

							<h3 className="text-xl font-medium text-neutral-950">
								Data management & integration
							</h3>

							<p className="text-neutral-950 text-base leading-6">
								Preserve, connect and enrich disaster impact data using
								exposure, vulnerability and baseline information.
							</p>
						</div>

						<div className="bg-white rounded-xl border-2 border-[#009EDB] p-8 flex flex-col gap-4">
							<div className="w-16 h-16 bg-[#009EDB]/30 rounded-2xl flex items-center justify-center">
								<i className="pi pi-chart-bar text-2xl text-[#009EDB]" style={{ fontSize: "1.5rem" }} aria-hidden="true"></i>
							</div>

							<h3 className="text-xl font-medium text-neutral-950">
								Losses and damages overview
							</h3>

							<p className="text-neutral-950 text-base leading-6">
								Analyze losses and damages through interactive dashboards
								per disaster event, hazard type, sector and geography.
							</p>
						</div>

						<div className="bg-white rounded-xl border-2 border-[#B42A32] p-8 flex flex-col gap-4">
							<div className="w-16 h-16 bg-[#B42A32]/30 rounded-2xl flex items-center justify-center">
								<i className="pi pi-share-alt text-2xl text-[#B42A32]" style={{ fontSize: "1.5rem" }} aria-hidden="true"></i>
							</div>

							<h3 className="text-xl font-medium text-neutral-950">
								Connected disaster data
							</h3>

							<p className="text-neutral-950 text-base leading-6">
								Support data sharing and application across sectors and
								multiple levels of government.
							</p>
						</div>

						<div className="bg-white rounded-xl border-2 border-[#002F49] p-8 flex flex-col gap-4">
							<div className="w-16 h-16 bg-[#002F49]/30 rounded-2xl flex items-center justify-center">
								<i className="pi pi-map text-2xl text-[#002F49]" style={{ fontSize: "1.5rem" }} aria-hidden="true"></i>
							</div>

							<h3 className="text-xl font-medium text-neutral-950">
								Baseline & contextual data integration
							</h3>

							<p className="text-neutral-950 text-base leading-6">
								Integrate exposure, vulnerability, statistical and geospatial
								data enabling post-disaster change and impact analysis.
							</p>
						</div>

					</div>
				</div>
			</section>

			{/* LEARN MORE */}
			<section className="w-full bg-sky-950 py-16 md:py-24">
				<div className="max-w-4xl mx-auto px-6 text-center flex flex-col items-center gap-8">

					<h2 className="text-white text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
						Learn more about the system
					</h2>

					<Link
						to="/en/about/technical-specifications"
						className="px-6 py-2 border border-white rounded-md text-white text-sm font-medium cursor-pointer inline-block"
					>
						View documentation
					</Link>

				</div>
			</section>



		</div >
	);
}