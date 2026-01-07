import { ContentRepeater } from "~/components/ContentRepeater";
import { ViewContext } from "./context";

export function AttachmentsFormView({
	ctx,
	initialData,
	save_path_temp,
	file_viewer_temp_url,
	file_viewer_url,
	api_upload_url,
}: {
	ctx: ViewContext;
	initialData: any;
	save_path_temp: string;
	file_viewer_temp_url: string;
	file_viewer_url: string;
	api_upload_url: string;
}) {
	const parsedData = (() => {
		try {
			if (Array.isArray(initialData)) return initialData;
			if (typeof initialData === "string") return JSON.parse(initialData) || [];
			return [];
		} catch {
			return [];
		}
	})();

	return (
		<>
			<ContentRepeater
				ctx={ctx}
				id="attachments"
				caption={ctx.t({
					"code": "common.attachments",
					"msg": "Attachments"
				})}
				dnd_order={true}
				save_path_temp={save_path_temp}
				file_viewer_temp_url={file_viewer_temp_url}
				file_viewer_url={file_viewer_url}
				api_upload_url={api_upload_url}
				table_columns={[
					{
						type: "dialog_field",
						dialog_field_id: "title",
						caption: ctx.t({
							"code": "common.title",
							"msg": "Title"
						})
					},
					{
						type: "custom",
						caption: ctx.t({
							"code": "common.tags",
							"msg": "Tags"
						}),
						render: (item: any) => {
							try {
								if (!item.tag) {
									return "N/A"; // Return "N/A" if no tags exist
								}

								const tags = (item.tag); // Parse the JSON string
								if (Array.isArray(tags) && tags.length > 0) {
									// Map the names and join them with commas
									return tags.map(tag => tag.name).join(", ");
								}
								return "N/A"; // If no tags exist
							} catch (error) {
								console.error("Failed to parse tags:", error);
								return "N/A"; // Return "N/A" if parsing fails
							}
						}
					},
					{
						type: "custom",
						caption: ctx.t({
							"code": "attachments.file_or_url",
							"msg": "File/URL"
						}),
						render: (item) => {
							let strRet = "N/A"; // Default to "N/A"		

							const fileOption = item?.file_option || "";

							if (fileOption === "File") {
								// Get the file name or fallback to URL
								const fullFileName = item.file?.name ? item.file.name.split('/').pop() : item.url;

								// Truncate long file names while preserving the file extension
								const maxLength = 30; // Adjust to fit your design
								strRet = fullFileName;

								if (fullFileName && fullFileName.length > maxLength) {
									const extension = fullFileName.includes('.')
										? fullFileName.substring(fullFileName.lastIndexOf('.'))
										: '';
									const baseName = fullFileName.substring(0, maxLength - extension.length - 3); // Reserve space for "..."
									strRet = `${baseName}...${extension}`;
								}
							} else if (fileOption === "Link") {
								strRet = item.url || "N/A";
							}

							return strRet || "N/A"; // Return the truncated name or fallback to "N/A"
						},
					},
					{
						type: "action",
						caption: ctx.t({
							"code": "common.action",
							"msg": "Action"
						})
					},
				]}
				dialog_fields={[
					{
						id: "title",
						caption: ctx.t({
							"code": "common.title",
							"msg": "Title"
						}),
						type: "input"
					},
					{
						id: "tag",
						caption: ctx.t({
							"code": "common.tags",
							"msg": "Tags"
						}),
						type: "tokenfield",
						dataSource: ctx.url("/api/disaster-event/tags-sectors")
					},
					{
						id: "file_option",
						caption: ctx.t({
							"code": "attachments.type",
							"msg": "Type"
						}),
						type: "option",
						options: [
							{
								value: "File",
								label: ctx.t({
									"code": "common.file",
									"msg": "File"
								})
							},
							{
								value: "Link",
								label: ctx.t({
									"code": "common.link",
									"msg": "Link"
								})
							},
						],
						onChange: (e) => {
							const value = e.target.value;
							const fileField = document.getElementById("attachments_file") as HTMLInputElement;
							const urlField = document.getElementById("attachments_url") as HTMLInputElement;

							if (fileField && urlField) {
								const fileDiv = fileField.closest(".dts-form-component") as HTMLElement;
								const urlDiv = urlField.closest(".dts-form-component") as HTMLElement;

								if (value === "File") {
									fileDiv?.style.setProperty("display", "block");
									urlDiv?.style.setProperty("display", "none");
								} else if (value === "Link") {
									fileDiv?.style.setProperty("display", "none");
									urlDiv?.style.setProperty("display", "block");
								}
							}
						},
					},
					{
						id: "file",
						caption: ctx.t({
							"code": "attachments.file_upload",
							"msg": "File upload"
						}),
						type: "file"
					},
					{
						id: "url",
						caption: ctx.t({
							"code": "attachments.link",
							"msg": "Link"
						}),
						type: "input",
						placeholder: ctx.t({
							"code": "attachments.enter_url",
							"desc": "Placeholder for URL input field",
							"msg": "Enter URL"
						})
					},
				]}
				data={parsedData}
				onChange={(items: any) => {
					try {
						Array.isArray(items) ? items : (items);
					} catch {
						console.error("Failed to process items.");
					}
				}}
			/>
		</>
	);
}
