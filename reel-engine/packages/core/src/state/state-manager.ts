import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { ProjectState, ProjectStateSchema } from "../contracts/project-state.schema.js";

export class StateManager {
  private filePath: string;
  private state: ProjectState;

  constructor(filePath: string = ".state/project-state.json", initial?: Partial<ProjectState>) {
    this.filePath = filePath;
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    if (existsSync(this.filePath)) {
      this.state = this.load();
      if (initial) {
        this.update(initial);
      }
    } else {
      const now = new Date().toISOString();
      this.state = ProjectStateSchema.parse({
        project_id: initial?.project_id || `proj_${Date.now()}`,
        created_at: initial?.created_at || now,
        updated_at: now,
        phase: initial?.phase || "input",
        rendered_clips: initial?.rendered_clips || {},
        ...initial,
      });
      this.save();
    }
  }

  public getState(): ProjectState {
    return { ...this.state };
  }

  public update(patch: Partial<ProjectState>): ProjectState {
    const now = new Date().toISOString();
    const updated = {
      ...this.state,
      ...patch,
      rendered_clips: {
        ...this.state.rendered_clips,
        ...(patch.rendered_clips || {}),
      },
      updated_at: now,
    };
    this.state = ProjectStateSchema.parse(updated);
    this.save();
    return this.getState();
  }

  public save(): void {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const tempPath = `${this.filePath}.tmp.${Date.now()}`;
    writeFileSync(tempPath, JSON.stringify(this.state, null, 2), "utf-8");
    renameSync(tempPath, this.filePath);
  }

  public load(): ProjectState {
    const raw = readFileSync(this.filePath, "utf-8");
    const parsed = JSON.parse(raw);
    this.state = ProjectStateSchema.parse(parsed);
    return this.state;
  }
}
