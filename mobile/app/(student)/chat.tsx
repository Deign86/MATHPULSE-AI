import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Text } from "../../components/ui/Text";
import { Button } from "../../components/ui/Button";
import { router } from "expo-router";
import { useChatStore } from "../../stores/useChatStore";
import type { ChatSession, ChatMessage } from "../../types/models";

export default function ChatScreen() {
  const {
    sessions,
    activeSessionId,
    messages,
    isStreaming,
    createSession,
    sendMessage,
    setActiveSession,
    clearSession,
  } = useChatStore();

  const [input, setInput] = useState("");

  // View A: Session list
  if (activeSessionId === null) {
    return (
      <View className="flex-1 bg-background p-4 pt-12">
        <Text variant="h2" className="text-foreground mb-6">
          AI Tutor
        </Text>

        {sessions.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-muted-foreground text-base mb-2">
              No conversations yet
            </Text>
            <Text className="text-muted-foreground text-sm">
              Tap + to start a new chat
            </Text>
          </View>
        ) : (
          <FlatList
            data={sessions}
            keyExtractor={(s) => s.id}
            renderItem={({ item }: { item: ChatSession }) => (
              <TouchableOpacity
                className="bg-surface rounded-2xl p-4 mb-3"
                onPress={() => setActiveSession(item.id, item.messages)}
              >
                <Text className="text-foreground text-sm font-semibold">
                  {item.messages.length > 0
                    ? item.messages[item.messages.length - 1].content.slice(
                        0,
                        80,
                      ) + "..."
                    : "New Chat"}
                </Text>
                <Text className="text-muted-foreground text-xs mt-1">
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            )}
          />
        )}

        {/* FAB */}
        <TouchableOpacity
          className="absolute bottom-6 right-6 bg-primary w-14 h-14 rounded-full items-center justify-center shadow-lg"
          onPress={() =>
            Alert.prompt(
              "New Chat",
              "Topic (optional):",
              (topic?: string) => createSession(topic || undefined),
            )
          }
        >
          <Text className="text-primary-foreground text-2xl font-bold">+</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // View B: Chat room
  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput("");
    sendMessage(trimmed);
  }, [input, isStreaming, sendMessage]);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View className="flex-row items-center px-4 pt-12 pb-3 border-b border-border">
        <TouchableOpacity onPress={clearSession}>
          <Text className="text-primary text-base">← Back</Text>
        </TouchableOpacity>
        <Text variant="h2" className="text-foreground ml-4">
          AI Tutor
        </Text>
      </View>

      {/* Messages */}
      <FlatList
        className="flex-1 px-4"
        data={[...messages].reverse()}
        inverted
        keyExtractor={(m) => m.id}
        renderItem={({ item }: { item: ChatMessage }) => (
          <View
            className={`max-w-[80%] mb-3 p-3 ${
              item.role === "user"
                ? "bg-primary rounded-2xl rounded-tr-sm self-end"
                : "bg-surface rounded-2xl rounded-tl-sm self-start"
            }`}
          >
            <Text
              className={
                item.role === "user"
                  ? "text-primary-foreground text-sm"
                  : "text-foreground text-sm"
              }
            >
              {item.content}
            </Text>
          </View>
        )}
      />

      {/* Input bar */}
      <View className="flex-row items-center px-4 py-3 border-t border-border bg-background">
        <TextInput
          className="flex-1 bg-surface rounded-full px-4 py-2 text-foreground text-sm"
          placeholder="Ask anything..."
          placeholderTextColor="#6b7280"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
          editable={!isStreaming}
        />
        <TouchableOpacity
          className={`ml-3 bg-primary w-10 h-10 rounded-full items-center justify-center ${
            !input.trim() || isStreaming ? "opacity-50" : ""
          }`}
          onPress={handleSend}
          disabled={!input.trim() || isStreaming}
        >
          <Text className="text-primary-foreground text-lg font-bold">↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
