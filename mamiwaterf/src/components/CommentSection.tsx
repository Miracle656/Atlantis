import { useState } from 'react';
import type { Comment } from '../types';
import { ArrowBigUp, Reply, MoreHorizontal } from 'lucide-react';
import DisplayName from './DisplayName';

interface CommentSectionProps {
    comments: Comment[];
    onAddComment: (content: string, parentId?: string) => Promise<void> | void;
}

export default function CommentSection({ comments, onAddComment }: CommentSectionProps) {
    const [newComment, setNewComment] = useState('');
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newComment.trim() && !isSubmitting) {
            setIsSubmitting(true);
            try {
                await onAddComment(newComment);
                setNewComment('');
            } catch (error) {
                console.error("Failed to post comment", error);
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handleReplySubmit = async (e: React.FormEvent, parentId: string) => {
        e.preventDefault();
        if (replyContent.trim() && !isSubmitting) {
            setIsSubmitting(true);
            try {
                await onAddComment(replyContent, parentId);
                setReplyContent('');
                setReplyingTo(null);
            } catch (error) {
                console.error("Failed to post reply", error);
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const CommentItem = ({ comment, depth = 0 }: { comment: Comment; depth?: number }) => (
        <div className={`flex gap-4 ${depth > 0 ? 'ml-8 md:ml-12 border-l-4 border-neo-black pl-4' : ''}`}>
            <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-neo-white border-2 border-neo-black flex items-center justify-center text-lg shadow-neo-sm">
                    {comment.userAvatar}
                </div>
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <DisplayName name={comment.userName} className="font-bold text-neo-black uppercase" />
                    {comment.isMaker && (
                        <span className="px-1.5 py-0.5 bg-neo-pink text-white border-2 border-neo-black text-[10px] font-black uppercase tracking-wider shadow-neo-sm">
                            Maker
                        </span>
                    )}
                    <span className="text-xs font-bold text-gray-500 uppercase">• {new Date(comment.date).toLocaleDateString()}</span>
                </div>

                <p className="text-neo-black font-medium text-sm mb-3 leading-relaxed bg-white p-3 border-2 border-neo-black shadow-neo-sm">{comment.content}</p>

                <div className="flex items-center gap-4 text-sm font-bold text-gray-500 uppercase">
                    <button className="flex items-center gap-1 hover:text-neo-green transition-colors group">
                        <ArrowBigUp className="w-5 h-5 text-neo-black group-hover:-translate-y-0.5 transition-transform" />
                        <span className="text-neo-black">{comment.upvotes}</span>
                    </button>

                    <button
                        onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                        className="flex items-center gap-1 hover:text-neo-blue transition-colors"
                        disabled={isSubmitting}
                    >
                        <Reply className="w-4 h-4" />
                        <span>Reply</span>
                    </button>

                    <button className="hover:text-neo-black transition-colors ml-auto">
                        <MoreHorizontal className="w-4 h-4" />
                    </button>
                </div>

                {replyingTo === comment.id && (
                    <form onSubmit={(e) => handleReplySubmit(e, comment.id)} className="mt-4 flex gap-3">
                        <input
                            type="text"
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="Write a reply..."
                            className="flex-1 bg-white border-2 border-neo-black px-4 py-2 text-sm text-neo-black focus:outline-none focus:shadow-neo transition-all font-medium placeholder-gray-500 disabled:opacity-50"
                            autoFocus
                            disabled={isSubmitting}
                        />
                        <button
                            type="submit"
                            disabled={!replyContent.trim() || isSubmitting}
                            className="px-4 py-2 bg-neo-black text-white border-2 border-neo-black text-sm font-bold uppercase hover:bg-neo-white hover:text-neo-black hover:shadow-neo transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px]"
                        >
                            {isSubmitting ? '...' : 'Reply'}
                        </button>
                    </form>
                )}

                {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-6 space-y-6">
                        {comment.replies.map(reply => (
                            <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black uppercase tracking-tighter text-neo-black flex items-center gap-3">
                    Discussion
                    <span className="text-sm font-bold text-white bg-neo-black px-2 py-1 border-2 border-neo-black shadow-neo-sm">
                        {comments.length}
                    </span>
                </h2>
            </div>

            <form onSubmit={handleSubmit} className="neo-box p-4 bg-white">
                <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="What do you think of this dApp?"
                    className="w-full bg-neo-white border-2 border-neo-black p-3 text-neo-black placeholder-gray-500 focus:outline-none focus:shadow-neo resize-none min-h-[80px] font-medium disabled:opacity-50"
                    disabled={isSubmitting}
                />
                <div className="flex items-center justify-between mt-4 border-t-2 border-neo-black pt-4">
                    <div className="text-xs font-bold uppercase text-gray-500">Markdown supported</div>
                    <button
                        type="submit"
                        disabled={!newComment.trim() || isSubmitting}
                        className="px-6 py-2 bg-neo-green text-neo-black border-2 border-neo-black text-sm font-black uppercase shadow-neo-sm hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-neo disabled:opacity-50 disabled:cursor-not-allowed transition-all min-w-[140px]"
                    >
                        {isSubmitting ? 'Posting...' : 'Post Comment'}
                    </button>
                </div>
            </form>

            <div className="space-y-8">
                {comments.map(comment => (
                    <CommentItem key={comment.id} comment={comment} />
                ))}
            </div>
        </div>
    );
}
