import { Form, useActionData, useLoaderData } from "react-router";
import { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

export const loader = async (_args: LoaderFunctionArgs) => {
    return { message: "Hello World Loader!" };
};

export const action = async (args: ActionFunctionArgs) => {
    const request = args.request;
    const formData = await request.formData();
    const name = formData.get("name") as string;
    return name ? { message: `Hello ${name}` } : { message: "Hello World Action!" }
};


export default function Hello() {
    const loaderData = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();

    return (
        <div>
            <h1>{loaderData.message}</h1>

            {actionData && <h2>{actionData.message}</h2>}

            <Form method="post">
                <input name="name" placeholder="Your name" />
                <button>Send</button>
            </Form>
        </div>
    );
}
