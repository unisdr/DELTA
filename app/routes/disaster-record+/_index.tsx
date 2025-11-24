import { disasterRecordLoader } from '~/backend.server/handlers/disaster_record';

import { DataScreen } from '~/frontend/data_screen';
import { ActionLinks } from '~/frontend/form';

import { useLoaderData, MetaFunction, Link } from '@remix-run/react';

import { authLoaderPublicOrWithPerm } from '~/util/auth';

import { route } from '~/frontend/disaster-record/form';
import { format } from 'date-fns';
import { DisasterRecordsFilter } from '~/frontend/components/DisasterRecordsFilter';
import { getUserFromSession, getUserRoleFromSession } from '~/util/session';
import { Tooltip } from 'primereact/tooltip';

export const loader = authLoaderPublicOrWithPerm('ViewData', async (loaderArgs) => {
    const { request } = loaderArgs;
    const loggedInUser = await getUserFromSession(request);
    const userRole = await getUserRoleFromSession(request);

    const user = {
        id: loggedInUser?.user.id,
        role: userRole,
    };

    const data = await disasterRecordLoader({ loaderArgs });

    return { ...data, user };
});

export const meta: MetaFunction = () => {
    return [
        { title: 'Disaster Records - DELTA Resilience' },
        { name: 'description', content: 'Disaster Records Repository.' },
    ];
};

export default function Data() {
    const ld = useLoaderData<typeof loader>();
    const { items, pagination } = ld.data;
    return DataScreen({
        isPublic: ld.isPublic,
        plural: 'Disaster records',
        resourceName: 'record',
        baseRoute: route,
        columns: ld.isPublic
            ? ['Related Disaster Event', 'Disaster Event', 'Created', 'Updated']
            : [
                  'Related Disaster Event',
                  'Record Status',
                  'Record UUID',
                  'Created',
                  'Updated',
                  'Actions',
              ],
        items: items,
        paginationData: pagination,
        csvExportLinks: false,
        beforeListElement: (<>
            <DisasterRecordsFilter
                clearFiltersUrl={route}
                disasterEventName={ld.filters.disasterEventName}
                disasterRecordUUID={ld.filters.disasterRecordUUID}
                fromDate={ld.filters.fromDate}
                toDate={ld.filters.toDate}
                recordStatus={ld.filters.recordStatus}
                sectors={ld.sectors}
                sectorId={ld.filters.sectorId}
                subSectorId={ld.filters.subSectorId}
            />
            <Tooltip target=".custom-target-icon" pt={{
                root: { style: { marginTop: '-10px' } }
            }} />
        </>),
        listName: 'disaster records',
        instanceName: ld.instanceName,
        totalItems: pagination.totalItems,
        renderRow: (item, route) => (
            <tr key={item.id}>
                <td>{item.nameNational && item.nameNational}</td>

                {!ld.isPublic && (
                    <td>
                        <span className={`dts-status dts-status--${item.approvalStatus} custom-target-icon`}
                            data-pr-tooltip={item.approvalStatus}
							data-pr-position="top"
                        ></span>
                        {} {item.approvalStatus}
                    </td>
                )}
                <td>
                    <Link to={`${route}/${item.id}`}>{item.id.slice(0, 5)}</Link>
                </td>
                <td>{format(new Date(item.createdAt), 'dd-MM-yyyy')}</td>
                <td>{item.updatedAt ? format(new Date(item.updatedAt), 'dd-MM-yyyy') : ''}</td>
                <td className="dts-table__actions">
                    {ld.isPublic ? null : (
                        <ActionLinks
                            route={route}
                            id={item.id}
                            deleteMessage="This data cannot be recovered after being deleted."
                            deleteTitle="Are you sure you want to delete this record?"
                            confirmDeleteLabel="Delete permanently"
                            cancelDeleteLabel="Do not delete"
                            user={ld.user}
                            approvalStatus={item.approvalStatus}
                        />
                    )}
                </td>
            </tr>
        ),
    });
}
