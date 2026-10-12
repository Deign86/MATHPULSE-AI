import assert from "node:assert/strict";
import { createServer, type IncomingHttpHeaders } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import Anthropic, { APIConnectionError, APIConnectionTimeoutError, APIError } from "@anthropic-ai/sdk";

import { __quizBattleTestUtils } from "./quizBattleApi";

const {
  resolveQuizBattleAiModel,
  shouldBlockStartDueToNonAiSource,
  computeRetryDelayMs,
  shuffleChoicesPreservingCorrect,
  buildStaticFallbackPool,
  expandStaticFallbackCandidates,
  generateAiQuestionSet,
  classifyGenerationError,
  resetQuizBattleAiClient,
  QUIZ_BATTLE_QUESTIONS_SCHEMA,
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
  sharedPoolMode: "grade_strict" as const,
};

interface EnvSnapshot { [key: string]: string | undefined; }

interface JsonRecord { [key: string]: string | number | boolean | JsonRecord | JsonRecord[] | null; }

const snapshotEnv = (): EnvSnapshot => ({
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  ANTHROPIC_WORKSPACE_ID: process.env.ANTHROPIC_WORKSPACE_ID,
  ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL,
  QUIZ_BATTLE_AI_MODEL: process.env.QUIZ_BATTLE_AI_MODEL,
});

const restoreEnv = (snapshot: EnvSnapshot): void => {
  Object.entries(snapshot).forEach(([key, value]) => {
    if (value === undefined) {
      delete process.env[key];
      return;
    }
    process.env[key] = value;
  });
};

type ClaudeReply = Pick<Anthropic.Message, "content" | "stop_reason">;

const claudeTextReply = (text: string, stopReason: ClaudeReply["stop_reason"] = "end_turn"): ClaudeReply => ({
  content: [{ type: "text", text, citations: null }],
  stop_reason: stopReason,
});

const buildValidQuestions = (questionCount: number) =>
  [...Array(questionCount)].map((_, index) => ({
    questionId: `ai-q-${index + 1}`,
    prompt: `Question ${index + 1}: Solve for x in ${index + 2}x = ${2 * (index + 2)}.`,
    choices: ["1", "2", "3", "4"],
    correctOptionIndex: 1,
  }));

const buildValidReply = (questionCount: number): ClaudeReply =>
  claudeTextReply(JSON.stringify({ questions: buildValidQuestions(questionCount) }));

const apiError = (status: number): APIError =>
  APIError.generate(
    status,
    { error: { type: "api_error", message: `Synthetic ${status} from Claude` } },
    undefined,
    new Headers(),
  );

test("defaults to Claude Haiku and rejects non-Claude model overrides", () => {
  const envSnapshot = snapshotEnv();

  try {
    delete process.env.QUIZ_BATTLE_AI_MODEL;
    assert.equal(resolveQuizBattleAiModel(), "claude-haiku-5-5");

    process.env.QUIZ_BATTLE_AI_MODEL = "meta-llama/Meta-Llama-3-70B-Instruct";
    assert.throws(
      () => resolveQuizBattleAiModel(),
      { reason: "invalid_model_override", retriable: false, message: /Claude model id/ },
    );

    process.env.QUIZ_BATTLE_AI_MODEL = "claude-haiku-4-5";
    assert.equal(resolveQuizBattleAiModel(), "claude-haiku-4-5");
  } finally {
    restoreEnv(envSnapshot);
  }
});

test("does not gate ready online starts by AI source when default policy is disabled", () => {
  assert.equal(
    shouldBlockStartDueToNonAiSource({
      status: "ready",
      mode: "online",
      questionSetSource: "bank",
    }),
    false,
  );

  assert.equal(
    shouldBlockStartDueToNonAiSource({
      status: "ready",
      mode: "online",
      questionSetSource: "ai",
    }),
    false,
  );

  assert.equal(
    shouldBlockStartDueToNonAiSource({
      status: "ready",
      mode: "bot",
      questionSetSource: "bank",
    }),
    false,
  );

  assert.equal(
    shouldBlockStartDueToNonAiSource({
      status: "in_progress",
      mode: "online",
      questionSetSource: "bank",
    }),
    false,
  );
});

test("allows bank source when AI source policy is enabled", () => {
  assert.equal(
    shouldBlockStartDueToNonAiSource({
      status: "ready",
      mode: "online",
      questionSetSource: "bank",
      requireAiSourceForStart: true,
    }),
    false,
  );

  assert.equal(
    shouldBlockStartDueToNonAiSource({
      status: "ready",
      mode: "online",
      questionSetSource: "ai",
      requireAiSourceForStart: true,
    }),
    false,
  );

  assert.equal(
    shouldBlockStartDueToNonAiSource({
      status: "ready",
      mode: "online",
      questionSetSource: "static",
      requireAiSourceForStart: true,
    }),
    true,
  );
});

test("static fallback prefers a pool that can satisfy requested rounds", () => {
  const selector = {
    sharedPoolMode: "grade_strict",
    gradeLevel: 11,
    curriculumVersionSetId: "shs-core-v1",
    curriculumVersion: "strengthened",
    subjectId: "gen-math",
    topicId: "functions",
    difficulty: "medium",
  } as const;

  const strictPool = buildStaticFallbackPool(selector, 3);
  const strictIds = strictPool.map((entry) => entry.questionId).sort();
  assert.deepEqual(strictIds, ["qb-gm-03", "qb-gm-04", "qb-gm-05", "qb-gm-06", "qb-gm-07", "qb-gm-08"]);

  const relaxedPool = buildStaticFallbackPool(selector, 2);
  const relaxedIds = relaxedPool.map((entry) => entry.questionId).sort();
  assert.deepEqual(relaxedIds, ["qb-gm-03", "qb-gm-04", "qb-gm-05", "qb-gm-06", "qb-gm-07", "qb-gm-08"]);
});

test("static fallback picks richest staged pool when rounds exceed strict filters", () => {
  const selector = {
    sharedPoolMode: "grade_strict",
    gradeLevel: 11,
    curriculumVersionSetId: "shs-core-v1",
    curriculumVersion: "strengthened",
    subjectId: "gen-math",
    topicId: "functions",
    difficulty: "medium",
  } as const;

  const fallbackPool = buildStaticFallbackPool(selector, 5);
  const fallbackIds = fallbackPool.map((entry) => entry.questionId).sort();
  assert.deepEqual(fallbackIds, ["qb-gm-03", "qb-gm-04", "qb-gm-05", "qb-gm-06", "qb-gm-07", "qb-gm-08"]);
});

test("static fallback expansion deterministically backfills missing rounds", () => {
  const basePool = [
    {
      questionId: "qb-gm-03",
      prompt: "A value grows from 200 to 260. What is the percent increase?",
      choices: ["20%", "25%", "30%", "35%"],
      correctOptionIndex: 2,
      difficulty: "medium" as const,
    },
    {
      questionId: "qb-gm-04",
      prompt: "If p -> q is true and p is true, then q is:",
      choices: ["True", "False", "Unknown", "Contradiction"],
      correctOptionIndex: 0,
    difficulty: "medium" as const,
    },
  ];

  const expanded = expandStaticFallbackCandidates(basePool, 5);
  assert.equal(expanded.length, 5);
  assert.deepEqual(expanded.map((entry) => entry.questionId), [
    "qb-gm-03",
    "qb-gm-04",
    "qb-gm-03-v2",
    "qb-gm-04-v2",
    "qb-gm-03-v3",
  ]);
  assert.equal(expanded[2]?.prompt.endsWith("(Variant 2)"), true);
  assert.equal(expanded[4]?.prompt.endsWith("(Variant 3)"), true);
});

test("does not fall back to bank when AI generation fails", async () => {
  const envSnapshot = snapshotEnv();

  try {
    delete process.env.QUIZ_BATTLE_AI_MODEL;
    process.env.ANTHROPIC_API_KEY = "test-key";

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
      { reason: "ai_unknown_error" },
    );
  } finally {
    restoreEnv(envSnapshot);
  }
});

test("fails fast without ANTHROPIC_API_KEY and never calls Claude", async () => {
  const envSnapshot = snapshotEnv();

  try {
    delete process.env.ANTHROPIC_API_KEY;

    let invokeCount = 0;

    await assert.rejects(
      () => generateAiQuestionSet(BASE_SETUP, {
        invokeRequest: async () => {
          invokeCount += 1;
          return buildValidReply(4);
        },
      }),
      { reason: "missing_ai_token", retriable: false, message: /ANTHROPIC_API_KEY/ },
    );
    assert.equal(invokeCount, 0);
  } finally {
    restoreEnv(envSnapshot);
  }
});

test("sends Claude a structured-output request without sampling parameters", async () => {
  const envSnapshot = snapshotEnv();

  try {
    delete process.env.QUIZ_BATTLE_AI_MODEL;
    process.env.ANTHROPIC_API_KEY = "test-key";

    const requests: Anthropic.MessageCreateParamsNonStreaming[] = [];

    await generateAiQuestionSet(BASE_SETUP, {
      invokeRequest: async (request) => {
        requests.push(request);
        return buildValidReply(4);
      },
      sleepMs: async () => {
        // no-op
      },
      randomInt: () => 0,
    });

    assert.equal(requests.length, 1);
    const [request] = requests;
    assert.equal(request.model, "claude-haiku-5-5");
    assert.deepEqual(request.thinking, { type: "disabled" });
    assert.deepEqual(request.output_config, {
      format: { type: "json_schema", schema: QUIZ_BATTLE_QUESTIONS_SCHEMA },
    });
    assert.ok(request.max_tokens >= 256 && request.max_tokens <= 4096);
    assert.equal(request.messages[request.messages.length - 1]?.role, "user");
    ["temperature", "top_p", "top_k", "response_format", "stream"].forEach((parameter) => {
      assert.equal(parameter in request, false, `${parameter} must not be sent to Claude`);
    });

    // Structured outputs need every object closed and fully required.
    const questionSchema = QUIZ_BATTLE_QUESTIONS_SCHEMA.properties.questions.items;
    assert.equal(QUIZ_BATTLE_QUESTIONS_SCHEMA.additionalProperties, false);
    assert.deepEqual(QUIZ_BATTLE_QUESTIONS_SCHEMA.required, ["questions"]);
    assert.equal(questionSchema.additionalProperties, false);
    assert.deepEqual([...questionSchema.required].sort(), Object.keys(questionSchema.properties).sort());
  } finally {
    restoreEnv(envSnapshot);
  }
});

test("leaves thinking at the model default for a non-Haiku override", async () => {
  const envSnapshot = snapshotEnv();

  try {
    process.env.QUIZ_BATTLE_AI_MODEL = "claude-sonnet-5-5";
    process.env.ANTHROPIC_API_KEY = "test-key";

    const requests: Anthropic.MessageCreateParamsNonStreaming[] = [];

    await generateAiQuestionSet(BASE_SETUP, {
      invokeRequest: async (request) => {
        requests.push(request);
        return buildValidReply(4);
      },
    });

    assert.equal(requests.length, 1);
    assert.equal(requests[0].model, "claude-sonnet-5-5");
    // Opus 5.5 and Sonnet 5.5 answer 400 to thinking: disabled.
    assert.equal("thinking" in requests[0], false);
  } finally {
    restoreEnv(envSnapshot);
  }
});

test("executes bounded retries with exponential backoff path", async () => {
  const envSnapshot = snapshotEnv();

  try {
    delete process.env.QUIZ_BATTLE_AI_MODEL;
    process.env.ANTHROPIC_API_KEY = "test-key";

    let invokeCount = 0;
    const recordedSleeps: number[] = [];

    const generated = await generateAiQuestionSet(BASE_SETUP, {
      invokeRequest: async () => {
        invokeCount += 1;
        if (invokeCount < 2) {
          throw apiError(429);
        }
        return buildValidReply(4);
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
    assert.equal(generated.model, "claude-haiku-5-5");
    assert.equal(generated.questions.length, BASE_SETUP.rounds);
  } finally {
    restoreEnv(envSnapshot);
  }
});

test("fails fast on a non-retriable Claude rejection", async () => {
  const envSnapshot = snapshotEnv();

  try {
    delete process.env.QUIZ_BATTLE_AI_MODEL;
    process.env.ANTHROPIC_API_KEY = "test-key";

    let invokeCount = 0;
    const recordedSleeps: number[] = [];

    await assert.rejects(
      () => generateAiQuestionSet(BASE_SETUP, {
        invokeRequest: async () => {
          invokeCount += 1;
          throw apiError(400);
        },
        sleepMs: async (durationMs) => {
          recordedSleeps.push(durationMs);
        },
        randomInt: () => 0,
      }),
      { reason: "ai_upstream_error", retriable: false, message: /rejected \(400\)/ },
    );

    assert.equal(invokeCount, 1);
    assert.deepEqual(recordedSleeps, []);
  } finally {
    restoreEnv(envSnapshot);
  }
});

test("retries malformed replies, then fails with ai_payload_invalid", async () => {
  const envSnapshot = snapshotEnv();

  try {
    delete process.env.QUIZ_BATTLE_AI_MODEL;
    process.env.ANTHROPIC_API_KEY = "test-key";

    const malformedReplies: Array<{ name: string; reply: ClaudeReply; message: RegExp }> = [
      {
        name: "refusal prose",
        reply: claudeTextReply("I cannot write those questions.", "refusal"),
        message: /valid questions array \(stop_reason: refusal\)/,
      },
      {
        name: "output cut off at max_tokens",
        reply: claudeTextReply("{\"questions\":[{\"prompt\":\"Question 1: Solve for", "max_tokens"),
        message: /valid questions array \(stop_reason: max_tokens\)/,
      },
      {
        name: "JSON without a questions array",
        reply: claudeTextReply(JSON.stringify({ result: "done" })),
        message: /valid questions array \(stop_reason: end_turn\)/,
      },
      {
        name: "questions with fewer than four choices",
        reply: claudeTextReply(JSON.stringify({
          questions: buildValidQuestions(4).map((question) => ({ ...question, choices: ["1", "2", "3"] })),
        })),
        message: /insufficient valid questions \(0\/3\)/,
      },
    ];

    for (const { name, reply, message } of malformedReplies) {
      let invokeCount = 0;
      const recordedSleeps: number[] = [];

      await assert.rejects(
        () => generateAiQuestionSet(BASE_SETUP, {
          invokeRequest: async () => {
            invokeCount += 1;
            return reply;
          },
          sleepMs: async (durationMs) => {
            recordedSleeps.push(durationMs);
          },
          randomInt: () => 0,
        }),
        { reason: "ai_payload_invalid", retriable: true, message },
        name,
      );

      assert.equal(invokeCount, 2, `${name}: one retry`);
      assert.deepEqual(recordedSleeps, [300], `${name}: backoff before the retry`);
    }
  } finally {
    restoreEnv(envSnapshot);
  }
});

test("reads question JSON from text blocks after a thinking block and through a code fence", async () => {
  const envSnapshot = snapshotEnv();

  try {
    delete process.env.QUIZ_BATTLE_AI_MODEL;
    process.env.ANTHROPIC_API_KEY = "test-key";

    const fencedJson = `\`\`\`json\n${JSON.stringify({ questions: buildValidQuestions(4) })}\n\`\`\``;

    const generated = await generateAiQuestionSet(BASE_SETUP, {
      invokeRequest: async () => ({
        content: [
          { type: "thinking", thinking: "", signature: "test-signature" },
          { type: "text", text: fencedJson, citations: null },
        ],
        stop_reason: "end_turn",
      }),
      sleepMs: async () => {
        // no-op
      },
      randomInt: () => 0,
    });

    assert.equal(generated.attempts, 1);
    assert.equal(generated.questions.length, BASE_SETUP.rounds);
  } finally {
    restoreEnv(envSnapshot);
  }
});

test("classifies Claude API failures into retriable and fail-fast reasons", async () => {
  for (const status of [408, 409, 429, 500, 529]) {
    const classified = await classifyGenerationError(apiError(status));
    assert.equal(classified.reason, "ai_upstream_error", `status ${status}`);
    assert.equal(classified.retriable, true, `status ${status}`);
  }

  for (const status of [400, 401, 403, 404]) {
    const classified = await classifyGenerationError(apiError(status));
    assert.equal(classified.reason, "ai_upstream_error", `status ${status}`);
    assert.equal(classified.retriable, false, `status ${status}`);
  }

  const timedOut = await classifyGenerationError(new APIConnectionTimeoutError());
  assert.equal(timedOut.reason, "ai_timeout");
  assert.equal(timedOut.retriable, true);

  const dropped = await classifyGenerationError(new APIConnectionError({ message: "socket hang up" }));
  assert.equal(dropped.reason, "ai_upstream_error");
  assert.equal(dropped.retriable, true);

  const unexpected = await classifyGenerationError(new Error("boom"));
  assert.equal(unexpected.reason, "ai_unknown_error");
  assert.equal(unexpected.retriable, true);
});

test("fails when dedupe cannot satisfy required rounds", async () => {
  const envSnapshot = snapshotEnv();

  try {
    delete process.env.QUIZ_BATTLE_AI_MODEL;
    process.env.ANTHROPIC_API_KEY = "test-key";

    await assert.rejects(
      () => generateAiQuestionSet(BASE_SETUP, {
        invokeRequest: async () => claudeTextReply(JSON.stringify({
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
        })),
        sleepMs: async () => {
          // no-op
        },
        randomInt: () => 0,
      }),
      { reason: "ai_insufficient_unique_questions" },
    );
  } finally {
    restoreEnv(envSnapshot);
  }
});

test("default client makes one HTTP request per attempt and sends key, workspace and request body", async () => {
  const envSnapshot = snapshotEnv();

  interface ReceivedRequest {
    url: string | undefined;
    headers: IncomingHttpHeaders;
    body: string;
  }
  const received: ReceivedRequest[] = [];
  let respondWithOutage = true;

  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      received.push({
        url: request.url,
        headers: request.headers,
        body: Buffer.concat(chunks).toString("utf8"),
      });
      response.setHeader("content-type", "application/json");
      if (respondWithOutage) {
        response.statusCode = 500;
        response.end(JSON.stringify({ type: "error", error: { type: "api_error", message: "Synthetic outage" } }));
        return;
      }
      response.end(JSON.stringify({
        id: "msg_test",
        type: "message",
        role: "assistant",
        model: "claude-haiku-5-5",
        content: [{ type: "text", text: JSON.stringify({ questions: buildValidQuestions(4) }) }],
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: { input_tokens: 12, output_tokens: 34 },
      }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    // SAFETY: a TCP server listening on a port reports an AddressInfo; the string form is for pipes only.
    const { port } = server.address() as AddressInfo;
    process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${port}`;
    process.env.ANTHROPIC_API_KEY = "test-key";
    process.env.ANTHROPIC_WORKSPACE_ID = "wrkspc_test";
    delete process.env.QUIZ_BATTLE_AI_MODEL;
    // The SDK client is cached after first use and reads these variables when built, so drop any earlier one.
    resetQuizBattleAiClient();

    const options = {
      sleepMs: async () => {
        // no-op
      },
      randomInt: () => 0,
    };

    await assert.rejects(
      () => generateAiQuestionSet(BASE_SETUP, options),
      { reason: "ai_upstream_error", retriable: true, message: /500/ },
    );
    // Two attempts, one request each: SDK-level retries would show up as extra requests.
    assert.equal(received.length, 2);

    respondWithOutage = false;
    received.length = 0;
    const generated = await generateAiQuestionSet(BASE_SETUP, options);
    assert.equal(generated.questions.length, BASE_SETUP.rounds);
    assert.equal(received.length, 1);

    const [wireRequest] = received;
    assert.equal(wireRequest.url, "/v1/messages");
    assert.equal(wireRequest.headers["x-api-key"], "test-key");
    assert.equal(wireRequest.headers["anthropic-workspace-id"], "wrkspc_test");
    const wireBody: JsonRecord = JSON.parse(wireRequest.body);
    assert.equal(wireBody.model, "claude-haiku-5-5");
    assert.deepEqual(wireBody.thinking, { type: "disabled" });
    assert.equal(wireBody.temperature, undefined);
    assert.equal(wireBody.top_p, undefined);
  } finally {
    server.closeAllConnections();
    server.close();
    resetQuizBattleAiClient();
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
