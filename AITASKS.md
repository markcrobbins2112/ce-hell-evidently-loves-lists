# AI Tasks
---
## Back to...
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

## Fails
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
## New Commands
- insert directives
	- below current line
```markdown
<!-- HELL:DIRECTIVES
{cursor}
-->
```
- wrap directives
```markdown
<!-- HELL:DIRECTIVES
{selection}
-->
```
- need these
	"onCommand:hell.item.copy.prev",
	"onCommand:hell.item.copy.next",
	"onCommand:hell.item.copy.parent",
	"onCommand:hell.item.copy.child",
	"onCommand:hell.item.copy.sibling",
- and
hell.item.(copy|move).(prepend|append|merge)
- cant find
		"onCommand:hell.section.sort",
		"onCommand:hell.section.union",
		"onCommand:hell.section.copy",
		"onCommand:hell.section.inject",
		"onCommand:hell.section.import",
		"onCommand:hell.section.export",



## [x] Incoming tasks from chat
- [x] NEW: Fix SectionA duplicate detection by supporting SAMPLE and checking quote tokenization with indentation
- [x] NEW: Fix "copy/move to next section fails if next section does not have a newline below"
- [x] NEW: Copy/Move interactive picker: choice between Copy or Move
- [x] NEW: Implement standalone/primitive commands for item appending, prepending, and merging
- [x] NEW: Let users decide how to insert (prepend, append/amend, merge) when copying or moving items unless list is ALPHA or UNIQUE, in which case bypass and always merge/auto-sort.


## [ ] New Changes
<!-- template
### [ ] Change X to Y
- details
-->

## [ ] New Settings
<!-- template
### [ ] Setting X
- details
-->

## [ ] New Commands
<!-- template
### [ ] Command X
- details
-->

## [ ] New Bindings
<!-- template
### [ ] Binding X
- details
-->

## [ ] New Features
<!-- template
### [ ] Feature X
- details
-->

## [ ] Settings
<!-- template
### Setting X
- details
-->

## [ ] Commands
<!-- template
### Command X
- details
-->

## [ ] Bindings
<!-- template
### Binding X
- details
-->

## [ ] Features
<!-- template
### Feature X
- details
-->
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
