"use client";
import {useEffect, useState} from "react";
import {getAuth, onAuthStateChanged, User} from "firebase/auth";
import SignIn from "@/app/components/signin";
import LinkComponent from "@/app/components/link";
import {getFirebaseApp} from "@/app/components/firebase/firebaseapp";
import {getApps} from "firebase/app";
import {initializeAppCheck, ReCaptchaEnterpriseProvider} from "firebase/app-check";

export default function Home() {
    const [user, setUser] = useState<User | null>(null);
    const fifiApp = getFirebaseApp()

    const isFirebaseInitialized = () => {
        return getApps().length > 0;
    }

    useEffect(() => {
        initializeAppCheck(fifiApp, {
            provider: new ReCaptchaEnterpriseProvider(
                process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY!
            ),
            isTokenAutoRefreshEnabled: true,
        });

        const unsubscribe = onAuthStateChanged(getAuth(), (user) => {
            setUser(user);
        });

        return () => unsubscribe();
    }, [fifiApp]);

    const handleLogout = () => {
        if (user) {
            getAuth().signOut();
        }
    };

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
                                            ? user.photoURL ? user.photoURL : "https://picsum.photos/200"
                                            : "https://daisyui.com/images/stock/photo-1534528741775-53994a69daeb.jpg"
                                    }
                                />{" "}
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
                {isFirebaseInitialized() ? (
                    user ? (
                        <LinkComponent/>
                    ) : (
                        <SignIn/>
                    )
                ) : (
                    <span className="loading loading-ring loading-lg"></span>
                )}
            </div>
        </div>
    );
}
