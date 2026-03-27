import { MetaFunction, Outlet, useLoaderData } from "react-router";
import { Card } from "primereact/card";
import { Tag } from "primereact/tag";
import { Button } from "primereact/button";
import { MainContainer } from "~/frontend/container";
import { ViewContext } from "~/frontend/context";
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
    const ctx = new ViewContext();

    return [
        {
            title: htmlTitle(
                ctx,
                ctx.t({
                    code: "meta.user_profile",
                    msg: "User Profile",
                }),
            ),
        },
        {
            name: "description",
            content: ctx.t({
                code: "meta.user_profile",
                msg: "User profile details",
            }),
        },
    ];
};

export default function UserProfileLayout() {
    const ctx = new ViewContext();
    const ld = useLoaderData<typeof loader>();

    const fullName = `${ld.user.firstName} ${ld.user.lastName}`.trim();

    return (
        <MainContainer
            title={ctx.t({ code: "nav.profile", msg: "Profile" })}
        >
            <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
                <Card className="shadow-2 border-round-xl">
                    <div className="flex flex-column gap-4">
                        <div>
                            <h2 className="m-0 text-2xl font-semibold text-color">
                                {fullName || ctx.t({ code: "common.user", msg: "User" })}
                            </h2>
                            <p className="m-0 mt-2 text-color-secondary">{ld.user.email}</p>
                        </div>

                        <div className="flex justify-content-end">
                            <Link to={ctx.url("/user/profile/edit")}>
                                <Button
                                    label={ctx.t({ code: "common.edit", msg: "Edit" })}
                                    icon="pi pi-pencil"
                                />
                            </Link>
                        </div>

                        <div className="grid">
                            <div className="col-12">
                                <div className="text-color-secondary">
                                    {ctx.t({ code: "common.email", msg: "Email" })}
                                </div>
                                <div className="font-medium mb-4">{ld.user.email}</div>
                            </div>

                            <div className="col-12">
                                <div className="text-color-secondary">
                                    {ctx.t({ code: "common.role", msg: "Role" })}
                                </div>
                                <div className="font-medium mb-4">{ld.userRole || "-"}</div>
                            </div>

                            <div className="col-12">
                                <div className="text-color-secondary">
                                    {ctx.t({ code: "user.email_status", msg: "Email status" })}
                                </div>
                                <div className="mb-4">
                                    <Tag
                                        value={ld.user.emailVerified
                                            ? ctx.t({ code: "common.verified", msg: "Verified" })
                                            : ctx.t({ code: "common.unverified", msg: "Unverified" })}
                                        severity={ld.user.emailVerified ? "success" : "warning"}
                                    />
                                </div>
                            </div>

                            <div className="col-12">
                                <div className="text-color-secondary">
                                    {ctx.t({ code: "user.totp_2fa_status", msg: "2FA (TOTP)" })}
                                </div>
                                <div className="mb-4">
                                    <Tag
                                        value={ld.user.totpEnabled
                                            ? ctx.t({ code: "common.enabled", msg: "Enabled" })
                                            : ctx.t({ code: "common.disabled", msg: "Disabled" })}
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
