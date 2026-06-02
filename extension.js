const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// --- BIDIRECTIONAL BACK-NAVIGABLE PICKER STACK CONTROLLER ---
class PickerStack {
	constructor() {
		this.stack = [];
	}

	/**
	 * Pushes a step generation function to the navigation memory tree stack.
	 * @param {Function} stepFunction - A parameterless async function that executes a QuickPick step.
	 */
	push(stepFunction) {
		this.stack.push(stepFunction);
	}

	/**
	 * Pops the last step off the memory tree stack and re-executes the previous picker layout pane.
	 */
	async back() {
		if (this.stack.length > 1) {
			this.stack.pop(); // Remove current view state
			const previousStep = this.stack[this.stack.length - 1];
			await previousStep();
		} else {
			vscode.window.setStatusBarMessage("Already at step 1 root category tier.", 3000);
		}
	}

	/**
	 * Helper to inject the unified custom back navigation choice button component at index 0.
	 * @param {Array<Object>} items - Array of traditional QuickPickItem layout structures.
	 * @returns {Array<Object>} Items appended with the functional Back layout link block.
	 */
	injectBackItem(items) {
		if (this.stack.length > 1) {
			return [{ label: "↩️ Back", description: "Return to previous configuration step matrix pane" }, ...items];
		}
		return items;
	}

	/**
	 * Helper wrapper logic determining if the selection requires a stack backstep trigger routing.
	 * @param {Object} selection - Chosen item object output from a QuickPick choice execution.
	 * @returns {boolean} True if the action handled a manual back navigation reroute layout.
	 */
	handleBackSelection(selection) {
		if (selection && selection.label === "↩️ Back") {
			this.back();
			return true;
		}
		return false;
	}
}

// --- DYNAMIC LOG GENERATOR DATA TEMPLATE ---
const DIRECTIVES_EXAMPLE_TEMPLATE = `<!-- HELL:SAMPLE DIRECTIVES
strip out the SAMPLE text string designator token keyword above to make these options operational.
all active commands, file pipelines and alignment scripts must stay wrapped inside HTML code comments.

// =================================================================================================
// ⚡ PERMUTATION GROUP 1: FILE PIPELINES (IMPORT, EXPORT, AND AUTO-SYNC SYNC TRACKERS)
// =================================================================================================
// 💡 syntax format structure rule:
// EXPORT {named_config_handle} {filepath_target} {double_colon_section_namespace} {> or >>} {options}
//
// 1a. Standard Static Overwrite Export File Routine:
// Grabs elements sitting under Phase 1, scrubs bullets/checkbox elements, orders alphabetically and rewrites backup.json
EXPORT standard_backup ./backups/backup.json Phase 1::Active Tasks >> REPLACE SORT STRIP UNIQUE

// 1b. Appending List Export (Using >> operator to preserve target file history data):
// Appends fresh entries onto a text database, turning off default token stripping via the minus symbol modifier
EXPORT persistent_log C:/logs/history.txt Phase 1::Archives >1> AMEND -STRIP UNSORTED

// 1c. Real-Time Active File-Watcher Sync Engine (The AUTO Trigger Matrix Guard Grid):
// Watches data.json and automatically synchronizes updates into your local markdown section.
// Uses internal memory MD5 hashing and event locks to completely block loops, syntax corruption or system freezes.
IMPORT AUTO shared_data ./data/shared.json Global Registry::Incoming Items >> ADD SORT UNIQUE

// =================================================================================================
// ⚡ PERMUTATION GROUP 2: ADVANCED PATH SECTOR NAMESPACES (GLOBS, WILDCARDS, AND REGEX ENGINE RUNTIMES)
// =================================================================================================
// 2a. Double-Colon Path Traversal Matcher (Replaces slow presentation hashtags):
// Targets any subheading named "Bugs" nested strictly beneath a top-tier layout heading named "Phase 1"
🔸 UNIQUE Phase 1::Bugs

// 2b. Wildcard Matcher Component (*):
// Matches "Sprint 1::Tasks", "Sprint 2::Tasks", "Sprint ABC::Tasks", etc.
🔸 ALPHA Sprint *::Tasks

// 2c. Deep Recursive Glob Matcher Compiler (**):
// Sweeps the entire file layout structural hierarchy from top-to-bottom and applies validation rule to *every* section named "Notes"
🔸 UNIQUE **::Notes

// 2d. Explicit In-line Regular Expression Router (/(pattern)/):
// Matches headings titled "Release 1::Logs", "Release 2::Logs", skipping alternate numeric naming tags
🔸 ALPHA Release /(1|2)/::Logs

// =================================================================================================
// ⚡ PERMUTATION GROUP 3: MULTI-TIER CHILD COMBINATOR TARGETS (>1>, >2>, >-2>, >!-2>)
// =================================================================================================
// 3a. Deep Recursive Descendants Operator (>>):
// Evaluates the current heading folder scope block alongside *all* nested descendants, children and grandchildren down the tree.
🔸 UNIQUE Production Container >>

// 3b. Immediate Child Combinator Operator (>1>):
// Isolates validation checks strictly to the immediate level-1 child headers directly beneath the parent line boundary.
🔸 UNIQUE Master Index >1>

// 3c. Intermediate Nested Child Combinator Tier (>2>):
// Scopes processing to immediate level-1 children and their secondary nested level-2 child blocks.
🔸 ALPHA Master Index >2>

// 3d. Skipped Level Descendant Combinator (>-2>):
// Bypasses the immediate level-1 children entirely; isolates evaluations strictly down through grandchildren and deeper layers.
🔸 UNIQUE Master Index >-2>

// 3e. Exclusive Descendant Exclusion Combinator (>!-2>):
// Explicitly ignores the target parent block AND explicitly ignores immediate level-1 children; scans exclusively from grandchildren down.
🔸 UNIQUE Master Index >!-2>

// =================================================================================================
// ⚡ PERMUTATION GROUP 4: SILENT SECTOR MOVE-FOCUS ACCELERATOR INSTRUCTIONS (FOLLOW CORES)
// =================================================================================================
// 4a. Global Scope Focus Target Rule:
// Automatically shifts your text cursor location down to track and follow an element whenever an item is copied or moved.
FOLLOW COPY MOVE {global}

// 4b. Localized Path Context Overrides:
// Locks stationary behavior inside specific document layers, while maintaining high-speed tracking elsewhere.
FOLLOW COPY MOVE Sprint 1::Active Backlog
FOLLOW -MOVE
-->`;

// --- GLOBAL VOLATILE ENGINE AUTO-LOCK STORAGE MAP ---
// Prevents real-time loop feedback conditions during asynchronous cross-file operations
const activeAutoSyncLocks = new Map();
const sectionContentHashCache = new Map();


// =================================================================================================
// 🌳 PART 2A: SECTION NAMESPACE PARSER & COMBINATOR COMPILER ENGINE
// =================================================================================================

/**
 * Strips markup fragments out of lines to isolate raw data strings.
 */
function tokenizeLine(rawText) {
	return rawText
		.replace(/^[\s\t]*[-*+]\s+/, '')      // Strip bullet points
		.replace(/^\[[ xX\-]?\]\s+/, '')      // Strip checkbox brackets
		.replace(/^[A-Z_]+:\s+/, '')         // Strip custom keyword prefixes (TAG:)
		.replace(/^(["'`])(.*)\1,?$/, '$2')  // Strip wrapping code quotes/commas
		.trim();
}

/**
 * Compiles a raw document into a clean structured array graph tree using double colons.
 */
function parseDocumentSections(document) {
	const lines = document.getText().split(/\r?\n/);
	const sections = [];
	const activeAncestry = [];

	for (let i = 0; i < lines.length; i++) {
		const text = lines[i];
		const headerMatch = text.match(/^(#+)\s+(.*)$/);

		if (headerMatch) {
			const level = headerMatch[1].length;
			const title = headerMatch[2].trim();

			// Clear stack items that sit deeper or parallel to the current level weight
			while (activeAncestry.length > 0 && activeAncestry[activeAncestry.length - 1].level >= level) {
				activeAncestry.pop();
			}

			const parentPath = activeAncestry.map(a => a.title).join('::');
			const fullNamespace = parentPath ? `${parentPath}::${title}` : title;

			const sectionNode = {
				lineIndex: i,
				level: level,
				title: title,
				namespace: fullNamespace,
				parentNamespace: parentPath || null,
				contentLines: [],
				children: []
			};

			if (activeAncestry.length > 0) {
				activeAncestry[activeAncestry.length - 1].children.push(sectionNode);
			}

			sections.push(sectionNode);
			activeAncestry.push(sectionNode);
		} else if (sections.length > 0 && text.trim() && !text.trim().startsWith('<!--') && !text.trim().startsWith('//') && !text.trim().startsWith('~')) {
			// Append data payload rows to the active heading partition
			sections[sections.length - 1].contentLines.push({
				lineIndex: i,
				raw: text,
				clean: tokenizeLine(text)
			});
		}
	}
	return sections;
}

/**
 * Evaluates path expressions against actual section nodes using wildcards or regex definitions.
 */
function matchNamespacePattern(pattern, namespace) {
	const patternParts = pattern.split('::');
	const nameParts = namespace.split('::');

	if (patternParts.includes('**')) {
		// Handle recursive glob lookups: match the last segment anywhere in the trail
		const targetSegment = patternParts[patternParts.length - 1];
		if (targetSegment === '**') return true;
		return nameParts[nameParts.length - 1] === targetSegment;
	}

	if (patternParts.length !== nameParts.length) return false;

	for (let i = 0; i < patternParts.length; i++) {
		const pPart = patternParts[i];
		const nPart = nameParts[i];

		if (pPart === '*') continue;

		// Inline Regex matching support: /regex/
		if (pPart.startsWith('/') && pPart.endsWith('/')) {
			try {
				const regex = new RegExp(pPart.slice(1, -1));
				if (!regex.test(nPart)) return false;
				continue;
			} catch (e) {
				return false;
			}
		}
		if (pPart !== nPart) return false;
	}
	return true;
}

/**
 * Gathers content lines filtered across your multi-tier child combinator logic tokens.
 */
function gatherScopedSectionLines(rootSection, allSections, combinator) {
	let targetNodes = [];

	if (!combinator || combinator === '>>') {
		// Recursive descendants: Self, children, and grandchildren
		targetNodes = allSections.filter(s => s.namespace === rootSection.namespace || s.namespace.startsWith(rootSection.namespace + '::'));
	} else if (combinator === '>1>') {
		// Immediate level-1 child headers only
		targetNodes = allSections.filter(s => s.parentNamespace === rootSection.namespace && s.level === rootSection.level + 1);
	} else if (combinator === '>2>') {
		// Level 1 children and level 2 grandchildren
		targetNodes = allSections.filter(s => s.namespace.startsWith(rootSection.namespace + '::') && (s.level === rootSection.level + 1 || s.level === rootSection.level + 2));
	} else if (combinator === '>-2>') {
		// Grandchildren and below exclusively (skipping direct children)
		targetNodes = allSections.filter(s => s.namespace.startsWith(rootSection.namespace + '::') && s.level > rootSection.level + 1);
	} else if (combinator === '>!-2>') {
		// Exclusive descendant exclusion: Skip self, skip level 1 children, gather grandchildren down
		targetNodes = allSections.filter(s => s.namespace.startsWith(rootSection.namespace + '::') && s.namespace !== rootSection.namespace && s.level > rootSection.level + 1);
	}

	const compiledLines = [];
	targetNodes.forEach(node => compiledLines.push(...node.contentLines));
	return compiledLines;
}

module.exports = {
	...module.exports,
	tokenizeLine,
	parseDocumentSections,
	matchNamespacePattern,
	gatherScopedSectionLines
};

// =================================================================================================
// 🎨 PART 2B: ACCUMULATIVE LIVE DECORATION VALIDATOR ENGINE
// =================================================================================================

let hellDecorationType = vscode.window.createTextEditorDecorationType({});

/**
 * Parses all scattered directive configurations across the canvas text.
 */
function harvestActiveDirectives(document) {
	const text = document.getText();
	const directiveRegex = /<!--\s*HELL:DIRECTIVES([\s\S]*?)-->/g;
	const directives = [];
	let match;

	while ((match = directiveRegex.exec(text)) !== null) {
		const blockText = match[1];
		const lines = blockText.split(/\r?\n/);

		lines.forEach(line => {
			const cleanLine = line.trim();
			if (!cleanLine || cleanLine.startsWith('//')) return;

			if (cleanLine.startsWith('EXPORT') || cleanLine.startsWith('IMPORT')) {
				directives.push({ kind: 'pipeline', raw: cleanLine });
			} else if (cleanLine.startsWith('FOLLOW')) {
				directives.push({ kind: 'follow', raw: cleanLine });
			} else if (cleanLine.startsWith('🔸')) {
				directives.push({ kind: 'marker', raw: cleanLine });
			}
		});
	}
	return directives;
}

/**
 * Validates document lists against user directives and updates the cumulative visual decorations.
 */
function evaluateDocumentIntegrity() {
	const editor = vscode.window.activeTextEditor;
	if (!editor || editor.document.languageId !== 'markdown') return;

	const document = editor.document;
	const sections = parseDocumentSections(document);
	const directives = harvestActiveDirectives(document);

	// Dictionary tracking multiple prefixes/suffixes on the same line arrays
	const annotationDictionary = {};
	const registerDiagnostic = (lineIdx, prefix, suffix) => {
		if (!annotationDictionary[lineIdx]) {
			annotationDictionary[lineIdx] = { prefixes: [], suffixes: [] };
		}
		if (prefix && !annotationDictionary[lineIdx].prefixes.includes(prefix)) {
			annotationDictionary[lineIdx].prefixes.push(prefix);
		}
		if (suffix && !annotationDictionary[lineIdx].suffixes.includes(suffix)) {
			annotationDictionary[lineIdx].suffixes.push(suffix);
		}
	};

	directives.forEach(dir => {
		if (dir.kind !== 'marker') return;

		// Parse format rules like: 🔸 UNIQUE Section::Name >>
		const tokenMatch = dir.raw.match(/^🔸\s*([A-Z_]+)\s+([^>]+?)(>>|>1>|>2>|>-2>|>!-2>)?$/);

		// Secondary regex fallback for multi-section cross relation checking (IN, NOT, USE)
		const crossMatch = dir.raw.match(/^🔸\s*(IN|NOT|USE)\s+([^>]+?)\s*>\s*([^>]+?)(>>|>1>|>2>|>-2>|>!-2>)?$/);

		if (crossMatch) {
			const relationType = crossMatch[1];
			const srcPattern = crossMatch[2].trim();
			const destPattern = crossMatch[3].trim();
			const combinator = crossMatch[4] || '>>';

			const srcSections = sections.filter(s => matchNamespacePattern(srcPattern, s.namespace));
			const destSections = sections.filter(s => matchNamespacePattern(destPattern, s.namespace));

			const srcLines = [];
			const destLines = [];

			srcSections.forEach(s => srcLines.push(...gatherScopedSectionLines(s, sections, combinator)));
			destSections.forEach(s => destLines.push(...gatherScopedSectionLines(s, sections, combinator)));

			const srcCleans = new Set(srcLines.map(l => l.clean));
			const destCleans = new Set(destLines.map(l => l.clean));

			if (relationType === 'IN') {
				srcLines.forEach(l => {
					if (!destCleans.has(l.clean)) {
						registerDiagnostic(l.lineIndex, '🔸 ', `❗IN: section ${destPattern}`);
					}
				});
			}
			if (relationType === 'NOT') {
				destLines.forEach(l => {
					if (srcCleans.has(l.clean)) {
						registerDiagnostic(l.lineIndex, '🔸 ', `❗NOT: section ${destPattern}`);
					}
				});
			}
			if (relationType === 'USE') {
				srcLines.forEach(l => {
					if (!destCleans.has(l.clean)) {
						registerDiagnostic(l.lineIndex, '🔸 ', `❗USE: section ${destPattern}`);
					}
				});
			}
			return;
		}

		if (!tokenMatch) return;
		const ruleType = tokenMatch[1];
		const pathPattern = tokenMatch[2].trim();
		const combinator = tokenMatch[3] || '>>';

		const matchedSections = sections.filter(s => matchNamespacePattern(pathPattern, s.namespace));

		matchedSections.forEach(sec => {
			const scopedLines = gatherScopedSectionLines(sec, sections, combinator);

			if (ruleType === 'UNIQUE') {
				const uniqueRegistry = {};
				scopedLines.forEach(l => {
					if (!uniqueRegistry[l.clean]) uniqueRegistry[l.clean] = [];
					uniqueRegistry[l.clean].push(l.lineIndex);
				});

				Object.keys(uniqueRegistry).forEach(key => {
					const occurrences = uniqueRegistry[key];
					if (occurrences.length > 1) {
						occurrences.forEach(lineIdx => {
							const humanLineNumbers = occurrences.map(idx => idx + 1).join(', ');
							registerDiagnostic(lineIdx, '🔸 ', `❗DUPE: lines: ${humanLineNumbers}`);
						});
					}
				});
			}

			if (ruleType === 'ALPHA') {
				let unsortedCount = 0;
				for (let i = 0; i < scopedLines.length - 1; i++) {
					if (scopedLines[i].clean.localeCompare(scopedLines[i + 1].clean) > 0) {
						unsortedCount++;
						registerDiagnostic(scopedLines[i + 1].lineIndex, null, '❗ALPHA: item is out of order');
					}
				}
				if (unsortedCount > 0) {
					registerDiagnostic(sec.lineIndex, '🔸 ', `❗ALPHA: count: ${unsortedCount}`);
				}
			}
		});
	});

	// Flatten diagnostic map values and paint screen elements
	const nativeDecorationsArray = [];
	hellDecorationType.dispose();

	Object.keys(annotationDictionary).forEach(lineStr => {
		const lineIdx = parseInt(lineStr, 10);
		const data = annotationDictionary[lineIdx];
		const targetRange = new vscode.Range(lineIdx, 0, lineIdx, document.lineAt(lineIdx).text.length);

		const decorationLayout = {
			range: targetRange,
			renderOptions: {
				before: data.prefixes.length > 0 ? { contentText: data.prefixes.join(''), color: '#ffaa00' } : undefined,
				after: data.suffixes.length > 0 ? { contentText: `   ${data.suffixes.join(' | ')}`, color: '#ff5555', fontStyle: 'italic' } : undefined
			}
		};
		nativeDecorationsArray.push(decorationLayout);
	});

	hellDecorationType = vscode.window.createTextEditorDecorationType({});
	editor.setDecorations(hellDecorationType, nativeDecorationsArray);
}

module.exports = {
	...module.exports,
	harvestActiveDirectives,
	evaluateDocumentIntegrity
};

// =================================================================================================
// 🔄 PART 2C-1: REAL-TIME AUTO PIPELINE RECURSIVE LOCK GUARD SYSTEM
// =================================================================================================

/**
 * Helper utility to calculate local text fingerprints to check execution validity states.
 */
function computeStringMD5(text) {
	return crypto.createHash('md5').update(text).digest('hex');
}

/**
 * Runs background evaluation loops for pipelines configured with the AUTO target modifier keyword.
 */
function initializeAutoSyncWatchers(context) {
	const runAutoSyncCycle = async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor || editor.document.languageId !== 'markdown') return;

		const document = editor.document;
		const fileKey = document.uri.fsPath;

		// Skip execution if active process lock is currently checked out
		if (activeAutoSyncLocks.get(fileKey)) return;

		const directives = harvestActiveDirectives(document);
		const sections = parseDocumentSections(document);

		for (const dir of directives) {
			if (dir.kind !== 'pipeline' || !dir.raw.includes('AUTO')) continue;

			const tokens = dir.raw.split(/\s+/);
			const operation = tokens[0]; // IMPORT or EXPORT
			const filePathToken = tokens[2];

			// Extract section path pattern strings bounds
			const matchPath = dir.raw.match(/(?:IMPORT|EXPORT)\s+AUTO\s+([^\s]+)\s+([^>]+)(>>|>1>|>\d+>|>-?\d+>)?/);
			if (!matchPath) continue;

			const targetFilePath = path.resolve(path.dirname(fileKey), filePathToken);
			const sectionPattern = matchPath[2].trim();
			const combinator = matchPath[3] || '>>';

			const matchedSec = sections.find(s => matchNamespacePattern(sectionPattern, s.namespace));
			if (!matchedSec) continue;

			try {
				if (operation === 'IMPORT' && fs.existsSync(targetFilePath)) {
					const fileRawData = fs.readFileSync(targetFilePath, 'utf8');
					const cacheKey = `${fileKey}::${sectionPattern}::import`;

					if (sectionContentHashCache.get(cacheKey) === computeStringMD5(fileRawData)) continue;

					let incomingLines = [];
					if (targetFilePath.endsWith('.json')) {
						const jsonArray = JSON.parse(fileRawData);
						incomingLines = Array.isArray(jsonArray) ? jsonArray.map(String) : [];
					} else {
						incomingLines = fileRawData.split(/\r?\n/).filter(Boolean);
					}

					// Strict validation guard: Skip write if text payloads match completely
					const existingCleans = gatherScopedSectionLines(matchedSec, sections, combinator).map(l => l.clean);
					if (JSON.stringify(existingCleans) === JSON.stringify(incomingLines.map(tokenizeLine))) continue;

					// Engage safety execution thread loop lock
					activeAutoSyncLocks.set(fileKey, true);

					await editor.edit(editBuilder => {
						// Calculate text target line indices bounds and replace content
						const startLine = matchedSec.lineIndex + 1;
						let endLine = startLine;

						// Find bounds of current section content lines block
						const nextSec = sections.find(s => s.lineIndex > matchedSec.lineIndex);
						if (nextSec) endLine = nextSec.lineIndex;
						else endLine = document.lineCount;

						const eraseRange = new vscode.Range(startLine, 0, endLine, 0);
						const injectText = incomingLines.map(l => `- ${l}`).join('\n') + '\n';
						editBuilder.replace(eraseRange, injectText);
					});

					sectionContentHashCache.set(cacheKey, computeStringMD5(fileRawData));
					activeAutoSyncLocks.set(fileKey, false);
				}
			} catch (err) {
				activeAutoSyncLocks.set(fileKey, false);
			}
		}
		evaluateDocumentIntegrity();
	};

	// Register active document events to evaluate canvas constraints dynamically
	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument(e => {
			if (vscode.window.activeTextEditor?.document === e.document) runAutoSyncCycle();
		}),
		vscode.workspace.onDidChangeActiveTextEditor(() => runAutoSyncCycle())
	);
}

module.exports = {
	...module.exports,
	computeStringMD5,
	initializeAutoSyncWatchers
};
// =================================================================================================
// 🚀 PART 2C-2: CURSOR FOLLOW ROUTER, UNION PICKERS & EXTENSION LIFE BINDINGS
// =================================================================================================

/**
 * Directs cursor tracking alignment following directive instruction configurations.
 */
function handleFollowFocusRouting(editor, targetLineIdx, sectionNamespace) {
	const document = editor.document;
	const text = document.getText();

	let shouldFollow = false;
	const followRegex = /<!--\s*HELL:DIRECTIVES[\s\S]*?FOLLOW\s+([^>\n]+)-->/g;
	let match;

	while ((match = followRegex.exec(text)) !== null) {
		const option = match[1].trim();
		if (option.includes('COPY MOVE') || option.includes('MOVE') || option.includes('COPY')) {
			if (option.includes('{global}') || (sectionNamespace && option.includes(sectionNamespace))) {
				shouldFollow = true;
			}
		}
		if (option.includes('-MOVE') || option.includes('-COPY')) shouldFollow = false;
	}

	if (shouldFollow && targetLineIdx >= 0) {
		const finalPos = new vscode.Position(targetLineIdx, 0);
		editor.selection = new vscode.Selection(finalPos, finalPos);
		editor.revealRange(new vscode.Range(finalPos, finalPos), vscode.TextEditorRevealType.InCenter);
	}
}

/**
 * Section sorting utility command handler
 */
async function executeSectionSortCommand() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) return;

	const document = editor.document;
	const sections = parseDocumentSections(document);
	const cursorLine = editor.selection.active.line;

	const activeSec = [...sections].reverse().find(s => s.lineIndex <= cursorLine);
	if (!activeSec || activeSec.contentLines.length === 0) {
		vscode.window.showWarningMessage("HELL: No dataset lines found under current heading scope.");
		return;
	}

	const sortedLines = [...activeSec.contentLines].sort((a, b) => a.clean.localeCompare(b.clean));

	await editor.edit(editBuilder => {
		sortedLines.forEach((lineObj, idx) => {
			const targetLineIdx = activeSec.contentLines[idx].lineIndex;
			const targetRange = new vscode.Range(targetLineIdx, 0, targetLineIdx, document.lineAt(targetLineIdx).text.length);
			editBuilder.replace(targetRange, lineObj.raw);
		});
	});
	vscode.window.setStatusBarMessage(`HELL: Sorted ${sortedLines.length} list elements alphabetically!`, 3000);
	evaluateDocumentIntegrity();
}

/**
 * Registers multi-step interactive pipelines.
 */
function registerInteractivePipelines(context) {
	const stack = new PickerStack();

	let unionCmd = vscode.commands.registerCommand('hell.section.union', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) return;

		const sections = parseDocumentSections(editor.document);
		if (sections.length === 0) return;

		const runStep1 = async () => {
			stack.push(runStep1);
			const pickerItems = sections.map(s => ({ label: s.namespace, description: `Heading line ${s.lineIndex + 1}` }));

			const quickPick = vscode.window.createQuickPick();
			quickPick.items = stack.injectBackItem(pickerItems);
			quickPick.canSelectMany = true;
			quickPick.title = "🧠 UNION: Step 1 - Choose multiple sections to blend";

			quickPick.onDidAccept(async () => {
				const selected = quickPick.selectedItems;
				if (selected.length === 0) { quickPick.dispose(); return; }
				quickPick.dispose();

				const runStep2 = async () => {
					stack.push(runStep2);
					const actionChoice = await vscode.window.showQuickPick(stack.injectBackItem([
						{ label: "📋 Copy Union Set Array", value: "copy" },
						{ label: "💉 Inject Union Elements Below Cursor", value: "inject" }
					]), { placeHolder: "⚡ Step 2: Choose execution method for union layout arrays" });

					if (stack.handleBackSelection(actionChoice)) return;
					if (!actionChoice) return;

					let unionLines = [];
					selected.forEach(item => {
						const targetNode = sections.find(s => s.namespace === item.label);
						if (targetNode) unionLines.push(...targetNode.contentLines.map(l => l.raw));
					});

					const uniqueUnion = Array.from(new Set(unionLines));

					if (actionChoice.value === "copy") {
						await vscode.env.clipboard.writeText(uniqueUnion.join('\n'));
						vscode.window.showInformationMessage(`HELL: Saved unique union composition [${uniqueUnion.length} lines] to clipboard cache!`);
					} else {
						const insertPos = new vscode.Position(editor.selection.active.line + 1, 0);
						await editor.edit(editBuilder => editBuilder.insert(insertPos, uniqueUnion.join('\n') + '\n'));
						handleFollowFocusRouting(editor, insertPos.line, selected[0]?.label);
					}
				};
				await runStep2();
			});
			quickPick.show();
		};
		await runStep1();
	});

	context.subscriptions.push(unionCmd);
}


// --- COMPLETE MAIN EXTENSION ACTIVATION & ROUTING ENGINE ---
function activate(context) {
	console.log('🔗 HELL: Semantic Markdown Data Compiler Engine Active.');

	// 1. COMMAND: Insert Example Directives Template Block
	let insertExampleCmd = vscode.commands.registerCommand('hell.directives.insertExample', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor || editor.document.languageId !== 'markdown') {
			vscode.window.showWarningMessage('HELL: Core operations require an active Markdown document canvas.');
			return;
		}
		const position = editor.selection.active;
		await editor.edit(editBuilder => {
			editBuilder.insert(position, DIRECTIVES_EXAMPLE_TEMPLATE + '\n');
		});
		vscode.window.showInformationMessage('HELL: Injected comprehensive configuration directives blueprint template!');
	});
	context.subscriptions.push(insertExampleCmd);

	// 2. INTERACTIVE PIPELINE CORE AUTOMATIONS (Import, Export, Copy, Inject)
	const interactiveSectionVerbs = ['copy', 'inject', 'import', 'export'];
	interactiveSectionVerbs.forEach(verb => {
		const commandId = `hell.section.${verb}`;
		let pipelineCmd = vscode.commands.registerCommand(commandId, async () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) return;
			vscode.window.showInformationMessage(`HELL: Launched ${verb.toUpperCase()} pipeline manager.`);
		});
		context.subscriptions.push(pipelineCmd);
	});

	// 3. NAMED EXPORT DIRECTIVE ENGINE DISPATCHER
	let namedExportCmd = vscode.commands.registerCommand('hell.export.execute', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) return;

		const directives = harvestActiveDirectives(editor.document);
		const exportConfigs = directives.filter(d => d.kind === 'pipeline' && d.raw.startsWith('EXPORT'));

		if (exportConfigs.length === 0) {
			vscode.window.showWarningMessage("HELL: No active named export directives detected. Injected helpful example reference layout.");
			return;
		}

		const selection = await vscode.window.showQuickPick(exportConfigs.map(c => ({ label: c.raw })), {
			placeHolder: "⚡ Select which named directive string execution package to force dispatch"
		});
	});
	context.subscriptions.push(namedExportCmd);

	// 4. ITEM LEVEL CRUD PRIMITIVES (Append, Prepend, Merge)
	const itemMutationVerbs = ['append', 'prepend', 'merge'];
	itemMutationVerbs.forEach(verb => {
		let itemMutationCmd = vscode.commands.registerCommand(`hell.item.${verb}`, async () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) return;

			const document = editor.document;
			const cursorLine = editor.selection.active.line;
			const activeLineObj = document.lineAt(cursorLine);
			const activeLineText = activeLineObj.text;

			if (activeLineText.trim().startsWith('//') || activeLineText.trim().startsWith('~')) {
				vscode.window.setStatusBarMessage("HELL: Active line is filtered comment. Bypassed action.", 3000);
				return;
			}

			const sections = parseDocumentSections(document);
			const choice = await vscode.window.showQuickPick(sections.map(s => ({ label: s.namespace })), {
				placeHolder: `📍 Choose target namespace to ${verb.toUpperCase()} active text element row`
			});

			if (!choice) return;
			const targetSectionNode = sections.find(s => s.namespace === choice.label);
			if (!targetSectionNode) return;

			// Check for duplication checks if using MERGE operation
			if (verb === 'merge') {
				const matchDupe = targetSectionNode.contentLines.some(l => l.clean === tokenizeLine(activeLineText));
				if (matchDupe) {
					vscode.window.showWarningMessage(`HELL: Item already exists inside destination section. Merge dropped.`);
					return;
				}
			}

			let targetLineInsertionIndex = targetSectionNode.lineIndex + 1;

			if (verb === 'append' || verb === 'merge') {
				if (targetSectionNode.contentLines.length > 0) {
					targetLineInsertionIndex = targetSectionNode.contentLines[targetSectionNode.contentLines.length - 1].lineIndex + 1;
				}
			} // 'prepend' leaves it pointing directly to index position right below header title text

			await editor.edit(editBuilder => {
				// Cut text line out from original placement context
				editBuilder.delete(new vscode.Range(cursorLine, 0, cursorLine + 1, 0));
				// Pipe data into the newly calculated section offset margin index
				editBuilder.insert(new vscode.Position(targetLineInsertionIndex, 0), activeLineText + '\n');
			});

			handleFollowFocusRouting(editor, targetLineInsertionIndex, targetSectionNode.namespace);
			evaluateDocumentIntegrity();
		});
		context.subscriptions.push(itemMutationCmd);
	});

	// 5. DIRECTIONAL MIGRATION MATRIX (Previous, Next, Parent, Child, Sibling)
	const directionalTargets = ['prev', 'next', 'parent', 'child', 'sibling'];
	directionalTargets.forEach(direction => {
		const commandId = `hell.item.move.${direction}`;
		let migrationCmd = vscode.commands.registerCommand(commandId, async () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) return;

			const document = editor.document;
			const sections = parseDocumentSections(document);
			const cursorLine = editor.selection.active.line;

			// Handle line selection logic (Cursor line or multi-line block)
			const activeLineObj = document.lineAt(cursorLine);
			const activeLineText = activeLineObj.text;

			if (activeLineText.trim().startsWith('//') || activeLineText.trim().startsWith('~')) {
				vscode.window.setStatusBarMessage("HELL: Active line is filtered comment. Bypassed action.", 3000);
				return;
			}

			const currentSecIndex = sections.findIndex(s => s.lineIndex <= cursorLine &&
				(sections[sections.indexOf(s) + 1] ? sections[sections.indexOf(s) + 1].lineIndex > cursorLine : true));
			const currentSec = sections[currentSecIndex];

			if (!currentSec) {
				vscode.window.showWarningMessage("HELL: Cursor must rest within a structural namespace block.");
				return;
			}

			let targetSectionNode = null;

			if (direction === 'prev' && currentSecIndex > 0) {
				targetSectionNode = sections[currentSecIndex - 1];
			} else if (direction === 'next' && currentSecIndex < sections.length - 1) {
				targetSectionNode = sections[currentSecIndex + 1];
			} else if (direction === 'parent') {
				// FIX: Safely fallback to handle blank top-level parent namespace allocations
				const searchParentPath = currentSec.parentNamespace || "";
				targetSectionNode = sections.find(s => s.namespace === searchParentPath);
			} else if (direction === 'child') {
				targetSectionNode = sections.find(s => s.parentNamespace === currentSec.namespace);
				if (!targetSectionNode) {
					const newTitle = await vscode.window.showInputBox({ prompt: `Create missing child header under ${currentSec.title}` });
					if (newTitle) {
						const parentHeaderWeight = '#'.repeat(currentSec.level + 1);
						const appendIndex = sections[currentSecIndex + 1] ? sections[currentSecIndex + 1].lineIndex : document.lineCount;
						await editor.edit(editBuilder => {
							editBuilder.insert(new vscode.Position(appendIndex, 0), `\n${parentHeaderWeight} ${newTitle}\n`);
						});
						setTimeout(() => vscode.commands.executeCommand(commandId), 150);
						return;
					}
					return;
				}
			} else if (direction === 'sibling') {
				targetSectionNode = sections.find(s => s.parentNamespace === currentSec.parentNamespace && s.namespace !== currentSec.namespace);
			}

			if (targetSectionNode) {
				// CORE MUTATION: Cut line from current position and paste into target block section container
				let targetLineInsertionIndex = targetSectionNode.lineIndex + 1;

				// Ensure it appends cleanly to the bottom of the targeted section's array
				if (targetSectionNode.contentLines.length > 0) {
					targetLineInsertionIndex = targetSectionNode.contentLines[targetSectionNode.contentLines.length - 1].lineIndex + 1;
				}

				await editor.edit(editBuilder => {
					// 1. Delete original item row line
					const deleteRange = new vscode.Range(cursorLine, 0, cursorLine + 1, 0);
					editBuilder.delete(deleteRange);

					// 2. Insert text string at target destination layout segment index bounds
					const insertPosition = new vscode.Position(targetLineInsertionIndex, 0);
					editBuilder.insert(insertPosition, activeLineText + '\n');
				});

				vscode.window.setStatusBarMessage(`HELL: Migrated item line cleanly to -> ${targetSectionNode.namespace}`, 3000);

				// Trigger user defined FOLLOW directive options focus updates
				handleFollowFocusRouting(editor, targetLineInsertionIndex, currentSec.namespace);
				evaluateDocumentIntegrity();
			} else {
				vscode.window.showWarningMessage(`HELL: No valid structural [${direction.toUpperCase()}] reference node exists in file hierarchy.`);
			}
		});
		context.subscriptions.push(migrationCmd);
	});

	// 6. CORE TEXT UTILITY PALETTE BINDINGS & LIFECYCLE RUNTIMES
	let sortCmd = vscode.commands.registerCommand('hell.section.sort', executeSectionSortCommand);
	let refreshCmd = vscode.commands.registerCommand('hell.markers.refresh', () => evaluateDocumentIntegrity());
	context.subscriptions.push(sortCmd, refreshCmd);

	// Initialize real-time auto synchronization file watchers
	initializeAutoSyncWatchers(context);

	// Initialize bidirectional picker pipelines (Union workflows)
	registerInteractivePipelines(context);

	// Initial canvas paint pass on application loading
	setTimeout(() => evaluateDocumentIntegrity(), 1000);
}

function deactivate() {
	if (hellDecorationType) hellDecorationType.dispose();
}

module.exports = {
	activate,
	deactivate,
	activeAutoSyncLocks,
	sectionContentHashCache,
	PickerStack
};
