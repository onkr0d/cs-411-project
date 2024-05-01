// APP COMPONENT
// Upon rendering of App component, make a request to create and
// obtain a link token to be used in the Link component
import React, {useEffect, useState} from 'react';
import {usePlaidLink} from 'react-plaid-link';
import {connectFunctionsEmulator, getFunctions, httpsCallable} from "firebase/functions";
import {getApp} from "firebase/app";

const LinkComponent = () => {
    const [linkToken, setLinkToken] = useState(null);
    const [hasAccessToken, setHasAccessToken] = useState(false);
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
    const checkToken = async () => {
        const functions = getFunctions(getApp());
        // yeah nice one google - manually use emulator since it doesn't automatically detect it
        if (process.env.NODE_ENV === 'development') {
            connectFunctionsEmulator(functions, 'localhost', 5001);
        }

        const hasToken = httpsCallable(functions, 'hasToken');
        console.log("Checking link token")
        hasToken()
            .then((result: any) => {
                console.log("Checked link token")
                if (result.data) {
                    setHasAccessToken(result.data.result)
                }
            })

    }
    useEffect(() => {
        checkToken();
        generateToken();
    }, []);
    return linkToken != null ? <Link linkToken={linkToken} hasAccessToken={hasAccessToken}/> : <></>;
};

// LINK COMPONENT
// Use Plaid Link and pass link token and onSuccess function
// in configuration to initialize Plaid Link
interface LinkProps {
    linkToken: string | null;
    hasAccessToken: boolean;
}

const Link: React.FC<LinkProps> = (props: LinkProps) => {
    const [accessTokenFound, setAccessTokenFound] = useState(false);

    useEffect(() => {
        setAccessTokenFound(props.hasAccessToken);

    }, [props.hasAccessToken]);

    const callPlaidApi = async (functionName: string, data: any = {}) => {
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
            })


    }, []);
    const config: Parameters<typeof usePlaidLink>[0] = {
        token: props.linkToken!,
        onSuccess,
    };
    const {open, ready} = usePlaidLink(config);

    if (accessTokenFound) {
        return (
            <div className="flex flex-col">
                <button className="btn btn-primary mb-2" onClick={() => callPlaidApi('getIdentity')}>Get Identity
                </button>
                <button className="btn btn-primary mb-2" onClick={() => callPlaidApi('getAccountBal')}>Get Account
                    Balance
                </button>
                <button className="btn btn-primary mb-2" onClick={() => callPlaidApi('getTransactions')}>Get
                    Transactions
                </button>
                <button className="btn btn-primary mb-2" onClick={() => callPlaidApi('syncTransactions')}>Sync
                    Transactions
                </button>
                <button className="btn btn-primary mb-2" onClick={() => callPlaidApi('getCategories')}>Get Categories
                </button>
                <button className="btn btn-primary mb-2" onClick={() => callPlaidApi('hasToken')}>Has Token</button>
            </div>
        );
    }
    return (
        <button onClick={() => open()} disabled={!ready}>
            Link account
        </button>
    );
};
export default LinkComponent;