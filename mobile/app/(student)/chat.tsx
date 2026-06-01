import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { Text } from "../../components/ui/Text";
import { Button } from "../../components/ui/Button";
import { MathText } from "../../components/MathText";
import { router } from "expo-router";
import { useChatStore } from "../../stores/useChatStore";
import type { ChatSession, ChatMessage } from "../../types/models";
import { auth } from "../../lib/firebase";
import { subscribeToUserSessions } from "../../services/chatService";

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
    loadSessionMessages,
    setSessions,
    endSession,
  } = useChatStore();

  const [input, setInput] = useState("");
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const colorScheme = useColorScheme();
  const mathColorScheme: 'light' | 'dark' = colorScheme === 'dark' ? 'dark' : 'light';

  // Subscribe to user sessions on mount for live updates
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setIsLoadingSessions(false);
      return;
    }

    setIsLoadingSessions(true);
    const unsubscribe = subscribeToUserSessions(uid, (updatedSessions) => {
      setSessions(updatedSessions);
      setIsLoadingSessions(false);
    });

    return () => unsubscribe();
  }, [setSessions]);

  const handleSelectSession = useCallback(
    async (sessionId: string) => {
      setIsLoadingMessages(true);
      setActiveSession(sessionId);
      await loadSessionMessages(sessionId);
      setIsLoadingMessages(false);
    },
    [setActiveSession, loadSessionMessages]
  );

  const handleEndSession = useCallback(
    (sessionId: string) => {
      Alert.alert(
        "End Chat",
        "Are you sure you want to end this conversation?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "End",
            style: "destructive",
            onPress: () => endSession(sessionId),
          },
        ]
      );
    },
    [endSession]
  );

  // View A: Session list
  if (activeSessionId === null) {
    return (
      <View className="flex-1 bg-background p-4 pt-12">
        <Text variant="h2" className="text-foreground mb-6">
          AI Tutor
        </Text>

        {isLoadingSessions ? (
          <View className="space-y-3">
            {[1, 2, 3].map((i) => (
              <View
                key={i}
                className="bg-surface rounded-2xl p-4 h-20 animate-pulse"
              />
            ))}
          </View>
        ) : sessions.length === 0 ? (
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
                className="bg-surface rounded-2xl p-4 mb-3 flex-row items-center"
                onPress={() => handleSelectSession(item.id)}
                onLongPress={() => handleEndSession(item.id)}
              >
                <View className="flex-1">
                  <Text className="text-foreground text-sm font-semibold">
                    {item.title ||
                      (item.messages.length > 0
                        ? item.messages[item.messages.length - 1].content.slice(
                            0,
                            80
                          ) + "..."
                        : "New Chat")}
                  </Text>
                  <Text className="text-muted-foreground text-xs mt-1">
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </Text>
                </View>
                <TouchableOpacity
                  className="ml-2 px-2 py-1"
                  onPress={() => handleEndSession(item.id)}
                >
                  <Text className="text-destructive text-xs font-medium">
                    End
                  </Text>
                </TouchableOpacity>
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
              (topic?: string) => createSession(topic || undefined)
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
          <Text className="text-primary text-base">Back</Text>
        </TouchableOpacity>
        <Text variant="h2" className="text-foreground ml-4 flex-1">
          AI Tutor
        </Text>
        <TouchableOpacity
          className="bg-destructive px-3 py-1.5 rounded-full"
          onPress={() => handleEndSession(activeSessionId)}
        >
          <Text className="text-destructive-foreground text-xs font-medium">
            End
          </Text>
        </TouchableOpacity>
      </View>

      {isLoadingMessages ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="text-muted-foreground mt-3">Loading messages...</Text>
        </View>
      ) : (
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
              <MathText
                content={item.content}
                colorScheme={mathColorScheme}
                className={
                  item.role === "user"
                    ? "text-primary-foreground text-sm"
                    : "text-foreground text-sm"
                }
              />
            </View>
          )}
        />
      )}

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
