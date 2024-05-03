import React from "react";

interface MessageProps {
    prompt: string,
    response?: string,
    id: string,
    parentMessageId?: string,
    status?: {
        created_at: {
            nanoseconds: number,
            seconds: number,
        },
        updated_at: {
            nanoseconds: number,
            seconds: number,
        },
        state: string,
    }
}

const Message = (props: MessageProps) => {
    // response lines need to render \n, chatgpt is funny and
    // sometimes decides to add a \n at the end, so get rid of that too 🤠
    const responseLines = (props.response || '').trimEnd().split('\n').map((line, index) =>
        <React.Fragment key={index}>
            {line}
            <br/>
        </React.Fragment>);

    return (
        <div>
            <div className={"chat chat-end"}>
                <div className="chat-bubble">{props.prompt}</div>
            </div>
            <div className={"chat chat-start"}>
                <div className="chat-bubble">{responseLines}</div>
            </div>
        </div>
    );
}
export default Message;
export type {MessageProps};