import { LoaderFunctionArgs } from 'react-router';
import { BackendContext } from '~/backend.server/context';
import { getSubSectorsBySectorId } from '~/db/queries/sector';

export async function loader(args: LoaderFunctionArgs) {
	const ctx = new BackendContext(args);
	const {request} = args;
  const url = new URL(request.url);
  const sectorId = url.searchParams.get('sectorId');
  if (!sectorId) return { subSectors: [] };

  const subSectors = await getSubSectorsBySectorId(ctx, sectorId);
  return { subSectors };
}
