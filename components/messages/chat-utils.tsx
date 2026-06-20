const TypingIndicator = () => (
    <div className="flex items-end gap-2" >
        <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm flex items-center gap-1" >
            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
    </div>
);

const AttachIcon = () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" >
        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
);


const EmptyMessagesIcon = () => (
    <svg className="w-16 h-16 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
);
const EmptyChatState = () => (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8 text-center" >
        <div className="w-24 h-24 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center" >
            <EmptyMessagesIcon />
        </div>
        < div >
            <h3 className="text-base font-semibold text-slate-700" > Your messages </h3>
            < p className="text-sm text-slate-400 mt-1 max-w-[260px] leading-relaxed" >
                Select a conversation with one of your doctors to get started.
            </p>
        </div>
    </div>
);

export { AttachIcon, TypingIndicator, EmptyChatState, EmptyMessagesIcon }