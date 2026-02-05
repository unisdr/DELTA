import { useRouteLoaderData } from 'react-router';
import { urlLang } from '~/utils/url';
import { UserForFrontend } from '~/utils/auth';
import {
    createTranslator,
    parseLanguageAndDebugFlag,
    TranslationGetter,
    Translator,
} from '~/utils/translator';
import { DContext } from '~/utils/dcontext';
import { CommonData } from '~/backend.server/handlers/commondata';
import type {} from '~/types/createTranslationGetter.d';

export class ViewContext implements DContext {
    t: Translator;
    lang: string;
    user: UserForFrontend | null;

    constructor() {
        const rootData = useRouteLoaderData('root') as CommonData;
        const commonData = rootData.common;
        if (!rootData.common.lang) throw new Error('lang not passed to ViewContext');
        this.lang = commonData.lang;
        this.user = commonData.user;

        {
            const { baseLang, isDebug } = parseLanguageAndDebugFlag(this.lang);

            let translationGetter: TranslationGetter;
            translationGetter = globalThis.createTranslationGetter(baseLang);

            this.t = createTranslator(translationGetter, baseLang, isDebug);
        }
    }

    url(path: string): string {
        return urlLang(this.lang, path);
    }
}
