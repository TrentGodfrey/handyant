ALTER TABLE "tasks" ADD COLUMN "home_todo_id" UUID;

CREATE INDEX "idx_tasks_home_todo" ON "tasks"("home_todo_id");

ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_home_todo_id_fkey"
  FOREIGN KEY ("home_todo_id") REFERENCES "home_todos"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;
