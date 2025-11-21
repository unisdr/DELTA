import { Link, LinkProps } from "react-router-dom";
import { urlLang } from "./url";

type LangLinkProps = Omit<LinkProps, "to"> & {
  to: string;
  lang: string;
};

export function LangLink({ to, lang, ...props }: LangLinkProps) {
  const toPath = urlLang(lang, to);
  return <Link to={toPath} {...props} />;
}
