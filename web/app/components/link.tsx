// APP COMPONENT
// Upon rendering of App component, make a request to create and
// obtain a link token to be used in the Link component
import React, {Dispatch, SetStateAction, useEffect, useState} from 'react';
import {usePlaidLink} from 'react-plaid-link';
import {connectFunctionsEmulator, getFunctions, httpsCallable} from "firebase/functions";
import {getApp} from "firebase/app";

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
                    console.log("token is:", result.data.result)
                    setHasAccessToken(result.data.result)
                    props.setIsFlowDone(result.data.result)
                }
            })

    }

    useEffect(() => {
        checkToken();
        generateToken();
    }, [props]);
    return linkToken != null ?
        <Link linkToken={linkToken} setIsFlowDone={props.setIsFlowDone} hasAccessToken={hasAccessToken}/> : <></>;
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
    const [hide, setHide] = useState(false)

    const onSuccess = React.useCallback((publicToken: string, metadata: any) => {
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
                props.setIsFlowDone(true);
                console.log("set public token!")
            })
    }, [props]);

    const config: Parameters<typeof usePlaidLink>[0] = {
        token: props.linkToken!,
        onSuccess,
        onExit: () => {
            setHide(false)
        }
    };

    const {open, ready} = usePlaidLink(config);

    return (
        hide ? null : (
            <button
                onClick={() => {
                    open();
                    setHide(true);
                }}
                disabled={!ready}
                className="btn btn-primary btn-active:bg-blue-600 hover:bg-blue-500"
            >
                Link account
            </button>
        )
    );
};
export default LinkComponent;