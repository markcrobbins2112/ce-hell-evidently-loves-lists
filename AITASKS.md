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
- [ ] FAIL: copy to next section fails if next section does not have a newline below
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
### New Commands
- [ ] NEW: insert directives
	- below current line
```markdown
<!-- HELL:DIRECTIVES
{cursor}
-->
```
- [ ] wrap directives
```markdown
<!-- HELL:DIRECTIVES
{selection}
-->
```
- [ ] need these
	"onCommand:hell.item.copy.prev",
	"onCommand:hell.item.copy.next",
	"onCommand:hell.item.copy.parent",
	"onCommand:hell.item.copy.child",
	"onCommand:hell.item.copy.sibling",
- [ ] and
hell.item.(copy|move).(prepend|append|merge)
- [ ] cant find
		"onCommand:hell.section.sort",
		"onCommand:hell.section.union",
		"onCommand:hell.section.copy",
		"onCommand:hell.section.inject",
		"onCommand:hell.section.import",
		"onCommand:hell.section.export",

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
	- **Description**: Duplicate indicator badges inside headers / lines are not visible when a Markdown document is first opened.
	- **Remediation**:
		- Added a `vscode.workspace.onDidOpenTextDocument` listener to safely trigger real-time auto-sync and decorator painting logic as soon as a Markdown file is opened.
		- Refactored `extension.js` by completely removing redundant duplicate function declarations (Part 1B), consolidating logic around the more complete Part 2 definitions.
		- Improved the directive regex to support optional spacing after `HELL:` to confidently parse directives in any valid styling.

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
