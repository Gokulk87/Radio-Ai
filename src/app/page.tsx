"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { RadioChatBot } from "./radio-chatbot";

export default function HomeScreen() {
    const { setTheme } = useTheme();

    useEffect(() => {
        // Force dark mode
        setTheme("dark");
    }, [setTheme]);

    return <RadioChatBot />;
}
