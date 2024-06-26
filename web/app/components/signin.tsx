import {Auth} from "firebase/auth";
import dynamic from "next/dynamic";

// @ts-ignore
const FirebaseUIReact = dynamic(() => import("firebaseui-react"), {
    ssr: false,
});

const SignIn = (props: { auth: Auth }) => (
    <FirebaseUIReact
        // @ts-ignore
        auth={props.auth}
        config={{
            continueUrl: "localhost:3000",
            signInSuccessUrl: "/",
            signInOptions: [
                {
                    provider: "google.com",
                    customParameters: {prompt: "select_account"},
                },
                "github.com",
                // "facebook.com", yo why does the facebook logo look so ugly.
                // because it's still a square >:(. need to check proj reqs to see if
                // i can get away without using ugly facebook
                "apple.com",
            ],
            callbacks: {
                signInSuccessWithAuthResult: (
                    userCredential: any,
                ) => {
                    return true;
                },
                signInFailure: function (error: any) {
                    console.log("Sign in failure");
                    console.log(error);
                },
            },
        }}
    />
);

export default SignIn;