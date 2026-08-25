import { FormField } from "@/components/ui/form-field";
import { InstructionsTextarea } from "@/instructions/InstructionsTextarea";
import React from "react";

const LABEL = "项目指令";

export interface ProjectInstructionsFieldProps {
  /** The project's AGENTS.md draft. */
  value: string;
  onChange: (next: string) => void;
}

/**
 * The Edit Project dialog's instruction field: the project's AGENTS.md draft, with the copy
 * explaining where the text lands and how it ranks against the vault-wide file.
 *
 * Split from the dialog so the state it introduces is renderable on its own — the dialog around
 * it cannot mount without a live project record, which would put this field out of reach of the
 * component gallery.
 */
export const ProjectInstructionsField: React.FC<ProjectInstructionsFieldProps> = ({
  value,
  onChange,
}) => (
  <FormField
    label={LABEL}
    description="你的自定义指令，供智能体在本项目的每次交互中遵循。与仓库级指令冲突时，以项目指令为准。指令保存在项目文件夹中的 AGENTS.md，你也可以将其作为笔记直接编辑。"
  >
    <InstructionsTextarea label={LABEL} value={value} onChange={onChange} />
  </FormField>
);
