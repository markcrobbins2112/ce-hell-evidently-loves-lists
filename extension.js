const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// --- BIDIRECTIONAL BACK-NAVIGABLE PICKER STACK CONTROLLER ---
class PickerStack {
	constructor() { this.stack = []; }
	push(stepFunction) { this.stack.push(stepFunction); }
	async back() {
		if (this.stack.length > 1) {
			this.stack.pop();
			await this.stack[this.stack.length - 1]();
		}
	}
	injectBackItem(items) {
		return this.stack.length > 1 ? [{ label: "↩️ Back", description: "Return to previous configuration pane" }, ...items] : items;
	}
	handleBackSelection(selection) {
		if (selection && selection.label === "↩️ Back") { this.back(); return true; }
		return false;
	}
}

// --- DYNAMIC DATA LOG GENERATOR TEMPLATE ---
const DIRECTIVES_EXAMPLE_TEMPLATE = `<!-- HELL:DIRECTIVES
// EXPORT standard_backup ./backups/backup.json Phase 1::Active Tasks >> REPLACE SORT STRIP UNIQUE
IMPORT AUTO shared_data ./data/shared.json Global Registry::Incoming Items >> ADD SORT UNIQUE
🔸 UNIQUE Phase 1::Bugs
🔸 ALPHA Sprint *::Tasks
FOLLOW COPY MOVE {global}
-->`;

const activeAutoSyncLocks = new Map();
const sectionContentHashCache = new Map();
let hellDecorationType = vscode.window.createTextEditorDecorationType({
	before: {
		color: '#ffaa00',
		margin: '0 4px 0 0'
	},
	after: {
		color: '#ff5555',
		fontStyle: 'italic',
		margin: '0 0 0 12px'
	}
});




// =================================================================================================
// 🌳 PART 2A: SECTION NAMESPACE PARSER & COMBINATOR COMPILER ENGINE
// =================================================================================================

/**
 * Strips markup fragments out of lines to isolate raw data strings.
 */
function tokenizeLine(rawText) {
	let str = rawText.trim();
	str = str.replace(/^[-*+]\s+/, '');      // Strip bullet points
	str = str.trim();
	str = str.replace(/^\[[ xX\-]?\]\s+/, '');      // Strip checkbox brackets
	str = str.trim();
	str = str.replace(/^[A-Z_]+:\s+/, '');         // Strip custom keyword prefixes (TAG:)
	str = str.trim();
	str = str.replace(/^(["'`])(.*)\1,?$/, '$2');  // Strip wrapping code quotes/commas
	return str.trim();
}

/**
 * Parses markdown list items into separate constituent chunks to allow flexible transitions between layouts.
 */
function parseMarkdownLine(rawText) {
	let remaining = rawText;
	
	// 1. Extract Indent
	const indentMatch = remaining.match(/^([ \t]*)/);
	const indent = indentMatch ? indentMatch[1] : '';
	remaining = remaining.substring(indent.length);
	
	// 2. Extract Comment (trailing // comment)
	let comment = '';
	const commentIdx = remaining.lastIndexOf('//');
	if (commentIdx !== -1) {
		comment = remaining.substring(commentIdx);
		remaining = remaining.substring(0, commentIdx);
	}
	
	// 3. Extract Bullet
	let bullet = '';
	const bulletMatch = remaining.match(/^([-*+]\s+)/);
	if (bulletMatch) {
		bullet = bulletMatch[1];
		remaining = remaining.substring(bullet.length);
	}
	
	// 4. Extract Checkbox
	let checkbox = '';
	const checkboxMatch = remaining.match(/^(\[[ xX\-]?\]\s+)/);
	if (checkboxMatch) {
		checkbox = checkboxMatch[1];
		remaining = remaining.substring(checkbox.length);
	}
	
	// 5. Extract Tag
	let tag = '';
	const tagMatch = remaining.match(/^([A-Z_]+:\s+)/);
	if (tagMatch) {
		tag = tagMatch[1];
		remaining = remaining.substring(tag.length);
	}
	
	let dataQuote = '';
	let hasComma = false;
	let dataValue = remaining.trim();
	let userTextAfter = '';
	
	// Analyze central string data values and any trailing commas
	const quoteMatch = remaining.match(/^(\s*)(")(.*?)(")(,?)(\s*)(.*)$/);
	if (quoteMatch) {
		dataQuote = '"';
		dataValue = quoteMatch[3];
		hasComma = !!quoteMatch[5];
		userTextAfter = quoteMatch[7].trim();
	} else {
		const trailingCommaMatch = remaining.match(/^(.*?)(,)(\s*)(.*)$/);
		if (trailingCommaMatch) {
			dataValue = trailingCommaMatch[1].trim();
			hasComma = true;
			userTextAfter = trailingCommaMatch[4].trim();
		} else {
			dataValue = remaining.trim();
			hasComma = false;
			userTextAfter = '';
		}
	}
	
	return {
		indent,
		bullet,
		checkbox,
		tag,
		dataValue,
		dataQuote,
		hasComma,
		userTextAfter,
		comment
	};
}

/**
 * Searches and parses FORMAT directives for a specific section level pattern scope.
 */
function getSectionFormat(namespace, sections, directives) {
	let bestFormat = null;
	directives.forEach(dir => {
		if (dir.kind !== 'marker') return;
		const match = dir.raw.match(/^🔸\s*(FORMAT|FORMATQ|FORMATC)\s+([^>]+?)\s*(>>|>1>|>2>|>-2>|>!-2>)?\s*$/);
		if (!match) return;
		
		const formatType = match[1];
		const pathPattern = match[2].trim();
		const combinator = match[3] ? match[3].trim() : '>>';
		
		const pathSections = sections.filter(s => matchNamespacePattern(pathPattern, s.namespace));
		pathSections.forEach(s => {
			const isNamespaceInScope = sections.some(sec => sec.namespace === namespace && 
				(sec.namespace === s.namespace || 
				(combinator === '>>' && sec.namespace.startsWith(s.namespace + '::')) ||
				(combinator === '>1>' && sec.parentNamespace === s.namespace && sec.level === s.level + 1) ||
				(combinator === '>2>' && sec.namespace.startsWith(s.namespace + '::') && sec.level <= s.level + 2)
			));
			
			if (isNamespaceInScope) {
				if (!bestFormat || s.namespace.length > bestFormat.len) {
					bestFormat = { type: formatType, len: s.namespace.length };
				}
			}
		});
	});
	return bestFormat ? bestFormat.type : null;
}

/**
 * Reformats list text data into target section format schemas and adjusts nested indent lines relatively.
 */
function adaptLineToSection(lineText, targetFormat, targetLevel, sourceLevel = null) {
	const parsed = parseMarkdownLine(lineText);
	if (!parsed.dataValue) return lineText;
	
	// 1. Shift indentation or ensure normalized tab spacing
	let newIndent = parsed.indent;
	if (sourceLevel !== null && targetLevel !== null) {
		const diff = targetLevel - sourceLevel;
		let currentTabs = 0;
		const leadSpaces = parsed.indent.match(/^( +)/);
		if (leadSpaces) {
			const spaceCount = leadSpaces[1].length;
			currentTabs = Math.max(1, Math.floor(spaceCount / 2));
		} else {
			currentTabs = (parsed.indent.match(/\t/g) || []).length;
		}
		
		const targetTabs = Math.max(0, currentTabs + diff);
		newIndent = '\t'.repeat(targetTabs);
	} else {
		const leadSpaces = parsed.indent.match(/^( +)/);
		if (leadSpaces) {
			const spaceCount = leadSpaces[1].length;
			const tabCount = Math.max(1, Math.floor(spaceCount / 2));
			newIndent = '\t'.repeat(tabCount);
		}
	}
	
	// 2. Perform layout format re-framing
	let quotedData = parsed.dataValue;
	if (targetFormat === 'FORMATQ') {
		quotedData = `"${parsed.dataValue}"`;
	} else if (targetFormat === 'FORMATC') {
		quotedData = `"${parsed.dataValue}",`;
	} else if (targetFormat === 'FORMAT') {
		quotedData = parsed.dataValue;
	} else {
		// Keep original double quotes/comma wrapping if no format matches
		if (parsed.dataQuote) {
			quotedData = `${parsed.dataQuote}${parsed.dataValue}${parsed.dataQuote}${parsed.hasComma ? ',' : ''}`;
		} else {
			quotedData = `${parsed.dataValue}${parsed.hasComma ? ',' : ''}`;
		}
	}
	
	let bulletStr = parsed.bullet;
	if (!bulletStr && parsed.dataValue) {
		bulletStr = '- ';
	}
	
	let checkboxStr = parsed.checkbox;
	let tagStr = parsed.tag;
	let afterStr = parsed.userTextAfter ? ' ' + parsed.userTextAfter : '';
	let commentStr = parsed.comment ? ' ' + parsed.comment : '';
	
	return `${newIndent}${bulletStr}${checkboxStr}${tagStr}${quotedData}${afterStr}${commentStr}`;
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


/**
 * Parses all scattered directive configurations across the canvas text.
 */
function harvestActiveDirectives(document) {
	const text = document.getText();
	const directiveRegex = /<!--\s*HELL:\s*(?:SAMPLE\s+)?DIRECTIVES([\s\S]*?)-->/g;
	const directives = [];
	let match;

	while ((match = directiveRegex.exec(text)) !== null) {
		const blockText = match[1];
		const blockStartOffset = match.index + match[0].indexOf(blockText);
		const lines = blockText.split(/\r?\n/);

		let currentOffset = blockStartOffset;
		lines.forEach((line) => {
			const cleanLine = line.trim();
			const lineIdx = document.positionAt(currentOffset).line;

			if (cleanLine && !cleanLine.startsWith('//')) {
				if (cleanLine.startsWith('EXPORT') || cleanLine.startsWith('IMPORT')) {
					directives.push({ kind: 'pipeline', raw: cleanLine, lineIndex: lineIdx });
				} else if (cleanLine.startsWith('FOLLOW')) {
					directives.push({ kind: 'follow', raw: cleanLine, lineIndex: lineIdx });
				} else if (cleanLine.startsWith('🔸')) {
					directives.push({ kind: 'marker', raw: cleanLine, lineIndex: lineIdx });
				}
			}
			currentOffset += line.length + 1;
		});
	}
	return directives;
}

/**
 * Validates document lists against user directives and updates the cumulative visual decorations.
 */
function evaluateDocumentIntegrity() {
	if (hellDecorationType) {
		hellDecorationType.dispose();
	}
	hellDecorationType = vscode.window.createTextEditorDecorationType({
		before: {
			color: '#ffaa00',
			margin: '0 4px 0 0'
		},
		after: {
			color: '#ff5555',
			fontStyle: 'italic',
			margin: '0 0 0 12px'
		}
	});

	const editors = vscode.window.visibleTextEditors;
	editors.forEach(editor => {
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
			const tokenMatch = dir.raw.match(/^🔸\s*([A-Z_]+)\s+([^>]+?)\s*(>>|>1>|>2>|>-2>|>!-2>)?\s*$/);

			// Secondary regex fallback for multi-section cross relation checking (IN, NOT, USE)
			const crossMatch = dir.raw.match(/^🔸\s*(IN|NOT|USE)\s+([^>]+?)\s*>\s*([^>]+?)\s*(>>|>1>|>2>|>-2>|>!-2>)?\s*$/);

			if (crossMatch) {
				const relationType = crossMatch[1];
				const srcPattern = crossMatch[2].trim();
				const destPattern = crossMatch[3].trim();
				const combinator = crossMatch[4] ? crossMatch[4].trim() : '>>';

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
			const combinator = tokenMatch[3] ? tokenMatch[3].trim() : '>>';

			const matchedSections = sections.filter(s => matchNamespacePattern(pathPattern, s.namespace));

			matchedSections.forEach(sec => {
				const scopedLines = gatherScopedSectionLines(sec, sections, combinator);

				if (ruleType === 'UNIQUE') {
					const uniqueRegistry = {};
					scopedLines.forEach(l => {
						if (!uniqueRegistry[l.clean]) uniqueRegistry[l.clean] = [];
						uniqueRegistry[l.clean].push(l.lineIndex);
					});

					let duplicateCount = 0;
					Object.keys(uniqueRegistry).forEach(key => {
						const occurrences = uniqueRegistry[key];
						if (occurrences.length > 1) {
							duplicateCount += (occurrences.length - 1);
							occurrences.forEach(lineIdx => {
								const humanLineNumbers = occurrences.map(idx => idx + 1).join(', ');
								registerDiagnostic(lineIdx, '🔸 ', `❗DUPE: lines: ${humanLineNumbers}`);
							});
						}
					});
					if (duplicateCount > 0) {
						registerDiagnostic(sec.lineIndex, '🔸 ', `❗UNIQUE: count: ${duplicateCount}`);
					}
				}

				if (ruleType === 'ALPHA') {
					let unsortedCount = 0;
					for (let i = 0; i < scopedLines.length - 1; i++) {
						if (scopedLines[i].clean.localeCompare(scopedLines[i + 1].clean) > 0) {
							unsortedCount++;
							registerDiagnostic(scopedLines[i + 1].lineIndex, '🔹 ', '❗ALPHA: item is out of order');
						}
					}
					if (unsortedCount > 0) {
						registerDiagnostic(sec.lineIndex, '🔸 ', `❗ALPHA: count: ${unsortedCount}`);
					}
				}

				if (ruleType === 'FORMATQ' || ruleType === 'FORMATC' || ruleType === 'FORMAT') {
					scopedLines.forEach(l => {
						const parsed = parseMarkdownLine(l.raw);
						let mismatch = false;
						if (ruleType === 'FORMATQ') {
							if (parsed.dataQuote !== '"' || parsed.hasComma) {
								mismatch = true;
							}
						} else if (ruleType === 'FORMATC') {
							if (parsed.dataQuote !== '"' || !parsed.hasComma) {
								mismatch = true;
							}
						} else if (ruleType === 'FORMAT') {
							if (parsed.dataQuote !== '' || parsed.hasComma) {
								mismatch = true;
							}
						}
						if (mismatch) {
							registerDiagnostic(l.lineIndex, '🔸 ', `❗FORMAT: expected ${ruleType}`);
						}
					});
				}
			});
		});

		// Evaluate section-local HTML comments (e.g., <!-- UNIQUE --> or <!-- ALPHA --> or <!-- FORMATQ -->, etc.)
		sections.forEach(sec => {
			const localRules = new Set();
			const nextSec = sections.find(s => s.lineIndex > sec.lineIndex);
			const startLine = sec.lineIndex + 1;
			const endLine = nextSec ? nextSec.lineIndex : document.lineCount;

			for (let i = startLine; i < endLine; i++) {
				const text = document.lineAt(i).text.trim();
				if (text.startsWith('<!--') && text.endsWith('-->')) {
					const inner = text.substring(4, text.length - 3).trim();
					if (inner === 'UNIQUE' || inner === 'ALPHA' || inner === 'FORMAT' || inner === 'FORMATQ' || inner === 'FORMATC') {
						localRules.add(inner);
					}
				}
			}

			const scopedLines = gatherScopedSectionLines(sec, sections, '>>');

			if (localRules.has('UNIQUE')) {
				const uniqueRegistry = {};
				scopedLines.forEach(l => {
					if (!uniqueRegistry[l.clean]) uniqueRegistry[l.clean] = [];
					uniqueRegistry[l.clean].push(l.lineIndex);
				});

				let duplicateCount = 0;
				Object.keys(uniqueRegistry).forEach(key => {
					const occurrences = uniqueRegistry[key];
					if (occurrences.length > 1) {
						duplicateCount += (occurrences.length - 1);
						occurrences.forEach(lineIdx => {
							const humanLineNumbers = occurrences.map(idx => idx + 1).join(', ');
							registerDiagnostic(lineIdx, '🔸 ', `❗DUPE: lines: ${humanLineNumbers}`);
						});
					}
				});
				if (duplicateCount > 0) {
					registerDiagnostic(sec.lineIndex, '🔸 ', `❗UNIQUE: count: ${duplicateCount}`);
				}
			}

			if (localRules.has('ALPHA')) {
				let unsortedCount = 0;
				for (let i = 0; i < scopedLines.length - 1; i++) {
					if (scopedLines[i].clean.localeCompare(scopedLines[i + 1].clean) > 0) {
						unsortedCount++;
						registerDiagnostic(scopedLines[i + 1].lineIndex, '🔹 ', '❗ALPHA: item is out of order');
					}
				}
				if (unsortedCount > 0) {
					registerDiagnostic(sec.lineIndex, '🔸 ', `❗ALPHA: count: ${unsortedCount}`);
				}
			}

			['FORMAT', 'FORMATQ', 'FORMATC'].forEach(fType => {
				if (localRules.has(fType)) {
					scopedLines.forEach(l => {
						const parsed = parseMarkdownLine(l.raw);
						let mismatch = false;
						if (fType === 'FORMATQ') {
							if (parsed.dataQuote !== '"' || parsed.hasComma) {
								mismatch = true;
							}
						} else if (fType === 'FORMATC') {
							if (parsed.dataQuote !== '"' || !parsed.hasComma) {
								mismatch = true;
							}
						} else if (fType === 'FORMAT') {
							if (parsed.dataQuote !== '' || parsed.hasComma) {
								mismatch = true;
							}
						}
						if (mismatch) {
							registerDiagnostic(l.lineIndex, '🔸 ', `❗FORMAT: expected ${fType}`);
						}
					});
				}
			});
		});

		// Every line in the document should have a blank before so as to even out the lines
		// Otherise the blank is removed if line has one or more before icons
		for (let i = 0; i < document.lineCount; i++) {
			if (!annotationDictionary[i]) {
				annotationDictionary[i] = { prefixes: [], suffixes: [] };
			}
			if (annotationDictionary[i].prefixes.length === 0) {
				annotationDictionary[i].prefixes.push('\u00a0\u00a0');
			}
		}

		// Flatten diagnostic map values and paint screen elements
		const nativeDecorationsArray = [];

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

		editor.setDecorations(hellDecorationType, nativeDecorationsArray);
	});
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
						let injectText = incomingLines.map(l => {
							let clean = l;
							const leadSpaces = clean.match(/^( +)/);
							if (leadSpaces) {
								const spaceCount = leadSpaces[1].length;
								const tabCount = Math.max(1, Math.floor(spaceCount / 2));
								clean = '\t'.repeat(tabCount) + clean.slice(spaceCount);
							}
							return clean.trim().startsWith('-') || clean.trim().startsWith('*') || clean.trim().startsWith('+') || clean.trim().startsWith('\t') ? clean : `- ${clean}`;
						}).join('\n') + '\n';

						if (startLine >= document.lineCount) {
							injectText = '\n' + injectText;
						}
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
		vscode.window.onDidChangeActiveTextEditor(() => runAutoSyncCycle()),
		vscode.workspace.onDidOpenTextDocument(() => runAutoSyncCycle()),
		vscode.window.onDidChangeVisibleTextEditors(() => evaluateDocumentIntegrity())
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
			const originalText = activeSec.contentLines[idx].raw;
			if (originalText !== lineObj.raw) {
				const targetRange = new vscode.Range(targetLineIdx, 0, targetLineIdx, originalText.length);
				editBuilder.replace(targetRange, lineObj.raw);
			}
		});
	});
	vscode.window.setStatusBarMessage(`HELL: Sorted ${sortedLines.length} list elements alphabetically!`, 3000);
	evaluateDocumentIntegrity();
}

// --- HELL CORE UTILITIES & ADAPTERS FOR ADVANCED OPERATIONS ---

function getSectionRuleTypes(sec, sections, document) {
	const ruleTypes = new Set();

	// Check local inline comment directives (e.g. <!-- UNIQUE --> or <!-- ALPHA -->)
	const nextSec = sections.find(s => s.lineIndex > sec.lineIndex);
	const startLine = sec.lineIndex + 1;
	const endLine = nextSec ? nextSec.lineIndex : document.lineCount;

	for (let i = startLine; i < endLine; i++) {
		const text = document.lineAt(i).text.trim();
		if (text.startsWith('<!--') && text.endsWith('-->')) {
			const inner = text.substring(4, text.length - 3).trim();
			if (inner === 'UNIQUE' || inner === 'ALPHA' || inner === 'FORMAT' || inner === 'FORMATQ' || inner === 'FORMATC') {
				ruleTypes.add(inner);
			}
		}
	}

	const directives = harvestActiveDirectives(document);
	directives.forEach(dir => {
		if (dir.kind !== 'marker') return;
		const tokenMatch = dir.raw.match(/^🔸\s*([A-Z_]+)\s+([^>]+?)(>>|>1>|>2>|>-2>|>!-2>)?$/);
		if (!tokenMatch) return;
		const ruleType = tokenMatch[1];
		const pathPattern = tokenMatch[2].trim();
		const combinator = tokenMatch[3] || '>>';
		
		const matchedSections = sections.filter(s => matchNamespacePattern(pathPattern, s.namespace));
		matchedSections.forEach(matchedSec => {
			let targetNodes = [];
			if (combinator === '>>') {
				targetNodes = sections.filter(s => s.namespace === matchedSec.namespace || s.namespace.startsWith(matchedSec.namespace + '::'));
			} else if (combinator === '>1>') {
				targetNodes = sections.filter(s => s.parentNamespace === matchedSec.namespace && s.level === matchedSec.level + 1);
			} else if (combinator === '>2>') {
				targetNodes = sections.filter(s => s.namespace.startsWith(matchedSec.namespace + '::') && (s.level === matchedSec.level + 1 || s.level === matchedSec.level + 2));
			} else if (combinator === '>-2>') {
				targetNodes = sections.filter(s => s.namespace.startsWith(matchedSec.namespace + '::') && s.level > matchedSec.level + 1);
			} else if (combinator === '>!-2>') {
				targetNodes = sections.filter(s => s.namespace.startsWith(matchedSec.namespace + '::') && s.namespace !== matchedSec.namespace && s.level > matchedSec.level + 1);
			}
			
			if (targetNodes.some(s => s.namespace === sec.namespace)) {
				ruleTypes.add(ruleType);
			}
		});
	});
	return ruleTypes;
}

async function writeSectionContent(editor, sec, sections, newLines) {
	const document = editor.document;
	const nextSec = sections.find(s => s.lineIndex > sec.lineIndex);
	const startLine = sec.lineIndex + 1;
	const endLine = nextSec ? nextSec.lineIndex : document.lineCount;
	
	const range = new vscode.Range(new vscode.Position(startLine, 0), new vscode.Position(endLine, 0));
	
	let textToInsert = newLines.map(l => {
		let clean = l;
		const leadSpaces = clean.match(/^( +)/);
		if (leadSpaces) {
			const spaceCount = leadSpaces[1].length;
			const tabCount = Math.max(1, Math.floor(spaceCount / 2));
			clean = '\t'.repeat(tabCount) + clean.slice(spaceCount);
		}
		return clean.trim().startsWith('-') || clean.trim().startsWith('*') || clean.trim().startsWith('+') || clean.trim().startsWith('\t') ? clean : `- ${clean}`;
	}).join('\n');

	if (textToInsert && !textToInsert.endsWith('\n')) {
		textToInsert += '\n';
	}
	
	if (startLine >= document.lineCount) {
		textToInsert = '\n' + textToInsert;
	}
	
	const existingText = document.getText(range);
	if (existingText !== textToInsert) {
		await editor.edit(editBuilder => {
			editBuilder.replace(range, textToInsert);
		});
	}
	
	evaluateDocumentIntegrity();
}

function getActiveItems(editor) {
	const document = editor.document;
	const selection = editor.selection;
	const startLine = selection.start.line;
	const endLine = selection.end.line;
	const items = [];
	for (let i = startLine; i <= endLine; i++) {
		const text = document.lineAt(i).text;
		const trimmed = text.trim();
		if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('~') || trimmed.startsWith('#')) {
			continue;
		}
		items.push({ lineIndex: i, text: text });
	}
	return items;
}

function getActiveSectionForCursor(editor, sections) {
	const cursorLine = editor.selection.active.line;
	return [...sections].reverse().find(s => s.lineIndex <= cursorLine);
}

async function relocateItem(editor, items, targetSec, actionType = null, forcedMode = null) {
	const document = editor.document;
	const sections = parseDocumentSections(document);
	
	let selectedAction = actionType;
	if (!selectedAction) {
		const choice = await vscode.window.showQuickPick([
			{ label: "📋 Copy Item(s)", value: "copy" },
			{ label: "📦 Move Item(s)", value: "move" }
		], { placeHolder: "Choose action for the active item(s)" });
		if (!choice) return;
		selectedAction = choice.value;
	}
	
	const rules = getSectionRuleTypes(targetSec, sections, document);
	let insertMode = forcedMode || "append";
	if (rules.has("UNIQUE") || rules.has("ALPHA")) {
		insertMode = "merge";
	} else if (!forcedMode) {
		const modeChoice = await vscode.window.showQuickPick([
			{ label: "📥 Prepend", value: "prepend", description: "Insert at the top of the section" },
			{ label: "📤 Append (Amend)", value: "append", description: "Insert at the bottom of the section" },
			{ label: "🔄 Merge (No duplicates)", value: "merge", description: "Ensure item does not exist, then append" }
		], { placeHolder: `How should the item(s) be inserted into '${targetSec.title}'?` });
		if (!modeChoice) return;
		insertMode = modeChoice.value;
	}
	
	const directives = harvestActiveDirectives(document);
	const targetFormat = getSectionFormat(targetSec.namespace, sections, directives);

	const originalLines = targetSec.contentLines.map(l => l.raw);
	let resultLines = [...originalLines];
	
	for (const item of items) {
		const rawText = typeof item === 'string' ? item : (item && item.text ? item.text : String(item));
		
		const activeLineIndex = item && typeof item.lineIndex === 'number' ? item.lineIndex : -1;
		let sourceSec = null;
		if (activeLineIndex !== -1) {
			sourceSec = [...sections].reverse().find(s => s.lineIndex <= activeLineIndex);
		}

		let adaptedText = rawText;
		if (item && item.isPreAdapted) {
			adaptedText = rawText;
		} else if (sourceSec) {
			adaptedText = adaptLineToSection(rawText, targetFormat, targetSec.level, sourceSec.level);
		} else {
			adaptedText = adaptLineToSection(rawText, targetFormat, targetSec.level, null);
		}

		const cleanVal = tokenizeLine(adaptedText);
		
		if (insertMode === "merge" || rules.has("UNIQUE") || rules.has("ALPHA")) {
			const exists = resultLines.some(l => tokenizeLine(l) === cleanVal);
			if (!exists) {
				resultLines.push(adaptedText);
			}
		} else if (insertMode === "prepend") {
			resultLines.unshift(adaptedText);
		} else {
			resultLines.push(adaptedText);
		}
	}
	
	if (rules.has("ALPHA")) {
		resultLines.sort((a, b) => tokenizeLine(a).localeCompare(tokenizeLine(b)));
	}
	
	await writeSectionContent(editor, targetSec, sections, resultLines);
	
	if (selectedAction === "move") {
		const sortedItemsToDelete = [...items].sort((a, b) => b.lineIndex - a.lineIndex);
		await editor.edit(editBuilder => {
			for (const item of sortedItemsToDelete) {
				const lineRange = new vscode.Range(item.lineIndex, 0, item.lineIndex + 1, 0);
				editBuilder.delete(lineRange);
			}
		});
	}
	
	const freshSections = parseDocumentSections(document);
	const freshTargetSec = freshSections.find(s => s.namespace === targetSec.namespace);
	if (freshTargetSec) {
		handleFollowFocusRouting(editor, freshTargetSec.lineIndex + 1, freshTargetSec.namespace);
	}
	
	vscode.window.showInformationMessage(`Successfully executed ${selectedAction} to '${targetSec.title}' using ${insertMode} mode!`);
}

async function dispatchMoveItemDirection(direction, forcedAction = null) {
	const editor = vscode.window.activeTextEditor;
	if (!editor) return;
	
	const document = editor.document;
	const sections = parseDocumentSections(document);
	if (sections.length === 0) return;
	
	const currentSec = getActiveSectionForCursor(editor, sections);
	if (!currentSec) {
		vscode.window.showWarningMessage("HELL: No parent heading section containing current cursor.");
		return;
	}
	
	const items = getActiveItems(editor);
	if (items.length === 0) {
		vscode.window.showWarningMessage("HELL: No valid list items found under selection.");
		return;
	}
	
	let targetSec = null;
	const currentIndex = sections.findIndex(s => s.namespace === currentSec.namespace);
	
	if (direction === 'prev') {
		if (currentIndex <= 0) {
			vscode.window.showWarningMessage("HELL: No previous section found.");
			return;
		}
		targetSec = sections[currentIndex - 1];
	} else if (direction === 'next') {
		if (currentIndex === -1 || currentIndex === sections.length - 1) {
			vscode.window.showWarningMessage("HELL: No next section found downstream.");
			return;
		}
		targetSec = sections[currentIndex + 1];
	} else if (direction === 'parent') {
		if (!currentSec.parentNamespace) {
			vscode.window.showWarningMessage("HELL: Current section has no parent heading.");
			return;
		}
		targetSec = sections.find(s => s.namespace === currentSec.parentNamespace);
		if (!targetSec) {
			vscode.window.showWarningMessage("HELL: Parent heading section is absent.");
			return;
		}
	} else if (direction === 'child') {
		const children = sections.filter(s => s.parentNamespace === currentSec.namespace && s.level === currentSec.level + 1);
		if (children.length === 0) {
			const newHeaderName = await vscode.window.showInputBox({
				prompt: "Enter the header name of the new child section to create under current heading",
				placeHolder: "e.g. Sub Tasks"
			});
			if (!newHeaderName) return;
			
			const newSectionLevel = currentSec.level + 1;
			const headingText = "\n" + "#".repeat(newSectionLevel) + " " + newHeaderName.trim();
			
			const nextSec = sections.find(s => s.lineIndex > currentSec.lineIndex);
			const insertLine = nextSec ? nextSec.lineIndex : document.lineCount;
			const insertPos = new vscode.Position(insertLine, 0);
			
			await editor.edit(editBuilder => {
				editBuilder.insert(insertPos, headingText + "\n\n");
			});
			
			const freshSecs = parseDocumentSections(document);
			const newNamespace = `${currentSec.namespace}::${newHeaderName.trim()}`;
			targetSec = freshSecs.find(s => s.namespace === newNamespace);
		} else if (children.length === 1) {
			targetSec = children[0];
		} else {
			const parentChoice = await vscode.window.showQuickPick(children.map(s => ({
				label: s.namespace,
				section: s
			})), { placeHolder: "Select a child section to target" });
			if (!parentChoice) return;
			targetSec = parentChoice.section;
		}
	} else if (direction === 'sibling') {
		const siblings = sections.filter(s => s.parentNamespace === currentSec.parentNamespace && s.level === currentSec.level && s.namespace !== currentSec.namespace);
		if (siblings.length === 0) {
			vscode.window.showWarningMessage("HELL: Current section has no active sibling headings.");
			return;
		}
		if (siblings.length === 1) {
			targetSec = siblings[0];
		} else {
			const choice = await vscode.window.showQuickPick(siblings.map(s => ({
				label: s.namespace,
				section: s
			})), { placeHolder: "Select a sibling heading section" });
			if (!choice) return;
			targetSec = choice.section;
		}
	}
	
	if (targetSec) {
		await relocateItem(editor, items, targetSec, forcedAction);
	}
}

async function executeItemPrimitiveCommand(mode) {
	const editor = vscode.window.activeTextEditor;
	if (!editor) return;
	
	const document = editor.document;
	const sections = parseDocumentSections(document);
	if (sections.length === 0) return;
	
	const items = getActiveItems(editor);
	if (items.length === 0) {
		vscode.window.showWarningMessage("HELL: No valid list items selected.");
		return;
	}
	
	const targets = sections.map(s => ({
		label: s.namespace,
		section: s
	}));
	targets.sort((a, b) => a.label.localeCompare(b.label));
	const targetChoice = await vscode.window.showQuickPick(targets, {
		placeHolder: `Select target section to ${mode} item(s) into`
	});
	if (!targetChoice) return;
	
	await relocateItem(editor, items, targetChoice.section, null, mode);
}

async function executeGeneralItemCopyCommand() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) return;
	
	const document = editor.document;
	const sections = parseDocumentSections(document);
	if (sections.length === 0) return;
	
	const items = getActiveItems(editor);
	if (items.length === 0) {
		vscode.window.showWarningMessage("HELL: No valid items selected.");
		return;
	}
	
	const targets = sections.map(s => ({
		label: s.namespace,
		section: s
	}));
	targets.sort((a, b) => a.label.localeCompare(b.label));
	const choice = await vscode.window.showQuickPick(targets, {
		placeHolder: "Select a target section to copy the selection into"
	});
	if (!choice) return;
	
	await relocateItem(editor, items, choice.section, "copy");
}

async function executeGeneralItemMoveCommand() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) return;
	
	const document = editor.document;
	const sections = parseDocumentSections(document);
	if (sections.length === 0) return;
	
	const items = getActiveItems(editor);
	if (items.length === 0) {
		vscode.window.showWarningMessage("HELL: No valid items selected.");
		return;
	}
	
	const targets = sections.map(s => ({
		label: s.namespace,
		section: s
	}));
	targets.sort((a, b) => a.label.localeCompare(b.label));
	const choice = await vscode.window.showQuickPick(targets, {
		placeHolder: "Select a target section to move the selection into"
	});
	if (!choice) return;
	
	await relocateItem(editor, items, choice.section, "move");
}

function parsePipelineDirectiveLine(lineText) {
	const match = lineText.match(/^(EXPORT|IMPORT)\s+([^\s]+)\s+([^\s]+)\s+([^>]+)(>>|>1>|>2>|>-2>|>!-2>)\s+(.*)$/);
	if (!match) {
		const autoMatch = lineText.match(/^(EXPORT|IMPORT)\s+AUTO\s+([^\s]+)\s+([^\s]+)\s+([^>]+)(>>|>1>|>2>|>-2>|>!-2>)\s+(.*)$/);
		if (autoMatch) {
			return {
				operation: autoMatch[1],
				isAuto: true,
				name: autoMatch[2],
				filePath: autoMatch[3],
				sectionPattern: autoMatch[4].trim(),
				combinator: autoMatch[5],
				options: autoMatch[6].trim().split(/\s+/)
			};
		}
		return null;
	}
	return {
		operation: match[1],
		isAuto: false,
		name: match[2],
		filePath: match[3],
		sectionPattern: match[4].trim(),
		combinator: match[5],
		options: match[6].trim().split(/\s+/)
	};
}

async function executePipeline(editor, pipeline, sections) {
	const document = editor.document;
	const fileDir = path.dirname(document.uri.fsPath);
	const targetFilePath = path.resolve(fileDir, pipeline.filePath);
	
	const targetFolder = path.dirname(targetFilePath);
	if (!fs.existsSync(targetFolder)) {
		fs.mkdirSync(targetFolder, { recursive: true });
	}
	
	const sec = sections.find(s => matchNamespacePattern(pipeline.sectionPattern, s.namespace));
	if (!sec) {
		vscode.window.showWarningMessage(`HELL Pipeline error: Target section '${pipeline.sectionPattern}' not found in document.`);
		return;
	}
	
	const combinator = pipeline.combinator || '>>';
	const options = pipeline.options || [];
	
	if (pipeline.operation === 'EXPORT') {
		const lines = gatherScopedSectionLines(sec, sections, combinator);
		let textLines = [];
		if (options.includes('STRIP')) {
			textLines = lines.map(l => l.clean);
		} else {
			textLines = lines.map(l => l.raw);
		}
		if (options.includes('UNIQUE')) {
			textLines = Array.from(new Set(textLines));
		}
		if (options.includes('SORT')) {
			textLines.sort();
		}
		let fileContent = '';
		if (pipeline.filePath.endsWith('.json')) {
			fileContent = JSON.stringify(textLines, null, 2);
		} else {
			fileContent = textLines.join('\n') + '\n';
		}
		fs.writeFileSync(targetFilePath, fileContent, 'utf8');
		vscode.window.showInformationMessage(`Successfully executed EXPORT named '${pipeline.name}' to file: ${pipeline.filePath}`);
	} else if (pipeline.operation === 'IMPORT') {
		if (!fs.existsSync(targetFilePath)) {
			vscode.window.showWarningMessage(`HELL Pipeline error: Source import file '${pipeline.filePath}' does not exist.`);
			return;
		}
		const fileData = fs.readFileSync(targetFilePath, 'utf8');
		let incomingLines = [];
		if (pipeline.filePath.endsWith('.json')) {
			try {
				const arr = JSON.parse(fileData);
				incomingLines = Array.isArray(arr) ? arr.map(String) : [];
			} catch (e) {
				vscode.window.showErrorMessage(`HELL Pipeline error: Failed to parse JSON from ${pipeline.filePath}`);
				return;
			}
		} else {
			incomingLines = fileData.split(/\r?\n/).filter(Boolean);
		}
		const cleanIncoming = incomingLines.map(tokenizeLine);
		const existingLines = gatherScopedSectionLines(sec, sections, combinator);
		let finalLines = existingLines.map(l => l.raw);
		
		if (options.includes('REPLACE')) {
			finalLines = incomingLines;
		} else if (options.includes('ADD')) {
			for (const line of incomingLines) {
				const cleanLine = tokenizeLine(line);
				if (!finalLines.some(fl => tokenizeLine(fl) === cleanLine)) {
					finalLines.push(line);
				}
			}
		} else if (options.includes('SUBTRACT')) {
			const incomingCleans = new Set(cleanIncoming);
			finalLines = finalLines.filter(fl => !incomingCleans.has(tokenizeLine(fl)));
		} else {
			finalLines.push(...incomingLines);
		}
		if (options.includes('UNIQUE')) {
			const cleans = new Set();
			finalLines = finalLines.filter(line => {
				const cl = tokenizeLine(line);
				if (cleans.has(cl)) return false;
				cleans.add(cl);
				return true;
			});
		}
		if (options.includes('SORT')) {
			finalLines.sort((a, b) => tokenizeLine(a).localeCompare(tokenizeLine(b)));
		}
		await writeSectionContent(editor, sec, sections, finalLines);
		vscode.window.showInformationMessage(`Successfully executed IMPORT named '${pipeline.name}' from file: ${pipeline.filePath}`);
	}
}

async function executeNamedExportCommand() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) return;
	const document = editor.document;
	const text = document.getText();
	const directives = harvestActiveDirectives(document);
	const exportPipelines = [];
	directives.forEach(dir => {
		if (dir.kind !== 'pipeline') return;
		const parsed = parsePipelineDirectiveLine(dir.raw);
		if (parsed && parsed.operation === 'EXPORT') {
			exportPipelines.push(parsed);
		}
	});
	if (exportPipelines.length === 0) {
		const directivesMatch = text.match(/<!--\s*HELL:(?:SAMPLE\s+)?DIRECTIVES([\s\S]*?)-->/);
		await editor.edit(editBuilder => {
			if (directivesMatch) {
				const matchEndIdx = text.indexOf(directivesMatch[0]) + directivesMatch[0].length;
				const endCommentPos = document.positionAt(matchEndIdx - 3);
				editBuilder.insert(endCommentPos, "\n// EXPORT sample_export ./backups/export.json SectionA >> REPLACE SORT STRIP UNIQUE\n");
			} else {
				editBuilder.insert(new vscode.Position(0, 0), DIRECTIVES_EXAMPLE_TEMPLATE + "\n\n");
			}
		});
		vscode.window.showInformationMessage("HELL: No EXPORT pipelines found. Auto-inserted a sample reference snippet.");
		return;
	}
	const choices = exportPipelines.map(p => ({
		label: p.name,
		description: `Export to ${p.filePath}`,
		detail: `Section: ${p.sectionPattern} using combinator ${p.combinator}`,
		pipeline: p
	}));
	const choice = await vscode.window.showQuickPick(choices, {
		placeHolder: "Select a named EXPORT pipeline to dispatch"
	});
	if (!choice) return;
	const sections = parseDocumentSections(document);
	await executePipeline(editor, choice.pipeline, sections);
}

async function executeInsertExampleCommand() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) return;
	const cursorPosition = editor.selection.active;
	const sampleTemplate = `<!-- HELL:SAMPLE DIRECTIVES
strip out the SAMPLE text string designator token keyword above to make these options operational.
all active commands, file pipelines and alignment scripts must stay wrapped inside HTML code comments.

// EXPORT standard_backup ./backups/backup.json Phase 1::Active Tasks >> REPLACE SORT STRIP UNIQUE
IMPORT AUTO shared_data ./data/shared.json Global Registry::Incoming Items >> ADD SORT UNIQUE

🔸 UNIQUE Phase 1::Bugs
🔸 ALPHA Sprint *::Tasks
🔸 UNIQUE **::Notes
🔸 ALPHA Release /(1|2)/::Logs

🔸 UNIQUE Production Container >>
🔸 UNIQUE Master Index >1>
🔸 ALPHA Master Index >2>
🔸 UNIQUE Master Index >-2>
🔸 UNIQUE Master Index >!-2>

FOLLOW COPY MOVE {global}
FOLLOW -MOVE
-->`;
	await editor.edit(editBuilder => {
		editBuilder.insert(cursorPosition, sampleTemplate + "\n");
	});
	vscode.window.showInformationMessage("HELL: Automatically stamped example config block comment under cursor.");
}

async function executeInsertDirectivesCommand() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) return;
	
	const document = editor.document;
	const activeLine = editor.selection.active.line;
	const isLastLine = activeLine === document.lineCount - 1;
	const lastLineText = document.lineAt(activeLine).text;
	
	let insertText = "<!-- HELL:DIRECTIVES\n\n-->\n";
	let insertPos;
	
	if (isLastLine) {
		insertPos = new vscode.Position(activeLine, lastLineText.length);
		insertText = "\n" + "<!-- HELL:DIRECTIVES\n\n-->";
	} else {
		insertPos = new vscode.Position(activeLine + 1, 0);
	}
	
	await editor.edit(editBuilder => {
		editBuilder.insert(insertPos, insertText);
	});
	
	const targetLine = activeLine + 2;
	const newCursorPos = new vscode.Position(targetLine, 0);
	editor.selection = new vscode.Selection(newCursorPos, newCursorPos);
}

async function executeWrapDirectivesCommand() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) return;
	
	const selection = editor.selection;
	const selectedText = editor.document.getText(selection);
	
	const wrapTemplate = `<!-- HELL:DIRECTIVES\n${selectedText}\n-->`;
	
	await editor.edit(editBuilder => {
		editBuilder.replace(selection, wrapTemplate);
	});
}

async function executeItemPrimitiveActionCommand(action, mode) {
	const editor = vscode.window.activeTextEditor;
	if (!editor) return;
	
	const document = editor.document;
	const sections = parseDocumentSections(document);
	if (sections.length === 0) return;
	
	const items = getActiveItems(editor);
	if (items.length === 0) {
		vscode.window.showWarningMessage("HELL: No valid list items selected.");
		return;
	}
	
	const targets = sections.map(s => ({
		label: s.namespace,
		section: s
	}));
	targets.sort((a, b) => a.label.localeCompare(b.label));
	const targetChoice = await vscode.window.showQuickPick(targets, {
		placeHolder: `Select target section to ${action} & ${mode} item(s) into`
	});
	if (!targetChoice) return;
	
	await relocateItem(editor, items, targetChoice.section, action, mode);
}

async function configureSectionContentInteractive(editor, sections) {
	const stack = new PickerStack();
	return new Promise(async (resolve) => {
		const stepSelectSection = async () => {
			stack.push(stepSelectSection);
			const items = sections.map(s => ({
				label: s.namespace,
				description: `Heading Level ${s.level}`,
				section: s
			}));
			items.sort((a, b) => a.label.localeCompare(b.label));
			const choice = await vscode.window.showQuickPick(stack.injectBackItem(items), {
				placeHolder: "Select a Section to inspect"
			});
			if (stack.handleBackSelection(choice)) return;
			if (!choice) { resolve(null); return; }
			const selectedSec = choice.section;
			
			const stepSelectCombinator = async () => {
				stack.push(stepSelectCombinator);
				const comChoices = [
					{ label: "Exact Section Content (Self only)", value: "self" },
					{ label: "Recursive descendants (Self and children >>)", value: ">>" },
					{ label: "Immediate Level-1 Children only (>1>)", value: ">1>" },
					{ label: "Children and Grandchildren (>2>)", value: ">2>" },
					{ label: "Grandchildren and below (>-2>)", value: ">-2>" },
					{ label: "Grandchildren and below exclusive (>!-2>)", value: ">!-2>" }
				];
				const comChoice = await vscode.window.showQuickPick(stack.injectBackItem(comChoices), {
					placeHolder: "Choose hierarchy/child recursion combinator"
				});
				if (stack.handleBackSelection(comChoice)) return;
				if (!comChoice) { resolve(null); return; }
				const comValue = comChoice.value;
				
				const stepSelectFormatting = async () => {
					stack.push(stepSelectFormatting);
					const formatChoices = [
						{ label: "Raw string lines (Original bullets & formats)", value: "raw" },
						{ label: "Clean tokens (Strip bullets and brackets)", value: "clean" }
					];
					const formatChoice = await vscode.window.showQuickPick(stack.injectBackItem(formatChoices), {
						placeHolder: "Select text cleaning formatting style"
					});
					if (stack.handleBackSelection(formatChoice)) return;
					if (!formatChoice) { resolve(null); return; }
					const formatValue = formatChoice.value;
					
					const stepSelectModifiers = async () => {
						stack.push(stepSelectModifiers);
						const modifierPick = vscode.window.createQuickPick();
						modifierPick.title = "Select manipulation modifiers";
						modifierPick.canSelectMany = true;
						
						const modItems = [
							{ label: "Alphabetical Sort", value: "sort" },
							{ label: "Unique items only", value: "unique" }
						];
						modifierPick.items = stack.injectBackItem(modItems);
						modifierPick.onDidAccept(async () => {
							const selectedMods = modifierPick.selectedItems.map(si => si.value);
							modifierPick.dispose();
							
							let resultLines = [];
							if (comValue === "self") {
								resultLines = selectedSec.contentLines;
							} else {
								let targetNodes = [];
								if (comValue === '>>') {
									targetNodes = sections.filter(s => s.namespace === selectedSec.namespace || s.namespace.startsWith(selectedSec.namespace + '::'));
								} else if (comValue === '>1>') {
									targetNodes = sections.filter(s => s.parentNamespace === selectedSec.namespace && s.level === selectedSec.level + 1);
								} else if (comValue === '>2>') {
									targetNodes = sections.filter(s => s.namespace.startsWith(selectedSec.namespace + '::') && (s.level === selectedSec.level + 1 || s.level === selectedSec.level + 2));
								} else if (comValue === '>-2>') {
									targetNodes = sections.filter(s => s.namespace.startsWith(selectedSec.namespace + '::') && s.level > selectedSec.level + 1);
								} else if (comValue === '>!-2>') {
									targetNodes = sections.filter(s => s.namespace.startsWith(selectedSec.namespace + '::') && s.namespace !== selectedSec.namespace && s.level > selectedSec.level + 1);
								}
								targetNodes.forEach(node => resultLines.push(...node.contentLines));
							}
							
							let outputStrings = resultLines.map(l => formatValue === "clean" ? l.clean : l.raw);
							if (selectedMods.includes("unique")) {
								outputStrings = Array.from(new Set(outputStrings));
							}
							if (selectedMods.includes("sort")) {
								outputStrings.sort((a, b) => tokenizeLine(a).localeCompare(tokenizeLine(b)));
							}
							resolve({ text: outputStrings.join('\n'), section: selectedSec });
						});
						modifierPick.show();
					};
					await stepSelectModifiers();
				};
				await stepSelectFormatting();
			};
			await stepSelectCombinator();
		};
		await stepSelectSection();
	});
}

async function executeSectionCopyCommand() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) return;
	const sections = parseDocumentSections(editor.document);
	if (sections.length === 0) return;
	const config = await configureSectionContentInteractive(editor, sections);
	if (!config) return;
	await vscode.env.clipboard.writeText(config.text);
	vscode.window.showInformationMessage(`Saved configured lines of '${config.section.title}' to clipboard!`);
}

async function executeSectionInjectCommand() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) return;
	const sections = parseDocumentSections(editor.document);
	if (sections.length === 0) return;
	const config = await configureSectionContentInteractive(editor, sections);
	if (!config) return;
	const activePos = editor.selection.active;
	await editor.edit(editBuilder => {
		editBuilder.insert(new vscode.Position(activePos.line + 1, 0), config.text + '\n');
	});
	vscode.window.showInformationMessage(`Successfully injected configured lines of '${config.section.title}' below cursor line!`);
}

async function executeSectionImportCommand() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) return;
	const document = editor.document;
	const sections = parseDocumentSections(document);
	if (sections.length === 0) return;
	const items = sections.map(s => ({
		label: s.namespace,
		description: `Heading level ${s.level}`,
		section: s
	}));
	items.sort((a, b) => a.label.localeCompare(b.label));
	const targetChoice = await vscode.window.showQuickPick(items, {
		placeHolder: "Select a Section To Import Data into"
	});
	if (!targetChoice) return;
	const selectedSec = targetChoice.section;
	const uris = await vscode.window.showOpenDialog({
		canSelectMany: false,
		filters: { 'Data Files': ['json', 'txt', 'md'] },
		openLabel: "Select source file to import"
	});
	if (!uris || uris.length === 0) return;
	const filePath = uris[0].fsPath;
	const fileData = fs.readFileSync(filePath, 'utf8');
	let incomingLines = [];
	if (filePath.endsWith('.json')) {
		try {
			const arr = JSON.parse(fileData);
			incomingLines = Array.isArray(arr) ? arr.map(String) : [];
		} catch (e) {
			vscode.window.showErrorMessage(`HELL Import error: Failed to parse JSON file.`);
			return;
		}
	} else {
		incomingLines = fileData.split(/\r?\n/).filter(Boolean);
	}
	const rules = getSectionRuleTypes(selectedSec, sections, document);
	let insertMode = "append";
	if (rules.has("UNIQUE") || rules.has("ALPHA")) {
		insertMode = "merge";
	} else {
		const modeChoice = await vscode.window.showQuickPick([
			{ label: "📥 Prepend", value: "prepend" },
			{ label: "📤 Append (Amend)", value: "append" },
			{ label: "🔄 Merge (No duplicates)", value: "merge" }
		], { placeHolder: "How should the imported lines be merged?" });
		if (!modeChoice) return;
		insertMode = modeChoice.value;
	}
	const originalLines = selectedSec.contentLines.map(l => l.raw);
	let finalLines = [...originalLines];
	for (const line of incomingLines) {
		const cleanLine = tokenizeLine(line);
		if (insertMode === "merge" || rules.has("UNIQUE") || rules.has("ALPHA")) {
			if (!finalLines.some(fl => tokenizeLine(fl) === cleanLine)) {
				finalLines.push(line);
			}
		} else if (insertMode === "prepend") {
			finalLines.unshift(line);
		} else {
			finalLines.push(line);
		}
	}
	if (rules.has("ALPHA")) {
		finalLines.sort((a, b) => tokenizeLine(a).localeCompare(tokenizeLine(b)));
	}
	await writeSectionContent(editor, selectedSec, sections, finalLines);
	vscode.window.showInformationMessage(`Imported ${incomingLines.length} lines into Section '${selectedSec.title}'!`);
}

async function executeSectionExportCommand() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) return;
	const sections = parseDocumentSections(editor.document);
	if (sections.length === 0) return;
	const config = await configureSectionContentInteractive(editor, sections);
	if (!config) return;
	const uri = await vscode.window.showSaveDialog({
		filters: { 'JSON Array': ['json'], 'Text Listing': ['txt', 'md'] },
		saveLabel: "Export Section Data"
	});
	if (!uri) return;
	const filePath = uri.fsPath;
	const rawArray = config.text.split('\n');
	let content = '';
	if (filePath.endsWith('.json')) {
		content = JSON.stringify(rawArray, null, 2);
	} else {
		content = config.text + '\n';
	}
	fs.writeFileSync(filePath, content, 'utf8');
	vscode.window.showInformationMessage(`Successfully exported data to ${path.basename(filePath)}`);
}

async function executeSectionIntersectCommand() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) return;

	const sections = parseDocumentSections(editor.document);
	if (sections.length === 0) return;

	const stack = new PickerStack();

	let selectedSections = [];
	let uniqueMode = "all";
	let sortOrder = "original";

	const runStep1 = async () => {
		stack.push(runStep1);
		const sortedSections = [...sections].sort((a, b) => a.namespace.localeCompare(b.namespace));
		const pickerItems = sortedSections.map(s => ({ label: s.namespace, description: `Heading line ${s.lineIndex + 1}` }));

		const quickPick = vscode.window.createQuickPick();
		quickPick.items = pickerItems;
		quickPick.canSelectMany = true;
		quickPick.title = "🧠 INTERSECT: Step 1 - Choose multiple sections to intersect";

		quickPick.onDidAccept(async () => {
			selectedSections = quickPick.selectedItems;
			quickPick.dispose();
			if (selectedSections.length === 0) {
				return;
			}
			await runStep2();
		});
		quickPick.show();
	};

	const runStep2 = async () => {
		stack.push(runStep2);
		const modeChoice = await vscode.window.showQuickPick(stack.injectBackItem([
			{ label: "Unique elements", value: "unique", description: "Keep only unique lines across the intersect results" },
			{ label: "Keep duplicates", value: "all", description: "Keep duplicates if present in all sections" }
		]), { placeHolder: "INTERSECT: Select elements uniqueness filter" });

		if (stack.handleBackSelection(modeChoice)) {
			return;
		}
		if (!modeChoice) {
			return;
		}
		uniqueMode = modeChoice.value;
		await runStep3();
	};

	const runStep3 = async () => {
		stack.push(runStep3);
		const sortChoice = await vscode.window.showQuickPick(stack.injectBackItem([
			{ label: "Keep original order", value: "original", description: "Maintain existing document line sequence" },
			{ label: "Sort alphabetically (A-Z)", value: "alpha", description: "Sort final results in alphabetical order" }
		]), { placeHolder: "INTERSECT: Select sort ordering layout" });

		if (stack.handleBackSelection(sortChoice)) {
			return;
		}
		if (!sortChoice) {
			return;
		}
		sortOrder = sortChoice.value;
		await runStep4();
	};

	const runStep4 = async () => {
		stack.push(runStep4);
		const actionChoice = await vscode.window.showQuickPick(stack.injectBackItem([
			{ label: "📋 Copy Intersection Set Array", value: "copy" },
			{ label: "💉 Inject Intersection Elements Below Cursor", value: "inject" }
		]), { placeHolder: "INTERSECT: Choose final execution method for intersection results" });

		if (stack.handleBackSelection(actionChoice)) {
			return;
		}
		if (!actionChoice) {
			return;
		}

		// Gather elements from each selected section
		const sectionLinesMap = selectedSections.map(item => {
			const targetNode = sections.find(s => s.namespace === item.label);
			return targetNode ? targetNode.contentLines : [];
		});

		// Compute intersection based on clean token values
		let intersectLines = [];
		if (sectionLinesMap.length > 0) {
			const firstSectionLines = sectionLinesMap[0];
			firstSectionLines.forEach(l => {
				const existsInAll = sectionLinesMap.slice(1).every(linesArray => 
					linesArray.some(otherL => otherL.clean === l.clean)
				);
				if (existsInAll) {
					intersectLines.push(l.raw);
				}
			});
		}

		let finalLines = intersectLines;
		if (uniqueMode === "unique") {
			const seen = new Set();
			finalLines = finalLines.filter(line => {
				const cl = tokenizeLine(line);
				if (seen.has(cl)) return false;
				seen.add(cl);
				return true;
			});
		}

		if (sortOrder === "alpha") {
			finalLines.sort((a, b) => tokenizeLine(a).localeCompare(tokenizeLine(b)));
		}

		if (actionChoice.value === "copy") {
			await vscode.env.clipboard.writeText(finalLines.join('\n'));
			vscode.window.showInformationMessage(`HELL: Saved intersection result [${finalLines.length} lines] to clipboard!`);
		} else {
			const insertPos = new vscode.Position(editor.selection.active.line + 1, 0);
			await editor.edit(editBuilder => editBuilder.insert(insertPos, finalLines.join('\n') + '\n'));
			handleFollowFocusRouting(editor, insertPos.line, selectedSections[0]?.label);
		}
	};

	await runStep1();
}

async function executeItemRemoveFromSectionsCommand() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) { return; }

	const sections = parseDocumentSections(editor.document);
	if (sections.length === 0) { return; }

	const sortedSections = [...sections].sort((a, b) => a.namespace.localeCompare(b.namespace));
	const selectSections = await vscode.window.showQuickPick(sortedSections.map(s => ({
		label: s.namespace,
		section: s
	})), { canPickMany: true, placeHolder: "Step 1: Choose sections to remove items from" });

	if (!selectSections || selectSections.length === 0) { return; }

	const uniqueItemsMap = new Map();
	selectSections.forEach(choice => {
		choice.section.contentLines.forEach(lineObj => {
			if (!uniqueItemsMap.has(lineObj.clean)) {
				uniqueItemsMap.set(lineObj.clean, {
					clean: lineObj.clean,
					raw: lineObj.raw,
					occurrences: []
				});
			}
			uniqueItemsMap.get(lineObj.clean).occurrences.push({
				section: choice.section,
				lineIndex: lineObj.lineIndex
			});
		});
	});

	if (uniqueItemsMap.size === 0) {
		vscode.window.showInformationMessage("HELL: No lines found in selected sections.");
		return;
	}

	const pickerItems = Array.from(uniqueItemsMap.values()).map(item => ({
		label: item.raw,
		description: `Occurrences: ${item.occurrences.length}`,
		clean: item.clean,
		occurrences: item.occurrences
	})).sort((a, b) => a.clean.localeCompare(b.clean));

	const itemQuickPick = vscode.window.createQuickPick();
	itemQuickPick.items = pickerItems;
	itemQuickPick.canSelectMany = true;
	itemQuickPick.title = "Step 2: Choose specific items to remove";

	itemQuickPick.onDidAccept(async () => {
		const selectedItems = itemQuickPick.selectedItems;
		if (selectedItems.length === 0) {
			itemQuickPick.dispose();
			return;
		}
		itemQuickPick.dispose();

		const lineIndicesToDelete = new Set();
		selectedItems.forEach(item => {
			item.occurrences.forEach(occ => {
				lineIndicesToDelete.add(occ.lineIndex);
			});
		});

		await editor.edit(editBuilder => {
			const sortedIndices = Array.from(lineIndicesToDelete).sort((a, b) => b - a);
			sortedIndices.forEach(idx => {
				const range = new vscode.Range(idx, 0, idx + 1, 0);
				editBuilder.delete(range);
			});
		});

		vscode.window.showInformationMessage(`HELL: Successfully removed chosen items from selected sections.`);
		evaluateDocumentIntegrity();
	});
	itemQuickPick.show();
}

async function executeItemInjectToSectionsCommand() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) { return; }

	// Choice 1: Choose item source
	const selectedText = editor.document.getText(editor.selection);
	let txtToInject = "";
	let linesToInject = [];

	const sourceChoice = await vscode.window.showQuickPick([
		{ label: "Use active selection/items", value: "selection", description: selectedText ? `"${selectedText.substring(0, 30)}..."` : "Current text selection" },
		{ label: "Enter manual custom text...", value: "manual" }
	], { placeHolder: "INJECT Choice 1: Choose item source text" });

	if (!sourceChoice) { return; }

	if (sourceChoice.value === "selection") {
		if (!selectedText.trim()) {
			const currentLineText = editor.document.lineAt(editor.selection.active.line).text;
			if (!currentLineText.trim()) {
				vscode.window.showWarningMessage("HELL: No active text select or non-empty line under cursor.");
				return;
			}
			txtToInject = currentLineText;
		} else {
			txtToInject = selectedText;
		}
	} else {
		const input = await vscode.window.showInputBox({
			prompt: "INJECT Choice 1: Enter custom item text to inject"
		});
		if (!input) { return; }
		txtToInject = input;
	}

	linesToInject = txtToInject.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
	if (linesToInject.length === 0) {
		vscode.window.showWarningMessage("HELL: No items to inject.");
		return;
	}

	// Choice 2: Destination sections to inject into
	const sections = parseDocumentSections(editor.document);
	if (sections.length === 0) {
		vscode.window.showWarningMessage("HELL: No sections found in the current document.");
		return;
	}

	const sortedSections = [...sections].sort((a, b) => a.namespace.localeCompare(b.namespace));
	const selectSections = await vscode.window.showQuickPick(sortedSections.map(s => ({
		label: s.namespace,
		section: s
	})), { canPickMany: true, placeHolder: "INJECT Choice 2: Choose destination sections to inject items into" });

	if (!selectSections || selectSections.length === 0) { return; }

	// Choice 3: Location mode
	const modeChoice = await vscode.window.showQuickPick([
		{ label: "Prepend", value: "prepend", description: "Insert as the first item of each section" },
		{ label: "Append", value: "append", description: "Insert as the last item of each section" },
		{ label: "Merge", value: "merge", description: "Insert only if the clean text is not already present" }
	], { placeHolder: "INJECT Choice 3: Choose injection location mode" });

	if (!modeChoice) { return; }
	const mode = modeChoice.value;

	for (const choice of selectSections) {
		const targetSec = choice.section;
		await relocateItem(editor, linesToInject, targetSec, 'copy', mode);
	}
	evaluateDocumentIntegrity();
}

async function executeSectionsSortCommand() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) { return; }

	const document = editor.document;
	const sections = parseDocumentSections(document);
	if (sections.length === 0) { return; }

	const parents = new Set();
	sections.forEach(s => {
		const hasChildren = sections.some(other => other.parentNamespace === s.namespace);
		if (hasChildren) {
			parents.add(s.namespace);
		}
	});

	const parentChoices = [{ label: "Root (Top Level headings)", value: null }];
	Array.from(parents).sort().forEach(p => {
		parentChoices.push({ label: String(p), value: p });
	});

	const chosenParent = await vscode.window.showQuickPick(parentChoices, {
		placeHolder: "Select parent section whose child sections you want to sort alphabetically"
	});

	if (chosenParent === undefined) { return; }

	const parentVal = chosenParent.value;
	const children = sections.filter(s => s.parentNamespace === parentVal);
	if (children.length <= 1) {
		vscode.window.showInformationMessage("HELL: Target has 1 or fewer child sections to sort.");
		return;
	}

	const childBlocks = children.map((child) => {
		const startLine = child.lineIndex;
		let endLine = document.lineCount;

		for (let i = startLine + 1; i < document.lineCount; i++) {
			const lineText = document.lineAt(i).text;
			const m = lineText.match(/^(#+)\s+/);
			if (m) {
				const level = m[1].length;
				if (level <= child.level) {
					endLine = i;
					break;
				}
			}
		}

		const textRange = new vscode.Range(startLine, 0, endLine, 0);
		const blockText = document.getText(textRange);

		return {
			title: child.title,
			startLine,
			endLine,
			range: textRange,
			text: blockText
		};
	});

	const sortedBlocks = [...childBlocks].sort((a, b) => a.title.localeCompare(b.title));

	await editor.edit(editBuilder => {
		const indices = childBlocks.map((_, i) => i).sort((idxA, idxB) => childBlocks[idxB].startLine - childBlocks[idxA].startLine);
		indices.forEach(idx => {
			const originalRange = childBlocks[idx].range;
			const originalBlockText = childBlocks[idx].text;
			const targetBlockText = sortedBlocks[idx].text;
			if (originalBlockText !== targetBlockText) {
				editBuilder.replace(originalRange, targetBlockText);
			}
		});
	});

	vscode.window.showInformationMessage("HELL: Ordered child sections alphabetically!");
	evaluateDocumentIntegrity();
}

/**
 * Reusable utility that injects or registers metadata directives in document comments blocks.
 */
async function insertDirectiveIntoDocument(type, sectionNamespace, suffix = ">>") {
	const editor = vscode.window.activeTextEditor;
	if (!editor) return;
	const document = editor.document;
	const directiveLine = `🔸 ${type} ${sectionNamespace} ${suffix}`;

	const text = document.getText();
	const blockMatch = /<!--\s*HELL:\s*(?:SAMPLE\s+)?DIRECTIVES([\s\S]*?)-->/i.exec(text);

	if (blockMatch) {
		const matchIndex = blockMatch.index;
		const innerContent = blockMatch[1];
		const openingMatch = text.substring(matchIndex).match(/<!--\s*HELL:\s*(?:SAMPLE\s+)?DIRECTIVES/i);
		const insertOffset = matchIndex + openingMatch[0].length;
		const insertPos = document.positionAt(insertOffset);

		await editor.edit(editBuilder => {
			editBuilder.insert(insertPos, `\n${directiveLine}`);
		});
	} else {
		const prependText = `<!-- HELL:DIRECTIVES\n${directiveLine}\n-->\n\n`;
		const insertPos = new vscode.Position(0, 0);
		await editor.edit(editBuilder => {
			editBuilder.insert(insertPos, prependText);
		});
	}
	evaluateDocumentIntegrity();
}

async function executeFormatAddCommand() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) return;

	const document = editor.document;
	const sections = parseDocumentSections(document);
	if (sections.length === 0) return;

	// Choice 1: Ask user for format type
	const formatChoice = await vscode.window.showQuickPick([
		{ label: "FORMAT: raw data (unquoted, no comma)", value: "FORMAT" },
		{ label: "FORMATQ: quoted keys (double quoted, no comma)", value: "FORMATQ" },
		{ label: "FORMATC: JSON list elements (double quoted with terminal comma)", value: "FORMATC" }
	], { placeHolder: "FORMAT: Choice 1 - Select format serialization style" });

	if (!formatChoice) return;
	const formatType = formatChoice.value;

	// Choice 2: Select target section namespace
	const sortedSections = [...sections].sort((a, b) => a.namespace.localeCompare(b.namespace));
	const targetChoice = await vscode.window.showQuickPick(sortedSections.map(s => ({
		label: s.namespace,
		section: s
	})), { placeHolder: "FORMAT: Choice 2 - Select target heading namespace" });

	if (!targetChoice) return;
	const targetNamespace = targetChoice.section.namespace;

	// Choice 3: Choose combinational scope
	const scopeChoice = await vscode.window.showQuickPick([
		{ label: "Recursive descendants (>>)", value: ">>" },
		{ label: "Immediate level-1 children only (>1>)", value: ">1>" },
		{ label: "Children and grandchildren (>2>)", value: ">2>" },
		{ label: "Grandchildren and below (>-2>)", value: ">-2>" },
		{ label: "Grandchildren down excl. parent (>!-2>)", value: ">!-2>" }
	], { placeHolder: "FORMAT: Choice 3 - Select hierarchical scope combinator" });

	if (!scopeChoice) return;
	const scopeCombinator = scopeChoice.value;

	// Add the directive to document
	await insertDirectiveIntoDocument(formatType, targetNamespace, scopeCombinator);
	vscode.window.showInformationMessage(`Successfully registered ${formatType} directive for ${targetNamespace} ${scopeCombinator}`);
}

async function executeFormatRemoveCommand() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) return;

	const document = editor.document;
	const directives = harvestActiveDirectives(document);
	
	// Filter format directives
	const formatDirectives = directives.filter(dir => {
		if (dir.kind !== 'marker') return false;
		return /^🔸\s*(FORMAT|FORMATQ|FORMATC)\s+/.test(dir.raw);
	});

	if (formatDirectives.length === 0) {
		vscode.window.showInformationMessage("HELL: No formatting directives found in the current document.");
		return;
	}

	const choices = formatDirectives.map(dir => ({
		label: dir.raw,
		directive: dir
	}));

	const selected = await vscode.window.showQuickPick(choices, {
		canPickMany: true,
		placeHolder: "Choose formatting directives to remove"
	});

	if (!selected || selected.length === 0) return;

	// Remove selected directives from document
	const sortedToDelete = [...selected].sort((a, b) => b.directive.lineIndex - a.directive.lineIndex);

	await editor.edit(editBuilder => {
		sortedToDelete.forEach(item => {
			const idx = item.directive.lineIndex;
			editBuilder.delete(new vscode.Range(idx, 0, idx + 1, 0));
		});
	});

	evaluateDocumentIntegrity();
	vscode.window.showInformationMessage(`Successfully removed ${selected.length} formatting directives.`);
}

async function executeSectionsSortChildItemsCommand() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) return;

	const document = editor.document;
	const sections = parseDocumentSections(document);
	if (sections.length === 0) return;

	const sortedSections = [...sections].sort((a, b) => a.namespace.localeCompare(b.namespace));
	const choice = await vscode.window.showQuickPick(sortedSections.map(s => ({
		label: s.namespace,
		section: s
	})), { placeHolder: "Select section to sort child items alphabetically" });

	if (!choice) return;

	const targetSec = choice.section;
	if (targetSec.contentLines.length === 0) {
		vscode.window.showInformationMessage(`HELL: Section '${targetSec.namespace}' has no items.`);
		return;
	}

	const sortedLines = [...targetSec.contentLines].sort((a, b) => a.clean.localeCompare(b.clean));

	await editor.edit(editBuilder => {
		sortedLines.forEach((lineObj, idx) => {
			const targetLineIdx = targetSec.contentLines[idx].lineIndex;
			const originalText = targetSec.contentLines[idx].raw;
			if (originalText !== lineObj.raw) {
				const targetRange = new vscode.Range(targetLineIdx, 0, targetLineIdx, originalText.length);
				editBuilder.replace(targetRange, lineObj.raw);
			}
		});
	});

	vscode.window.showInformationMessage(`Successfully sorted child items of section '${targetSec.namespace}'!`);
	evaluateDocumentIntegrity();
}

async function executeSectionsUniqueCommand() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) { return; }

	const sections = parseDocumentSections(editor.document);
	if (sections.length === 0) { return; }

	const sortedSections = [...sections].sort((a, b) => a.namespace.localeCompare(b.namespace));
	const selectSections = await vscode.window.showQuickPick(sortedSections.map(s => ({
		label: s.namespace,
		section: s
	})), { canPickMany: true, placeHolder: "Select sections to de-duplicate" });

	if (!selectSections || selectSections.length === 0) { return; }

	await editor.edit(editBuilder => {
		selectSections.forEach(choice => {
			const targetSec = choice.section;
			const uniqueClean = new Set();
			const duplicateLineIndices = [];

			targetSec.contentLines.forEach(lineObj => {
				if (uniqueClean.has(lineObj.clean)) {
					duplicateLineIndices.push(lineObj.lineIndex);
				} else {
					uniqueClean.add(lineObj.clean);
				}
			});

			duplicateLineIndices.sort((a, b) => b - a).forEach(idx => {
				const range = new vscode.Range(idx, 0, idx + 1, 0);
				editBuilder.delete(range);
			});
		});
	});

	vscode.window.showInformationMessage("HELL: Cleaned duplicates out of chosen sections!");
	evaluateDocumentIntegrity();
}

async function executeAddDirectiveCommand(type) {
	const editor = vscode.window.activeTextEditor;
	if (!editor) { return; }

	const document = editor.document;
	const sections = parseDocumentSections(document);
	if (sections.length === 0) { return; }

	const sortedSections = [...sections].sort((a, b) => a.namespace.localeCompare(b.namespace));
	const choice = await vscode.window.showQuickPick(sortedSections.map(s => ({
		label: s.namespace,
		section: s
	})), { placeHolder: `Choose section to add <!-- ${type} --> directive for` });

	if (!choice) { return; }

	const sec = choice.section;
	const startLine = sec.lineIndex + 1;
	const nextSec = sections.find(s => s.lineIndex > sec.lineIndex);
	const endLine = nextSec ? nextSec.lineIndex : document.lineCount;

	// Check if already present on first few lines of the section content
	let found = false;
	for (let i = startLine; i < endLine; i++) {
		const text = document.lineAt(i).text.trim();
		if (text === `<!-- ${type} -->`) {
			found = true;
			break;
		}
	}

	if (found) {
		vscode.window.showInformationMessage(`HELL: Directive <!-- ${type} --> already exists in section '${sec.namespace}'.`);
		return;
	}

	// Insert the comment right below the header line
	const insertPos = new vscode.Position(startLine, 0);
	await editor.edit(editBuilder => {
		editBuilder.insert(insertPos, `<!-- ${type} -->\n`);
	});

	vscode.window.showInformationMessage(`Successfully added <!-- ${type} --> directive to section '${sec.namespace}'.`);
	evaluateDocumentIntegrity();
}

async function executeItemYankCommand() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) { return; }

	const document = editor.document;
	const sections = parseDocumentSections(document);
	if (sections.length === 0) { return; }

	// Step 1: Picker - From sections
	const sortedSections = [...sections].sort((a, b) => a.namespace.localeCompare(b.namespace));
	const selectSourceSections = await vscode.window.showQuickPick(sortedSections.map(s => ({
		label: s.namespace,
		section: s
	})), { canPickMany: true, placeHolder: "YANK Step 1: Choose source sections to yank items from" });

	if (!selectSourceSections || selectSourceSections.length === 0) { return; }

	let allSourceLines = [];

	// Step 2: For each section, select hierarchy child depth OR specific items
	for (const choice of selectSourceSections) {
		const sec = choice.section;
		const methodChoice = await vscode.window.showQuickPick([
			{ label: "This section only (no children)", value: "self" },
			{ label: "Recursive descendants (>>)", value: ">>" },
			{ label: "Immediate level-1 children only (>1>)", value: ">1>" },
			{ label: "Children and grandchildren (>2>)", value: ">2>" },
			{ label: "Grandchildren and below (>-2>)", value: ">-2>" },
			{ label: "Grandchildren down excl. parent (>!-2>)", value: ">!-2>" },
			{ label: "👉 Choose specific items...", value: "items" }
		], { placeHolder: `YANK Step 2: Choose scope for section '${sec.namespace}'` });

		if (!methodChoice) return;

		if (methodChoice.value === "items") {
			if (sec.contentLines.length === 0) {
				vscode.window.showWarningMessage(`Section '${sec.namespace}' has no items.`);
				continue;
			}
			const itemChoices = sec.contentLines.map(lineObj => ({
				label: lineObj.raw,
				lineObj: lineObj
			}));
			const chosenSecItems = await vscode.window.showQuickPick(itemChoices, {
				canPickMany: true,
				placeHolder: `Select specific items to yank from '${sec.namespace}'`
			});
			if (!chosenSecItems || chosenSecItems.length === 0) continue;
			allSourceLines.push(...chosenSecItems.map(item => item.lineObj));
		} else {
			const targetNodes = sections.filter(s => {
				const cm = methodChoice.value;
				if (cm === "self") {
					return s.namespace === sec.namespace;
				} else if (cm === ">>") {
					return s.namespace === sec.namespace || s.namespace.startsWith(sec.namespace + '::');
				} else if (cm === ">1>") {
					return s.namespace === sec.namespace || (s.parentNamespace === sec.namespace && s.level === sec.level + 1);
				} else if (cm === ">2>") {
					return s.namespace === sec.namespace || (s.namespace.startsWith(sec.namespace + '::') && s.level <= sec.level + 2);
				} else if (cm === ">-2>") {
					return s.namespace.startsWith(sec.namespace + '::') && s.level >= sec.level + 2;
				} else if (cm === ">!-2>") {
					return s.namespace.startsWith(sec.namespace + '::') && s.level > sec.level + 2;
				}
				return false;
			});
			targetNodes.forEach(node => {
				allSourceLines.push(...node.contentLines);
			});
		}
	}

	if (allSourceLines.length === 0) {
		vscode.window.showInformationMessage("HELL: No lines collected.");
		return;
	}

	// Step 3: Picker - Flatten
	const flattenChoice = await vscode.window.showQuickPick([
		{ label: "Flatten (Remove indentation levels)", value: "yes" },
		{ label: "Preserve nesting hierarchy", value: "no" }
	], { placeHolder: "YANK Step 3: Flatten sections/items hierarchy?" });

	if (!flattenChoice) return;
	const doFlatten = flattenChoice.value === "yes";

	// Step 4: Picker - Sort
	const sortChoice = await vscode.window.showQuickPick([
		{ label: "Keep original order", value: "normal" },
		{ label: "Sort alphabetically A-Z (Sorts on data, not literal line)", value: "alpha" }
	], { placeHolder: "YANK Step 4: Sort items?" });

	if (!sortChoice) return;
	const doSort = sortChoice.value === "alpha";

	// Step 5: Picker - Unique
	const uniqueChoice = await vscode.window.showQuickPick([
		{ label: "Keep duplicates", value: "all" },
		{ label: "Unique items only (deduplicate on token data)", value: "unique" }
	], { placeHolder: "YANK Step 5: Filter duplicates?" });

	if (!uniqueChoice) return;
	const doUnique = uniqueChoice.value === "unique";

	// Apply filtering/sorting
	let processedItems = [...allSourceLines];
	if (doUnique) {
		const seen = new Set();
		processedItems = processedItems.filter(item => {
			const cl = tokenizeLine(item.raw);
			if (seen.has(cl)) return false;
			seen.add(cl);
			return true;
		});
	}
	if (doSort) {
		processedItems.sort((a, b) => tokenizeLine(a.raw).localeCompare(tokenizeLine(b.raw)));
	}

	// Step 6: Picker - Inject or Copy
	const targetChoice = await vscode.window.showQuickPick([
		{ label: "💉 Inject (Cut from source, insert in active section)", value: "inject" },
		{ label: "📋 Copy (Copy to clipboard, keep at source)", value: "copy" }
	], { placeHolder: "YANK Step 6: Choose destination target" });

	if (!targetChoice) return;

	if (targetChoice.value === "copy") {
		const rawLineTexts = processedItems.map(item => item.raw);
		await vscode.env.clipboard.writeText(rawLineTexts.join('\n'));
		vscode.window.showInformationMessage(`HELL: Copied ${rawLineTexts.length} items to clipboard!`);
	} else {
		// Identify active section under cursor
		const cursorLine = editor.selection.active.line;
		const activeSec = [...sections].reverse().find(s => s.lineIndex <= cursorLine);
		if (!activeSec) {
			vscode.window.showWarningMessage("HELL: Please place cursor inside a active section first.");
			return;
		}

		// Step 7: Picker - Prepend, Append, Merge
		const injectModeChoice = await vscode.window.showQuickPick([
			{ label: "Prepend", value: "prepend" },
			{ label: "Append", value: "append" },
			{ label: "Merge", value: "merge" }
		], { placeHolder: `YANK Step 7: Insertion mode for '${activeSec.namespace}'` });

		if (!injectModeChoice) return;

		// Perform cut: Delete the yanked lines from their original source indices
		const sortedLineIndicesToDelete = processedItems.map(it => it.lineIndex).sort((a, b) => b - a);
		await editor.edit(editBuilder => {
			sortedLineIndicesToDelete.forEach(lineIdx => {
				editBuilder.delete(new vscode.Range(lineIdx, 0, lineIdx + 1, 0));
			});
		});

		// Now write the items into the active section.
		const freshSections = parseDocumentSections(editor.document);
		const freshActiveSec = freshSections.find(s => s.namespace === activeSec.namespace);
		if (freshActiveSec) {
			const itemsToRelocate = processedItems.map(orig => {
				const rawText = orig.raw;
				let itemWithNestingObj = { text: rawText, lineIndex: -1, isPreAdapted: true };
				if (!doFlatten) {
					const directives = harvestActiveDirectives(document);
					const targetFormat = getSectionFormat(freshActiveSec.namespace, freshSections, directives);
					const sourceSec = [...sections].reverse().find(s => s.lineIndex <= orig.lineIndex);
					let sourceLevel = sourceSec ? sourceSec.level : null;
					
					itemWithNestingObj.text = adaptLineToSection(rawText, targetFormat, freshActiveSec.level, sourceLevel);
				} else {
					const directives = harvestActiveDirectives(document);
					const targetFormat = getSectionFormat(freshActiveSec.namespace, freshSections, directives);
					itemWithNestingObj.text = adaptLineToSection(rawText, targetFormat, freshActiveSec.level, null);
				}
				return itemWithNestingObj;
			});

			await relocateItem(editor, itemsToRelocate, freshActiveSec, 'copy', injectModeChoice.value);
		}
		vscode.window.showInformationMessage(`HELL: Successfully yanked (cut and injected) ${processedItems.length} items into section '${activeSec.namespace}'!`);
	}
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

		const stack = new PickerStack();

		let selectedSections = [];
		let uniqueMode = "all";
		let sortOrder = "original";

		const runStep1 = async () => {
			stack.push(runStep1);
			const sortedSections = [...sections].sort((a, b) => a.namespace.localeCompare(b.namespace));
			const pickerItems = sortedSections.map(s => ({ label: s.namespace, description: `Heading line ${s.lineIndex + 1}` }));

			const quickPick = vscode.window.createQuickPick();
			quickPick.items = pickerItems;
			quickPick.canSelectMany = true;
			quickPick.title = "🧠 UNION: Step 1 - Choose multiple sections to blend";

			quickPick.onDidAccept(async () => {
				selectedSections = quickPick.selectedItems;
				quickPick.dispose();
				if (selectedSections.length === 0) {
					return;
				}
				await runStep2();
			});
			quickPick.show();
		};

		const runStep2 = async () => {
			stack.push(runStep2);
			const modeChoice = await vscode.window.showQuickPick(stack.injectBackItem([
				{ label: "Unique elements", value: "unique", description: "Keep only unique lines across the chosen sections" },
				{ label: "Keep duplicates", value: "all", description: "Keep all lines, including duplicate entries" }
			]), { placeHolder: "UNION: Select elements uniqueness filter" });

			if (stack.handleBackSelection(modeChoice)) {
				return;
			}
			if (!modeChoice) {
				return;
			}
			uniqueMode = modeChoice.value;
			await runStep3();
		};

		const runStep3 = async () => {
			stack.push(runStep3);
			const sortChoice = await vscode.window.showQuickPick(stack.injectBackItem([
				{ label: "Keep original order", value: "original", description: "Maintain existing document line sequence" },
				{ label: "Sort alphabetically (A-Z)", value: "alpha", description: "Sort final results in alphabetical order" }
			]), { placeHolder: "UNION: Select sort ordering layout" });

			if (stack.handleBackSelection(sortChoice)) {
				return;
			}
			if (!sortChoice) {
				return;
			}
			sortOrder = sortChoice.value;
			await runStep4();
		};

		const runStep4 = async () => {
			stack.push(runStep4);
			const actionChoice = await vscode.window.showQuickPick(stack.injectBackItem([
				{ label: "📋 Copy Union Set Array", value: "copy" },
				{ label: "💉 Inject Union Elements Below Cursor", value: "inject" }
			]), { placeHolder: "UNION: Choose final execution method for union layout arrays" });

			if (stack.handleBackSelection(actionChoice)) {
				return;
			}
			if (!actionChoice) {
				return;
			}

			// Perform union compilation
			let unionLines = [];
			selectedSections.forEach(item => {
				const targetNode = sections.find(s => s.namespace === item.label);
				if (targetNode) {
					unionLines.push(...targetNode.contentLines.map(l => l.raw));
				}
			});

			if (uniqueMode === "unique") {
				const seen = new Set();
				unionLines = unionLines.filter(line => {
					const cl = tokenizeLine(line);
					if (seen.has(cl)) return false;
					seen.add(cl);
					return true;
				});
			}

			if (sortOrder === "alpha") {
				unionLines.sort((a, b) => tokenizeLine(a).localeCompare(tokenizeLine(b)));
			}

			if (actionChoice.value === "copy") {
				await vscode.env.clipboard.writeText(unionLines.join('\n'));
				vscode.window.showInformationMessage(`HELL: Saved union composition [${unionLines.length} lines] to clipboard cache!`);
			} else {
				const insertPos = new vscode.Position(editor.selection.active.line + 1, 0);
				await editor.edit(editBuilder => editBuilder.insert(insertPos, unionLines.join('\n') + '\n'));
				handleFollowFocusRouting(editor, insertPos.line, selectedSections[0]?.label);
			}
		};

		await runStep1();
	});

	let intersectCmd = vscode.commands.registerCommand('hell.section.intersect', executeSectionIntersectCommand);
	let itemRemoveCmd = vscode.commands.registerCommand('hell.item.remove', executeItemRemoveFromSectionsCommand);
	let itemInjectCmd = vscode.commands.registerCommand('hell.item.inject', executeItemInjectToSectionsCommand);
	let sectionsSortCmd = vscode.commands.registerCommand('hell.sections.sort', executeSectionsSortCommand);
	let sectionsUniqueCmd = vscode.commands.registerCommand('hell.sections.unique', executeSectionsUniqueCommand);
	let directivesUniqueCmd = vscode.commands.registerCommand('hell.directives.uniqueSections', () => executeAddDirectiveCommand('UNIQUE'));
	let directivesSortCmd = vscode.commands.registerCommand('hell.directives.sortSections', () => executeAddDirectiveCommand('ALPHA'));
	let itemYankCmd = vscode.commands.registerCommand('hell.item.yank', executeItemYankCommand);
	let formatAddCmd = vscode.commands.registerCommand('hell.format.add', executeFormatAddCommand);
	let formatRemoveCmd = vscode.commands.registerCommand('hell.format.remove', executeFormatRemoveCommand);
	let sectionsSortChildItemsCmd = vscode.commands.registerCommand('hell.sections.sortChildItems', executeSectionsSortChildItemsCommand);

	context.subscriptions.push(
		unionCmd,
		intersectCmd,
		itemRemoveCmd,
		itemInjectCmd,
		sectionsSortCmd,
		sectionsUniqueCmd,
		directivesUniqueCmd,
		directivesSortCmd,
		itemYankCmd,
		formatAddCmd,
		formatRemoveCmd,
		sectionsSortChildItemsCmd
	);
}


// =================================================================================================
// 🏁 SOLID INDUSTRIAL ENGINE LIFECYCLE EXPORTS
// =================================================================================================

const baseActivate = module.exports.activate;
module.exports = {
	activate: function (context) {
		// Fallback safety hook call
		if (typeof baseActivate === 'function') {
			baseActivate(context);
		}

		// Initialize active real-time watchers and picker systems internally
		initializeAutoSyncWatchers(context);
		registerInteractivePipelines(context);

		// Bind core palette actions
		let sortCmd = vscode.commands.registerCommand('hell.section.sort', executeSectionSortCommand);
		let refreshCmd = vscode.commands.registerCommand('hell.markers.refresh', () => evaluateDocumentIntegrity());

		// Directive and pipeline commands
		let insertExampleCmd = vscode.commands.registerCommand('hell.directives.insertExample', executeInsertExampleCommand);
		let exportExecuteCmd = vscode.commands.registerCommand('hell.export.execute', executeNamedExportCommand);

		// Section manipulation commands
		let sectionCopyCmd = vscode.commands.registerCommand('hell.section.copy', executeSectionCopyCommand);
		let sectionInjectCmd = vscode.commands.registerCommand('hell.section.inject', executeSectionInjectCommand);
		let sectionImportCmd = vscode.commands.registerCommand('hell.section.import', executeSectionImportCommand);
		let sectionExportCmd = vscode.commands.registerCommand('hell.section.export', executeSectionExportCommand);

		// Item relocation & primitive commands
		let appendCmd = vscode.commands.registerCommand('hell.item.append', () => executeItemPrimitiveCommand('append'));
		let prependCmd = vscode.commands.registerCommand('hell.item.prepend', () => executeItemPrimitiveCommand('prepend'));
		let mergeCmd = vscode.commands.registerCommand('hell.item.merge', () => executeItemPrimitiveCommand('merge'));

		let movePrevCmd = vscode.commands.registerCommand('hell.item.move.prev', () => dispatchMoveItemDirection('prev', 'move'));
		let moveNextCmd = vscode.commands.registerCommand('hell.item.move.next', () => dispatchMoveItemDirection('next', 'move'));
		let moveParentCmd = vscode.commands.registerCommand('hell.item.move.parent', () => dispatchMoveItemDirection('parent', 'move'));
		let moveChildCmd = vscode.commands.registerCommand('hell.item.move.child', () => dispatchMoveItemDirection('child', 'move'));
		let moveSiblingCmd = vscode.commands.registerCommand('hell.item.move.sibling', () => dispatchMoveItemDirection('sibling', 'move'));

		let copyPrevCmd = vscode.commands.registerCommand('hell.item.copy.prev', () => dispatchMoveItemDirection('prev', 'copy'));
		let copyNextCmd = vscode.commands.registerCommand('hell.item.copy.next', () => dispatchMoveItemDirection('next', 'copy'));
		let copyParentCmd = vscode.commands.registerCommand('hell.item.copy.parent', () => dispatchMoveItemDirection('parent', 'copy'));
		let copyChildCmd = vscode.commands.registerCommand('hell.item.copy.child', () => dispatchMoveItemDirection('child', 'copy'));
		let copySiblingCmd = vscode.commands.registerCommand('hell.item.copy.sibling', () => dispatchMoveItemDirection('sibling', 'copy'));

		let copyPrependCmd = vscode.commands.registerCommand('hell.item.copy.prepend', () => executeItemPrimitiveActionCommand('copy', 'prepend'));
		let copyAppendCmd = vscode.commands.registerCommand('hell.item.copy.append', () => executeItemPrimitiveActionCommand('copy', 'append'));
		let copyMergeCmd = vscode.commands.registerCommand('hell.item.copy.merge', () => executeItemPrimitiveActionCommand('copy', 'merge'));
		let movePrependCmd = vscode.commands.registerCommand('hell.item.move.prepend', () => executeItemPrimitiveActionCommand('move', 'prepend'));
		let moveAppendCmd = vscode.commands.registerCommand('hell.item.move.append', () => executeItemPrimitiveActionCommand('move', 'append'));
		let moveMergeCmd = vscode.commands.registerCommand('hell.item.move.merge', () => executeItemPrimitiveActionCommand('move', 'merge'));

		let insertDirectivesCmd = vscode.commands.registerCommand('hell.directives.insert', executeInsertDirectivesCommand);
		let wrapDirectivesCmd = vscode.commands.registerCommand('hell.directives.wrap', executeWrapDirectivesCommand);

		let generalItemCopyCmd = vscode.commands.registerCommand('hell.item.copy', executeGeneralItemCopyCommand);
		let generalItemMoveCmd = vscode.commands.registerCommand('hell.item.move', executeGeneralItemMoveCommand);

		context.subscriptions.push(
			sortCmd,
			refreshCmd,
			insertExampleCmd,
			exportExecuteCmd,
			sectionCopyCmd,
			sectionInjectCmd,
			sectionImportCmd,
			sectionExportCmd,
			appendCmd,
			prependCmd,
			mergeCmd,
			movePrevCmd,
			moveNextCmd,
			moveParentCmd,
			moveChildCmd,
			moveSiblingCmd,
			copyPrevCmd,
			copyNextCmd,
			copyParentCmd,
			copyChildCmd,
			copySiblingCmd,
			copyPrependCmd,
			copyAppendCmd,
			copyMergeCmd,
			movePrependCmd,
			moveAppendCmd,
			moveMergeCmd,
			insertDirectivesCmd,
			wrapDirectivesCmd,
			generalItemCopyCmd,
			generalItemMoveCmd
		);

		// Initial paint pass
		setTimeout(() => evaluateDocumentIntegrity(), 500);
	},
	deactivate: function () {
		// Clean up allocation layers to prevent memory leaks on exit
		if (hellDecorationType) {
			hellDecorationType.dispose();
		}
	}
};
