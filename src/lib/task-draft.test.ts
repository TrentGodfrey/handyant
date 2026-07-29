import assert from "node:assert/strict";
import test from "node:test";
import { mergeTaskDraftAfterPartialSave } from "./task-draft";

test("partial task saves preserve unrelated draft edits", () => {
  const draft = {
    task: "Edited title",
    description: "Unsaved description",
    status: "pending",
    photoIds: ["photo-1"],
    photos: [{ id: "photo-1" }],
  };
  const server = {
    task: "Original title",
    description: "Original description",
    status: "completed",
    photoIds: ["photo-1"],
    photos: [{ id: "photo-1" }],
  };

  assert.deepEqual(
    mergeTaskDraftAfterPartialSave(draft, server, { status: "completed" }),
    {
      ...draft,
      status: "completed",
    },
  );
});

test("photo id saves refresh photo records without replacing the current draft", () => {
  const draft = {
    task: "Edited while video uploaded",
    status: "pending",
    photoIds: ["photo-1"],
    photos: [{ id: "photo-1" }],
  };
  const server = {
    task: "Original title",
    status: "pending",
    photoIds: ["photo-1", "video-2"],
    photos: [{ id: "photo-1" }, { id: "video-2" }],
  };

  assert.deepEqual(
    mergeTaskDraftAfterPartialSave(draft, server, {
      photoIds: ["photo-1", "video-2"],
    }),
    {
      ...draft,
      photoIds: server.photoIds,
      photos: server.photos,
    },
  );
});
