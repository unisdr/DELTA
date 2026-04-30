import { Link } from "react-router";
import { Card } from "primereact/card";
import { Button } from "primereact/button";

export default function WelcomeUser() {
    return (
        <div className="flex align-items-center justify-content-center min-h-screen surface-ground">
            <Card className="w-full md:w-6 lg:w-4 shadow-4 border-round-xl text-center">
                <h2 className="mb-3">🎉 Welcome!</h2>
                <p className="mb-4">
                    Your account has been created successfully.
                </p>

                <Link to="/login">
                    <Button label="Click here to Sign In" className="w-full" />
                </Link>
            </Card>
        </div>
    );
}