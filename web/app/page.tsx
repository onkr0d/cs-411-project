"use client";
import {useEffect, useState} from "react";
import {getAuth, onAuthStateChanged, User} from "firebase/auth";
import SignIn from "@/app/components/signin";
import LinkComponent from "@/app/components/link";
import {getFirebaseApp} from "@/app/components/firebase/firebaseapp";
import {initializeAppCheck, ReCaptchaEnterpriseProvider} from "firebase/app-check";
import Chat from "@/app/components/chat/chat";
import {usePersistentState} from "react-persistent-state";
import {connectFunctionsEmulator, getFunctions, httpsCallable} from "firebase/functions";
import {getApp} from "firebase/app";

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
            if (!user) {
                setIsPlaidFlowDone(false);
            }
            setIsLoading(false)
        });

        return () => unsubscribe();
    }, [fifiApp, isPlaidFlowDone]);

    const handleLogout = async () => {
        if (user) {
            await getAuth().signOut();
            setIsPlaidFlowDone(false);
            // plaid link component doesn't support reuse,
            // reload to reset the component
            window.location.reload();
        }
    };

    const deleteChat = async () => {
        const functions = getFunctions(getApp());
        if (process.env.NODE_ENV === 'development') {
            connectFunctionsEmulator(functions, 'localhost', 5001);
        }

        const deleteChat = httpsCallable(functions, "deleteChat");
        try {
            const result = await deleteChat();
            console.log(`Result from deleteChat:`, result.data);
        } catch (error) {
            console.error(`Error calling deleteChat:`, error);
        }
        window.location.reload();
    }

    return (
        <div className="h-full">
            <div className="navbar bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 sticky top-0 z-10">
                <div className="flex-1">
                    <a className="btn btn-ghost text-xl" onClick={() => window.location.reload()}>FIFI</a></div>
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
                                    src={user?.photoURL || "https://picsum.photos/200"}
                                />{" "}
                            </div>
                        </div>
                        {user && <ul
                            tabIndex={0}
                            className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52"
                        >
                            <li className="">
                                <a>User: {user?.displayName}</a>
                            </li>
                            <li className="py-2">
                                <a className="hover:bg-orange-400" onClick={() => handleLogout()}>Logout</a>
                            </li>
                            {isPlaidFlowDone && <li className="">
                                <a className="hover:bg-red-500" onClick={() => deleteChat()}>Delete chat history</a>
                            </li>}
                        </ul>}
                    </div>
                </div>
            </div>
            <div className="bg-base-100 h-full w-full grid place-content-center">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-[80vh]">
                        <span className="loading loading-ring loading-lg"></span>
                    </div>
                ) : (
                    user ? (
                        isPlaidFlowDone ?
                            <Chat/> :
                            // suboptimal because we're specifying style for each component
                            <div className="flex flex-col items-center justify-center h-[80vh]">
                                <LinkComponent setIsFlowDone={setIsPlaidFlowDone}/>
                            </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[80vh]">
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
