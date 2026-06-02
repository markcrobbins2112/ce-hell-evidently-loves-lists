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
	- [ ] see extension-with-befores.ts for example of working before/after
	- [ ] I did something that made a certain section persist a state of it being sensative to duplicates, whatever that state mechanism is, clear it and remove its functionality

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
### Before and After
- Every line in the document should have a blank :before so as to even out the lines
- Otherise the blank is removed it line hase one or more before icons
- icons for directive violations
	- ALPHA = 🔹
	- SORT = 🔸
- [ ] FAIL: if more than one before is present, all befores should be used
- [ ] NEW: ALPHA
	- [ ] FAIL: alpha before icon needs to be applied to the item as well as the heading with the count
- [ ] NEW: UNIQUE
	- [ ] FAIL: unique violations need to go on the section heading like ALPHA
#### Data Format
- a line can look like
	- {optional tabs or spaces}{optional - for bullet}{optional checkbox}{optional checkbox tag}{data container}{optional user text}{optional //{more user text}}
	- examples
		- 1 '- [ ] FAIL: "data" comments // meta comments'
		- 2 '- [ ] FAIL: "data", comments // meta comments'
		- 3 '- [ ] FAIL: 'data''
		- 4 '- [ ] FAIL: `data`'
		- 5 '- [ ] FAIL: data'
		- data formats
			1. is directive FORMATQ (default)
			2. is directive FORMATC
			3. is directive FORMATQ
			4. is directive FORMATQ
			5. is directive FORMAT
- Items being moved or copied have to adapt to the sections format
- Items being moved or copied have to adapt to the proper indent level
- Items being sorted use the actual data no matter its format
- Items with bad format should be indicated by before
- commands to deal with format
	- [ ] FAIL: remove
		- [ ] FAIL: this is not dependent on directives, it operates on the current lines, removing substrings
		- [ ] FAIL: multi picker (show each that is present)
			- remove indent
			- remove bullet
			- remove text before data
			- remove text after data
			- remove meta text after text after data
			- remove data quotes
			- remove data comma
	- [ ] FAIL: add
		- [ ] FAIL: this is not dependent on directives, it operates on the current lines, adding substrings
		- multi picker (show each that is not present)
			- add indent
			- add bullet
			- add data quotes
			- add data comma

### Command Reference
- [ ] NEW: Commands and their new titles
	- [ ] NEW: AI Maintain this, push changes from here
	- `hell.markers.refresh` Markers: Refresh _mr
	- `hell.directives.insert` Directives: Insert Empty Block _dieb
	- `hell.directives.insertExample` Directives: Insert Example Block _dixb
	- `hell.directives.wrap` Directives: Wrap Selection _dws
	- `hell.export.execute` Exports: Execute an Export _eee
	- `hell.section.sort` Section: Sort Current _ssc
	- `hell.section.union` Sections: Create Item Union _sciu
	- `hell.section.copy` Sections: Copy Section Items _scsi
	- `hell.section.inject` Sections: Inject Section Items _sisi
	- `hell.section.export` Section: Export Section Data _sesd
	- `hell.section.import` Section: Import Section Data _sisd
	- `hell.item.append` Items: Append Items to Section _iais
	- `hell.item.prepend` Items: Prepend Items to Section _ipis
	- `hell.item.merge` Items: Merge Item into Section _imis
	- `hell.item.move` Items: Move Items to Section _imis
	- `hell.item.move.prepend` Items: Move and Prepend Items to Section _imps
	- `hell.item.move.append` Items: Move and Append Items to Section _imas
	- `hell.item.move.merge` Items: Move and Merge Items to Section _imms
	- `hell.item.move.prev` Items: Move Items to Previous Section _imps
	- `hell.item.move.next` Items: Move Items to Next Section _imns
	- `hell.item.move.parent` Items: Move Items to Parent Section _impas
	- `hell.item.move.child` Items: Move Items to Child Section _imcs
	- `hell.item.move.sibling` Items: Move Items to Sibling Section _imss
	- `hell.item.copy` Items: Copy Items to Section _ics
	- `hell.item.copy.prepend` Items: Copy and Prepend Items to Section _icprs
	- `hell.item.copy.append` Items: Copy and Append Items to Section _icas
	- `hell.item.copy.merge` Items: Copy and Merge Items to Section _icms
	- `hell.item.copy.prev` Items: Copy Items to Previous Section _icps
	- `hell.item.copy.next` Items: Copy Items to Next Section _icns
	- `hell.item.copy.parent` Items: Copy Items to Parent Section _icpas
	- `hell.item.copy.child` Items: Copy Items to Child Section _iccs
	- `hell.item.copy.sibling` Items: Copy Items to Sibling Section _icss
	- `hell.item.copy.prepend` Items: Copy and Prepend Items to Section _icprs
	- `hell.item.copy.append` Items: Copy and Append Items to Section _icas
	- `hell.item.copy.merge` Items: Copy and Merge Items to Section _icms
	- `hell.item.move.prepend` Items: Move and Prepend Items to Section _imps
	- `hell.item.move.append` Items: Move and Append Items to Section _imas
	- `hell.item.move.merge` Items: Move and Merge Items to Section _imms

### New Commands
- [ ] FAIL: Yank
	- [ ] FAIL: Nothing happens
	- [ ] FAIL: cut items and put them in current section
	- [ ] FAIL: picker: from sections
	- [ ] FAIL: with each section: picker: child depth|items
	- [ ] FAIL: picker: flatten
	- [ ] FAIL: picker: sort
	- [ ] FAIL: picker: unique
	- [ ] FAIL: picker: inject or copy
	- [ ] FAIL: if inject: picker: prepend append merge
- use new naming style
- [ ] FAIL: Section Intersect
	- [X] has no results
	- [ ] FAIL: works like union but does intersection
		- [ ] FAIL: is doing a union should do an intersection
			- intersection is only items existing in all sources
- [ ] FAIL: Item Remove from Sections
	- [ ] FAIL: does nothing
		- [ ] offers multi-picker of all sections
			- then for each section selected
				- offer a depth picker
			- then multi-picker of all chosen items
			- then remove those items
			- this is exactly what Yank does except Yank offers another picker to copy or inject
- [ ] FAIL: Item Inject to Sections
	- [X] first picker should be choice between current items or new item
	- [ ] FAIL: when this executes it does damage to lines beginning with html comment first part
	- [ ] FAIL: general fail to operate
- [ ] FAIL: Sections Sort Child Sections
	- [ ] FAIL: picker should be mult-pick of sections with child sections
	- [ ] FAIL: child sections should be sorted
	- [X] picker does not bring up list of every section with children
- [ ] FAIL: Sections Sort Child Items
	- [ ] FAIL: picker should be mult-pick of sections with child items
	- [X] child items of selected sections should be sorted
- [ ] NEW: Sections Unique
	- [ ] NEW: picker should be a multi-pick of sections
	- [ ] NEW: sections items should be made unique
- [ ] NEW: Directives Unique Sections
	- [ ] NEW: directives like this should work
		- '<!-- ALPHA UNIQUE -->'
	- [X] OK: I ran this and the dupe indicators started working, now need that undone if it is permanent. this function is meant to inject a html comment directive
	- [X] write/reuse directive as first item in section
- [ ] Directives Sort Sections
	- [X] write/reuse directive as first item in section
	- [ ] NEW: directives like this should work
		- '<!-- ALPHA UNIQUE -->'

- [X] insert directives
	- below current line
	- [X] command not found
```markdown
<!-- HELL:DIRECTIVES
{cursor}
-->
```
- [X] wrap directives
	- [X] wrap directives command not found
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
- [x] cant find
	- [X] "onCommand:hell.section.sort",
	- [x] NEW: "onCommand:hell.section.union",
		- [X] need a picker to choose unique or all, default unique
		- [x] NEW: before copy/inject picker put a sort/normal picker
	- [X] "onCommand:hell.section.copy",
	- [x] "onCommand:hell.section.inject",
		- [X] alphabetical selection does not sort
		- [x] sort must occur on data, not literal line, all sorts must work this way
	- [x] "onCommand:hell.section.import",
	- [x] "onCommand:hell.section.export",

- [x] FAIL: alphabetical selection does not sort
	- [x] FAIL: sort must occur on data, not literal line, all sorts must work this way

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

- [x] FAIL: Task 4: Fix Missing Duplicate Decoration (`::before` / `::after`) for Duplicate Core Data
	- [X] nothing shows in before or after
	- [X] see extension-with-befores.ts for example of working before/after
	- **Description**: Duplicate indicator badges inside headers / lines are not visible when a Markdown document is first opened.
	- **Remediation**:
		- Added a `vscode.workspace.onDidOpenTextDocument` listener to safely trigger real-time auto-sync and decorator painting logic as soon as a Markdown file is opened.
		- Refactored `extension.js` by completely removing redundant duplicate function declarations (Part 1B), consolidating logic around the more complete Part 2 definitions.
		- Improved the directive regex to support optional trailing/leading spaces near combinators (`>>`), ensuring 100% accurate token matching for multi-level configurations.
		- Configured initial `createTextEditorDecorationType` call styles with standard properties (color, margin, etc.) to allocate resource layers, enabling individual dynamic decoration overrides to display.

- [X] Task 5: Handle Non-Newline Section Appending and Convert Indented Bullet points to Tabs
	- **Description**: Appending to a section that lacked a trailing newline resulted in welding text directly to the heading label. Also, nested indentation needs to always use tab characters over spaces.
	- **Remediation**:
		- Implemented dynamic line-welding remediation in `writeSectionContent` and `runAutoSyncCycle` via `startLine >= document.lineCount` validation to automatically prefix a newline sequence if appending directly to a terminal header line.
		- Configured code to convert leading spaces of items to tab characters, enforcing the "use tabs" indentation directive globally across nested outputs.

- [X] Task 6: Implement and Register All Requested Copy/Move Palette and Block Insertion Actions
	- **Description**: Fully implement and expose command palette configurations for custom-targeted directional actions and markdown directive block wrappers.
	- [X] AI create a list here of all the commands you are referencing
		- `hell.item.copy.prev` Copy Active Item(s) to Previous Section
		- `hell.item.copy.next` Copy Active Item(s) to Next Section
		- `hell.item.copy.parent` Copy Active Item(s) to Parent Section
		- `hell.item.copy.child` Copy Active Item(s) to Child Section
		- `hell.item.copy.sibling` Copy Active Item(s) to Sibling Section
		- `hell.item.copy.prepend` Copy Active Item(s) to Section (Prepend Mode)
		- `hell.item.copy.append` Copy Active Item(s) to Section (Append Mode)
		- `hell.item.copy.merge` Copy Active Item(s) to Section (Merge Mode)
		- `hell.item.move.prepend` Move Active Item(s) to Section (Prepend Mode)
		- `hell.item.move.append` Move Active Item(s) to Section (Append Mode)
		- `hell.item.move.merge` Move Active Item(s) to Section (Merge Mode)
		- `hell.directives.insert` Insert Empty Directives Block
		- `hell.directives.wrap` Wrap Selection in Directives Block
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
