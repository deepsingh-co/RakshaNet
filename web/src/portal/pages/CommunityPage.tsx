import React, { useState } from 'react';
import {
  Users,
  MessageSquare,
  Sparkles,
  Calendar,
  ThumbsUp,
  Heart,
  Send,
  Plus,
  Share2,
  CheckCircle,
  X,
  Star,
  MapPin,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { usePortalStore } from '../store/portalStore';
import { MOCK_MENTORS } from '../data/mockData';
import { ForumPost } from '../types';

export function CommunityPage() {
  const forumPosts = usePortalStore((s) => s.forumPosts);
  const events = usePortalStore((s) => s.events);
  const addForumPost = usePortalStore((s) => s.addForumPost);
  const toggleUpvotePost = usePortalStore((s) => s.toggleUpvotePost);
  const addForumComment = usePortalStore((s) => s.addForumComment);
  const toggleEventRegistration = usePortalStore((s) => s.toggleEventRegistration);

  const [activeTab, setActiveTab] = useState<'forum' | 'mentorship' | 'events' | 'stories'>('forum');

  // New post modal state
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<ForumPost['category']>('Career advice');
  const [newContent, setNewContent] = useState('');

  // Comment input per post
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  // Mentorship request modal
  const [selectedMentor, setSelectedMentor] = useState<any>(null);
  const [mentorshipNote, setMentorshipNote] = useState('');
  const [mentorshipSent, setMentorshipSent] = useState(false);

  // Success stories hearts state
  const [storyHearts, setStoryHearts] = useState<Record<string, number>>({
    'story-1': 142,
    'story-2': 98,
  });

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    addForumPost(newTitle, newCategory, newContent);
    setNewTitle('');
    setNewContent('');
    setShowNewPostModal(false);
  };

  const handleAddComment = (postId: string) => {
    const text = commentInputs[postId];
    if (!text || !text.trim()) return;
    addForumComment(postId, text);
    setCommentInputs({ ...commentInputs, [postId]: '' });
  };

  const handleMentorshipSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMentorshipSent(true);
    setTimeout(() => {
      setMentorshipSent(false);
      setSelectedMentor(null);
      setMentorshipNote('');
    }, 1500);
  };

  const handleToggleHeart = (storyId: string) => {
    setStoryHearts((prev) => ({
      ...prev,
      [storyId]: (prev[storyId] || 100) + 1,
    }));
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-pink-100 px-3 py-1 text-xs font-bold text-pink-700 dark:bg-pink-950 dark:text-pink-300">
            <Users className="size-3.5" />
            <span>Sisterhood &amp; Collective Growth</span>
          </div>
          <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
            Community, Mentorship &amp; Networking
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Safe discussion forums, 1-on-1 female leader mentorship, national summits, and inspiring stories.
          </p>
        </div>

        {activeTab === 'forum' && (
          <button
            onClick={() => setShowNewPostModal(true)}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:from-pink-600 hover:to-rose-700"
          >
            <Plus className="size-4" /> Start Discussion
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-200 scrollbar-none dark:border-slate-800">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('forum')}
            className={`border-b-2 pb-3 text-sm font-bold transition whitespace-nowrap ${
              activeTab === 'forum'
                ? 'border-pink-600 text-pink-600 dark:border-pink-400 dark:text-pink-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Discussion Forums ({forumPosts.length})
          </button>
          <button
            onClick={() => setActiveTab('mentorship')}
            className={`border-b-2 pb-3 text-sm font-bold transition whitespace-nowrap ${
              activeTab === 'mentorship'
                ? 'border-pink-600 text-pink-600 dark:border-pink-400 dark:text-pink-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Mentorship Matching ({MOCK_MENTORS.length})
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`border-b-2 pb-3 text-sm font-bold transition whitespace-nowrap ${
              activeTab === 'events'
                ? 'border-pink-600 text-pink-600 dark:border-pink-400 dark:text-pink-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Events &amp; Summits ({events.length})
          </button>
          <button
            onClick={() => setActiveTab('stories')}
            className={`border-b-2 pb-3 text-sm font-bold transition whitespace-nowrap ${
              activeTab === 'stories'
                ? 'border-pink-600 text-pink-600 dark:border-pink-400 dark:text-pink-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Success Stories
          </button>
        </div>
      </div>

      {/* 1. Discussion Forums */}
      {activeTab === 'forum' && (
        <div className="space-y-6">
          {forumPosts.map((post) => (
            <div
              key={post.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={post.authorAvatar}
                    alt={post.authorName}
                    className="size-10 rounded-full object-cover"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {post.authorName}
                      </span>
                      <span className="rounded-full bg-pink-50 px-2 py-0.2 text-[10px] font-bold text-pink-700 dark:bg-pink-950 dark:text-pink-300">
                        {post.authorRole}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">{post.timestamp} · {post.category}</span>
                  </div>
                </div>

                <button
                  onClick={() => toggleUpvotePost(post.id)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                    post.userUpvoted
                      ? 'border-pink-500 bg-pink-50 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
                  }`}
                >
                  <ThumbsUp className="size-3.5" />
                  <span>{post.upvotes}</span>
                </button>
              </div>

              <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
                {post.title}
              </h3>

              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {post.content}
              </p>

              {/* Comments Section */}
              <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Replies &amp; Peer Wisdom ({post.comments.length})
                </h4>
                <div className="mt-3 space-y-2.5">
                  {post.comments.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/40"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {c.authorName} ({c.authorRole})
                        </span>
                        <span className="text-slate-400">{c.timestamp}</span>
                      </div>
                      <p className="mt-1 text-slate-600 dark:text-slate-400">{c.content}</p>
                    </div>
                  ))}
                </div>

                {/* Add Reply Input */}
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    placeholder="Write a supportive reply or answer..."
                    value={commentInputs[post.id] || ''}
                    onChange={(e) =>
                      setCommentInputs({ ...commentInputs, [post.id]: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddComment(post.id);
                    }}
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-pink-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <button
                    onClick={() => handleAddComment(post.id)}
                    className="flex items-center gap-1 rounded-xl bg-pink-600 px-4 py-2 text-xs font-bold text-white hover:bg-pink-700"
                  >
                    <Send className="size-3" /> Reply
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. Mentorship Matching Tab */}
      {activeTab === 'mentorship' && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {MOCK_MENTORS.map((m) => (
            <div
              key={m.id}
              className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-pink-100 px-2.5 py-0.5 text-[10px] font-bold text-pink-700 dark:bg-pink-950 dark:text-pink-300">
                    {m.domain}
                  </span>
                  <span className="text-xs font-bold text-amber-500">★ {m.rating}</span>
                </div>

                <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">{m.name}</h3>
                <p className="text-xs font-semibold text-rose-600">{m.title} at {m.company}</p>

                <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {m.bio}
                </p>

                <div className="mt-4 space-y-1 text-xs text-slate-500">
                  <p>• Experience: {m.experience}</p>
                  <p>• Mentees Guided: {m.menteesCount}+</p>
                  <p>• Available: {m.availableSlots}</p>
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {m.skills.map((s: string, idx: number) => (
                    <span key={idx} className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setSelectedMentor(m)}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-pink-600 py-2.5 text-xs font-bold text-white shadow hover:bg-pink-700"
              >
                Request Mentorship Session
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 3. Events & Summits Tab */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex flex-col justify-between gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                    {event.type}
                  </span>
                  <span className="text-xs font-bold text-slate-500">{event.attendeesCount} Registered</span>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white">{event.title}</h3>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3.5" /> {event.date} · {event.time}
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-pink-600">
                    Speaker: {event.speaker} ({event.speakerRole})
                  </span>
                  <span>• {event.location}</span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400">{event.description}</p>
              </div>

              <div className="shrink-0">
                <button
                  onClick={() => toggleEventRegistration(event.id)}
                  className={`rounded-xl px-5 py-2.5 text-xs font-bold shadow-md transition ${
                    event.registered
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-pink-600 text-white hover:bg-pink-700'
                  }`}
                >
                  {event.registered ? '✓ Registered (View Pass)' : 'Register Free RSVP'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Success Stories Tab */}
      {activeTab === 'stories' && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {[
            {
              id: 'story-1',
              title: 'From Grassroots Artisan to E-Commerce Business Owner',
              author: 'Meenakshi Devi, Jaipur',
              photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
              story: 'Using the RakshaNet financial literacy course, I applied for the Mudra loan (₹2,50,000) and launched an authentic block-print textiles venture. Today, my cooperative employs 12 village women.',
            },
            {
              id: 'story-2',
              title: 'Winning My Legal Battle for Equal Workplace Pay',
              author: 'Rashmi Nair, Bengaluru',
              photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
              story: 'When my tech firm quietly denied maternity bonus and promotion, I downloaded the Equal Remuneration draft from RakshaNet and connected with Adv. Shalini Sen. We achieved a full amicable settlement.',
            },
          ].map((st) => (
            <div
              key={st.id}
              className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="h-48 w-full overflow-hidden">
                <img src={st.photo} alt={st.author} className="size-full object-cover" />
              </div>
              <div className="p-6">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{st.title}</h3>
                <p className="mt-1 text-xs font-semibold text-pink-600">{st.author}</p>
                <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">"{st.story}"</p>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                  <button
                    onClick={() => handleToggleHeart(st.id)}
                    className="flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:scale-105 transition"
                  >
                    <Heart className="size-4 fill-rose-600 text-rose-600" />
                    <span>{storyHearts[st.id]} Cheering Hearts</span>
                  </button>
                  <button className="text-xs font-semibold text-slate-500 hover:text-slate-800">
                    Share Story
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Post Modal */}
      {showNewPostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 sm:p-8">
            <button
              onClick={() => setShowNewPostModal(false)}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100"
            >
              <X className="size-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Start a Discussion Post</h3>
            <p className="text-xs text-slate-500">Ask career questions, share resources, or seek advice from women peers.</p>

            <form onSubmit={handleCreatePost} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option>Career advice</option>
                  <option>Legal queries</option>
                  <option>Health &amp; wellness</option>
                  <option>Entrepreneurship</option>
                  <option>General discussion</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Discussion Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tips for negotiating remote work compensation..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none focus:border-pink-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Your Experience or Question</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Share details, context, and what advice you are looking for..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none focus:border-pink-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewPostModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-pink-600 px-6 py-2 text-xs font-bold text-white hover:bg-pink-700"
                >
                  Publish to Community
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mentorship Request Modal */}
      {selectedMentor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 sm:p-8">
            <button
              onClick={() => setSelectedMentor(null)}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100"
            >
              <X className="size-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Request Mentorship from {selectedMentor.name}
            </h3>
            <p className="text-xs text-slate-500">{selectedMentor.title} at {selectedMentor.company}</p>

            {mentorshipSent && (
              <div className="my-4 rounded-xl bg-emerald-50 p-3 text-center text-xs font-bold text-emerald-700">
                ✓ Mentorship application submitted to {selectedMentor.name}! You will receive a session calendar invite.
              </div>
            )}

            <form onSubmit={handleMentorshipSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  What goals would you like to achieve in this 1-on-1 mentorship?
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Share your current background, what challenges you are facing, and how this mentor can guide your journey..."
                  value={mentorshipNote}
                  onChange={(e) => setMentorshipNote(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none focus:border-pink-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedMentor(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-pink-600 px-6 py-2 text-xs font-bold text-white hover:bg-pink-700"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
