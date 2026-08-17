'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabaseClient } from '@/lib/supabase/client';
import type { Photo } from '@/types/photo';

interface PageProps {
    params: Promise<{ username: string }>;
}

export default function AuthorPortfolioPage({ params }: PageProps) {
    // Unwrap Next.js 16 async route params using React.use()
    const resolvedParams = use(params);
    const username = decodeURIComponent(resolvedParams.username);

    const [photos, setPhotos] = useState<Photo[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
    const [isFeatured, setIsFeatured] = useState(false);

    useEffect(() => {
        async function loadAuthorData() {
            setLoading(true);
            try {
                // 1. Fetch author's approved photos
                const { data: authorPhotos, error: photosError } = await supabaseClient
                    .from('photos')
                    .select('*')
                    .ilike('photographer', username)
                    .eq('status', 'approved')
                    .order('created_at', { ascending: false });

                if (photosError) throw photosError;
                const loadedPhotos = (authorPhotos as Photo[]) || [];
                setPhotos(loadedPhotos);

                // 2. Check if author has any frame in the latest 5 homepage photos
                const { data: top5Photos } = await supabaseClient
                    .from('photos')
                    .select('id')
                    .eq('status', 'approved')
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (top5Photos && loadedPhotos.length > 0) {
                    const top5Ids = new Set(top5Photos.map((p) => p.id));
                    const hasLookbookFrame = loadedPhotos.some((p) => top5Ids.has(p.id));
                    setIsFeatured(hasLookbookFrame);
                }
            } catch (err) {
                console.error('Error fetching author portfolio:', err);
            } finally {
                setLoading(false);
            }
        }

        if (username) {
            loadAuthorData();
        }
    }, [username]);

    // Compute 100% automated statistics
    const publishedCount = photos.length;
    const totalLikes = photos.reduce((acc, p) => acc + (p.likes_count || 0), 0);

    // Compute Mode (Top) Location
    const topLocation = React.useMemo(() => {
        if (photos.length === 0) return 'N/A';
        const locCounts: Record<string, number> = {};
        photos.forEach((p) => {
            if (p.location) {
                locCounts[p.location] = (locCounts[p.location] || 0) + 1;
            }
        });
        const sorted = Object.entries(locCounts).sort((a, b) => b[1] - a[1]);
        return sorted.length > 0 ? sorted[0][0] : 'Kuantan';
    }, [photos]);

    return (
        <main className="min-h-screen bg-[#0B192C] text-stone-100 pt-28 sm:pt-32 pb-20 px-4 sm:px-8">
            <div className="max-w-7xl mx-auto space-y-12">
                {/* Navigation Back Link */}
                <div>
                    <Link
                        href="/gallery"
                        className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-stone-400 hover:text-amber-400 transition-colors"
                    >
                        <span>←</span> Back to Archive
                    </Link>
                </div>

                {/* Hero Contributor Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-800/80 pb-10">
                    <div className="space-y-3">
                        <span className="text-amber-400/90 text-xs tracking-[0.25em] font-mono uppercase font-semibold">
                            CONTRIBUTOR ARCHIVE
                        </span>
                        <h1 className="font-serif text-4xl sm:text-6xl text-stone-100 tracking-tight">
                            @{username}
                        </h1>
                        <p className="text-stone-400 text-sm max-w-lg font-sans">
                            Editorial visual collection capturing moments, heritage, and landscapes across Kuantan.
                        </p>
                    </div>

                    {/* Lookbook Badge */}
                    {isFeatured && (
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono tracking-wide shadow-lg">
                            <span>⭐</span>
                            <span>Featured in Lookbook</span>
                        </div>
                    )}
                </div>

                {/* Automated Metrics Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-1">
                        <span className="text-xs font-mono text-stone-400 uppercase tracking-wider block">
                            PUBLISHED FRAMES
                        </span>
                        <span className="font-serif text-3xl text-amber-400 block">{publishedCount}</span>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-1">
                        <span className="text-xs font-mono text-stone-400 uppercase tracking-wider block">
                            TOTAL HEARTS
                        </span>
                        <span className="font-serif text-3xl text-rose-400 block">❤️ {totalLikes}</span>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-1">
                        <span className="text-xs font-mono text-stone-400 uppercase tracking-wider block">
                            TOP LOCATION
                        </span>
                        <span className="font-serif text-xl text-stone-200 block truncate">{topLocation}</span>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-1">
                        <span className="text-xs font-mono text-stone-400 uppercase tracking-wider block">
                            STATUS
                        </span>
                        <span className="font-serif text-xl text-emerald-400 block">
                            {isFeatured ? 'Lookbook Featured' : 'Active Contributor'}
                        </span>
                    </div>
                </div>

                {/* Gallery Grid Section */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="font-serif text-2xl text-stone-200">Frames by @{username}</h2>
                        <span className="text-xs font-mono text-stone-400">{photos.length} photos</span>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map((n) => (
                                <div key={n} className="h-72 bg-slate-900/40 border border-slate-800 rounded-3xl animate-pulse" />
                            ))}
                        </div>
                    ) : photos.length === 0 ? (
                        <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-12 text-center space-y-3">
                            <p className="font-serif text-xl text-stone-300">No public frames published yet.</p>
                            <p className="text-xs font-mono text-stone-500">
                                Check back later or explore other approved contributors.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {photos.map((photo) => (
                                <div
                                    key={photo.id}
                                    onClick={() => setSelectedPhoto(photo)}
                                    className="group relative bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden cursor-pointer hover:border-amber-500/50 transition-all duration-300 shadow-xl"
                                >
                                    <div className="relative h-72 w-full overflow-hidden">
                                        <Image
                                            src={photo.image_url}
                                            alt={photo.caption || photo.location}
                                            fill
                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-80 group-hover:opacity-90 transition-opacity" />

                                        {/* Location Badge */}
                                        <div className="absolute top-4 left-4">
                                            <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-mono text-stone-200">
                                                📍 {photo.location}
                                            </span>
                                        </div>

                                        {/* Likes Indicator */}
                                        <div className="absolute top-4 right-4">
                                            <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-mono text-rose-300">
                                                ❤️ {photo.likes_count || 0}
                                            </span>
                                        </div>

                                        {/* Caption / Title */}
                                        <div className="absolute bottom-4 left-4 right-4 space-y-1">
                                            <p className="font-serif text-lg text-stone-100 line-clamp-1">
                                                {photo.caption || photo.location}
                                            </p>
                                            <p className="text-xs font-mono text-stone-400">
                                                {new Date(photo.created_at).toLocaleDateString(undefined, {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric',
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Photo Lightbox Preview Modal */}
            {selectedPhoto && (
                <div
                    onClick={() => setSelectedPhoto(null)}
                    className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="relative max-w-4xl w-full max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col my-auto text-stone-100"
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-800">
                            <div className="space-y-1">
                                <span className="text-xs font-mono text-amber-400">📍 {selectedPhoto.location}</span>
                                <h3 className="font-serif text-xl text-stone-100">@{selectedPhoto.photographer}</h3>
                            </div>
                            <button
                                onClick={() => setSelectedPhoto(null)}
                                className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 hover:bg-slate-700 flex items-center justify-center text-stone-300 transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Image Viewport */}
                        <div className="relative w-full h-[50vh] sm:h-[60vh] bg-black/50">
                            <Image
                                src={selectedPhoto.image_url}
                                alt={selectedPhoto.caption || selectedPhoto.location}
                                fill
                                className="object-contain"
                            />
                        </div>

                        {/* Modal Caption Footer */}
                        <div className="p-6 border-t border-slate-800 flex items-center justify-between">
                            <p className="font-serif text-sm sm:text-base text-stone-300 max-w-xl">
                                {selectedPhoto.caption || 'No caption provided.'}
                            </p>
                            <div className="flex items-center gap-2 font-mono text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-full">
                                ❤️ {selectedPhoto.likes_count || 0} Likes
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}