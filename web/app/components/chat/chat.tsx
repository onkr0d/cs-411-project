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
        const functions = getFunctions(getApp());
        if (process.env.NODE_ENV === 'development') {
            connectFunctionsEmulator(functions, 'localhost', 5001);
        }
        setChattable(false);
        let incompleteMessage: MessageProps = {
            prompt: inputValue,
            id: "-69", // we don't know this value yet
        }

        console.log("incomplete message is", incompleteMessage);
        setInputValue('');
        chatWithGPT(incompleteMessage, messages[messages.length - 1]);
    }

    // incomplete means that the message has not been responded to yet.
    // we have to return a full response.
    const chatWithGPT = async (newMessage: MessageProps, lastMessage: MessageProps) => {
        const functions = getFunctions(getApp());
        if (process.env.NODE_ENV === 'development') {
            connectFunctionsEmulator(functions, 'localhost', 5001);
        }

        const chat = httpsCallable(functions, "chatWithGPT");

        console.log("i was given", newMessage, "and the last message was", lastMessage);
        try {
            let data = {
                prompt: newMessage.prompt,
                parentMessageId: lastMessage?.parentMessageId,
            }
            console.log("i just sent the data", data)
            const result: HttpsCallableResult = await chat({
                prompt: newMessage.prompt,
                parentMessageId: lastMessage?.parentMessageId,
            });
            console.log(`Result from chatting:`, result.data.id);
            // we just found out our own id, but do we really care?
            return result.data.id;
        } catch (error) {
            console.error(`Error chatting with GPT:`, error);
        }
    }

    useEffect(() => {
        const q = query(collection(getFirestore(), `users/${getAuth().currentUser?.uid}/messages`), where("status.state", "==", "COMPLETED"));
        const messageListener = onSnapshot(q, (snapshot: any) => {
            const newMessages: MessageProps[] = [];

            snapshot.docChanges().forEach((change: any) => {
                const messageData = change.doc.data() as MessageProps;
                const messageId = messageData.id;
                console.log("message Data is", messageData);
                console.log("messages are", messages);
                // chat is this real?
                if (!messages.some(message => message.id === messageId)) {
                    newMessages.push(messageData);
                }
            });

            console.log("New messages:", newMessages, "but old messages are size", messages.length);
            setMessages(prevMessages => [...prevMessages, ...newMessages]);
            setChattable(true);
        });

        return () => messageListener();
    }, []);


    return (
        // FIXME: This is too wide and it looks really really really ugly.
        <div className="h-screen w-screen flex flex-col p-5">
            {messages
                .slice() // Create a copy of the array
                .sort((a, b) => {
                    // Convert date strings to Date objects and compare
                    const dateA = a.status?.created_at ? new Date(a.status.created_at.seconds * 1000 + a.status.created_at.nanoseconds / 1000000) : new Date('');
                    const dateB = b.status?.created_at ? new Date(b.status.created_at.seconds * 1000 + b.status.created_at.nanoseconds / 1000000) : new Date('');
                    // console.log("dateA is", dateA, "dateB is", dateB, "diff is", dateA.getTime() - dateB.getTime());
                    return dateA.getTime() - dateB.getTime();
                })
                .map((message, index) => (
                    <Message key={index} {...message} />
                ))
            }
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