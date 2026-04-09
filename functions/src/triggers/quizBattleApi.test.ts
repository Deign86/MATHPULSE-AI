import assert from "node:assert/strict";
import test from "node:test";

import { __quizBattleTestUtils } from "./quizBattleApi";

const {
  resolveQuizBattleAiModel,
  resolveQuizBattleAiModelName,
  computeRetryDelayMs,
  shuffleChoicesPreservingCorrect,
  generateAiQuestionSet,
} = __quizBattleTestUtils;

const BASE_SETUP = {
  mode: "bot" as const,
  subjectId: "gen-math",
  topicId: "functions",
  difficulty: "medium" as const,
  rounds: 3,
  timePerQuestionSec: 30,
  queueType: "public_matchmaking" as const,
  botDifficulty: "medium" as const,
  adaptiveBot: false,
};

const snapshotEnv = (): Record<string, string | undefined> => ({
  QUIZ_BATTLE_AI_MODEL: process.env.QUIZ_BATTLE_AI_MODEL,
  QUIZ_BATTLE_AI_TOKEN: process.env.QUIZ_BATTLE_AI_TOKEN,
  HF_TOKEN: process.env.HF_TOKEN,
  HUGGING_FACE_API_TOKEN: process.env.HUGGING_FACE_API_TOKEN,
  HUGGINGFACE_API_TOKEN: process.env.HUGGINGFACE_API_TOKEN,
});

const restoreEnv = (snapshot: Record<string, string | undefined>): void => {
  Object.entries(snapshot).forEach(([key, value]) => {
    if (value === undefined) {
      delete process.env[key];
      return;
    }
    process.env[key] = value;
  });
};

const buildValidPayload = (questionCount: number): unknown => {
  const questions = [...Array(questionCount)].map((_, index) => ({
    questionId: `ai-q-${index + 1}`,
    prompt: `Question ${index + 1}: Solve for x in ${index + 2}x = ${2 * (index + 2)}.`,
    choices: ["1", "2", "3", "4"],
    correctOptionIndex: 1,
  }));

  return {
    choices: [
      {
        message: {
          content: JSON.stringify({ questions }),
        },
      },
    ],
  };
};

test("enforces Qwen-only model overrides", () => {
  const envSnapshot = snapshotEnv();

  try {
    process.env.QUIZ_BATTLE_AI_MODEL = "meta-llama/Meta-Llama-3-70B-Instruct";
    assert.throws(
      () => resolveQuizBattleAiModel(),
      /Qwen-family model/,
    );

    process.env.QUIZ_BATTLE_AI_MODEL = "Qwen/Qwen3-32B";
    assert.equal(resolveQuizBattleAiModel(), "Qwen/Qwen3-32B");
    assert.equal(resolveQuizBattleAiModelName(), "Qwen/Qwen3-32B:fastest");

    process.env.QUIZ_BATTLE_AI_MODEL = "Qwen/Qwen2.5-72B-Instruct:fastest";
    assert.equal(resolveQuizBattleAiModelName(), "Qwen/Qwen2.5-72B-Instruct:fastest");
  } finally {
    restoreEnv(envSnapshot);
  }
});

test("does not fall back to bank when AI generation fails", async () => {
  const envSnapshot = snapshotEnv();

  try {
    process.env.QUIZ_BATTLE_AI_MODEL = "Qwen/Qwen3-32B";
    process.env.QUIZ_BATTLE_AI_TOKEN = "test-token";

    await assert.rejects(
      () => generateAiQuestionSet(BASE_SETUP, {
        invokeRequest: async () => {
          throw new Error("Synthetic upstream outage");
        },
        sleepMs: async () => {
          // no-op
        },
        randomInt: () => 0,
      }),
      (error: unknown) => {
        const asRecord = error as Record<string, unknown>;
        return asRecord.reason === "ai_unknown_error";
      },
    );
  } finally {
    restoreEnv(envSnapshot);
  }
});

test("executes bounded retries with exponential backoff path", async () => {
  const envSnapshot = snapshotEnv();

  try {
    process.env.QUIZ_BATTLE_AI_MODEL = "Qwen/Qwen3-32B";
    process.env.QUIZ_BATTLE_AI_TOKEN = "test-token";

    let invokeCount = 0;
    const recordedSleeps: number[] = [];

    const generated = await generateAiQuestionSet(BASE_SETUP, {
      invokeRequest: async () => {
        invokeCount += 1;
        if (invokeCount < 2) {
          throw new Error(`Transient failure ${invokeCount}`);
        }
        return buildValidPayload(4);
      },
      sleepMs: async (durationMs) => {
        recordedSleeps.push(durationMs);
      },
      randomInt: () => 0,
      now: (() => {
        let cursor = 1000;
        return () => {
          cursor += 10;
          return cursor;
        };
      })(),
    });

    assert.equal(invokeCount, 2);
    assert.deepEqual(recordedSleeps, [300]);
    assert.equal(generated.attempts, 2);
    assert.equal(generated.questions.length, BASE_SETUP.rounds);
  } finally {
    restoreEnv(envSnapshot);
  }
});

test("fails when dedupe cannot satisfy required rounds", async () => {
  const envSnapshot = snapshotEnv();

  try {
    process.env.QUIZ_BATTLE_AI_MODEL = "Qwen/Qwen3-32B";
    process.env.QUIZ_BATTLE_AI_TOKEN = "test-token";

    await assert.rejects(
      () => generateAiQuestionSet(BASE_SETUP, {
        invokeRequest: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  questions: [
                    {
                      questionId: "dup-id",
                      prompt: "What is 2 + 2?",
                      choices: ["1", "2", "3", "4"],
                      correctOptionIndex: 3,
                    },
                    {
                      questionId: "dup-id",
                      prompt: "What is 2 + 2?",
                      choices: ["1", "2", "3", "4"],
                      correctOptionIndex: 3,
                    },
                    {
                      questionId: "dup-id-2",
                      prompt: "What is 2 + 2?",
                      choices: ["1", "2", "3", "4"],
                      correctOptionIndex: 3,
                    },
                  ],
                }),
              },
            },
          ],
        }),
        sleepMs: async () => {
          // no-op
        },
        randomInt: () => 0,
      }),
      (error: unknown) => {
        const asRecord = error as Record<string, unknown>;
        return asRecord.reason === "ai_insufficient_unique_questions";
      },
    );
  } finally {
    restoreEnv(envSnapshot);
  }
});

test("reshuffles static choice order when shuffle would otherwise be unchanged", () => {
  const originalChoices = ["A", "B", "C", "D"];
  const result = shuffleChoicesPreservingCorrect(
    originalChoices,
    2,
    (_min: number, max: number) => max,
  );

  assert.notDeepEqual(result.choices, originalChoices);
  assert.ok(result.correctOptionIndex >= 0);
  assert.ok(result.correctOptionIndex < result.choices.length);
  assert.equal(result.choices[result.correctOptionIndex], "C");
});

test("retry delay grows exponentially with jitter cap", () => {
  const delay1 = computeRetryDelayMs(1, () => 0);
  const delay2 = computeRetryDelayMs(2, () => 0);
  const delay3 = computeRetryDelayMs(3, () => 0);

  assert.equal(delay1, 300);
  assert.equal(delay2, 600);
  assert.equal(delay3, 1200);
});
