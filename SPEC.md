# Spec

This document compiles the user requirements and instructions from `AGENTS.md` and provides detailed documentation of how the extension was architected and built.

---
## Back to...
- ▪️[AGENTS.md](AGENTS.md)
- ▪️[AILOG.md](AILOG.md)
- ▪️[AITASKS.md](AITASKS.md)
- ▪️[BUILD.md](BUILD.md)
- ▪️[CODE.md](CODE.md)
- ▪️[FEATURES.md](FEATURES.md)
- ▪️[MANUAL.md](MANUAL.md)
- ▪️[README.md](README.md)
- 🔸[SPEC.md](SPEC.md)
- ▪️[TESTING.md](TESTING.md)

---
## Original Spec
- AI should merge this with what it reverse engineers with the code

### 1. Core Framework Rules
- **Target Scope**: Runs exclusively when the active text file is a Markdown document (`.md`).
- **Keybindings**: Contains no default keyboard shortcuts. Users map custom macros to standalone command IDs manually.
- **Delayed Execution State**: To prevent intermediate canvas corruption and preserve history, no text editing happens during picker navigation. All file read and write tasks are combined into a single transaction block at the absolute end of the user selection chain.
- **Bi-directional Picker Windows**: Built using custom menu controller stacks (`vscode.window.createQuickPick`). Every sub-menu inserts a `↩️ Back` item at index 0. Selecting it pops the current workflow view state off the stack and re-renders the previous menu layer safely.
- **Broadcasting Multi-Matches (`>>`)**: If an alignment directive target (such as `## Tasks`) matches multiple layout containers in the current document, actions and validation checks automatically iterate and evaluate across *every* matched subset simultaneously.

### 2. Configuration Blocks (Directives)
Directives always live inside HTML comment boxes, isolating them from raw markdown display layers.

#### The Template Block Injector Command
- **Command**: `HELL: Insert Example Directives Template Block` (`hell.directives.insertExample`)
- **Action**: Instantly stamps out a fully annotated dummy layout configuration block under your active text cursor. To make it operational, a user simply strips out the `SAMPLE` keyword modifier inside the comment opener.

```markdown
<!-- HELL:SAMPLE DIRECTIVES
strip out the SAMPLE text string designator token keyword above to make these options operational.
all active commands, file pipelines and alignment scripts must stay wrapped inside HTML code comments.

// =================================================================================================
// EXPORT {named_config_handle} {filepath_target} {double_colon_section_namespace} {> or >>} {options}
// =================================================================================================
EXPORT standard_backup ./backups/backup.json Phase 1::Active Tasks >> REPLACE SORT STRIP UNIQUE

// Real-Time Active File-Watcher Sync Engine (The AUTO Trigger Matrix Guard Grid):
IMPORT AUTO shared_data ./data/shared.json Global Registry::Incoming Items >> ADD SORT UNIQUE

// =================================================================================================
// GLOBS, WILDCARDS, AND REGEX ENGINE RUNTIMES
// =================================================================================================
🔸 UNIQUE Phase 1::Bugs
🔸 ALPHA Sprint *::Tasks
🔸 UNIQUE **::Notes
🔸 ALPHA Release /(1|2)/::Logs

// =================================================================================================
// MULTI-TIER CHILD COMBINATOR TARGETS
// =================================================================================================
🔸 UNIQUE Production Container >>
🔸 UNIQUE Master Index >1>
🔸 ALPHA Master Index >2>
🔸 UNIQUE Master Index >-2>
🔸 UNIQUE Master Index >!-2>

// =================================================================================================
// SILENT SECTOR MOVE-FOCUS ACCELERATOR INSTRUCTIONS
// =================================================================================================
FOLLOW COPY MOVE {global}
FOLLOW COPY MOVE Sprint 1::Active Backlog
FOLLOW -MOVE
-->
```

### 3. Core Engine Toolset

#### ⚡ Directives, Exporters, & AUTO Watcher Grid
- **File Path Identification**: Parses text elements looking for paths starting with relative (`./`) or drive-absolute (`C:/`) layouts. All other text on that configuration line is bypassed.
- **JSON Matrix Pipelines**: Imports/exports text array components using precise structural parameters: `append`, `prepend`, `replace`, `add` (ensures unique insertions), `subtract` (wipes out matching entries), `sorted`, and `unsorted`.
- **TXT & MD Layout Support**: Maps identical synchronization operations. For Markdown file operations, users can choose to target an existing structural heading section or write out a fresh heading component.
- **Text Data Scrubber**: Provides interactive checkboxes inside the pipeline dialogs to strip `bullets`, `checkboxes`, and inline metadata category markers (`[ ] TAG: text content`).
- **Named Export Dispatcher**: Runs a configuration string picker matching your directive names. If none exist in the file, it auto-inserts a dummy reference snippet outlining structural configuration usage directly into your directives layer.
- **Real-Time AUTO Synchronization Guard**: When an import/export contains the word `AUTO`, background system listeners track file changes and update sections instantly. To ensure absolute loop protection, the engine uses:
  1. *MD5 Content-Hash Memory Verification:* Files are read and cross-compared; data injections drop silently if hashes match.
  2. *Thread Volatile State Locks:* Flashing execution states (`activeSyncs.set(file, true)`) blocks recursive event triggers from causing application crashes or infinite system loops.

#### 🌳 Section Paths & Hierarchical Combinators
Hashtag prefixes (`#`) are stripped out of paths in favor of double-colons (`::`), separating data structure paths from presentation style layouts:
- **`level 1::level 2::level 3`**: Exact parent-child namespace tree path routing.
- **`level *::level 2`**: Asterisk wildcard matcher solving variable subheadings.
- **`**::level 3`**: Deep recursive glob routing matching destination blocks at any structural depth tier.
- **`level /(1|2)/::level 2`**: Regex evaluating dynamic string constraints inside structural sections.

Hierarchical parsing maps the strict depth value shifts of header nodes via step tokens:
- **`>>`**: Targets the parent node, its children, and all grandchildren downstream recursively.
- **`>1>`**: Scopes checks exclusively to immediate level-1 child headers.
- **`>2>`**: Scopes checks to immediate level-1 children and their level-2 grandchildren.
- **`>-2>`**: Bypasses immediate children entirely; scopes processing through grandchildren and lower branches.
- **`>!-2>`**: Bypasses parent and intermediate children; tracks strictly from grandchildren and deeper layers.

#### 🎨 Accumulative Live Decoration Markers
Markers are user-defined strings declared directly inside your comment directives. To prevent conflicts when a line hits multiple rules, a diagnostic layout collector matches lines to dynamic property arrays, combining them into an accumulative UI layer:


| Rule Name | Visual Prefix Marker (`before`) | Diagnostic Gutter Suffix (`after`) |
| :--- | :--- | :--- |
| **`UNIQUE`** | `🔸` | `❗DUPE: lines: {duplicate line index elements}` |
| **`ALPHA`** | `🔸` | `❗ALPHA: count: {unsorted items count}` or `❗ALPHA: item is out of order` |
| **`IN`** | `🔸` | `❗IN: section {target section destination path string}` |
| **`NOT`** | `🔸` | `❗NOT: section {target section destination path string}` |
| **`USE`** | `🔸` | `❗USE: section {target section destination path string}` |

#### 📦 Structural Data Formats
- **Default Extraction Matrix**: Automatically strips markdown markup prefixes (bullets, checkbox brackets) during evaluation loops.
- **Sanitization Fallback**: Treats data elements as implied quote arrays. If a line is unquoted, the parsing tokenizer evaluates it as if it were wrapped in quotes (e.g., `"item",` matches a raw text line containing `item`).

### 4. Operational Command Spectra

#### 🗂️ Section Primitives
- **Sort**: Reorders target elements alphabetically, completely ignoring markup strings (bullets, checkbox states).
- **Global Union Command**: Invokes multi-choice picker paths to select multiple sections ➔ isolate child/grandchild tree inclusion scopes ➔ determine standard manipulations (`sort`, `flatten`, `unique`) ➔ select instant destination method (`copy` or `inject`).
- **Copy & Inject Matrix**: Interactive multi-choice chains controlling section selection, child recursion (`include children`), flattening hierarchies (`flatten`), ordering (`sort`), and token scrubbing (`clean bullets and checkboxes`).
- **Import / Export Pipelines**: Provides standard file window dialog selections. Automatically checks document file extensions to fork menus:
 - *If Markdown*: Select heading path ➔ choose child recursion ➔ flatten ➔ sort ➔ scrub tokens ➔ determine insertion placement relative to targets (before/after) ➔ execute structural merge checks ➔ optional post-process file focus.
 - *If Non-Markdown*: Choose sorting ➔ execute duplicate merge checks ➔ handle append/prepend operations ➔ optional post-process file focus.

#### 📍 Item Primitives
Evaluates items based on current active cursor lines or active multi-line selection blocks. Lines starting with comment flags `//` or `~` are strictly bypassed.

- **Append / Prepend / Merge**: Interactively updates target header blocks using path selection pickers.
- **Directional Migration Matrix**: Moves or copies data segments to target locations: `previous`, `next`, `parent`, `child`, or `sibling` headings. If structural parents or siblings don't exist, a native notification fires; if a targeted child header is missing, the engine prompts an automatic creation layout step.
- **Silent Focus Traversal Mode**: Directives inside sections (`FOLLOW COPY`, `FOLLOW -MOVE`) dictate whether your active cursor selection automatically leaps down to follow data blocks to their new location or remains completely stationary.

## 📋 Originally Requested Specifications
### 1. Application & Identification
### 2. Format Specification
### 3. Dynamic UI Gutter Indicators
### 4. Custom Command Palette Rules & Contexts
- `idx.openIdx`: Focuses the active index file or requests/creates the default configuration if absent. (Available when `!idxFileActive`)

## 🛠️ Implementation Details (How We Built It)
### 1. Robust Markdown Fileline Parser (`parseIdxMarkdown`)

## 🎯 Implemented Technical Concerns & Optimization Features
---
## Go Back to...
- ▪️[AGENTS.md](AGENTS.md)
- ▪️[AILOG.md](AILOG.md)
- ▪️[AITASKS.md](AITASKS.md)
- ▪️[BUILD.md](BUILD.md)
- ▪️[CODE.md](CODE.md)
- ▪️[FEATURES.md](FEATURES.md)
- ▪️[MANUAL.md](MANUAL.md)
- ▪️[README.md](README.md)
- 🔸[SPEC.md](SPEC.md)
- ▪️[TESTING.md](TESTING.md)
