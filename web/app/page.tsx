"use client";
import {useEffect, useState} from "react";
import {getAuth, onAuthStateChanged, User} from "firebase/auth";
import SignIn from "@/app/components/signin";
import LinkComponent from "@/app/components/link";
import {getFirebaseApp} from "@/app/components/firebase/firebaseapp";
import {initializeAppCheck, ReCaptchaEnterpriseProvider} from "firebase/app-check";
import Chat from "@/app/components/chat";
import {usePersistentState} from "react-persistent-state";

export default function Home() {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const fifiApp = getFirebaseApp()
    const [isPlaidFlowDone, setIsPlaidFlowDone] =
        usePersistentState(false, {storageKey: 'plaidFlowDone'});

    useEffect(() => {
        initializeAppCheck(fifiApp, {
            provider: new ReCaptchaEnterpriseProvider(
                process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY!
            ),
            isTokenAutoRefreshEnabled: true,
        });

        const unsubscribe = onAuthStateChanged(getAuth(), (user) => {
            setUser(user);
            setIsLoading(false)
        });

        return () => unsubscribe();
    }, [fifiApp, isPlaidFlowDone]);

    const handleLogout = () => {
        if (user) {
            getAuth().signOut();
            setIsPlaidFlowDone(false);
        }
    };

    console.log('plaid flow complete?', isPlaidFlowDone)

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
                {isLoading ? (
                    <span className="loading loading-ring loading-lg"></span>
                ) : (
                    user ? (
                        isPlaidFlowDone ?
                            <Chat/> :
                            <LinkComponent setIsFlowDone={setIsPlaidFlowDone}/>
                    ) : (
                        <div>
                            <div className="h-[10vh] sm:h-[15vh] flex flex-col justify-between items-center">
                                <h1 className="text-2xl sm:text-4xl">Welcome to{" "}
                                    <span
                                        className="text-2xl sm:text-4xl font-extrabold bg-clip-text text-transparent bg-[linear-gradient(to_right,theme(colors.green.300),theme(colors.green.100),theme(colors.sky.400),theme(colors.yellow.200),theme(colors.sky.400),theme(colors.green.100),theme(colors.green.300))] bg-[length:200%_auto] animate-gradient">FiFi</span>
                                    <span className="text-2xl sm:text-4xl">!</span>
                                </h1>
                                <p className="text-sm sm:text-xl text-center">Log in to get started w/quick + easy
                                    financial advice:</p>
                            </div>
                            <div className="w-full">
                                <div className="w-full sm:w-1/2 mx-auto">
                                    <SignIn auth={getAuth()}/>
                                </div>
                            </div>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
