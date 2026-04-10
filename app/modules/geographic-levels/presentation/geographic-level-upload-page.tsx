import { Form } from "react-router";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Message } from "primereact/message";

interface GeographicLevelUploadPageProps {
    submitted: boolean;
    error: string;
    imported: number;
    failed: number;
    failedDetails: Record<string, string>;
}

export default function GeographicLevelUploadPage({
    submitted,
    error,
    imported,
    failed,
    failedDetails,
}: GeographicLevelUploadPageProps) {
    return (
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
            <div>
                <h2 className="text-2xl font-semibold text-slate-900">Upload divisions ZIP</h2>
                <p className="mt-1 text-sm text-slate-600">
                    Import geographic levels from a ZIP file. CSV upload functionality is preserved.
                </p>
            </div>

            {submitted ? (
                <Message
                    severity={failed > 0 ? "warn" : "success"}
                    content={`Successfully imported ${imported} records${failed > 0 ? ` (${failed} records failed)` : ""}`}
                />
            ) : null}

            {error ? <Message severity="error" text={error} /> : null}

            {failed > 0 && Object.keys(failedDetails).length > 0 ? (
                <Card className="shadow-sm">
                    <h3 className="mb-3 text-lg font-semibold text-slate-900">Failed imports</h3>
                    <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
                        {Object.entries(failedDetails).map(([divisionId, errorMsg]) => (
                            <li key={divisionId}>
                                <strong>{divisionId}:</strong> {errorMsg}
                            </li>
                        ))}
                    </ul>
                </Card>
            ) : null}

            <Card className="shadow-sm">
                <Form method="post" encType="multipart/form-data" className="flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                        <label htmlFor="file" className="text-sm font-medium text-slate-700">
                            Upload division ZIP file
                        </label>
                        <input
                            id="file"
                            name="file"
                            type="file"
                            accept=".zip"
                            className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-700"
                        />
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Button type="submit" label="Upload and import" icon="pi pi-upload" />
                        <Button
                            type="button"
                            label="Back to list"
                            icon="pi pi-arrow-left"
                            severity="secondary"
                            outlined
                            onClick={() => {
                                window.location.href = "/settings/geography";
                            }}
                        />
                    </div>
                </Form>
            </Card>
        </div>
    );
}
