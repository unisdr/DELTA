import {initDB, endDB} from "./db.server"
import {initCookieStorage} from "./util/session"
import {createTranslationGetter} from "~/backend.server/translations"
import { importTranslationsIfNeeded } from "./backend.server/services/translationDBUpdates/update"
import type {} from '~/types/createTranslationGetter.d';

export function initServer() {
	console.log("init.serve.tsx:init")
	console.log("Initing DB...")
	initDB()
	console.log("Initing cookie storage...")
	initCookieStorage();

	console.log("Setting up translator...")
	globalThis.createTranslationGetter = createTranslationGetter

	importTranslationsIfNeeded()
}

export function endServer() {
	console.log("init.serve.tsx:end")
	console.log("Ending DB...")
	endDB()
}
