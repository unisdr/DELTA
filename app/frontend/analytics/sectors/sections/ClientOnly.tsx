import * as React from "react";

interface ClientOnlyProps {
	children: () => React.ReactNode;
	fallback?: React.ReactNode;
}

export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
	const [mounted, setMounted] = React.useState(false);

	React.useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) return <>{fallback}</>;
	return <>{children()}</>;
}
