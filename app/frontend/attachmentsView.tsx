import { ViewContext } from "./context";

export function AttachmentsView({
	ctx,
	id = "",
	initialData = [],
	file_viewer_url = "",
	location = "",
	countryAccountsId: _countryAccountsId = "",
}: {
	ctx: ViewContext;
	id: string;
	initialData: any[];
	file_viewer_url: string;
	location?: string;
	countryAccountsId?: string;
}) {
	if (initialData) {
		return (
			<>
				<p>
					{ctx.t({
						code: "attachments",
						msg: "Attachments",
					})}
					:
				</p>
				{(() => {
					try {
						let attachments: any[] = []; // Ensure it's always an array

						if (Array.isArray(initialData)) {
							attachments = initialData;
						} else if (typeof initialData === "string") {
							try {
								const parsed = JSON.parse(initialData);
								attachments = Array.isArray(parsed) ? parsed : [];
							} catch (error) {
								console.error("Invalid JSON in attachments:", error);
								attachments = [];
							}
						} else {
							console.warn(
								"Unexpected type for attachments:",
								typeof initialData,
							);
							attachments = [];
						}

						return attachments.length > 0 ? (
							<table
								style={{
									border: "1px solid #ddd",
									width: "100%",
									borderCollapse: "collapse",
									marginBottom: "2rem",
								}}
							>
								<thead>
									<tr style={{ backgroundColor: "#f2f2f2" }}>
										<th
											style={{
												border: "1px solid #ddd",
												padding: "8px",
												textAlign: "left",
												fontWeight: "normal",
											}}
										>
											Title
										</th>
										<th
											style={{
												border: "1px solid #ddd",
												padding: "8px",
												textAlign: "left",
												fontWeight: "normal",
											}}
										>
											Tags
										</th>
										<th
											style={{
												border: "1px solid #ddd",
												padding: "8px",
												textAlign: "left",
												fontWeight: "normal",
											}}
										>
											File/URL
										</th>
									</tr>
								</thead>
								<tbody>
									{attachments.map((attachment: any) => {
										const tags = attachment.tag
											? attachment.tag.map((tag: any) => tag.name).join(", ")
											: "N/A";

										let fileOrUrl: React.ReactNode = "N/A";

										if (attachment.file_option === "File" && attachment.file) {
											const fileName = attachment.file.name.split("/").pop();
											const locParam = location ? `&loc=${location}` : "";

											// Check if file_viewer_url already contains query parameters
											const separator = file_viewer_url.includes("?")
												? "&"
												: "?";

											fileOrUrl = (
												<a
													href={ctx.url(
														`${file_viewer_url}${separator}name=${id}/${fileName}${locParam}`,
													)}
													target="_blank"
													rel="noopener noreferrer"
												>
													{fileName}
												</a>
											);
										} else if (attachment.file_option === "Link") {
											fileOrUrl = (
												<a
													href={attachment.url}
													target="_blank"
													rel="noopener noreferrer"
												>
													{attachment.url}
												</a>
											);
										}

										return (
											<tr
												key={attachment.id}
												style={{ borderBottom: "1px solid gray" }}
											>
												<td
													style={{ border: "1px solid #ddd", padding: "8px" }}
												>
													{attachment.title || "N/A"}
												</td>
												<td
													style={{ border: "1px solid #ddd", padding: "8px" }}
												>
													{tags}
												</td>
												<td
													style={{ border: "1px solid #ddd", padding: "8px" }}
												>
													{fileOrUrl}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						) : (
							<></>
						);
					} catch (error) {
						console.error("Error processing attachments:", error);
						return <p>Error loading attachments.</p>;
					}
				})()}
			</>
		);
	} else {
		return <></>;
	}
}
