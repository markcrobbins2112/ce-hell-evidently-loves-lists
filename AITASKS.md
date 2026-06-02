# AI Tasks

## Go to...
- ▪️[AGENTS.md](AGENTS.md)
- ▪️[AILOG.md](AILOG.md)
- 🔸[AITASKS.md](AITASKS.md)
- ▪️[BUILD.md](BUILD.md)
- ▪️[CODE.md](CODE.md)
- ▪️[FEATURES.md](FEATURES.md)
- ▪️[MANUAL.md](MANUAL.md)
- ▪️[README.md](README.md)
- ▪️[SPEC.md](SPEC.md)
- ▪️[TESTING.md](TESTING.md)

## Active Tasks Dashboard

### Fails
- [X] OK: copy to next section fails if next section does not have a newline below
	- '## SectionB2- 	"datac",'

- [ ] FAIL: I have the following and I do not see a ::before or ::after on duplicate "data",

```markdown
<!-- HELL:DIRECTIVES
🔸 UNIQUE SectionA >>
🔸 UNIQUE SectionB2 >>
-->
## SectionA
- "data",
- "data",
- "datab",
```
### Prepare for Command Renames
- [ ] NEW: AI put a list here of commands and their titles

### New Commands
- [ ] FAIL: insert directives
	- below current line
	- [ ] FAIL: command not found
```markdown
<!-- HELL:DIRECTIVES
{cursor}
-->
```
- [ ] FAIL: wrap directives
	- [ ] FAIL: wrap directives command not found
```markdown
<!-- HELL:DIRECTIVES
{selection}
-->
```
- [X] OK: need these
	"onCommand:hell.item.copy.prev",
	"onCommand:hell.item.copy.next",
	"onCommand:hell.item.copy.parent",
	"onCommand:hell.item.copy.child",
	"onCommand:hell.item.copy.sibling",
- [X] and
	hell.item.(copy|move).(prepend|append|merge)
- [ ] cant find
	- [X] "onCommand:hell.section.sort",
	- [ ] FAIL: "onCommand:hell.section.union",
		- [ ] need a picker to choose unique or all, default unique
	- [X] "onCommand:hell.section.copy",
	- [ ] "onCommand:hell.section.inject",
		- [ ] FAIL: alphabetical selection does not sort
	- [ ] "onCommand:hell.section.import",
	- [ ] "onCommand:hell.section.export",

- [ ] FAIL: alphabetical selection does not sort

## AI Active Tasks Dashboard

- [X] Task 1: Fix Extension Activation Error
	- **Description**: Activating the extension failed because `vscode.workspace.onDidChangeActiveTextEditor` was not a function.
	- **Remediation**: Replaced it with the correct `vscode.window.onDidChangeActiveTextEditor` API. Verified that activation now works flawlessly.

- [X] Task 2: Command Category and Titles Refactoring
	- **Description**: Remove "HELL: " prefix from command titles and update category matching globally to "👹HELL".
	- **Remediation**: Completely refactored all command configurations inside `package.json` with the updated category.

- [X] Task 3: Address Copy/Move Picker Missing Choice
	- **Description**: Investigate and fix why the Copy or Move picker option is missing or bypassed on some commands.
	- **Remediation**: Updated primitive standalone commands (`hell.item.append`, `hell.item.prepend`, `hell.item.merge`) to properly prompt the user with a Copy vs. Move choice block, matching the robust UX behavior of the directional migration operations.

- [ ] FAIL: Task 4: Fix Missing Duplicate Decoration (`::before` / `::after`) for Duplicate Core Data
	- [ ] nothing shows in before or after
	- **Description**: Duplicate indicator badges inside headers / lines are not visible when a Markdown document is first opened.
	- **Remediation**:
		- Added a `vscode.workspace.onDidOpenTextDocument` listener to safely trigger real-time auto-sync and decorator painting logic as soon as a Markdown file is opened.
		- Refactored `extension.js` by completely removing redundant duplicate function declarations (Part 1B), consolidating logic around the more complete Part 2 definitions.
		- Improved the directive regex to support optional trailing/leading spaces near combinators (`>>`), ensuring 100% accurate token matching for multi-level configurations.

- [X] Task 5: Handle Non-Newline Section Appending and Convert Indented Bullet points to Tabs
	- **Description**: Appending to a section that lacked a trailing newline resulted in welding text directly to the heading label. Also, nested indentation needs to always use tab characters over spaces.
	- **Remediation**:
		- Implemented dynamic line-welding remediation in `writeSectionContent` and `runAutoSyncCycle` via `startLine >= document.lineCount` validation to automatically prefix a newline sequence if appending directly to a terminal header line.
		- Configured code to convert leading spaces of items to tab characters, enforcing the "use tabs" indentation directive globally across nested outputs.

- [ ] NEW: Task 6: Implement and Register All Requested Copy/Move Palette and Block Insertion Actions
	- **Description**: Fully implement and expose command palette configurations for custom-targeted directional actions and markdown directive block wrappers.
	- [ ] AI create a list here of all the commands you are referencing
		- format: {command name} {title}
	- **Remediation**:
		- Registered all requested 13 commands inside `package.json` (under `activationEvents`, `commands`, and `commandPalette` menu contributions contexts) and bound them in `extension.js`.
		- Implemented `hell.directives.insert` and `hell.directives.wrap` to dynamically stamp nested comment boundaries (`<!-- HELL:DIRECTIVES -->`) around selection blocks and current cursor lines.
		- Created `executeItemPrimitiveActionCommand(action, mode)` and extended `dispatchMoveItemDirection(direction, forcedAction)` to let users trigger seamless, promptless directional copies/moves directly.


---
## Go Back to...
- ▪️[AGENTS.md](AGENTS.md)
- ▪️[AILOG.md](AILOG.md)
- 🔸[AITASKS.md](AITASKS.md)
- ▪️[BUILD.md](BUILD.md)
- ▪️[CODE.md](CODE.md)
- ▪️[FEATURES.md](FEATURES.md)
- ▪️[MANUAL.md](MANUAL.md)
- ▪️[README.md](README.md)
- ▪️[SPEC.md](SPEC.md)
- ▪️[TESTING.md](TESTING.md)
