"use client";
import {useEffect, useState} from "react";
import dynamic from "next/dynamic";
import {FirebaseApp, initializeApp} from "firebase/app";
import {getAuth, onAuthStateChanged, User} from "firebase/auth";
import {initializeAppCheck, ReCaptchaEnterpriseProvider,} from "firebase/app-check";
import {usePlaidLink} from 'react-plaid-link';
import {connectFunctionsEmulator, getFunctions, httpsCallable} from 'firebase/functions';
import firebase from "@firebase/app-compat";


// @ts-ignore
const FirebaseUIReact = dynamic(() => import("firebaseui-react"), {
    ssr: false,
});

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
    const [linkToken, setLinkToken] = useState(null);

    const generateToken = async (app: FirebaseApp) => {
        const functions = getFunctions(app);
        // yeah nice one google - manually use emulator since it doesn't automatically detect it
        connectFunctionsEmulator(functions, 'localhost', 5001);

        const linkTokenFunction = httpsCallable(functions, 'createNewLinkToken');
        linkTokenFunction()
            .then((result) => {
                console.log("getting a new link token!")
                console.log(result)
            })
    };


    useEffect(() => {
        const app = initializeApp(firebaseConfig);

        // this must be called before we use any firebase resources to activate app check
        initializeAppCheck(app, {
            // yeah this gets fucked after google phases out 3rd party cookies. ignoring for now
            provider: new ReCaptchaEnterpriseProvider(
                process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY!,
            ),
            isTokenAutoRefreshEnabled: true, // Set to true to allow auto-refresh.
        });

        const unsubscribe = onAuthStateChanged(getAuth(), (user) => {
            setUser(user);
            if (user != null) {
                generateToken(app)
            }
        });

        setFirebaseInitialized(true);
        console.log("Firebase initialized");
        return () => unsubscribe(); // Clean up the subscription when component unmounts
    }, []);

    const handleLogout = () => {
        if (!firebaseInitialized || !user) {
            return;
        }

        getAuth()
            .signOut()
            .then(() => {
                console.log("User signed out");
            })
            .catch((error) => {
                console.error(error);
            });
    };

    // Render Plaid Link component if linkToken is available and user is signed in
    const renderPlaidLink = () => {
        if (linkToken && user) {
            const onSuccess = (public_token: string, metadata: any) => {
                // send public_token to server
                const response = fetch('/api/set_access_token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({public_token}),
                });
                // Handle response ...
            };

            const config = {
                token: linkToken,
                onSuccess,
            };

            // eslint-disable-next-line react-hooks/rules-of-hooks
            const {open, ready} = usePlaidLink(config);

            return (
                <button onClick={() => open()} disabled={!ready}>
                    Link account
                </button>
            );
        }
        return null;
    }

    return (
        <div>
            <div className="navbar bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 sticky top-0">
                <div className="flex-1">
                    <a className="btn btn-ghost text-xl">FIFI</a>
                </div>
                <div className="flex-none">
                    <div className="dropdown dropdown-end">
                        <div
                            tabIndex={0}
                            role="button"
                            className="btn btn-ghost btn-circle avatar"
                        >
                            <div className="w-10 rounded-full">
                                <img
                                    alt="Avatar"
                                    src={
                                        user
                                            ? user.photoURL? user.photoURL : "https://daisyui.com/images/stock/photo-1534528741775-53994a69daeb.jpg"
                                            : "https://daisyui.com/images/stock/photo-1534528741775-53994a69daeb.jpg"
                                    }
                                />{" "}
                                {/* Render user's photoURL */}
                            </div>
                        </div>
                        <ul
                            tabIndex={0}
                            className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52"
                        >
                            <li>
                                <a className="justify-between">
                                    Profile
                                    <span className="badge">New</span>
                                </a>
                            </li>
                            <li>
                                <a>Settings</a>
                            </li>
                            <li>
                                <a onClick={() => handleLogout()}>Logout</a>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
            <div className={"bg-base-100 h-screen grid place-content-center"}>
                {firebaseInitialized ? ( // Render component based on firebaseInitialized state
                    user ? ( // If user is signed in, render welcome message
                        renderPlaidLink()
                    ) : (
                        // If user is not signed in, render FirebaseUI component
                        <FirebaseUIReact
                            // @ts-ignore
                            auth={getAuth()}
                            config={{
                                continueUrl: "localhost:3000",
                                signInSuccessUrl: "/",
                                signInOptions: [
                                    {
                                        provider: "google.com",
                                        customParameters: {prompt: "select_account"},
                                    },
                                ],
                                callbacks: {
                                    signInSuccessWithAuthResult: (
                                        userCredential: any,
                                    ) => {
                                        console.log("Sign in success");
                                        // console.log("is the user a new user?", userCredential);
                                        // console.log("is the user a new user?", userCredential.additionalUserInfo.isNewUser);
                                        return true;
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
