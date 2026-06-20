import { cn } from "@/lib/utils";
import { Avatar } from "../ui/avatar";

type MessageListProps = {
    data: Doctor[],
    isActive: string;
    onClick: (id: string) => void;
}
const MessageList = ({ data, isActive, onClick }: MessageListProps) => {
    return (
        <div>
            {data.map(msg => {
                return <button aria-current={isActive ? 'true' : 'false'}
                    onClick={() => onClick(msg.id)}
                    key={msg.id}
                    className={cn(
                        'w-full text-left px-4 py-3.5 flex items-start gap-3 transition-all duration-150 cursor-pointer',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500',
                        isActive
                            ? 'bg-blue-50 border-r-2 border-r-blue-600'
                            : 'hover:bg-slate-50 border-r-2 border-r-transparent',
                    )}>
                    <Avatar></Avatar>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                            <span className={cn('text-sm truncate', isActive ? 'font-semibold text-blue-700' : 'font-semibold text-slate-800')}>
                                {msg.name}
                            </span>
                            <span className="text-[11px] text-slate-400 shrink-0">{doctor.lastMessageTime}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                            <p className="text-xs text-slate-500 truncate leading-snug">{doctor.lastMessage}</p>
                            {msg.unread > 0 && (
                                <span className="shrink-0 text-[10px] font-bold bg-blue-600 text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-sm shadow-blue-300/40">
                                    {msg.unread}
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{doctor.specialty}</p>
                    </div>
                </button>
            })}
        </div>
    )
}

export default MessageList