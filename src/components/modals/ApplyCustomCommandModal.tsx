import { App, FuzzySuggestModal, MarkdownView } from "obsidian";
import { getCachedCustomCommands } from "@/commands/state";
import { CustomCommand } from "@/commands/type";
import { sortSlashCommands } from "@/commands/customCommandUtils";
import { CustomCommandChatModal } from "@/commands/CustomCommandChatModal";
import { CustomCommandManager } from "@/commands/customCommandManager";

export class ApplyCustomCommandModal extends FuzzySuggestModal<CustomCommand> {
  private commands: CustomCommand[];

  constructor(app: App) {
    super(app);
    this.setPlaceholder("选择要应用的自定义命令...");

    // Get all custom commands and sort them by the user's selected ordering method
    const allCommands = getCachedCustomCommands();
    this.commands = sortSlashCommands(allCommands);
  }

  onOpen() {
    super.onOpen();

    // Check if there are no commands available
    if (this.commands.length === 0) {
      this.setInstructions([
        {
          command: "",
          purpose: "未找到自定义命令。请先在设置中创建自定义命令。",
        },
      ]);
    }
  }

  getItems(): CustomCommand[] {
    return this.commands;
  }

  getItemText(command: CustomCommand): string {
    return command.title;
  }

  onChooseItem(command: CustomCommand, evt: MouseEvent | KeyboardEvent) {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);

    if (!activeView || !activeView.editor) {
      // If no active editor, use empty string as selected text
      this.openCommandModal(command, "");
      return;
    }

    const selectedText = activeView.editor.getSelection();
    this.openCommandModal(command, selectedText);
  }

  private openCommandModal(command: CustomCommand, selectedText: string) {
    // Record usage of the command
    void CustomCommandManager.getInstance().recordUsage(command);

    // Open the CustomCommandChatModal with the selected command
    const modal = new CustomCommandChatModal(this.app, {
      selectedText,
      command,
    });
    modal.open();
  }
}
