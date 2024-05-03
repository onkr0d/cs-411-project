import {useEffect, useState} from 'react';
import {connectFunctionsEmulator, getFunctions, httpsCallable} from "firebase/functions";
import {getApp} from "firebase/app";
import '@/app/globals.css';
import {collection, getFirestore, onSnapshot, query, where} from "@firebase/firestore";
import {getAuth} from "firebase/auth";
import Message, {MessageProps} from "@/app/components/chat/message";
import {HttpsCallableResult} from "@firebase/functions-types";

const Chat = () => {
    const [messages, setMessages] = useState<MessageProps[]>([
        // {prompt: 'It\'s over Anakin, \n I have the high ground.', id: '-1', parentMessageId: '-1'},
    ]);

    const [inputValue, setInputValue] = useState<string>('');
    const [chattable, setChattable] = useState<boolean>(true);

    const handleChange = (event: any) => {
        setInputValue(event.target.value);
    }

    const handleSubmit = (event: any) => {
        event.preventDefault();
        // setMessages(prevMessages => [...prevMessages, inputValue]);
        const functions = getFunctions(getApp());
        if (process.env.NODE_ENV === 'development') {
            connectFunctionsEmulator(functions, 'localhost', 5001);
        }
        setChattable(false);
        let incompleteMessage = {
            prompt: inputValue,
            id: "-69",
            parentMessageId: messages.length > 0 ? messages[messages.length - 1].id : '-1',
        }
        setInputValue('');
        chatWithGPT(incompleteMessage);
    }

    // incomplete means that the message has not been responded to yet.
    // we have to return a full response.
    const chatWithGPT = async (incompleteMessage: MessageProps) => {
        const functions = getFunctions(getApp());
        if (process.env.NODE_ENV === 'development') {
            connectFunctionsEmulator(functions, 'localhost', 5001);
        }

        const chat = httpsCallable(functions, "chatWithGPT");

        console.log("i was given", incompleteMessage);
        try {
            const result: HttpsCallableResult = await chat({
                prompt: incompleteMessage.prompt,
                parentMessageId: incompleteMessage.parentMessageId,
            });
            console.log(`Result from chatting:`, result.data.id);
            return {id: result.data.id, parentMessageId: result.data.parentMessageId};
        } catch (error) {
            console.error(`Error chatting with GPT:`, error);
        }
    }

    useEffect(() => {
        console.log('gyatt')
        // listen only to messages that have been completed
        const q = query(collection(getFirestore(),
            `users/${getAuth().currentUser?.uid}/messages`), where("status.state", "==", "COMPLETED"));
        const messageListener = onSnapshot(q, (snapshot: any) => {
            // get the changes that have COMPLETED only
            console.log('changes are', snapshot.docChanges());
            // snapshot.docChanges().forEach((change: any) => {
            //    setMessages(prevMessages => [...prevMessages, change.doc.data() as MessageProps]);
            // });
            setMessages(prevMessages => [...prevMessages, ...snapshot.docChanges().map((change: any) => change.doc.data() as MessageProps)]);
            setChattable(true)
        });
    }, []);

    return (
        <div className="h-screen w-screen flex flex-col p-5">
            {messages.map((message, index) => (
                <Message key={index} {...message} />
            ))}
            <form onSubmit={handleSubmit} className="mx-auto mt-20 relative">
                <div>
                    <input
                        type="text"
                        placeholder="Type here"
                        className={`input w-screen max-w-xs input-bordered ${chattable ? '' : 'rainbow'}`}
                        value={inputValue}
                        onChange={handleChange}
                        disabled={!chattable}
                    />
                </div>
            </form>
        </div>
    );
}

export default Chat;