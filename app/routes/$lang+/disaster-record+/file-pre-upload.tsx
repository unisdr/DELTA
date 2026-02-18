import ContentRepeaterPreUploadFile from "~/components/ContentRepeater/PreUploadFile";
import { authLoaderPublicOrWithPerm } from "~/utils/auth";

export const loader = ContentRepeaterPreUploadFile.loader
	? authLoaderPublicOrWithPerm("ViewData", ContentRepeaterPreUploadFile.loader)
	: (undefined as never); // Ensures it's always defined

export const action = ContentRepeaterPreUploadFile.action ?? (() => null);
