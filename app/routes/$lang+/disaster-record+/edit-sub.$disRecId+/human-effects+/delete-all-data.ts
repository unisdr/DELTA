import { authActionWithPerm, authLoaderWithPerm } from '~/utils/auth';
import { deleteAllData } from '~/backend.server/handlers/human_effects';
import { BackendContext } from '~/backend.server/context';

export const loader = authLoaderWithPerm('EditData', async () => {
    return 'use POST';
});

export const action = authActionWithPerm('EditData', async (actionArgs) => {
    const ctx = new BackendContext(actionArgs);
    const { params } = actionArgs;
    let recordId = params.disRecId || '';
    return await deleteAllData(ctx, recordId);
});
