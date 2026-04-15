import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import {
    action as editAction,
    loader as editLoader,
} from "./edit";
import EditScreen from "./edit";

export const loader = async (loaderArgs: LoaderFunctionArgs) => {
    return editLoader({
        ...loaderArgs,
        params: {
            ...loaderArgs.params,
            id: "new",
        },
    } as LoaderFunctionArgs);
};

export const action = async (actionArgs: ActionFunctionArgs) => {
    return editAction({
        ...actionArgs,
        params: {
            ...actionArgs.params,
            id: "new",
        },
    } as ActionFunctionArgs);
};

export default function Screen() {
    return <EditScreen />;
}
