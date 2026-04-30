import { Link, LinkProps } from "react-router";
import { urlLang } from "./url";

type LangLinkProps = Omit<LinkProps, "to"> & {
	to: string;
	lang: string;
	visible?: boolean;
};

export function LangLink({
	to,
	lang,
	visible = true,
	...props
}: LangLinkProps) {
	const toPath = urlLang(lang, to);
	if (!visible) {
		return null;
	}
	return <Link to={toPath} {...props} />;
}
