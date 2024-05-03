import React from "react";

interface MessageProps {
    prompt: string,
    response?: string,
    id: string,
    parentMessageId?: string,
}

const Message = (props: MessageProps) => {
    const responseLines = (props.response || '').split('\n').map((line, index) =>
    <React.Fragment key={index}>
        {line}
        <br/>
    </React.Fragment>
);

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