import { Translator } from "./translator";

export interface Context {
  lang: string;
  t: Translator;
  url(path: string): string;
}
