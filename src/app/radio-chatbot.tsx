"use client";

import { useState, useRef, useEffect } from "react";
import {
    Plus,
    SearchLg,
    Settings01,
    User01,
    ArrowRight,
    PlayCircle,
    Bell01,
    BookOpen01,
    UploadCloud02,
    ChevronDown,
    Check,
} from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { TextArea } from "@/components/base/textarea/textarea";
import { Avatar } from "@/components/base/avatar/avatar";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { AnimatePresence, motion } from "motion/react";
import { cx } from "@/utils/cx";

// Simple pause icon component
const PauseIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="4" width="4" height="16" />
        <rect x="14" y="4" width="4" height="16" />
    </svg>
);

// Simple volume icon component
const VolumeIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
);

// Simple muted volume icon
const VolumeMutedIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
    </svg>
);

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    stationName?: string;
    stationUrl?: string;
}

const suggestedPrompts = [
    {
        id: 1,
        text: "Play Kodai FM",
        icon: PlayCircle,
    },
    {
        id: 2,
        text: "Play Radio Mirchi",
        icon: PlayCircle,
    },
    {
        id: 3,
        text: "Play Radio City",
        icon: PlayCircle,
    },
    {
        id: 4,
        text: "Play Red FM",
        icon: PlayCircle,
    },
];

// Radio stations database - Using Radio Browser API for working streams
// Note: We'll fetch working streams from Radio Browser API which provides CORS-enabled URLs
// Kodai FM: https://radiosindia.com/kodaifm.html (Kodaikanal FM 100.5MHz - Tamil radio)
const radioStations: Record<string, string> = {
    // Priority stations - Kodai FM is prioritized
    "kodai fm": "",
    "kodai": "",
    "kodaisaral fm": "",
    "kodaisaralfm": "",
    "kodaikanal fm": "",
    "kodaikanal": "",
    // Other popular stations
    "bbc radio 1": "",
    "bbc radio 2": "",
    "bbc radio 4": "",
    "classic fm": "",
    "capital fm": "",
    "radio mirchi": "",
    "mirchi": "",
    "radio city": "",
    "red fm": "",
    "redfm": "",
    "big fm": "",
    "bigfm": "",
};

export const RadioChatBot = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStation, setCurrentStation] = useState<string | null>(null);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [selectedModel, setSelectedModel] = useState("Radio Player");
    const [mounted, setMounted] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const idCounterRef = useRef(0);
    
    // Generate stable IDs
    const generateId = () => {
        idCounterRef.current += 1;
        return `msg-${idCounterRef.current}`;
    };
    
    // Ensure client-side only rendering
    useEffect(() => {
        setMounted(true);
    }, []);

    const RADIO_MODELS = ["Radio Player", "Premium Radio", "Classic Radio", "Live Radio"];

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "72px";
            const scrollHeight = textareaRef.current.scrollHeight;
            const maxHeight = 300;
            textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
        }
    }, [inputValue]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const findStation = async (query: string): Promise<{ name: string; url: string } | null> => {
        const normalizedQuery = query.toLowerCase().trim();
        
        // Check if it's Kodai FM first (priority)
        const isKodaiFM = normalizedQuery.includes('kodai') || normalizedQuery.includes('kodaisaral') || normalizedQuery.includes('kodaikanal');
        
        // Always use Radio Browser API for working streams
        try {
            let apiUrl: string;
            
            if (isKodaiFM) {
                // Use specific Radio Browser API search for Kodai FM
                // Based on: https://www.radio-browser.info/search?page=1&order=clickcount&reverse=true&hidebroken=true&name=kodai
                apiUrl = `https://de1.api.radio-browser.info/json/stations/search?name=kodai&limit=20&order=clickcount&reverse=true&hidebroken=true`;
            } else {
                // For other stations, use votes order
                apiUrl = `https://de1.api.radio-browser.info/json/stations/search?name=${encodeURIComponent(query)}&limit=20&order=votes&reverse=true&hidebroken=true`;
            }
            
            // Search for the station
            const searchResponse = await fetch(apiUrl, {
                headers: {
                    'User-Agent': 'RadioChatBot/1.0',
                },
            });
            
            if (!searchResponse.ok) {
                throw new Error('API request failed');
            }
            
            const stations = await searchResponse.json();
            
            if (stations && stations.length > 0) {
                // Filter for working streams (hidebroken=true already filters, but we double-check)
                let workingStations = stations.filter((s: any) => 
                    s.url && 
                    s.url.startsWith('http') && 
                    s.url_resolved && 
                    s.url_resolved.startsWith('http')
                );
                
                if (isKodaiFM) {
                    // Prioritize stations with "Kodai" or "Kodaikanal" in the name
                    const kodaiStations = workingStations.filter((s: any) => {
                        const name = (s.name || '').toLowerCase();
                        return name.includes('kodai') || name.includes('kodaikanal');
                    });
                    if (kodaiStations.length > 0) {
                        // Sort by clickcount (most popular first) since we used clickcount order
                        kodaiStations.sort((a: any, b: any) => (b.clickcount || 0) - (a.clickcount || 0));
                        workingStations = kodaiStations;
                    }
                }
                
                if (workingStations.length > 0) {
                    // Get the most popular working station (highest clickcount for Kodai, votes for others)
                    const station = workingStations[0];
                    // Use url_resolved which is the actual working URL
                    const streamUrl = station.url_resolved || station.url;
                    
                    return { 
                        name: station.name || (isKodaiFM ? 'Kodai FM' : query), 
                        url: streamUrl 
                    };
                }
            }
        } catch (error) {
            console.error("Error fetching from Radio Browser API:", error);
        }

        return null;
    };

    const playStation = (stationName: string, stationUrl: string) => {
        // Stop current audio if playing
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }

        // Show loading message
        setMessages((prev) => [
            ...prev,
            {
                id: generateId(),
                role: "assistant",
                content: `Connecting to ${stationName}...`,
            },
        ]);

        // Create new audio element
        const audio = new Audio(stationUrl);
        audio.volume = isMuted ? 0 : volume;
        audio.crossOrigin = "anonymous";
        audio.preload = "auto";

        // Set timeout to detect if stream doesn't load
        const loadTimeout = setTimeout(() => {
            if (!isPlaying) {
                audio.load();
            }
        }, 5000);

        audio.addEventListener("loadeddata", () => {
            clearTimeout(loadTimeout);
            audio.play().catch((error) => {
                console.error("Error playing audio:", error);
                setIsPlaying(false);
                setCurrentStation(null);
                setMessages((prev) => [
                    ...prev,
                    {
                        id: generateId(),
                        role: "assistant",
                        content: `Sorry, I couldn't play ${stationName}. This might be due to:\n• CORS restrictions (browser security)\n• Geo-blocking\n• Stream temporarily unavailable\n\nTry: "BBC Radio 1" or "Classic FM" which usually work better.`,
                    },
                ]);
            });
        });

        audio.addEventListener("canplay", () => {
            clearTimeout(loadTimeout);
        });

        audio.addEventListener("play", () => {
            clearTimeout(loadTimeout);
            setIsPlaying(true);
            setCurrentStation(stationName);
            // Update the last message to show success
            setMessages((prev) => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage && lastMessage.content.includes("Connecting")) {
                    lastMessage.content = `Now playing ${stationName}...`;
                }
                return newMessages;
            });
        });

        audio.addEventListener("pause", () => {
            setIsPlaying(false);
        });

        audio.addEventListener("error", (e) => {
            clearTimeout(loadTimeout);
            setIsPlaying(false);
            setCurrentStation(null);
            console.error("Audio error:", e, "URL:", stationUrl);
            setMessages((prev) => [
                ...prev,
                {
                    id: generateId(),
                    role: "assistant",
                    content: `Sorry, I couldn't play ${stationName}. The stream may be temporarily unavailable or blocked by browser security.\n\n💡 **Tip:** Try searching for a different station, or visit the station's website directly to listen. This is a demo limitation - in production, you'd use a backend proxy to handle radio streams.`,
                },
            ]);
        });

        // Try to load the stream
        audio.load();
        audioRef.current = audio;
    };

    const stopStation = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
            setIsPlaying(false);
            setCurrentStation(null);
        }
    };

    const togglePlayPause = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
        }
    };

    const handleSend = async () => {
        if (!inputValue.trim()) return;

        const userMessage: Message = {
            id: generateId(),
            role: "user",
            content: inputValue,
        };

        setMessages((prev) => [...prev, userMessage]);

        // Show searching message
        const searchingId = generateId();
        setMessages((prev) => [
            ...prev,
            {
                id: searchingId,
                role: "assistant",
                content: `Searching for "${inputValue}"...`,
            },
        ]);

        // Find and play station
        const station = await findStation(inputValue);
        if (station) {
            // Update searching message
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === searchingId
                        ? {
                              ...msg,
                              content: `Found ${station.name}! Connecting...`,
                              stationName: station.name,
                              stationUrl: station.url,
                          }
                        : msg
                )
            );
            playStation(station.name, station.url);
        } else {
            // Update searching message with error
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === searchingId
                        ? {
                              ...msg,
                              content: `I couldn't find a station matching "${inputValue}". Try asking for:\n\n• "BBC Radio 1"\n• "Classic FM"\n• "Radio Mirchi"\n• "Radio City"\n• Or any other radio station name`,
                          }
                        : msg
                )
            );
        }

        setInputValue("");
    };

    const handlePromptClick = (prompt: string) => {
        setInputValue(prompt);
        setTimeout(() => {
            handleSend();
        }, 100);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex h-dvh w-full bg-gray-950 dark-mode">
            {/* Sidebar */}
            <div className="flex w-16 flex-col items-center border-r border-gray-800 bg-gray-900 py-4">
                {/* Logo */}
                <div className="mb-6 flex size-10 items-center justify-center rounded-lg bg-gray-800">
                    <div className="size-6 rounded bg-brand-600" />
                </div>

                {/* New Chat */}
                <Button
                    size="sm"
                    color="secondary"
                    className="mb-4 size-12 rounded-lg p-0"
                    iconLeading={Plus}
                    aria-label="New Chat"
                />

                {/* Navigation Icons */}
                <div className="flex flex-1 flex-col gap-2">
                    <Button
                        size="sm"
                        color="tertiary"
                        className="size-12 rounded-lg p-0"
                        iconLeading={SearchLg}
                        aria-label="Search"
                    />
                                <Button
                                    size="sm"
                                    color="tertiary"
                                    className="size-12 rounded-lg p-0"
                                    iconLeading={Bell01}
                                    aria-label="Home"
                                />
                                <Button
                                    size="sm"
                                    color="tertiary"
                                    className="size-12 rounded-lg p-0"
                                    iconLeading={BookOpen01}
                                    aria-label="Files"
                                />
                                <Button
                                    size="sm"
                                    color="tertiary"
                                    className="size-12 rounded-lg p-0"
                                    iconLeading={SearchLg}
                                    aria-label="History"
                                />
                </div>

                {/* Bottom Actions */}
                <div className="flex flex-col gap-2">
                    <Button
                        size="sm"
                        color="tertiary"
                        className="size-12 rounded-lg p-0"
                        iconLeading={Settings01}
                        aria-label="Settings"
                    />
                    <Avatar size="sm" className="size-12" />
                </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Chat Messages Area */}
                <div className="flex-1 overflow-y-auto px-6 py-8 scrollbar-hide">
                    {messages.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center">
                            {/* Greeting */}
                            <div className="mb-8 text-center">
                                <h1 className="mb-2 text-4xl font-semibold text-primary">
                                    Hi there, <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">John</span>
                                </h1>
                                <h2 className="mb-4 text-4xl font-semibold text-primary">
                                    What would you like to <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">know?</span>
                                </h2>
                                <p className="text-lg text-tertiary">
                                    Use one of the most common prompts below or use your own to begin
                                </p>
                            </div>

                            {/* Suggested Prompts */}
                            <div className="grid w-full max-w-4xl grid-cols-1 gap-4 md:grid-cols-2">
                                {suggestedPrompts.map((prompt) => {
                                    const Icon = prompt.icon;
                                    return (
                                        <button
                                            key={prompt.id}
                                            onClick={() => handlePromptClick(prompt.text)}
                                            className="group flex flex-col items-start rounded-xl border border-gray-800 bg-gray-900 p-6 text-left transition-all hover:border-gray-700 hover:bg-gray-800"
                                            suppressHydrationWarning
                                        >
                                            <p className="mb-4 text-primary">{prompt.text}</p>
                                            <Icon className="size-6 text-fg-quaternary group-hover:text-fg-tertiary" />
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Refresh Prompts */}
                            <button
                                onClick={() => window.location.reload()}
                                className="mt-6 flex items-center gap-2 text-sm text-tertiary hover:text-secondary"
                                suppressHydrationWarning
                            >
                                <ArrowRight className="size-4 rotate-90" />
                                <span>Refresh Prompts</span>
                            </button>
                        </div>
                    ) : (
                        <div className="mx-auto w-full max-w-3xl space-y-6">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={cx(
                                        "flex gap-4",
                                        message.role === "user" ? "justify-end" : "justify-start"
                                    )}
                                >
                                    {message.role === "assistant" && (
                                        <Avatar size="sm" className="mt-1 shrink-0" />
                                    )}
                                    <div
                                        className={cx(
                                            "max-w-[80%] rounded-lg px-4 py-3",
                                            message.role === "user"
                                                ? "bg-brand-600 text-white"
                                                : "bg-gray-800 text-primary"
                                        )}
                                    >
                                        <p className="text-sm">{message.content}</p>
                                        {message.stationName && message.stationUrl && (
                                            <div className="mt-3 flex items-center gap-2 rounded-lg bg-gray-900 p-3">
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-primary">
                                                        {message.stationName}
                                                    </p>
                                                    <p className="text-xs text-tertiary">Now Playing</p>
                                                </div>
                                                {currentStation === message.stationName && (
                                                    <button
                                                        onClick={togglePlayPause}
                                                        className="flex size-8 items-center justify-center rounded-lg bg-gray-700 text-primary hover:bg-gray-600"
                                                        aria-label={isPlaying ? "Pause" : "Play"}
                                                    >
                                                        {isPlaying ? (
                                                            <PauseIcon className="size-4" />
                                                        ) : (
                                                            <PlayCircle className="size-4" />
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {message.role === "user" && (
                                        <Avatar size="sm" className="mt-1 shrink-0" />
                                    )}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Input Area - AI Prompt Style */}
                <div className="border-t border-gray-800 bg-gray-900 px-6 py-4">
                    <div className="mx-auto max-w-4xl">
                        <div className="rounded-2xl bg-white/5 p-1.5 pt-4">
                            {/* Promo Banner */}
                            <div className="mx-2 mb-2.5 flex items-center gap-2">
                                <div className="flex flex-1 items-center gap-2">
                                    <PlayCircle className="size-3.5 text-brand-400" />
                                    <h3 className="text-xs tracking-tighter text-white/90">
                                        Radio stations are free to play!
                                    </h3>
                                </div>
                                <p className="text-xs tracking-tighter text-white/90">Try Now!</p>
                            </div>

                            {/* Input Container */}
                            <div className="relative">
                                <div className="relative flex flex-col">
                                    <div className="overflow-y-auto" style={{ maxHeight: "400px" }}>
                                        <TextArea
                                            textAreaRef={textareaRef}
                                            placeholder="What radio station would you like to play?"
                                            value={inputValue}
                                            onChange={setInputValue}
                                            onKeyDown={handleKeyPress}
                                            className="w-full"
                                            textAreaClassName={cx(
                                                "min-h-[72px] resize-none rounded-xl rounded-b-none border-none bg-white/5 px-4 py-3 text-white placeholder:text-white/70 focus-visible:ring-0 focus-visible:ring-offset-0",
                                                "ring-1 ring-white/10"
                                            )}
                                        />
                                    </div>

                                    {/* Bottom Bar */}
                                    <div className="flex h-14 items-center rounded-b-xl bg-white/5">
                                        <div className="absolute right-3 bottom-3 left-3 flex w-[calc(100%-24px)] items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {/* Model Selector */}
                                                <Dropdown.Root>
                                                    <Button
                                                        size="sm"
                                                        color="tertiary"
                                                        className="flex h-8 items-center gap-1 rounded-md pr-2 pl-1 text-xs hover:bg-white/10"
                                                    >
                                                        <AnimatePresence mode="wait">
                                                            <motion.div
                                                                key={selectedModel}
                                                                initial={{ opacity: 0, y: -5 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                exit={{ opacity: 0, y: 5 }}
                                                                transition={{ duration: 0.15 }}
                                                                className="flex items-center gap-1"
                                                            >
                                                                <PlayCircle className="size-3.5" />
                                                                {selectedModel}
                                                                <ChevronDown className="size-3 opacity-50" />
                                                            </motion.div>
                                                        </AnimatePresence>
                                                    </Button>
                                                    <Dropdown.Popover>
                                                        <Dropdown.Menu
                                                            selectedKeys={[selectedModel]}
                                                            onSelectionChange={(keys) => {
                                                                const selected = Array.from(keys)[0] as string;
                                                                if (selected) setSelectedModel(selected);
                                                            }}
                                                        >
                                                            {RADIO_MODELS.map((model) => (
                                                                <Dropdown.Item
                                                                    key={model}
                                                                    id={model}
                                                                    textValue={model}
                                                                    label={model}
                                                                    icon={PlayCircle}
                                                                    addon={selectedModel === model ? "✓" : undefined}
                                                                />
                                                            ))}
                                                        </Dropdown.Menu>
                                                    </Dropdown.Popover>
                                                </Dropdown.Root>

                                                <div className="mx-0.5 h-4 w-px bg-white/10" />

                                                {/* Attachment Button */}
                                                <label
                                                    aria-label="Attach file"
                                                    className="cursor-pointer rounded-lg bg-white/5 p-2 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                                                >
                                                    <input className="hidden" type="file" />
                                                    <UploadCloud02 className="size-4" />
                                                </label>
                                            </div>

                                            {/* Send Button */}
                                            <button
                                                aria-label="Send message"
                                                onClick={handleSend}
                                                disabled={!inputValue.trim()}
                                                className={cx(
                                                    "rounded-lg bg-white/5 p-2 transition-colors hover:bg-white/10 focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:ring-offset-0",
                                                    !inputValue.trim() && "opacity-30 cursor-not-allowed"
                                                )}
                                                type="button"
                                            >
                                                <ArrowRight
                                                    className={cx(
                                                        "size-4 transition-opacity duration-200 text-white",
                                                        inputValue.trim() ? "opacity-100" : "opacity-30"
                                                    )}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Radio Player Controls */}
                        {currentStation && (
                            <div className="mt-4 flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-800 p-3">
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-primary">{currentStation}</p>
                                    <p className="text-xs text-tertiary">Live Radio</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            if (audioRef.current) {
                                                setIsMuted(!isMuted);
                                                audioRef.current.volume = !isMuted ? volume : 0;
                                            }
                                        }}
                                        className="flex size-9 items-center justify-center rounded-lg bg-gray-700 text-primary hover:bg-gray-600"
                                        aria-label={isMuted ? "Unmute" : "Mute"}
                                    >
                                        {isMuted ? (
                                            <VolumeMutedIcon className="size-4" />
                                        ) : (
                                            <VolumeIcon className="size-4" />
                                        )}
                                    </button>
                                    <button
                                        onClick={togglePlayPause}
                                        className="flex size-9 items-center justify-center rounded-lg bg-gray-700 text-primary hover:bg-gray-600"
                                        aria-label={isPlaying ? "Pause" : "Play"}
                                    >
                                        {isPlaying ? (
                                            <PauseIcon className="size-4" />
                                        ) : (
                                            <PlayCircle className="size-4" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

