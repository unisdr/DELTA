import { MetaFunction, Outlet, useLoaderData } from "react-router";
import { Card } from "primereact/card";
import { Tag } from "primereact/tag";
import { Button } from "primereact/button";
import { MainContainer } from "~/frontend/container";

import { authLoader, authLoaderGetAuth } from "~/utils/auth";
import { getUserRoleFromSession } from "~/utils/session";
import { htmlTitle } from "~/utils/htmlmeta";
import { Link } from "react-router";

export const loader = authLoader(async (loaderArgs) => {
    const { request } = loaderArgs;
    const { user } = authLoaderGetAuth(loaderArgs);
    const userRole = await getUserRoleFromSession(request);

    return {
        user: {
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            email: user.email,
            emailVerified: !!user.emailVerified,
            totpEnabled: !!user.totpEnabled,
        },
        userRole: userRole || "",
    };
});

export const meta: MetaFunction = () => {


    return [
        {
            title: htmlTitle(
                "User Profile",
            ),
        },
        {
            name: "description",
            content: "User profile details",
        },
    ];
};

export default function UserProfileLayout() {

    const ld = useLoaderData<typeof loader>();

    const fullName = `${ld.user.firstName} ${ld.user.lastName}`.trim();

    return (
        <MainContainer
            title={"Profile"}
        >
            <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
                <Card className="shadow-md rounded-xl">
                    <div className="flex flex-col gap-4">
                        <div>
                            <h2 className="m-0 text-2xl font-semibold text-gray-900">
                                {fullName || "User"}
                            </h2>
                        </div>

                        <div className="flex justify-end">
                            <Link to={"/user/profile/edit"}>
                                <Button
                                    label={"Edit"}
                                    icon="pi pi-pencil"
                                />
                            </Link>
                        </div>

                        <div className="flex flex-col">
                            <div>
                                <div className="text-gray-500">
                                    {"Email"}
                                </div>
                                <div className="font-medium mb-4">{ld.user.email}</div>
                            </div>

                            <div>
                                <div className="text-gray-500">
                                    {"Role"}
                                </div>
                                <div className="font-medium mb-4">{ld.userRole || "-"}</div>
                            </div>

                            <div>
                                <div className="text-gray-500">
                                    {"Email status"}
                                </div>
                                <div className="mb-4">
                                    <Tag
                                        value={ld.user.emailVerified
                                            ? "Verified"
                                            : "Unverified"}
                                        severity={ld.user.emailVerified ? "success" : "warning"}
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="text-gray-500">
                                    {"2FA (TOTP)"}
                                </div>
                                <div className="mb-4">
                                    <Tag
                                        value={ld.user.totpEnabled
                                            ? "Enabled"
                                            : "Disabled"}
                                        severity={ld.user.totpEnabled ? "info" : "secondary"}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
            <Outlet />
        </MainContainer>
    );
}
