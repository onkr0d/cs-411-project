// APP COMPONENT
// Upon rendering of App component, make a request to create and
// obtain a link token to be used in the Link component
import React, {useEffect, useState} from 'react';
import {usePlaidLink} from 'react-plaid-link';
import {connectFunctionsEmulator, getFunctions, httpsCallable} from "firebase/functions";
import {getApp} from "firebase/app";

const LinkComponent = () => {
    const [linkToken, setLinkToken] = useState(null);
    const generateToken = async () => {
        const functions = getFunctions(getApp());
        // yeah nice one google - manually use emulator since it doesn't automatically detect it
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
    useEffect(() => {
        generateToken();
    }, []);
    return linkToken != null ? <Link linkToken={linkToken}/> : <></>;
};

// LINK COMPONENT
// Use Plaid Link and pass link token and onSuccess function
// in configuration to initialize Plaid Link
interface LinkProps {
    linkToken: string | null;
}

const Link: React.FC<LinkProps> = (props: LinkProps) => {
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
            })


        // Handle response ...
    }, []);
    const config: Parameters<typeof usePlaidLink>[0] = {
        token: props.linkToken!,
        onSuccess,
    };
    const {open, ready} = usePlaidLink(config);
    return (
        <button onClick={() => open()} disabled={!ready}>
            Link account
        </button>
    );
};
export default LinkComponent;