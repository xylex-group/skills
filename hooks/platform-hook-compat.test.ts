import { describe, expect, it } from "bun:test";
import {
  formatOutput as formatPreToolOutput,
  parseInput as parsePreToolInput,
} from "./src/pretooluse-skill-inject.mts";

describe("platform hook compatibility", () => {
  it("test_parseInput_normalizes_cursor_session_and_workspace_root_for_pretooluse", () => {
    const parsed = parsePreToolInput(
      JSON.stringify({
        conversation_id: "cursor-conversation",
        tool_input: { file_path: "app/page.tsx" },
        tool_name: "Write",
        workspace_roots: ["/tmp/cursor-workspace"],
      }),
      undefined,
      {
        ...process.env,
        CLAUDE_PROJECT_ROOT: "/tmp/claude-project",
        CURSOR_PROJECT_DIR: "/tmp/cursor-project",
      }
    );

    expect(parsed).not.toBeNull();
    expect(parsed?.platform).toBe("cursor");
    expect(parsed?.sessionId).toBe("cursor-conversation");
    expect(parsed?.cwd).toBe("/tmp/cursor-workspace");
  });

  it("test_formatOutput_returns_cursor_env_only_payload_when_pretooluse_has_no_context", () => {
    const output = formatPreToolOutput({
      droppedByCap: [],
      env: {
        XYLEX_PLUGIN_TSX_EDIT_COUNT: "2",
      },
      injectedSkills: [],
      matched: new Set(),
      parts: [],
      platform: "cursor",
      toolName: "Write",
      toolTarget: "app/page.tsx",
    });

    expect(JSON.parse(output)).toEqual({
      env: {
        XYLEX_PLUGIN_TSX_EDIT_COUNT: "2",
      },
    });
  });

  it("test_formatOutput_returns_cursor_flat_payload_with_env_for_pretooluse", () => {
    const output = formatPreToolOutput({
      droppedByCap: [],
      env: {
        XYLEX_PLUGIN_SEEN_SKILLS: "ai-sdk",
        XYLEX_PLUGIN_TSX_EDIT_COUNT: "1",
      },
      injectedSkills: ["ai-sdk"],
      matched: new Set(["ai-sdk"]),
      parts: ["You must run the Skill(ai-sdk) tool."],
      platform: "cursor",
      toolName: "Write",
      toolTarget: "app/page.tsx",
    });

    const parsed = JSON.parse(output);
    expect(parsed.additional_context).toContain("Skill(ai-sdk)");
    expect(parsed.env).toEqual({
      XYLEX_PLUGIN_SEEN_SKILLS: "ai-sdk",
      XYLEX_PLUGIN_TSX_EDIT_COUNT: "1",
    });
    expect(parsed.hookSpecificOutput).toBeUndefined();
  });
});
