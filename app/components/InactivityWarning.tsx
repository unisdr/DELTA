import { useEffect, useState } from "react";
import { useLocation, useNavigation, useSubmit, useFetcher } from "react-router";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import {
    sessionActivityTimeoutMinutes,
    sessionActivityWarningBeforeTimeoutMinutes,
} from "~/utils/session-activity-config";
import type { ViewContext } from "~/frontend/context";

interface InactivityWarningProps {
    ctx: ViewContext;
    loggedIn: boolean;
}

export default function InactivityWarning(props: InactivityWarningProps) {
    const ctx = props.ctx;
    const location = useLocation();
    const navigation = useNavigation();
    const submit = useSubmit();
    const [lastActivity, setLastActivity] = useState(new Date());
    const [showWarning, setShowWarning] = useState(false);
    const [expiresInMinutes, setExpiresInMinutes] = useState(0);

    useEffect(() => {
        setLastActivity(new Date());
    }, [navigation.state]);

    useEffect(() => {
        const update = () => {
            const now = new Date();
            const minutesSinceLastActivity =
                (now.getTime() - lastActivity.getTime()) / (1000 * 60);

            if (
                minutesSinceLastActivity >
                sessionActivityTimeoutMinutes -
                sessionActivityWarningBeforeTimeoutMinutes
            ) {
                setShowWarning(true);
                setExpiresInMinutes(
                    Math.max(0, sessionActivityTimeoutMinutes - minutesSinceLastActivity),
                );
            } else {
                setShowWarning(false);
            }
        };
        update();
        const interval = setInterval(update, 10 * 1000);
        return () => clearInterval(interval);
    }, [lastActivity]);

    const fetcher = useFetcher();

    const handleRefreshSession = () => {
        setLastActivity(new Date());
        fetcher.load(ctx.url("/user/refresh-session"));
    };

    const logoutAction = location.pathname.startsWith(ctx.url("/admin/"))
        ? ctx.url("/admin/logout")
        : ctx.url("/user/logout");

    const handleGoToLogin = () => {
        submit(null, { method: "post", action: logoutAction });
    };

    const isExpired = expiresInMinutes <= 0.1;

    if (!props.loggedIn) {
        return null;
    }

    return (
        <>
            <Dialog
                visible={showWarning}
                onHide={() => { }}
                modal
                closable={false}
                draggable={false}
                resizable={false}
                style={{ width: "92%", maxWidth: "560px" }}
                header={
                    <div className="flex items-center gap-2">
                        <i
                            className={`pi ${isExpired ? "pi-times-circle text-red-600" : "pi-exclamation-triangle text-amber-600"}`}
                        />
                        <span className="font-semibold text-base text-gray-900">
                            {isExpired ? "Session expired" : "Session expiration warning"}
                        </span>
                    </div>
                }
            >
                <div className="flex flex-col gap-4">
                    {isExpired ? (
                        <p className="text-sm text-gray-700 leading-relaxed">
                            {ctx.t({ code: "session.expired_message", msg: "Your session has expired due to inactivity. Please sign in again to continue." })}
                        </p>
                    ) : (
                        <p className="text-sm text-gray-700 leading-relaxed">
                            {ctx.t(
                                {
                                    code: "session.expiry_warning_minutes",
                                    msgs: {
                                        one: "For your security, your session will expire in {n} minute due to inactivity.",
                                        other: "For your security, your session will expire in {n} minutes due to inactivity.",
                                    },
                                },
                                { n: Math.round(expiresInMinutes) },
                            )}
                        </p>
                    )}

                    <div className="flex items-center justify-end gap-2">
                        {!isExpired ? (
                            <Button
                                type="button"
                                label="Refresh session"
                                icon="pi pi-refresh"
                                onClick={handleRefreshSession}
                                loading={fetcher.state !== "idle"}
                                severity="warning"
                            />
                        ) : null}
                        <Button
                            type="button"
                            label="Go to Sign in"
                            icon="pi pi-arrow-right"
                            onClick={handleGoToLogin}
                            outlined={!isExpired}
                            severity={isExpired ? "danger" : "secondary"}
                        />
                    </div>
                </div>
            </Dialog>
        </>
    );
}
