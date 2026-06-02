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
#### Editor Jumping
- [ ] FAIL: Important: when typing occurs, the text in editors will jump back and forth due to before
	- even when there is no befores, so it must be due to the blank before
	- suggest a timer and a focus hook will help instead of on editor change
#### Commands to deal with format
- [ ] FAIL: Format: Remove
	- hell.format.remove
	- [ ] FAIL: Nothing to do with directives
	- for current items:
		- [ ] FAIL: multi picker (show each that is present)
			- remove indent
			- remove bullet
			- remove text before data
			- remove text after data
			- remove meta text after text after data
			- remove data quotes
			- remove data comma
- [ ] FAIL: Format: Add
	- hell.format.add
	- [ ] FAIL: this is not dependent on directives, it operates on the current lines, adding substrings
	- for current items:
		- [ ] FAIL: multi picker (show each that is not present)
			- add indent
			- add bullet
			- add data quotes
			- add data comma

### Directives
- [ ] FAIL: Directives like this should work
	- [ ] FAIL: '<!-- ALPHA UNIQUE -->'

### Command Reference
- [ ] NEW: Commands and their new titles
	- [ ] NEW: AI! Maintain this, push changes from here
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
	- [x] Nothing happens
	- [x] cut items and put them in current section
	- [x] from sections
	- [x] with each section: picker: child depth|items
	- [ ] FAIL: multi picker: all items picked so far
	- [ ] FAIL: picker: flatten
	- [ ] FAIL: picker: sort
	- [ ] FAIL: picker: unique
	- [ ] FAIL: picker: inject or copy
	- [ ] FAIL: if inject: picker: prepend append merge
- use new naming style
- [x] Section Intersect
	- [x] has no results
	- [x] works like union but does intersection
		- [ ] FAIL: is doing a union should do an intersection
			- intersection is only items existing in all sources
- [x] Item Remove from Sections
	- hell.item.remove
	- [ ] NEW: rename to Sections Remove Item
		- [ ] NEW: rename to hell.sections.item.remove
	- [x] does nothing
		- [x] offers multi-picker of all sections
			- [x] then for each section selected
				- offer a depth picker
			- [ ] FAIL: offer a depth picker for section
			- [ ] FAIL: then multi-picker of all chosen items
			- then remove those items
- [ ] FAIL: 👹HELL: Items: Inject to Sections _iits
	- hell.item.inject
	- [x] first picker should be choice between current items or new item
	- [ ] FAIL: when this executes it does damage to lines beginning with html comment first part
	- [x] general fail to operate
	- [ ] FAIL: only injects in first section
- [ ] FAIL: 👹HELL: Sections: Sort Sections _sss
	- hell.sections.sort
	- [ ] FAIL: picker should be mult-pick of sections with child sections
	- [ ] FAIL: child sections should be sorted
	- [x] picker does not bring up list of every section with children
- [ ] FAIL: 👹HELL: Sections: Sort Child Items _ssci
	- hell.sections.sortChildItems
	- [ ] FAIL: picker should be mult-pick of sections with child items
	- [x] child items of selected sections should be sorted
- [ ] NEW: 👹HELL: Sections: Unique Children _suc
	- hell.sections.unique
	- [ ] NEW: hell.sections.uniqueChildren
	- [ ] NEW: picker should be a multi-pick of sections
	- [ ] NEW: sections items should be made unique
- [ ] NEW: 👹HELL: Directives: Unique Sections _dus
	- hell.directives.uniqueSections
	- add directive to section
		- '<!-- UNIQUE -->'
	- [ ] NEW: directives like this should work
		- '<!-- ALPHA UNIQUE -->'
- [ ] 👹HELL: Directives: Sort Sections _dss
	- hell.directives.sortSections
	- add directive to section
		- '<!-- ALPHA -->'
	- [ ] NEW: directives like this should work
		- '<!-- ALPHA UNIQUE -->'
	- [x] write/reuse directive as first item in section
- [x] Insert Directives
	- below current line
	- [x] command not found

## AI Active Tasks Dashboard


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
