"use client";
import {useEffect, useState} from "react";
import dynamic from "next/dynamic";
import {initializeApp} from "firebase/app";
import {getAuth, onAuthStateChanged, User} from "firebase/auth";

// @ts-ignore
const FirebaseUIReact = dynamic(() => import("firebaseui-react"), {ssr: false});

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY,
};

export default function Home() {
    const [firebaseInitialized, setFirebaseInitialized] = useState(false);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const app = initializeApp(firebaseConfig);
        setFirebaseInitialized(true);
        console.log("Firebase initialized");

        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
        });

        return () => unsubscribe(); // Clean up the subscription when component unmounts
    }, []);

    return (
        <div>
            <div className="navbar bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 sticky top-0">
                <div className="flex-1">
                    <a className="btn btn-ghost text-xl">FIFI</a>
                </div>
                <div className="flex-none">
                    <div className="dropdown dropdown-end">
                        <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
                            <div className="w-10 rounded-full">
                                <img alt="Avatar"
                                     src={user ? user.photoURL! : "https://daisyui.com/images/stock/photo-1534528741775-53994a69daeb.jpg"}/> {/* Render user's photoURL */}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className={"bg-base-100 h-screen grid place-content-center"}>
                {firebaseInitialized ? ( // Render component based on firebaseInitialized state
                    user ? ( // If user is signed in, render welcome message
                        <p>Welcome back, {user.displayName}</p>
                    ) : ( // If user is not signed in, render FirebaseUI component
                        <FirebaseUIReact
                            // @ts-ignore
                            auth={getAuth()}
                            config={{
                                continueUrl: "localhost:3000",
                                signInOptions: [
                                    {
                                        provider: "google.com",
                                        customParameters: {prompt: "select_account"},
                                    },
                                ],
                                callBacks: {
                                    signInSuccessWithAuthResult: function (authResult: any, redirectUrl: any) {
                                        console.log("Sign in success");
                                        console.log(authResult);
                                    },
                                    signInFailure: function (error: any) {
                                        console.log("Sign in failure");
                                        console.log(error);
                                    },
                                },
                            }}
                        />
                    )
                ) : (
                    <span className="loading loading-ring loading-lg"></span>
                )}
            </div>
        </div>
    );
}
