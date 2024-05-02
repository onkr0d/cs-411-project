// APP COMPONENT
// Upon rendering of App component, make a request to create and
// obtain a link token to be used in the Link component
import React, {Dispatch, SetStateAction, useEffect, useState} from 'react';
import {usePlaidLink} from 'react-plaid-link';
import {connectFunctionsEmulator, getFunctions, httpsCallable} from "firebase/functions";
import {getApp} from "firebase/app";
import {collection, DocumentChange, getFirestore, onSnapshot} from "@firebase/firestore";
import {getAuth} from "firebase/auth";

interface LinkComponentProps {
    setIsFlowDone: Dispatch<SetStateAction<boolean>>;
}

const LinkComponent = (props: LinkComponentProps) => {
    const [linkToken, setLinkToken] = useState(null);
    const [hasAccessToken, setHasAccessToken] = useState(false);
    const generateToken = async () => {
        const functions = getFunctions(getApp());
        if (process.env.NODE_ENV === 'development') {
            connectFunctionsEmulator(functions, 'localhost', 5001);
        }

        const createNewLinkToken = httpsCallable(functions, 'createNewLinkToken');
        console.log("Requesting link token")
        createNewLinkToken()
            .then((result: any) => {
                console.log("Received link token")
                setLinkToken(result.data.linkToken.link_token);
            })
    };
    const checkToken = async () => {
        const functions = getFunctions(getApp());
        if (process.env.NODE_ENV === 'development') {
            connectFunctionsEmulator(functions, 'localhost', 5001);
        }
        const hasToken = httpsCallable(functions, 'hasToken');
        hasToken()
            .then((result: any) => {
                if (result.data) {
                    setHasAccessToken(result.data.result)
                }
            })

    }

    useEffect(() => {
        checkToken();
        generateToken();
    }, [props]);
    return linkToken != null ? <Link linkToken={linkToken} setIsFlowDone={props.setIsFlowDone} hasAccessToken={hasAccessToken}/> : <></>;
};

// LINK COMPONENT
// Use Plaid Link and pass link token and onSuccess function
// in configuration to initialize Plaid Link
interface LinkProps {
    linkToken: string | null;
    setIsFlowDone: Dispatch<SetStateAction<boolean>>;
    hasAccessToken: boolean;
}

const Link: React.FC<LinkProps> = (props: LinkProps) => {
    const [accessTokenFound, setAccessTokenFound] = useState(false);

    const callBackend = async (functionName: string, data: any = {}) => {
        const functions = getFunctions(getApp());
        if (process.env.NODE_ENV === 'development') {
            connectFunctionsEmulator(functions, 'localhost', 5001);
        }

        const callableFunction = httpsCallable(functions, functionName);
        try {
            const result = await callableFunction(data);
            console.log(`Result from ${functionName}:`, result.data);
        } catch (error) {
            console.error(`Error calling ${functionName}:`, error);
        }
    };

    const onSuccess = React.useCallback((publicToken: string, metadata: any) => {
        // send public_token to server
        const functions = getFunctions(getApp());
        // yeah nice one google - manually use emulator since it doesn't automatically detect it
        if (process.env.NODE_ENV === 'development') {
            connectFunctionsEmulator(functions, 'localhost', 5001);
        }

        const saveLinkToken = httpsCallable(functions, 'saveAccessToken');
        console.log("Sending access token")
        saveLinkToken({publicToken})
            .then((result: any) => {
                console.log("Sent public token!")
                console.log(result.data)
                setAccessTokenFound(true);
                props.setIsFlowDone(true);
                console.log("set public token!")
            })
    }, [props]);
    const config: Parameters<typeof usePlaidLink>[0] = {
        token: props.linkToken!,
        onSuccess,
    };
    const {open, ready} = usePlaidLink(config);

    // get our own user id:
    const userUid = getAuth().currentUser?.uid;
    const messagesRef = collection(getFirestore(), `users/${userUid}/messages`);
    const unsubscribe = onSnapshot(messagesRef, snapshot => {
        snapshot.docChanges().forEach((change: DocumentChange) => {
            if (change.type === 'added') {
                console.log('New message:', change.doc.id, change.doc.data());
            }
            if (change.type === 'modified') {
                console.log('Modified message:', change.doc.id, change.doc.data());
            }
            if (change.type === 'removed') {
                console.log('Removed message:', change.doc.id);
            }
        });
    }, error => {
        console.error('Error fetching snapshot:', error);
    }, 1000);

    if (props.hasAccessToken) {
        return (
            <div className="flex flex-col">
                <button className="btn btn-primary mb-2" onClick={() => callBackend('getIdentity')}>Get Identity
                </button>
                <button className="btn btn-primary mb-2" onClick={() => callBackend('getAccountBal')}>Get Account
                    Balance
                </button>
                <button className="btn btn-primary mb-2" onClick={() => callBackend('getTransactions')}>Get
                    Transactions
                </button>
                <button className="btn btn-primary mb-2" onClick={() => callBackend('syncTransactions')}>Sync
                    Transactions
                </button>
                <button className="btn btn-primary mb-2" onClick={() => callBackend('getCategories')}>Get Categories
                </button>
                <button className="btn btn-primary mb-2" onClick={() => callBackend('hasToken')}>Has Token</button>
                <button className={"btn btn-primary mb-2"} onClick={() => callBackend('better')}>Better</button>
                <button className={"btn btn-primary mb-2"}
                        onClick={() => callBackend('chatWithGPT', {prompt: "Hello, how are you?"})}>chat with GPT
                </button>
            </div>
        );
    }
    return (
        <button
            onClick={() => open()}
            disabled={!ready}
            className="btn btn-primary btn-active:bg-blue-600 hover:bg-blue-500"
        >
            Link account
        </button>
    );
};
export default LinkComponent;